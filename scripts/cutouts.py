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
- holes: a fraction: the holes of the outline smaller than that fraction of the jewel's box filled (dark stones of a pavé
  as dark as the background), not the larger ones (the space between a chain and its pendant).
- clear: a light level: the black seen through the gaps of a chain on black, filled by macOS, cleared (every part of the
  jewel darker than that and larger than a speck): only for a jewel without black parts of its own.
- largest: only the largest part of the jewel stays (what is left of a jewel whose black mirror sides were cleared).
- seed: [x, y] (fractions of the photo): only the part of the jewel at that point (or the nearest one) is kept (a watch
  beside a chain and a bangle on the same cushion).
- A jewel that leaves the photo (a chain going up) keeps its sharp cut there, flush with the border of the image (cut: those
  sides, never a fade since 27/11/2026); keep_edge: true or a list of sides where it only touches the edge (its margin kept).
  cut: {"top": y}: the line above which everything goes (a chain behind the neck of a bust, or leaving the photo on its sides,
  cut below that place). fade_at: [[x, y, r]]: a tiny fade around a point (where a ring touches its mirror).
- defringe (on a dark background): the edge of the jewel redrawn from the jewel next to it (alpha from its light above the
  background compared to the light just inside it, its colour never darker than the jewel there): no dark rim, no halo.
  edge_px: the width of that edge (pixels of a 3600 px photo). peel: the flat black regions reaching the outside go (or
  [level, depth]: only near the outside). drop: boxes or polygons of the photo where nothing is the jewel. harden: a soft
  outline made crisp (true: alpha 0.3–0.7 becomes 0–1; a number h: 0.5 ± h).
- near: (mode "luma") the colour of a half-transparent edge taken from the jewel next to it, at its own light, instead of
  unpremultiplied against black: the light decides the alpha there, so a dim pixel of metal is dark metal, not half
  background, and dividing it by its alpha drew a pale rim around a chain on a bust.
- Cropped on the jewel with a transparent margin of 5 % (none on a cut side).
- mode "png": an image already cut out (a transparent PNG made by hand): kept as it is, only its loose specks removed and
  cropped with the same margin.
