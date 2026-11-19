#!/usr/bin/env python3
"""
The cutout of a jewel (scripts/cutouts.mjs): from a working photo (long side 3600 px at most) and the mask of macOS
subject lifting (scripts/cutout-mask.swift), a transparent image whose edges follow the photo pixel by pixel.

    python3 scripts/cutouts.py jobs.json      (a list of {work, mask, out, mode})

- mode "mask" (the jewel alone): the inside of the subject is opaque (dark metal too); its edges are redrawn from the
  photo itself: on a black background by the light of the jewel (chains, claws, glints of the stones kept whole and
  sharp), on any other background by a guided filter on the photo.
- mode "luma" (a jewel on a dark bust or velvet): only the light of the jewel near the subject, so that the bust goes.
- Edge colours decontaminated (no dark or coloured fringe), dust and small specks removed.
- A jewel that leaves the photo (a chain going up) fades out on that side instead of a sharp cut.
- Cropped on the jewel with a transparent margin of 5 % (none on a faded side).
Prints one JSON line per job: size, faded sides, checks (touches the edge, haze).
"""
import json
import sys

import cv2
import numpy as np
from PIL import Image

MARGIN = 0.05
FADE = 0.16


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / max(e1 - e0, 1e-6), 0, 1)
    return t * t * (3 - 2 * t)


def disk(r):
    r = max(1, int(round(r)))
    return cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1))


def border_pixels(img, n=10):
    return np.concatenate([img[:n].reshape(-1, 3), img[-n:].reshape(-1, 3), img[:, :n].reshape(-1, 3), img[:, -n:].reshape(-1, 3)])


