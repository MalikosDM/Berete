#!/usr/bin/env python3
"""
The AI backgrounds of the universes (src/data/themes.ts), enlarged with a super-resolution model (Swin2SR x2, through
the transformers library) to 2560 px wide: the masters go to .local/universes/<id>.png (never in Git, the repo is
public), then scripts/universe-media.mjs makes the web files. Run by `npm run universes` when a master is missing.

    python3 scripts/universe-upscale.py <source.png> <master.png>

Needs: torch, transformers, pillow (the model, about 50 MB, is downloaded once from Hugging Face).
"""
import sys

import numpy as np
import torch
from PIL import Image
from transformers import Swin2SRForImageSuperResolution, Swin2SRImageProcessor

MODEL = "caidas/swin2SR-classical-sr-x2-64"
WIDTH = 2560
TILE = 256
PAD = 16


def upscale(img: Image.Image) -> Image.Image:
    device = "mps" if torch.backends.mps.is_available() else "cpu"
    processor = Swin2SRImageProcessor.from_pretrained(MODEL)
    model = Swin2SRForImageSuperResolution.from_pretrained(MODEL).to(device).eval()
    src = np.asarray(img.convert("RGB"), dtype=np.float32) / 255.0
    h, w, _ = src.shape
    out = np.zeros((h * 2, w * 2, 3), dtype=np.float32)
    # Tiles with a margin, so the seams never show.
    for y in range(0, h, TILE):
        for x in range(0, w, TILE):
            y0, x0 = max(0, y - PAD), max(0, x - PAD)
            y1, x1 = min(h, y + TILE + PAD), min(w, x + TILE + PAD)
            tile = Image.fromarray((src[y0:y1, x0:x1] * 255).astype(np.uint8))
            inputs = processor(tile, return_tensors="pt").to(device)
            with torch.no_grad():
                rec = model(**inputs).reconstruction[0].clamp(0, 1).cpu().numpy().transpose(1, 2, 0)
            ty, tx = (y - y0) * 2, (x - x0) * 2
            th, tw = min(TILE, h - y) * 2, min(TILE, w - x) * 2
            out[y * 2 : y * 2 + th, x * 2 : x * 2 + tw] = rec[ty : ty + th, tx : tx + tw]
    big = Image.fromarray((out * 255).round().astype(np.uint8))
    return big.resize((WIDTH, round(WIDTH * h / w)), Image.LANCZOS)


if __name__ == "__main__":
    source, master = sys.argv[1], sys.argv[2]
    upscale(Image.open(source)).save(master)
    print("  + " + master)
