"""
The photo of the opening of the home page, made larger WITHOUT touching the trunk (28/11/2026, Malik and Yoni: the photo fills
the screen from edge to edge, no frame seen). Only its ground is extended: each row goes on to the sides with the colour of its
edge (its median over a strip, blurred, plus a grain like the photo's), the top goes on with the black of its top rows, the
floor goes on below; the seams melt over a few per cent of the photo where it shows only its black ground or its floor (never
the trunk: its handle starts at 4.2 % of the height, the seam at the top stops at 2.5 %), and the outer edge ends exactly in
the black of the page (#0a0a0a), so that beyond it the page goes on without an edge. No generative image: the logo BRT, the
plate SIRIUS and the pendant are the pixels of the photo, untouched.

    python3 -I scripts/hero-extend.py <source> <out.png> <out.json>

<out.json>: the size of the larger image and the place of the original rectangle in it (pixels).
"""
import json
import sys

import numpy as np
from PIL import Image, ImageFilter

SRC, OUT, META = sys.argv[1:4]
# How much ground is added: on each side (share of the width), above and below (shares of the height).
SIDE, TOP, BOTTOM = 0.225, 0.22, 0.4
# The seams, in the photo itself (shares of its size): only black ground at the sides (the trunks start at 15 % and end at
# 90 % of the width), black at the top (the handle starts at 4.2 %), the floor at the bottom.
SEAM_SIDE, SEAM_TOP, SEAM_BOTTOM = 0.06, 0.025, 0.05
PAGE = np.array([10, 10, 10], np.float32)

a = np.asarray(Image.open(SRC).convert("RGB")).astype(np.float32)
H, W, _ = a.shape
rng = np.random.default_rng(7)


def blur(x, r):
    return np.asarray(Image.fromarray(np.clip(x, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r))).astype(np.float32)


def grain(h, w, sd):
    return (blur(rng.normal(0, sd, (h, w)) + 128, 0.7) - 128)[..., None]


k = max(40, W // 80)
sd = float((a[:, :k] - blur(a[:, :k], 6)).std())
E, T, B = int(W * SIDE), int(H * TOP), int(H * BOTTOM)


def side(cols):
    profile = blur(np.repeat(np.median(a[:, cols], 1)[:, None], 8, 1), H / 90)[:, 0]
    return np.repeat(profile[:, None], E, 1) + grain(H, E, sd)


L, R = side(slice(0, k)), side(slice(W - k, W))
mid = np.concatenate([L, a, R], 1)
F = int(W * SEAM_SIDE)
t = (np.arange(F) / F)[None, :, None]
mid[:, E:E + F] = L[:, -1:] * (1 - t) + a[:, :F] * t
mid[:, E + W - F:E + W] = a[:, W - F:] * (1 - t) + R[:, :1] * t
NW = mid.shape[1]

row = blur(np.repeat(np.median(mid[:k], 0)[None], 8, 0), W / 90)[0]
# The floor goes on softer than the photo (its reflections smoothed over a wider span: no relief where it melts).
brow = blur(np.repeat(np.median(mid[-k:], 0)[None], 8, 0), W / 40)[0]
top = np.repeat(row[None], T, 0) + grain(T, NW, sd)
bottom = np.repeat(brow[None], B, 0) + grain(B, NW, sd)
o = np.concatenate([top, mid, bottom], 0)
G = int(H * SEAM_TOP)
t = (np.arange(G) / G)[:, None, None]
o[T:T + G] = row[None] * (1 - t) + mid[:G] * t
G = int(H * SEAM_BOTTOM)
t = (np.arange(G) / G)[:, None, None]
o[T + H - G:T + H] = mid[-G:] * (1 - t) + brow[None] * t

# The outer edge melts into the black of the page (the photo itself, inside, keeps a weight of 1: untouched).
hh, ww, _ = o.shape
yy = np.minimum(np.clip(np.arange(hh) / (T * 0.8), 0, 1), np.clip((hh - 1 - np.arange(hh)) / (B * 0.9), 0, 1))[:, None]
xx = np.clip(np.minimum(np.arange(ww), ww - 1 - np.arange(ww)) / (E * 0.8), 0, 1)[None, :]
# A smooth step (no slope at either end): the ground melts without any relief, even on the small screen of a phone.
w = (yy * yy * (3 - 2 * yy)) * (xx * xx * (3 - 2 * xx))
w = w[..., None]
o = o * w + PAGE * (1 - w)

Image.fromarray(np.clip(np.round(o), 0, 255).astype(np.uint8)).save(OUT, compress_level=1)
with open(META, "w") as f:
    json.dump({"width": ww, "height": hh, "original": {"x": E, "y": T, "width": W, "height": H}}, f)
print(ww, hh, E, T)
