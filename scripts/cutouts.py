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
- stones: a coloured stone set inside the jewel (the red pear of the Ruby T necklace), as dark as the background, is
  kept: a hole of the jewel that is red, not the neutral black of the background, is filled.
- ring: a ring on black, kept whole by its light (macOS misses its band in the shadow), its surfaces solid; level: the
  least light kept (above a velvet whose threads catch the light).
- fill: every hole of the outline filled (a ring seen from the side: the inside of its band, dark, is part of it); a
  number: its outline also made convex from that fraction of its height down (its band open on a side).
- floor: a jewel standing on a mirror (its reflection joined to it): everything below that line (a fraction of the
  height of the photo) goes.
- neutral: a white-metal jewel on skin (a watch on a wrist): kept where the photo is neutral and light (its diamonds and
  steel), not where it is coloured (the skin) or dark (a sleeve, the background).
- seed: [x, y] (fractions of the photo): only the part of the jewel at that point (or the nearest one) is kept (a watch
  beside a chain and a bangle on the same cushion).
- A jewel that leaves the photo (a chain going up) fades out on that side instead of a sharp cut; keep_edge: the cut kept
  sharp instead (a pendant whose corner only touches the edge: a fade would dissolve half of it). fade: {side: fraction}:
  a fade asked on a side, over that fraction of the jewel from its own edge (a chain whose ends go behind the neck of the
  bust, blurred: they fade out instead of ending in ragged pieces).
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


def fill_stones(alpha, img, s):
    """The holes of the jewel (not reached from the edges of the photo) whose colour is a stone, not the background."""
    solid = cv2.morphologyEx((alpha > 0.3).astype(np.uint8), cv2.MORPH_CLOSE, disk(2 * s))
    n, labels, stats, _ = cv2.connectedComponentsWithStats(1 - solid, connectivity=4)
    h, w = alpha.shape
    # How red a pixel is: a dark red stone stays redder than the neutral black of the velvet behind a link (measured on
    # the Ruby T necklace: 0.015 to 0.02 on average and a red pixel in 6 to 18 against 0.005 and none at most).
    red = img[..., 0] - (img[..., 1] + img[..., 2]) / 2
    for i in range(1, n):
        x, y, bw, bh, area = stats[i]
        if x == 0 or y == 0 or x + bw >= w or y + bh >= h or area < 200 * s * s:
            continue
        hole = labels == i
        if float(red[hole].mean()) > 0.01 and float((red[hole] > 0.04).mean()) > 0.04:
            grown = cv2.dilate(hole.astype(np.uint8), disk(2 * s)).astype(np.float32)
            alpha = np.maximum(alpha, cv2.GaussianBlur(grown, (0, 0), 0.8 * s + 0.3))
    return alpha


