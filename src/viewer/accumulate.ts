/*
 * Progressive rendering, as iJewel3D does it: while the camera does not move,
 * each new image is drawn with the camera shifted by a fraction of a pixel
 * and averaged with the previous ones. After some 30 images the edges of the
 * facets, the tiny stones and the shadows are smooth; the first movement
 * starts again from one image. The average is made before the glow and the
 * tone mapping (on the light values themselves).
 */
import { Pass } from "postprocessing";
import { HalfFloatType, LinearFilter, ShaderMaterial, Uniform, WebGLRenderTarget, type Texture, type WebGLRenderer } from "three";

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = position.xy * 0.5 + 0.5;
    gl_Position = vec4(position.xy, 1.0, 1.0);
  }`;

export class AccumulatePass extends Pass {
  /** Images averaged so far (0 after a movement). */
  count = 0;
  private read: WebGLRenderTarget;
  private write: WebGLRenderTarget;
  private blend: ShaderMaterial;
  private copy: ShaderMaterial;

  constructor() {
    super("AccumulatePass");
    const options = { type: HalfFloatType, depthBuffer: false, minFilter: LinearFilter, magFilter: LinearFilter };
    this.read = new WebGLRenderTarget(1, 1, options);
    this.write = new WebGLRenderTarget(1, 1, options);
    this.blend = new ShaderMaterial({
      uniforms: { current: new Uniform<Texture | null>(null), previous: new Uniform<Texture | null>(null), weight: new Uniform(1) },
      vertexShader: VERTEX,
      fragmentShader: /* glsl */ `
        uniform sampler2D current;
        uniform sampler2D previous;
        uniform float weight;
        varying vec2 vUv;
        void main() { gl_FragColor = mix(texture2D(previous, vUv), texture2D(current, vUv), weight); }`,
      depthTest: false,
      depthWrite: false,
    });
    this.copy = new ShaderMaterial({
      uniforms: { source: new Uniform<Texture | null>(null) },
      vertexShader: VERTEX,
      fragmentShader: /* glsl */ `
        uniform sampler2D source;
        varying vec2 vUv;
        void main() { gl_FragColor = texture2D(source, vUv); }`,
      depthTest: false,
      depthWrite: false,
    });
    this.fullscreenMaterial = this.blend;
  }

  reset(): void {
    this.count = 0;
  }

  override render(renderer: WebGLRenderer, inputBuffer: WebGLRenderTarget | null, outputBuffer: WebGLRenderTarget | null): void {
    if (!inputBuffer) return;
    // The new image weighs 1/(n+1): the result is the average of all of them.
    this.fullscreenMaterial = this.blend;
    this.blend.uniforms.current!.value = inputBuffer.texture;
    this.blend.uniforms.previous!.value = this.read.texture;
    this.blend.uniforms.weight!.value = 1 / (this.count + 1);
    renderer.setRenderTarget(this.write);
    renderer.render(this.scene, this.camera);
    [this.read, this.write] = [this.write, this.read];
    this.count++;
    this.fullscreenMaterial = this.copy;
    this.copy.uniforms.source!.value = this.read.texture;
    renderer.setRenderTarget(this.renderToScreen ? null : outputBuffer);
    renderer.render(this.scene, this.camera);
  }

  override setSize(width: number, height: number): void {
    this.read.setSize(width, height);
    this.write.setSize(width, height);
    this.count = 0;
  }

  override dispose(): void {
    this.read.dispose();
    this.write.dispose();
    this.blend.dispose();
    this.copy.dispose();
    super.dispose();
  }
}

/** Sub-pixel shifts spread evenly (Halton sequence, bases 2 and 3), in [-0.5, 0.5]. */
export function jitter(index: number): [number, number] {
  const halton = (i: number, base: number) => {
    let f = 1;
    let r = 0;
    for (let n = i; n > 0; n = Math.floor(n / base)) {
      f /= base;
      r += f * (n % base);
    }
    return r;
  };
  return [halton(index + 1, 2) - 0.5, halton(index + 1, 3) - 0.5];
}
