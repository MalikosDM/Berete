/*
 * Smoothing for the ring try-on (26/11/2026). The one-euro filter (Casiez et al.): still when the hand is still, quick
 * when it moves (its cut-off frequency rises with the speed). Used twice: on the 21 points of the hand (./hands.ts), then
 * on the finger's frame itself (where the ring sits, its size, its turn), because what is reckoned from the points (the
 * size from the knuckles, the back of the hand from the palm) still trembles a little when the points barely move.
 */
import { MathUtils, Matrix4, Quaternion, Vector3 } from "three";
import type { FingerFrame } from "./place";

export class OneEuro {
  private x = 0;
  private dx = 0;
  private t = -1;
  constructor(
    private readonly minCutoff: number,
    private readonly beta: number,
    private readonly dCutoff = 1,
  ) {}
  static alpha(cutoff: number, dt: number): number {
    const tau = 1 / (2 * Math.PI * cutoff);
    return 1 / (1 + tau / dt);
  }
  filter(value: number, t: number): number {
    if (this.t < 0) {
      this.t = t;
      this.x = value;
      this.dx = 0;
      return value;
    }
    const dt = Math.max((t - this.t) / 1000, 1e-3);
    this.t = t;
    const dValue = (value - this.x) / dt;
    this.dx += OneEuro.alpha(this.dCutoff, dt) * (dValue - this.dx);
    const cutoff = this.minCutoff + this.beta * Math.abs(this.dx);
    this.x += OneEuro.alpha(cutoff, dt) * (value - this.x);
    return this.x;
  }
  reset(): void {
    this.t = -1;
  }
}

/** A turn of more than this from the smoothed one is taken only if it lasts (a back of the hand misread for an image). */
const FLIP_RAD = MathUtils.degToRad(100);
const FLIP_MS = 160;

/**
 * The frame of one finger, smoothed: its position (video pixels: light, the points are smoothed already), its turn (a
 * quaternion, at a speed that rises with the turning), its size. The size in two parts: the finger's own width and length
 * in metres (they never change on a hand: smoothed a lot, no trembling) times the scale of the image (pixels per metre:
 * smoothed lightly, so a hand that comes closer gets a larger ring at once).
 * The base knuckle and the middle joint are rebuilt from the smoothed position, direction and length, so the ring and
 * the finger that hides the back of its band always agree.
 */
export class FrameSmoother {
  private origin = [0, 1, 2].map(() => new OneEuro(3, 0.05));
  private width = new OneEuro(0.3, 0);
  private length = new OneEuro(0.5, 0);
  private scale = new OneEuro(2, 0.003);
  private turn = new Quaternion();
  private speed = 0;
  private t = -1;
  private flipSince = -1;

  reset(): void {
    this.origin.forEach((f) => f.reset());
    this.width.reset();
    this.length.reset();
    this.scale.reset();
    this.t = -1;
    this.flipSince = -1;
  }

  smooth(frame: FingerFrame, t: number): FingerFrame {
    const raw = new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(frame.x, frame.y, frame.z));
    if (this.t < 0) {
      this.turn.copy(raw);
      this.speed = 0;
    } else {
      const dt = Math.max((t - this.t) / 1000, 1e-3);
      const angle = this.turn.angleTo(raw);
      if (angle > FLIP_RAD) {
        // Kept as it was until the new side lasts; then taken at once.
        if (this.flipSince < 0) this.flipSince = t;
        if (t - this.flipSince >= FLIP_MS) {
          this.turn.copy(raw);
          this.flipSince = -1;
        }
      } else {
        this.flipSince = -1;
        this.speed += OneEuro.alpha(1, dt) * (angle / dt - this.speed);
        // About 1.5 Hz at rest, 6 Hz when the hand turns at half a turn per second.
        const cutoff = 1.5 + 1.5 * this.speed;
        this.turn.slerp(raw, OneEuro.alpha(cutoff, dt));
      }
    }
    this.t = t;

    const x = new Vector3(1, 0, 0).applyQuaternion(this.turn);
    const y = new Vector3(0, 1, 0).applyQuaternion(this.turn);
    const z = new Vector3(0, 0, 1).applyQuaternion(this.turn);
    const origin = new Vector3(this.origin[0].filter(frame.origin.x, t), this.origin[1].filter(frame.origin.y, t), this.origin[2].filter(frame.origin.z, t));
    const scale = this.scale.filter(frame.scale, t);
    const diameter = this.width.filter(frame.diameter / frame.scale, t) * scale;
    const length = this.length.filter(frame.joint.distanceTo(frame.base) / frame.scale, t) * scale;
    const base = origin.clone().addScaledVector(y, -frame.along * length);
    const joint = base.clone().addScaledVector(y, length);
    return { origin, x, y, z, diameter, base, joint, along: frame.along, scale };
  }
}