Prints one JSON line per job: size, cut sides, checks (touches the edge, haze).
"""
import json
import sys

import cv2
import numpy as np
from PIL import Image

MARGIN = 0.05


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



def background_map(img, alpha, s, bg_level):
    """The light of the background behind every pixel (a vignette, a velvet), from the background around the jewel."""
    lum = img.max(axis=2)
    bgmask = (alpha < 0.02).astype(np.float32)
    near, den = local_mean(lum, bgmask, 25 * s + 1)
    far, den2 = local_mean(lum, bgmask, 120 * s + 1)
    out = np.where(den > 0.05, near, np.where(den2 > 0.01, far, bg_level))
    return out.astype(np.float32)


def blur(x, k):
    """A Gaussian blur of radius k; a wide one made on a smaller copy (the same result to the eye, many times faster)."""
    if k <= 6:
        return cv2.GaussianBlur(x, (0, 0), k)
    f = max(1, int(k // 3))
    h, w = x.shape[:2]
    small = cv2.resize(x, (max(1, w // f), max(1, h // f)), interpolation=cv2.INTER_AREA)
    small = cv2.GaussianBlur(small, (0, 0), k / f)
    return cv2.resize(small, (w, h), interpolation=cv2.INTER_LINEAR)


def local_mean(values, weight, k):
    """The mean of values over the pixels of weight, around each pixel (Gaussian k), and how much weight there is."""
    num = blur(values * weight[..., None], k) if values.ndim == 3 else blur(values * weight, k)
    den = blur(weight, k)
    d = den[..., None] if values.ndim == 3 else den
    return num / np.maximum(d, 1e-5), den


def defringe(alpha, img, bg_map, s, edge_px=None):
    """
    The edge of a jewel on a dark background, redrawn from the jewel next to it. A pixel near the outside (within edge_px of a
    transparent pixel) is as opaque as its light above the background is close to the light of the jewel just inside it
    (unmixed against the background: alpha = (Y - Ybg) / (Yjewel - Ybg)), its colour that of the jewel there. So the black of
    the background kept in the soft edge of the mask, and the dark rim of polished metal mirroring the black, go: no dark
    fringe on a light page, no halo on a coloured one; the edge stays sharp (a tight curve) and its glints stay whole.
    Returns the alpha and (band, colour of the jewel nearby, weight of the pixel's own colour).
    """
    lum = img.max(axis=2)
    R = float(edge_px if edge_px is not None else 9) * s
    alpha = alpha.copy()
    ratio = np.ones_like(alpha)
    for _ in range(2):
        outside = (alpha < 0.02).astype(np.uint8)
        dist = cv2.distanceTransform(1 - outside, cv2.DIST_L2, 3)
        band = (dist <= R) & (outside == 0)
        deep = ((alpha >= 0.97) & (dist > R)).astype(np.float32)
        yl, den = local_mean(lum, deep, R + 0.5)
        yl2, den2 = local_mean(lum, deep, 4 * R + 0.5)
        yl = np.where(den > 0.03, yl, np.where(den2 > 0.01, yl2, float(np.median(lum[deep > 0])) if deep.any() else 0.5))
        r = (lum - bg_map) / np.maximum(yl - bg_map, 0.06)
        ratio = np.where(band, np.minimum(ratio, r), ratio)
        alpha = np.where(band, np.minimum(alpha, smoothstep(0.1, 0.55, r)), alpha)
    outside = (alpha < 0.02).astype(np.uint8)
    dist = cv2.distanceTransform(1 - outside, cv2.DIST_L2, 3)
    band = (dist <= R + 1) & (outside == 0)
    deep = ((alpha >= 0.97) & (dist > R)).astype(np.float32)
    local, den = local_mean(img, deep, R + 0.5)
    local2, _ = local_mean(img, deep, 4 * R + 0.5)
    local = np.where((den > 0.03)[..., None], local, local2)
    # The colour of the edge: its own where it is as bright as the jewel next to it (a glint, a prong), else the jewel's: never
    # darker than the jewel just inside it (a dark facet or the dark rim at the very edge would draw a dark line).
    t = smoothstep(0.75, 1.0, ratio)
    return alpha, (band, local.astype(np.float32), t.astype(np.float32))


def peel_background(alpha, img, bg_map, s, delta):
    """What is left of the background stuck to the jewel (black stains under it, the black seen through a ring): every flat
    region no lighter than the background (by delta) that reaches the outside of the jewel goes. delta may be [delta, depth]:
    only within depth pixels (of a 3600 px photo) of the outside (the black rim of a polished band, not the band itself)."""
    depth = None
    if isinstance(delta, (list, tuple)):
        delta, depth = delta
    lum = img.max(axis=2)
    k = int(5 * s) | 1
    mean = cv2.blur(lum, (k, k))
    sq = cv2.blur(lum * lum, (k, k))
    std = np.sqrt(np.maximum(sq - mean * mean, 0))
    flat = ((lum < bg_map + delta) & (std < 0.03)).astype(np.uint8)
    n, labels = cv2.connectedComponents(flat, connectivity=8)
    reach = np.zeros(n, bool)
    reach[np.unique(labels[(alpha < 0.02) & (flat > 0)])] = True
    reach[0] = False
    gone = reach[labels]
    if depth is not None:
        outside = (alpha < 0.02).astype(np.uint8)
        gone = gone & (cv2.distanceTransform(1 - outside, cv2.DIST_L2, 3) <= depth * s)
    gone = cv2.GaussianBlur(gone.astype(np.float32), (0, 0), 0.8 * s + 0.3)
    return alpha * (1 - gone)


def as_is(work):
    """An image already cut out by hand: its alpha kept, loose specks removed, cropped with the margin."""
    rgba = np.asarray(Image.open(work).convert("RGBA")).astype(np.float32) / 255
    h, w = rgba.shape[:2]
    s = max(h, w) / 3600
    alpha = rgba[..., 3].copy()
    solid = (alpha > 0.15).astype(np.uint8)
    n, labels, stats, _ = cv2.connectedComponentsWithStats(solid, connectivity=8)
    if n > 1:
        areas = stats[1:, cv2.CC_STAT_AREA]
        keep = np.zeros(n, bool)
        keep[1:] = areas >= max(40 * s * s, areas.max() * 0.0015)
        alpha = alpha * (cv2.dilate(keep[labels].astype(np.uint8), disk(3 * s)) > 0)
    alpha[alpha < 0.02] = 0
    ys, xs = np.nonzero(alpha > 0.02)
    if len(ys) == 0:
        return None, {"error": "empty"}
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    mg = int(round(MARGIN * max(y1 - y0, x1 - x0)))
    out = np.zeros((y1 - y0 + 2 * mg, x1 - x0 + 2 * mg, 4), np.float32)
    out[mg : mg + y1 - y0, mg : mg + x1 - x0, :3] = rgba[y0:y1, x0:x1, :3]
    out[mg : mg + y1 - y0, mg : mg + x1 - x0, 3] = alpha[y0:y1, x0:x1]
    a = out[..., 3]
    obj = (a > 0.02).sum()
    haze = float(((a > 0.05) & (a < 0.5)).sum() / max(obj, 1))
    return out, {"width": int(out.shape[1]), "height": int(out.shape[0]), "fade": [], "onEdge": [], "haze": round(haze, 3), "dark": True, "bg": 0}


def cutout(work, mask_path, mode, solo=False, stones=False, ring=False, floor=None, fill=False, level=None, neutral=False, seed=None, keep_edge=False, cut=None, near_colour=False, fade_at=None, clear=None, holes=None, largest=False, peel=None, edge_px=None, defringe_on=True, drop=None, harden=None):
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
        t0 = max(bg_level + 0.035, level or 0)
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

    if clear:
        # The black seen through the gaps between the links of a chain (macOS fills them): a pure dark part of the
        # jewel larger than a speck goes, its edge drawn by the light around it.
        gap = ((lum < clear) & (alpha > 0.3)).astype(np.uint8)
        n, labels, stats, _ = cv2.connectedComponentsWithStats(gap, connectivity=8)
        big = np.zeros(n, bool)
        big[1:] = stats[1:, cv2.CC_STAT_AREA] >= 150 * s * s
        gaps = cv2.GaussianBlur(big[labels].astype(np.float32), (0, 0), 0.8 * s + 0.3)
        alpha = alpha * (1 - gaps) + np.minimum(alpha, smoothstep(clear, clear + 0.12, lum)) * gaps
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
    if holes:
        # The small holes of its outline filled (dark stones of a pavé, as dark as the background), not the large ones (the
        # space between a chain and its pendant): a hole smaller than that fraction of the jewel's box.
        solid = cv2.morphologyEx((alpha > 0.3).astype(np.uint8), cv2.MORPH_CLOSE, disk(3 * s))
        n, labels, stats, _ = cv2.connectedComponentsWithStats(1 - solid, connectivity=4)
        ys, xs = np.nonzero(solid)
        box = (ys.max() - ys.min() + 1) * (xs.max() - xs.min() + 1)
        small = np.zeros(n, bool)
        for i in range(1, n):
            x, y, bw, bh, area = stats[i]
            small[i] = area < holes * box and not (x == 0 or y == 0 or x + bw >= w or y + bh >= h)
        filled = cv2.erode((solid | small[labels]).astype(np.uint8), disk(1 * s)).astype(np.float32)
        alpha = np.maximum(alpha, cv2.GaussianBlur(filled, (0, 0), 0.8 * s + 0.3))
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
    for area in drop or []:
        # A part of the photo where nothing is the jewel (what lies beside it, joined to it: a part of the piece seen behind it):
        # a box [x0, y0, x1, y1] or a polygon [[x, y], ...] (fractions of the photo).
        if isinstance(area[0], (int, float)):
            x0, y0, x1, y1 = area
            alpha[int(round(y0 * h)) : int(round(y1 * h)), int(round(x0 * w)) : int(round(x1 * w))] = 0
        else:
            poly = np.zeros((h, w), np.uint8)
            cv2.fillPoly(poly, [np.array([[round(x * (w - 1)), round(y * (h - 1))] for x, y in area], np.int32)], 1)
            alpha[poly > 0] = 0
    if cut and cut.get("top") is not None:
        # The line where the jewel is cut (a chain whose ends go behind the neck of the bust, or out of the photo on a side):
        # everything above goes, and the image starts exactly there (a sharp cut, flush with its border).
        alpha[: int(round(cut["top"] * h))] = 0

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
                # Inside its box, and not a loose glint (a stone out of focus in the shadow, a speck of dust).
                keep[i] = x - pad <= cx <= x + bw0 + pad and y - pad <= cy <= y + bh0 + pad and stats[i, cv2.CC_STAT_AREA] >= 0.002 * stats[big, cv2.CC_STAT_AREA]
            alpha = alpha * (cv2.dilate(keep[labels].astype(np.uint8), disk(3 * s)) > 0)
    if largest:
        # Only its largest part (the front of a cross whose black mirror sides were cleared: the pieces of rim left
        # floating beside it go).
        solid = (alpha > 0.15).astype(np.uint8)
        n, labels, stats, _ = cv2.connectedComponentsWithStats(solid, connectivity=8)
        if n > 2:
            big = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
            alpha = alpha * (cv2.dilate((labels == big).astype(np.uint8), disk(3 * s)) > 0)
    alpha[alpha < 0.02] = 0

    # A dark background (on black, on a dark bust): the background seen through the edge redrawn (defringe), never a dark rim.
    bg_map = None
    if (dark or mode == "luma") and not neutral and defringe_on:
        bg_map = background_map(img, alpha, s, bg_level)
        alpha, fix = defringe(alpha, img, bg_map, s, edge_px)
        if peel is not None:
            alpha = peel_background(alpha, img, bg_map, s, peel)
            alpha, fix = defringe(alpha, img, bg_map, s, edge_px)
    else:
        fix = None
    if harden:
        # A soft outline (a part out of focus, a dim link by its light) made crisp: what is more than half there is the jewel,
        # what is less goes, over a narrow ramp (still drawn smooth).
        lo, hi = (0.5 - harden, 0.5 + harden) if isinstance(harden, (int, float)) and not isinstance(harden, bool) else (0.3, 0.7)
        alpha = smoothstep(lo, hi, alpha)
    alpha[alpha < 0.02] = 0

    # Colours without the background (unpremultiplied against it).
    a3 = alpha[..., None]
    fg = np.where(a3 > 0.004, (img - (1 - a3) * bg_color) / np.maximum(a3, 0.004), img)
    fg = np.clip(fg, 0, 1)
    if near_colour and mode == "luma" and not neutral:
        # The colour of the jewel nearby (its opaque part), blended back to the photo as the alpha rises.
        op = (alpha > 0.9).astype(np.float32)
        k = 3 * s + 0.5
        num = cv2.GaussianBlur(img * op[..., None], (0, 0), k)
        den = cv2.GaussianBlur(op, (0, 0), k)[..., None]
        t = np.clip((a3 - 0.15) / 0.75, 0, 1)
        fg = np.where(den > 0.02, num / np.maximum(den, 1e-4) * (1 - t) + img * t, img)
        fg = np.clip(np.where(a3 > 0.9, img, fg), 0, 1)
    if fix is not None:
        # The edge redrawn: its colour is the jewel's next to it (never the black behind), its own where it is as bright.
        band, local, t = fix
        fg = np.where(band[..., None], np.clip(local * (1 - t[..., None]) + fg * t[..., None], 0, 1), fg)

    # A jewel that leaves the photo (a chain going up, or the line where it was cut: cut) keeps its sharp cut there, flush with
    # the border of the image (no margin on that side): the page puts that border at the edge of its frame. Never a fade.
    band = max(2, int(round(3 * s)))
    top_row = int(round(cut["top"] * h)) if cut and cut.get("top") is not None else 0
    touches = []
    for side, strip in (("top", alpha[top_row : top_row + band]), ("bottom", alpha[-band:]), ("left", alpha[:, :band]), ("right", alpha[:, -band:])):
        if (strip > 0.08).sum() > 3 * band and not (keep_edge is True or (isinstance(keep_edge, list) and side in keep_edge)):
            touches.append(side)
    if top_row > 0 and "top" not in touches and (alpha[top_row : top_row + band] > 0.08).sum() > 3 * band:
        touches.append("top")
    ys, xs = np.nonzero(alpha > 0.02)
    if len(ys) == 0:
        return None, {"error": "empty"}
    # A fade around a point ([x, y, r], fractions of the photo; r of its larger side), only a tiny one: where a ring touches its
    # mirror, the few pixels of the contact go softly instead of a notch.
    yy = np.arange(h, dtype=np.float32)[:, None]
    xx = np.arange(w, dtype=np.float32)[None, :]
    for fx, fy, fr in fade_at or []:
        r = fr * max(h, w)
        d = np.sqrt((xx - fx * (w - 1)) ** 2 + (yy - fy * (h - 1)) ** 2)
        alpha = alpha * smoothstep(0.25 * r, r, d)
    ys, xs = np.nonzero(alpha > 0.02)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    bh, bw = y1 - y0, x1 - x0

    # Cropped on the jewel, with its margin (none on a side where it is cut: that border is the cut itself).
    mg = int(round(MARGIN * max(bh, bw)))
    top = (top_row if top_row > 0 else 0) if "top" in touches else y0 - mg
    if "top" in touches and top_row == 0:
        top = 0
    bottom = h if "bottom" in touches else y1 + mg
    left = 0 if "left" in touches else x0 - mg
    right = w if "right" in touches else x1 + mg
    ch, cw = bottom - top, right - left
    out = np.zeros((ch, cw, 4), np.float32)
    sy0, sx0 = max(0, top), max(0, left)
    sy1, sx1 = min(h, bottom), min(w, right)
    out[sy0 - top : sy1 - top, sx0 - left : sx1 - left, :3] = fg[sy0:sy1, sx0:sx1]
    out[sy0 - top : sy1 - top, sx0 - left : sx1 - left, 3] = alpha[sy0:sy1, sx0:sx1]

    # Checks: nothing on the edge of the image but a cut side; how much of the jewel is half transparent (haze).
    a = out[..., 3]
    edge = {"top": a[0], "bottom": a[-1], "left": a[:, 0], "right": a[:, -1]}
    on_edge = [k for k, v in edge.items() if (v > 0.05).sum() > 2 and k not in touches]
    obj = (a > 0.02).sum()
    haze = float(((a > 0.05) & (a < 0.5)).sum() / max(obj, 1))
    report = {"width": int(cw), "height": int(ch), "cut": touches, "onEdge": on_edge, "haze": round(haze, 3), "dark": bool(dark), "bg": round(bg_level, 3)}
    return out, report


def main():
    jobs = json.load(open(sys.argv[1]))
    for job in jobs:
        if job.get("mode") == "png":
            out, report = as_is(job["work"])
        else:
            out, report = cutout(job["work"], job["mask"], job.get("mode", "mask"), job.get("solo", False), job.get("stones", False), job.get("ring", False), job.get("floor"), job.get("fill", False), job.get("level"), job.get("neutral", False), job.get("seed"), job.get("keepEdge", False), job.get("cut"), job.get("near", False), job.get("fadeAt"), job.get("clear"), job.get("holes"), job.get("largest", False), job.get("peel"), job.get("edge"), job.get("defringe", True), job.get("drop"), job.get("harden"))
        if out is not None:
            Image.fromarray((out * 255 + 0.5).astype(np.uint8), "RGBA").save(job["out"], compress_level=3)
        print(json.dumps({"out": job["out"], **report}), flush=True)


if __name__ == "__main__":
    main()