def cutout(work, mask_path, mode, solo=False):
    img = cv2.cvtColor(cv2.imread(work, cv2.IMREAD_COLOR), cv2.COLOR_BGR2RGB).astype(np.float32) / 255
    h, w = img.shape[:2]
    m = cv2.imread(mask_path, cv2.IMREAD_GRAYSCALE).astype(np.float32) / 255
    if m.shape != (h, w):
        m = cv2.resize(m, (w, h), interpolation=cv2.INTER_LINEAR)
    s = max(h, w) / 3600
    lum = img.max(axis=2)
    border = border_pixels(img)
    bg_color = np.median(border, axis=0)
    bg_level = float(np.percentile(border.max(axis=1), 70))
    dark = bg_level < 0.14

    if mode == "luma":
        # The jewel on a dark bust or velvet: its light only (the bust is darker than the metal), then its surfaces made
        # solid (the gaps between the stones of a pavé closed) so that the jewel is opaque, its edges still drawn by light.
        t0 = max(0.17, bg_level + 0.08)
        alpha = smoothstep(t0, t0 + 0.26, lum)
        solid = cv2.morphologyEx((alpha > 0.35).astype(np.uint8), cv2.MORPH_CLOSE, disk(6 * s))
        core = cv2.erode(solid, disk(3 * s)).astype(np.float32)
        alpha = np.maximum(alpha, cv2.GaussianBlur(core, (0, 0), 1.5 * s + 0.3))
        bg_color = np.zeros(3, np.float32)
    elif dark:
        # The jewel alone on black: an opaque inside, edges drawn by its own light.
        core = cv2.erode((m > 0.5).astype(np.uint8), disk(7 * s)).astype(np.float32)
        core = cv2.GaussianBlur(core, (0, 0), 1.2 * s + 0.3)
        near = cv2.dilate((m > 0.12).astype(np.uint8), disk(16 * s)) > 0
        t0 = bg_level + 0.035
        light = smoothstep(t0, t0 + 0.16, lum) * near
        alpha = np.maximum(core, light)
    else:
        # Any other background: the mask aligned on the edges of the photo by a guided filter.
        guide = (img * 255).astype(np.uint8)
        alpha = cv2.ximgproc.guidedFilter(guide, m, radius=max(2, int(round(5 * s))), eps=1e-3)
        alpha = smoothstep(0.12, 0.92, np.clip(alpha, 0, 1))
        # The background behind the edges, from the nearby background (normalized convolution).
        bgmask = (alpha < 0.03).astype(np.float32)
        k = max(15, int(round(40 * s)) | 1)
        num = cv2.GaussianBlur(img * bgmask[..., None], (0, 0), k)
        den = cv2.GaussianBlur(bgmask, (0, 0), k)[..., None]
        bg_color = num / np.maximum(den, 1e-4)

    # Specks: only the parts of a reasonable size stay (a chain, a pendant, a separate stone of the piece).
    solid = (alpha > 0.15).astype(np.uint8)
    n, labels, stats, _ = cv2.connectedComponentsWithStats(solid, connectivity=8)
    if n > 1:
        areas = stats[1:, cv2.CC_STAT_AREA]
        keep = np.zeros(n, bool)
        keep[1:] = areas >= max(40 * s * s, areas.max() * 0.0015)
        allowed = keep[labels]
        allowed = cv2.dilate(allowed.astype(np.uint8), disk(3 * s)) > 0
        alpha = alpha * allowed
    if solo:
        # One object only: what lies outside the main part (a reflection on a mirror below it) goes.
        solid = (alpha > 0.15).astype(np.uint8)
        n, labels, stats, cents = cv2.connectedComponentsWithStats(solid, connectivity=8)
        if n > 2:
            big = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
            x, y, bw0, bh0 = stats[big, :4]
            pad = 0.02 * max(bw0, bh0)
            keep = np.zeros(n, bool)
            for i in range(1, n):
                cx, cy = cents[i]
                keep[i] = x - pad <= cx <= x + bw0 + pad and y - pad <= cy <= y + bh0 + pad
            alpha = alpha * (cv2.dilate(keep[labels].astype(np.uint8), disk(3 * s)) > 0)
    alpha[alpha < 0.02] = 0

    # Colours without the background (unpremultiplied against it).
    a3 = alpha[..., None]
    fg = np.where(a3 > 0.004, (img - (1 - a3) * bg_color) / np.maximum(a3, 0.004), img)
    fg = np.clip(fg, 0, 1)

    # A jewel that leaves the photo fades out on that side.
    band = max(2, int(round(3 * s)))
    touches = []
    for side, strip in (("top", alpha[:band]), ("bottom", alpha[-band:]), ("left", alpha[:, :band]), ("right", alpha[:, -band:])):
        if (strip > 0.08).sum() > 3 * band:
            touches.append(side)
    ys, xs = np.nonzero(alpha > 0.02)
    if len(ys) == 0:
        return None, {"error": "empty"}
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    bh, bw = y1 - y0, x1 - x0
    yy = np.arange(h, dtype=np.float32)[:, None]
    xx = np.arange(w, dtype=np.float32)[None, :]
    for side in touches:
        if side == "top":
            alpha = alpha * smoothstep(0, FADE * bh, yy - 0)
        elif side == "bottom":
            alpha = alpha * smoothstep(0, FADE * bh, (h - 1) - yy)
        elif side == "left":
            alpha = alpha * smoothstep(0, FADE * bw, xx - 0)
        else:
            alpha = alpha * smoothstep(0, FADE * bw, (w - 1) - xx)

    # Cropped on the jewel, with its margin (none on a faded side).
    mg = int(round(MARGIN * max(bh, bw)))
    top = y0 - (0 if "top" in touches else mg)
    bottom = y1 + (0 if "bottom" in touches else mg)
    left = x0 - (0 if "left" in touches else mg)
    right = x1 + (0 if "right" in touches else mg)
    ch, cw = bottom - top, right - left
    out = np.zeros((ch, cw, 4), np.float32)
    sy0, sx0 = max(0, top), max(0, left)
    sy1, sx1 = min(h, bottom), min(w, right)
    out[sy0 - top : sy1 - top, sx0 - left : sx1 - left, :3] = fg[sy0:sy1, sx0:sx1]
    out[sy0 - top : sy1 - top, sx0 - left : sx1 - left, 3] = alpha[sy0:sy1, sx0:sx1]

    # Checks: nothing on the edge of the image but a faded side; how much of the jewel is half transparent (haze).
    a = out[..., 3]
    edge = {"top": a[0], "bottom": a[-1], "left": a[:, 0], "right": a[:, -1]}
    on_edge = [k for k, v in edge.items() if (v > 0.05).sum() > 2 and k not in touches]
    obj = (a > 0.02).sum()
    haze = float(((a > 0.05) & (a < 0.5)).sum() / max(obj, 1))
    report = {"width": int(cw), "height": int(ch), "fade": touches, "onEdge": on_edge, "haze": round(haze, 3), "dark": bool(dark), "bg": round(bg_level, 3)}
    return out, report


def main():
    jobs = json.load(open(sys.argv[1]))
    for job in jobs:
        out, report = cutout(job["work"], job["mask"], job.get("mode", "mask"), job.get("solo", False))
        if out is not None:
            Image.fromarray((out * 255 + 0.5).astype(np.uint8), "RGBA").save(job["out"], compress_level=3)
        print(json.dumps({"out": job["out"], **report}), flush=True)


if __name__ == "__main__":
    main()
