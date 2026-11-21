"""
The sails of the windmills of an AI background, removed from a copy of the image (the sky behind them rebuilt by
inpainting), so that the site can draw them turning (src/components/Universe.tsx, spot "sails"). The original image is
only read. Used by scripts/universe-media.mjs:

    python3 -I scripts/universe-inpaint.py <source> <output.png> <windmill> [<windmill> ...]

A windmill: "x,y,r,a1,a2,..." -- its hub (shares of the width and of the height), the length of its sails (share of the
width), and the angle of each sail seen in the image (degrees, 0 to the right, 90 down). Removed: a band along each sail
(its spar and its lattice); kept: the hub, the cap and the tower.
"""
import sys

import cv2
import numpy as np


def main() -> None:
    src, out, *specs = sys.argv[1:]
    image = cv2.imread(src, cv2.IMREAD_COLOR)
    if image is None:
        raise SystemExit("cannot read " + src)
    h, w = image.shape[:2]
    clean = image.astype(np.float32)
    debug = np.zeros((h, w), np.uint8)
    for spec in specs:
        x, y, r, *angles = (float(v) for v in spec.split(","))
        cx, cy, r = x * w, y * h, r * w
        # Work in a square around the windmill only.
        x0, y0 = int(max(0, cx - 1.35 * r)), int(max(0, cy - 1.35 * r))
        x1, y1 = int(min(w, cx + 1.35 * r)), int(min(h, cy + 1.35 * r))
        yy, xx = np.mgrid[y0:y1, x0:x1].astype(np.float64)
        dx, dy = xx - cx, yy - cy
        band = np.zeros(dx.shape, bool)
        for a in angles:
            ux, uy = np.cos(np.radians(a)), np.sin(np.radians(a))
            along = dx * ux + dy * uy
            across = -dx * uy + dy * ux
            band |= (along > 0.08 * r) & (along < 1.12 * r) & (np.abs(across) < 0.2 * r)
        tower = (dx * dx + dy * dy <= (0.13 * r) ** 2) | ((dy > 0.02 * r) & (dx > -0.2 * r) & (dx < 0.45 * r)) | (dy > 0.2 * r)
        band &= ~tower
        # The sky: a smooth surface fitted on the sky around (not the sails, not the tower), one per colour.
        sample = ~band & ~tower & (dx * dx + dy * dy <= (1.3 * r) ** 2)
        sample &= ~cv2.dilate(band.astype(np.uint8), np.ones((15, 15), np.uint8)).astype(bool)
        u, v = (dx / r)[sample], (dy / r)[sample]
        design = np.stack([np.ones_like(u), u, v, u * u, u * v, v * v, v * v * v], axis=1)
        patch = clean[y0:y1, x0:x1]
        U, V = dx / r, dy / r
        terms = [np.ones_like(U), U, V, U * U, U * V, V * V, V * V * V]
        fit = np.empty_like(patch)
        for c in range(3):
            coef, *_ = np.linalg.lstsq(design, patch[..., c][sample].astype(np.float64), rcond=None)
            fit[..., c] = sum(k * t for k, t in zip(coef, terms)).astype(np.float32)
        # A fine grain like the image, and soft edges.
        fit += np.random.default_rng(7).normal(0, 1.6, fit.shape).astype(np.float32)
        alpha = cv2.GaussianBlur(band.astype(np.float32), (0, 0), max(2.0, 0.035 * r))
        alpha = np.clip(alpha * 1.25, 0, 1)[..., None]
        clean[y0:y1, x0:x1] = patch * (1 - alpha) + fit * alpha
        debug[y0:y1, x0:x1] = np.maximum(debug[y0:y1, x0:x1], (alpha[..., 0] * 255).astype(np.uint8))
    cv2.imwrite(out, np.clip(clean, 0, 255).astype(np.uint8))
    if len(sys.argv) and out.endswith(".png"):
        cv2.imwrite(out.replace(".png", "-mask.png"), debug)


if __name__ == "__main__":
    main()