def cutout(work, mask_path, mode, solo=False, stones=False, ring=False, floor=None, fill=False, level=None, neutral=False, seed=None, keep_edge=False, fade=None):
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

    if neutral:
        # A white-metal jewel on skin: neutral and light (diamonds, steel, a white dial), against the colour of the skin and
        # the dark of a sleeve or a background. Its dark details (screws, numerals) are holes filled below (fill).
        sat = (lum - img.min(axis=2)) / np.maximum(lum, 1e-3)
        alpha = (1 - smoothstep(0.16, 0.32, sat)) * smoothstep(0.28, 0.45, lum)
        # The skin behind the edges, from the nearby background (normalized convolution), for clean edge colours.
        bgmask = (alpha < 0.03).astype(np.float32)
        k = max(15, int(round(40 * s)) | 1)
        num = cv2.GaussianBlur(img * bgmask[..., None], (0, 0), k)
        den = cv2.GaussianBlur(bgmask, (0, 0), k)[..., None]
        bg_color = num / np.maximum(den, 1e-4)
    elif mode == "luma":
        # The jewel on a dark bust or velvet: its light only (the bust is darker than the metal), then its surfaces made
        # solid (the gaps between the stones of a pavé closed) so that the jewel is opaque, its edges still drawn by light.
        # level: the least light kept, when the border of the photo is not the background (a chain beside the jewel).
        t0 = level if level is not None else max(0.17, bg_level + 0.08)
        alpha = smoothstep(t0, t0 + 0.26, lum)
        solid = cv2.morphologyEx((alpha > 0.35).astype(np.uint8), cv2.MORPH_CLOSE, disk(6 * s))
        core = cv2.erode(solid, disk(3 * s)).astype(np.float32)
        alpha = np.maximum(alpha, cv2.GaussianBlur(core, (0, 0), 1.5 * s + 0.3))
        bg_color = np.zeros(3, np.float32)
    elif dark and ring:
        # A ring on black: macOS often misses its band in the shadow (the bottom, the shank going back). The whole ring is
        # kept by its light wherever it is in the photo, its surfaces made solid (the band bottom, as dark as it is, stays
        # whole), its edges still drawn by light; the parts apart from it go below (solo).
        # macOS fills the opening of a ring: its mask counts only near the light of the metal (the black seen through the
        # ring stays transparent).
        t0 = max(bg_level + 0.025, level or 0)
        light = smoothstep(t0, t0 + 0.14, lum)
        lit = cv2.dilate((lum > t0 + 0.05).astype(np.uint8), disk(8 * s))
        core = (cv2.erode((m > 0.5).astype(np.uint8), disk(7 * s)) & lit).astype(np.float32)
        alpha = np.maximum(cv2.GaussianBlur(core, (0, 0), 1.2 * s + 0.3), light)
        solid = cv2.morphologyEx((alpha > 0.2).astype(np.uint8), cv2.MORPH_CLOSE, disk(9 * s))
        solid = cv2.erode(solid, disk(2 * s)).astype(np.float32)
        alpha = np.maximum(alpha, cv2.GaussianBlur(solid, (0, 0), 1.2 * s + 0.3))
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

    if seed is not None:
        # Only the part at the seed (or the nearest part): the jewel, not what lies beside it in the photo.
        solid = cv2.morphologyEx((alpha > 0.35).astype(np.uint8), cv2.MORPH_CLOSE, disk(5 * s))
        n, labels, stats, _ = cv2.connectedComponentsWithStats(solid, connectivity=8)
        sx, sy = int(seed[0] * (w - 1)), int(seed[1] * (h - 1))
        k = labels[sy, sx]
        if k == 0 and n > 1:
            ys, xs = np.nonzero(labels)
            i = int(np.argmin((ys - sy) ** 2 + (xs - sx) ** 2))
            k = labels[ys[i], xs[i]]
        if k:
            alpha = alpha * (cv2.dilate((labels == k).astype(np.uint8), disk(3 * s)) > 0)
    if stones:
        alpha = fill_stones(alpha, img, s)
    if fill:
        # A ring seen from the side, where no background shows through it: the inside of its band, a mirror of the black
        # background (dark between its reflections), is part of it: every hole of its outline is filled.
        solid = cv2.morphologyEx((alpha > 0.3).astype(np.uint8), cv2.MORPH_CLOSE, disk(14 * s))
        if not isinstance(fill, bool):
            # Its band open on a side: the outline of the main part made convex, from that fraction of its height down
            # (above, the ornaments of its top keep their own outline).
            n, labels, stats, cents = cv2.connectedComponentsWithStats(solid, connectivity=8)
            big = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
            x, y, bw0, bh0 = stats[big, :4]
            parts = np.zeros(n, bool)
            for i in range(1, n):
                cx, cy = cents[i]
                parts[i] = stats[i, cv2.CC_STAT_AREA] >= 0.005 * stats[big, cv2.CC_STAT_AREA] and x <= cx <= x + bw0 and y <= cy <= y + bh0
            pts = cv2.findNonZero(parts[labels].astype(np.uint8))
            hull = np.zeros_like(solid)
            cv2.fillConvexPoly(hull, cv2.convexHull(pts), 1)
            by, bh0 = stats[big, cv2.CC_STAT_TOP], stats[big, cv2.CC_STAT_HEIGHT]
            hull[: by + int(float(fill) * bh0)] = 0
            solid = solid | hull
        holes = solid.copy()
        ff = np.zeros((h + 2, w + 2), np.uint8)
        cv2.floodFill(holes, ff, (0, 0), 1)
        solid = solid | (1 - holes)
        solid = cv2.erode(solid, disk(2 * s)).astype(np.float32)
        alpha = np.maximum(alpha, cv2.GaussianBlur(solid, (0, 0), 1.2 * s + 0.3))
    if floor is not None:
        # A jewel standing on a mirror: its reflection, joined to it, starts at the line where it stands (a fraction of
        # the height of the photo): everything below goes.
        # A number: a straight line; a list of [x, y] points (fractions): a line through them (a ring lying down).
        pts = [[0, floor], [1, floor]] if isinstance(floor, (int, float)) else sorted(floor)
        line = np.interp(np.arange(w) / max(w - 1, 1), [p[0] for p in pts], [p[1] for p in pts]) * h
        yy = np.arange(h, dtype=np.float32)[:, None]
        alpha = alpha * np.clip(line[None, :] - yy, 0, 1)

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
        if (strip > 0.08).sum() > 3 * band and not keep_edge:
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
    # A fade asked on a side, from the edge of the jewel itself.
    for side, f in (fade or {}).items():
        if side == "top":
            alpha = alpha * smoothstep(0, f * bh, yy - y0)
        elif side == "bottom":
            alpha = alpha * smoothstep(0, f * bh, y1 - yy)
        elif side == "left":
            alpha = alpha * smoothstep(0, f * bw, xx - x0)
        elif side == "right":
            alpha = alpha * smoothstep(0, f * bw, x1 - xx)

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
        out, report = cutout(job["work"], job["mask"], job.get("mode", "mask"), job.get("solo", False), job.get("stones", False), job.get("ring", False), job.get("floor"), job.get("fill", False), job.get("level"), job.get("neutral", False), job.get("seed"), job.get("keepEdge", False), job.get("fade"))
        if out is not None:
            Image.fromarray((out * 255 + 0.5).astype(np.uint8), "RGBA").save(job["out"], compress_level=3)
        print(json.dumps({"out": job["out"], **report}), flush=True)


if __name__ == "__main__":
    main()
