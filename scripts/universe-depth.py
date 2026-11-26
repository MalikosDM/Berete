#!/usr/bin/env python3
"""
The depth of each background of the universes (25/11/2026, the idea of Neil validated by Yoni): a grey map, white for what
is near, black for what is far, made once on the Mac by Depth Anything V2 small (ONNX, onnxruntime; the model in
.local/models/depth-anything-v2-small/model.onnx, never in Git). The page moves the planes of the background with it when
the mouse moves (src/components/universe/depth.ts): the players behind the ring move apart from the stadium.

    .local/venv-cutout/bin/python scripts/universe-depth.py [--only=id,id]     (npm run universes:depth)

Read: the computer and phone images of each background already prepared (public/media/universes/<id>-1600.<v>.webp and
<id>-m-1080.<v>.webp), so that the map lies exactly on the image shown. Written: <id>-depth.<v>.webp (512 px wide) and
<id>-m-depth.<v>.webp (360 px wide), slightly smoothed (no tear at the edges of the planes), and their version in
src/data/universes.generated.json ("depth").
"""
import hashlib
import json
import sys
from pathlib import Path

import numpy as np
import onnxruntime as ort
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
MODEL = ROOT / ".local" / "models" / "depth-anything-v2-small" / "model.onnx"
OUT = ROOT / "public" / "media" / "universes"
DATA = ROOT / "src" / "data" / "universes.generated.json"
MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)


def depth_of(session: ort.InferenceSession, image: Image.Image) -> np.ndarray:
    """The relative depth of an image (0 far, 1 near), at the size of the model (the short side at 518, multiples of 14)."""
    w, h = image.size
    scale = 518 / min(w, h)
    nw, nh = max(14, round(w * scale / 14) * 14), max(14, round(h * scale / 14) * 14)
    x = np.asarray(image.convert("RGB").resize((nw, nh), Image.BICUBIC), dtype=np.float32) / 255.0
    x = ((x - MEAN) / STD).transpose(2, 0, 1)[None]
    name = session.get_inputs()[0].name
    out = session.run(None, {name: x})[0]
    d = np.squeeze(out).astype(np.float32)
    lo, hi = np.percentile(d, 1), np.percentile(d, 99)
    return np.clip((d - lo) / max(hi - lo, 1e-6), 0, 1)


def write(depth: np.ndarray, width: int, ratio: float, stem: str) -> str:
    """The map as a grey WebP of the given width (the ratio of the image), named with its version; returns the version."""
    img = Image.fromarray((depth * 255).astype(np.uint8), "L").resize((width, round(width / ratio)), Image.BICUBIC)
    img = img.filter(ImageFilter.GaussianBlur(radius=width / 256))
    for old in OUT.glob(stem + ".*.webp"):
        old.unlink()
    tmp = OUT / (stem + ".tmp.webp")
    img.save(tmp, "WEBP", quality=82, method=6)
    version = hashlib.sha256(tmp.read_bytes()).hexdigest()[:10]
    tmp.rename(OUT / (stem + "." + version + ".webp"))
    return version


def main() -> None:
    only = next((a[7:].split(",") for a in sys.argv[1:] if a.startswith("--only=")), None)
    data = json.loads(DATA.read_text())
    backdrops = data["backdrops"]
    session = ort.InferenceSession(str(MODEL), providers=["CPUExecutionProvider"])
    for bid, b in backdrops.items():
        if b.get("sequence") or (only and bid not in only):
            continue
        v = b.get("version")
        desk = OUT / (bid + "-1600" + ("." + v if v else "") + ".webp")
        mob = OUT / (bid + "-m-1080" + ("." + v if v else "") + ".webp")
        if not desk.exists():
            print("  ! " + bid + ": no image " + desk.name)
            continue
        depth = {"d": write(depth_of(session, Image.open(desk)), 512, b["ratio"], bid + "-depth")}
        if mob.exists():
            depth["m"] = write(depth_of(session, Image.open(mob)), 360, 9 / 16, bid + "-m-depth")
        b["depth"] = depth
        print("  + " + bid + " depth " + depth["d"] + (" / " + depth["m"] if "m" in depth else ""))
    # A sequence takes the depth of each of its images (src/components/Universe.tsx draws them one by one).
    DATA.write_text(json.dumps(data, indent=1, ensure_ascii=False) + "\n")
    print("  = src/data/universes.generated.json")


if __name__ == "__main__":
    main()
