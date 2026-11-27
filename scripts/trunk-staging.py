"""
One staging for the two glass displays (Yoni, 27/11/2026: every trunk on exactly the same background, the same black
marble plinth and the same golden light from above, at the same size and the same place). The DFB-Pokal 2025 Display and
the World Cup Display were rendered with a camera at eye level, their plinth seen edge on: no crop can give them the plinth
of the others. So the display itself (real pixels of its four files, never generated) is set on the real staging of the
reference, the Butterfly Trunk (its closed image): its marble plinth, its wall and its light, at the same pixels.

    python3 -I scripts/trunk-staging.py <box> <folder of the box> <folder of the reference> <out folder>

writes closed.jpg, open.jpg (2048 px) and ouverture.mp4, fermeture.mp4 (1440 px, nearly lossless) in <out folder>, read
then by scripts/trunk-media.mjs as the files of the box. The originals are only read.

How, for each image and each frame of the films (the camera of the four files is fixed, frame 0 = the closed image, the
last frame = the open one):
  - the display is scaled and moved so that its base stands on the plinth of the reference, centred, as wide as the trunk
    of the reference (the opaque parts: the base, the inner frame, the cushion, the ring; edges snapped on the image);
  - around the glass hood (the whole region its glass sweeps in the films), its own background is kept, behind and through
    the glass, but brought to the background of the reference at low frequency (an additive, smooth correction): its glass,
    its edges and its reflections stay its own, and the region melts into the reference without a seam;
  - everywhere else, the reference: its wall, its light, its plinth; where its trunk would still show beside the display
    (two corners, the reflections of its copper in the marble), the trunk is filled from the wall and the marble around it
    (classical inpainting, staging pixels only);
  - the light of the films of the box (it changes as the glass rises) is carried to the reference: a smooth gain field
    measured on the background of each frame against the closed image, so that the films start and end on the images;
  - where the base meets the marble: a soft contact shadow and its reflection (the base itself, mirrored and faint), as the
    marble of the reference reflects the copper of its trunk.
"""
import subprocess
import sys

import cv2
import numpy as np

STILL = 2048
FILM = 1440
LOW = 512
GAIN = 180

# The reference (scripts/trunk-media.mjs, REFERENCE: the Butterfly Trunk), shares of its square.
REFERENCE = {
    # Its trunk and the reflections of its copper in the marble: removed where the display does not cover them.
    "trunk": [
        (0.193, 0.548), (0.204, 0.531), (0.233, 0.519), (0.27, 0.512), (0.585, 0.443), (0.70, 0.49), (0.786, 0.526),
        (0.800, 0.536), (0.806, 0.552), (0.806, 0.705), (0.80, 0.728), (0.60, 0.790), (0.52, 0.796), (0.50, 0.805), (0.47, 0.810), (0.36, 0.810),
        (0.325, 0.795), (0.25, 0.757), (0.212, 0.737), (0.193, 0.728),
    ],
    # The top of its marble plinth (an ellipse: centre, half axes), where a display stands and reflects, and the height of
    # its side under the top.
    "plinth": (0.495, 0.69, 0.339, 0.12),
    "side": 0.055,
    # The middle of its plinth (trunk-media measures 0.4952).
    "centre": 0.495,
}

# Each display, in shares of its own square: the three steps of its base (left, right, top, bottom; from the bottom one),
# its inner frame with its cushion and its ring (a polygon), the glass closed (a box) and the bottom of the glass raised
# (the open image), the width its base takes on the plinth, the height of the bottom of its base on the plinth.
BOXES = {
    "dfb-pokal-2025-display": {
        "base": [(0.240, 0.765, 0.7425, 0.784), (0.2475, 0.7575, 0.659, 0.745), (0.257, 0.748, 0.645, 0.661)],
        "inner": [
            (0.3115, 0.657), (0.3105, 0.55), (0.318, 0.50), (0.327, 0.46), (0.337, 0.43), (0.349, 0.414), (0.442, 0.412),
            (0.446, 0.39), (0.46, 0.373), (0.50, 0.364), (0.54, 0.373), (0.556, 0.39), (0.563, 0.412), (0.671, 0.412),
            (0.683, 0.43), (0.693, 0.46), (0.703, 0.50), (0.709, 0.55), (0.709, 0.657),
        ],
        "glass": (0.278, 0.730, 0.293, 0.660),
        "raised": 0.515,
        "width": 0.593,
        "at": 0.795,
    },
    "world-cup-display": {
        "base": [(0.2125, 0.790, 0.684, 0.730), (0.2225, 0.780, 0.597, 0.686), (0.233, 0.770, 0.5825, 0.598)],
        "inner": [
            (0.299, 0.596), (0.300, 0.52), (0.301, 0.48), (0.3025, 0.45), (0.318, 0.42), (0.330, 0.40), (0.336, 0.389),
            (0.341, 0.379), (0.348, 0.371), (0.418, 0.369), (0.418, 0.33), (0.43, 0.30), (0.46, 0.282), (0.50, 0.276),
            (0.54, 0.282), (0.57, 0.30), (0.585, 0.33), (0.585, 0.369), (0.650, 0.371), (0.656, 0.385), (0.662, 0.40),
            (0.683, 0.43), (0.698, 0.45), (0.701, 0.48), (0.705, 0.52), (0.709, 0.596),
        ],
        "glass": (0.255, 0.750, 0.196, 0.592),
        "raised": 0.39,
        "width": 0.593,
        "at": 0.795,
    },
}


def luminance(img: np.ndarray) -> np.ndarray:
    return img[..., 0] * 0.114 + img[..., 1] * 0.587 + img[..., 2] * 0.299  # BGR


def snap(gray: np.ndarray, base: list) -> list:
    """The edges of the steps of the base, snapped to the strongest edge of the image (within 0.6 % of the given ones)."""
    n = gray.shape[0]
    g = cv2.GaussianBlur(gray, (0, 0), 1.0)
    out = []
    for i, (x0, x1, y0, y1) in enumerate(base):
        rows = slice(int((y0 + 0.25 * (y1 - y0)) * n), int((y1 - 0.25 * (y1 - y0)) * n))
        profile = g[rows].mean(axis=0)
        grad = np.abs(np.roll(profile, -1) - np.roll(profile, 1))

        def best(v: float, prof: np.ndarray) -> float:
            w = int(0.006 * n)
            c = int(round(v * n))
            seg = prof[c - w:c + w + 1]
            k = int(np.argmax(seg))
            if 0 < k < len(seg) - 1:  # sub-pixel (the top of a parabola)
                a, b, d = seg[k - 1], seg[k], seg[k + 1]
                if a - 2 * b + d < 0:
                    k += 0.5 * (a - d) / (a - 2 * b + d)
            return (c - w + k) / n

        nx0, nx1 = best(x0, grad), best(x1, grad)
        ny1 = y1
        if i == 0:  # the bottom of the base, on the plinth
            cols = slice(int((x0 + 0.15 * (x1 - x0)) * n), int((x1 - 0.15 * (x1 - x0)) * n))
            vprof = g[:, cols].mean(axis=1)
            ny1 = best(y1, np.abs(np.roll(vprof, -1) - np.roll(vprof, 1)))
        out.append((nx0, nx1, y0, ny1))
    return out


def opaque(box: dict, base: list, n: int) -> np.ndarray:
    """The opaque parts of the display (base, inner frame, cushion, ring), anti-aliased, at n px (its own square)."""
    k = 4
    m = np.zeros((n * k, n * k), np.uint8)
    r = int(0.0025 * n * k)
    for x0, x1, y0, y1 in base:
        a, b, c, d = int(x0 * n * k), int(x1 * n * k), int(y0 * n * k), int(y1 * n * k)
        cv2.rectangle(m, (a + r, c), (b - r, d), 255, -1)
        cv2.rectangle(m, (a, c + r), (b, d - r), 255, -1)
        for cx, cy in ((a + r, c + r), (b - r, c + r), (a + r, d - r), (b - r, d - r)):
            cv2.circle(m, (cx, cy), r, 255, -1, cv2.LINE_AA)
    poly = (np.array(box["inner"]) * n * k).astype(np.int32)
    cv2.fillPoly(m, [poly], 255, cv2.LINE_AA)
    return cv2.resize(m, (n, n), interpolation=cv2.INTER_AREA).astype(np.float32) / 255.0


def frames(path: str, n: int):
    """The frames of a film, BGR uint8, at n px."""
    p = subprocess.Popen(["ffmpeg", "-loglevel", "error", "-i", path, "-vf", f"scale={n}:{n}:flags=lanczos", "-f", "rawvideo", "-pix_fmt", "bgr24", "-"], stdout=subprocess.PIPE)
    size = n * n * 3
    try:
        while True:
            buf = p.stdout.read(size)
            if len(buf) < size:
                break
            yield np.frombuffer(buf, np.uint8).reshape(n, n, 3)
    finally:  # (also when only its first frame is wanted)
        p.stdout.close()
        p.kill()
        p.wait()


def sweep(path: str, n: int = 720) -> np.ndarray:
    """The region the glass sweeps in the opening (what changes beyond the slow change of the light), filled, at n px."""
    first = None
    acc = np.zeros((n, n), np.uint8)
    for f in frames(path, n):
        L = luminance(f.astype(np.float32))
        hp = L - cv2.GaussianBlur(L, (0, 0), 25)
        if first is None:
            first = hp
            continue
        acc |= (np.abs(hp - first) > 12).astype(np.uint8)
    acc = cv2.morphologyEx(acc, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    acc = cv2.morphologyEx(acc, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (31, 31)))
    count, labels, stats, _ = cv2.connectedComponentsWithStats(acc)
    keep = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    blob = (labels == keep).astype(np.uint8)
    # Its holes filled (the opaque parts inside it).
    flood = blob.copy()
    cv2.floodFill(flood, np.zeros((n + 2, n + 2), np.uint8), (0, 0), 1)
    blob = blob | (1 - flood)
    # Without the thin trails of the dust that drifts beside the display (they reach the plinth: its marble must stay).
    blob = cv2.morphologyEx(blob, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (int(0.07 * n) | 1, int(0.07 * n) | 1)))
    count, labels, stats, _ = cv2.connectedComponentsWithStats(blob)
    blob = (labels == 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))).astype(np.uint8)
    blob = cv2.dilate(blob, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (int(0.024 * n) | 1, int(0.024 * n) | 1)))
    return blob.astype(np.float32)


def clean_reference(img: np.ndarray) -> np.ndarray:
    """
    The reference without its trunk, where it could still show beside a display: the wall around its two upper corners
    (Telea: a smooth wall), the right end of the top of its plinth (its left end, mirrored and stretched column by column so
    that the rims meet: the trunk covers the right end but not the left one), the strip of marble in front of it (its other
    half, mirrored about the middle of the plinth: the plinth is round, its rim symmetric), above the rim.
    """
    n = img.shape[0]
    hole = np.zeros((n, n), np.uint8)
    cv2.fillPoly(hole, [(np.array(REFERENCE["trunk"]) * n).astype(np.int32)], 255)
    out = cv2.inpaint(np.clip(img, 0, 255).astype(np.uint8), hole, 6, cv2.INPAINT_TELEA).astype(np.float32)
    cx, cy, a, b = REFERENCE["plinth"]
    xs = (np.arange(n, dtype=np.float32) + 0.5) / n
    ys = (np.arange(n, dtype=np.float32) + 0.5) / n
    X, Y = np.meshgrid(xs, ys)
    inside = hole.astype(np.float32) / 255

    def blend(mask: np.ndarray, mapx: np.ndarray, mapy: np.ndarray) -> None:
        nonlocal out
        patch = cv2.remap(img, mapx * n - 0.5, mapy * n - 0.5, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
        m = cv2.GaussianBlur(mask * inside, (0, 0), 1.5)[..., None]
        out = m * patch + (1 - m) * out

    # The right end of the plinth top, from its left end (shifted outwards, off the left corner of the trunk).
    shift = 0.014
    d = np.clip(X - cx, 0, a * 0.999)
    d2 = np.clip(d + shift, 0, a * 0.999)
    ratio = np.sqrt(np.maximum(1 - (d2 / a) ** 2, 1e-3)) / np.sqrt(np.maximum(1 - (d / a) ** 2, 1e-3))
    right = ((X >= 0.779) & (Y >= 0.60)).astype(np.float32)
    blend(right, (cx - d2).astype(np.float32), (cy + (Y - cy) * ratio).astype(np.float32))
    # The strip of marble in front of the trunk, from the other half of the plinth, above its front rim.
    rim = cy + b * np.sqrt(np.maximum(1 - ((X - cx) / a) ** 2, 0))
    front = ((X >= 0.33) & (X <= 0.50) & (Y >= 0.78) & (Y <= rim - 0.0015)).astype(np.float32)
    blend(front, (2 * cx - X).astype(np.float32), Y.astype(np.float32))
    return out


def soft_gain(cur: np.ndarray, ref: np.ndarray, valid: np.ndarray) -> np.ndarray:
    """The smooth change of the light between two images (a gain on the luminance), from the pixels of the background."""
    s1, s2 = 0.05 * GAIN, 0.16 * GAIN
    a = cv2.GaussianBlur(luminance(cur) * valid, (0, 0), s1)
    b = cv2.GaussianBlur(luminance(ref) * valid, (0, 0), s1)
    w = cv2.GaussianBlur(valid, (0, 0), s1)
    r = np.where(b > 1e-3, a / np.maximum(b, 1e-3), 1.0)
    conf = np.clip(w / 0.35, 0, 1)
    wide = cv2.GaussianBlur(r * conf, (0, 0), s2) / np.maximum(cv2.GaussianBlur(conf, (0, 0), s2), 1e-4)
    g = conf * r + (1 - conf) * wide
    return cv2.GaussianBlur(np.clip(g, 0.5, 2.0), (0, 0), 0.02 * GAIN).astype(np.float32)


class Staging:
    def __init__(self, slug: str, src: str, ref: str):
        self.box = BOXES[slug]
        self.src = src
        closed = cv2.imread(src + "/closed.jpg").astype(np.float32)
        opened = cv2.imread(src + "/open.jpg").astype(np.float32)
        refimg = cv2.imread(ref + "/closed.jpg").astype(np.float32)
        self.stills = {k: cv2.resize(v, (STILL, STILL), interpolation=cv2.INTER_AREA) for k, v in (("closed", closed), ("open", opened))}
        refimg = cv2.resize(refimg, (STILL, STILL), interpolation=cv2.INTER_AREA)
        # Its base snapped on its closed image.
        self.base = snap(luminance(self.stills["closed"]), self.box["base"])
        x0, x1, _, yb = self.base[0]
        self.scale = self.box["width"] / (x1 - x0)
        self.anchor = ((x0 + x1) / 2, yb)
        # The reference without its trunk (only what can still show matters: its corners, its reflections).
        self.ref = clean_reference(refimg)
        # The glass region, from the opening; by the base, only right above its plate under the glass (the back of the plinth
        # of the reference shows on both sides of it).
        self.region = sweep(src + "/ouverture.mp4")
        rn = self.region.shape[0]
        plate = min(y0 for _, _, y0, _ in self.base)
        gx0, gx1 = self.box["glass"][:2]
        self.region[int((plate - 0.01) * rn):, : int((gx0 - 0.004) * rn)] = 0
        self.region[int((plate - 0.01) * rn):, int((gx1 + 0.004) * rn):] = 0
        self.region[int((plate + 0.02) * rn):, :] = 0
        # The background of the box at low frequency (behind its glass: the open image where the glass has left).
        lo = lambda im: cv2.resize(im, (LOW, LOW), interpolation=cv2.INTER_AREA)
        gx0, gx1, gy0, gy1 = self.box["glass"]
        data = lo(self.stills["closed"]).copy()
        gopen = cv2.resize(soft_gain(lo(self.stills["open"]), lo(self.stills["closed"]), self.valid(LOW)), (LOW, LOW))
        rows = slice(int(max(gy0, self.box["raised"]) * LOW), int(gy1 * LOW))
        cols = slice(int(gx0 * LOW), int(gx1 * LOW))
        data[rows, cols] = lo(self.stills["open"])[rows, cols] / gopen[rows, cols, None]
        omask = (cv2.dilate(opaque(self.box, self.base, LOW), np.ones((7, 7), np.uint8)) > 0.02).astype(np.uint8) * 255
        filled = cv2.inpaint(np.clip(data, 0, 255).astype(np.uint8), omask, 5, cv2.INPAINT_TELEA)
        low_box = cv2.GaussianBlur(cv2.medianBlur(filled, 9).astype(np.float32), (0, 0), 0.025 * LOW)
        low_ref = cv2.GaussianBlur(cv2.medianBlur(lo(self.ref).astype(np.uint8), 9).astype(np.float32), (0, 0), 0.025 * LOW)
        self.correction = low_ref - self.warp(low_box, LOW, cv2.BORDER_REPLICATE)
        self.cache = {}

    def matrix(self, n: int) -> np.ndarray:
        """From the square of the box to the square of the reference (pixels at n)."""
        s = self.scale
        ax, ay = self.anchor
        bx, by = REFERENCE["centre"], self.box["at"]
        return np.float32([[s, 0, (bx - s * ax) * n], [0, s, (by - s * ay) * n]])

    def warp(self, img: np.ndarray, n: int, border=cv2.BORDER_CONSTANT, interp=cv2.INTER_LINEAR) -> np.ndarray:
        return cv2.warpAffine(img, self.matrix(n), (n, n), flags=interp, borderMode=border)

    def valid(self, n: int) -> np.ndarray:
        """The background of the box, to measure its light: off the display, its glass, its plinth and its reflection."""
        v = np.ones((n, n), np.float32)
        region = cv2.resize(self.region, (n, n), interpolation=cv2.INTER_NEAREST) if hasattr(self, "region") else np.zeros((n, n), np.float32)
        busy = np.maximum(region, (opaque(self.box, self.base, n) > 0.02).astype(np.float32))
        busy = cv2.dilate(busy, np.ones((max(3, int(0.03 * n)),) * 2, np.uint8))
        v[busy > 0] = 0
        top = min(y0 for _, _, y0, _ in self.box["base"]) - 0.02
        v[int(top * n):, int(0.12 * n):int(0.88 * n)] = 0
        return v

    def layers(self, n: int) -> dict:
        """What does not change from one frame to the next, at n px (in the square of the reference)."""
        if n in self.cache:
            return self.cache[n]
        o = self.warp(opaque(self.box, self.base, n), n)
        o = cv2.GaussianBlur(o, (0, 0), 0.4 * n / 1440)
        w = self.warp(cv2.resize(self.region, (n, n), interpolation=cv2.INTER_LINEAR), n)
        w = cv2.GaussianBlur(w, (0, 0), 0.01 * n)
        ref = cv2.resize(self.ref, (n, n), interpolation=cv2.INTER_AREA)
        corr = cv2.resize(self.correction, (n, n), interpolation=cv2.INTER_CUBIC)
        # The plinth of the reference, where the base stands: its contact shadow and the place of its reflection.
        cx, cy, a, b = REFERENCE["plinth"]
        k = 4
        e = np.zeros((n * k, n * k), np.uint8)
        cv2.ellipse(e, (int(cx * n * k), int(cy * n * k)), (int(a * n * k), int(b * n * k)), 0, 0, 360, 255, -1, cv2.LINE_AA)
        # (and its whole silhouette, its side too: under the corners of a base wider than the front of the top)
        p = e.copy()
        side = int(REFERENCE["side"] * n * k)
        cv2.ellipse(p, (int(cx * n * k), int(cy * n * k) + side), (int(a * n * k), int(b * n * k)), 0, 0, 360, 255, -1, cv2.LINE_AA)
        cv2.rectangle(p, (int((cx - a) * n * k), int(cy * n * k)), (int((cx + a) * n * k), int(cy * n * k) + side), 255, -1)
        e = cv2.resize(e, (n, n), interpolation=cv2.INTER_AREA).astype(np.float32) / 255
        p = cv2.resize(p, (n, n), interpolation=cv2.INTER_AREA).astype(np.float32) / 255
        s = self.scale
        x0, x1, _, _ = self.base[0]
        X0 = REFERENCE["centre"] + s * (x0 - self.anchor[0])
        X1 = REFERENCE["centre"] + s * (x1 - self.anchor[0])
        yb = self.box["at"]
        xs = (np.arange(n) + 0.5) / n
        ys = (np.arange(n) + 0.5) / n
        edge = 0.006
        hw = np.clip((xs - X0) / edge + 0.5, 0, 1) * np.clip((X1 - xs) / edge + 0.5, 0, 1)
        d = ys - yb
        below = d >= 0
        shadow = np.where(below, np.exp(-np.maximum(d, 0) / 0.0065), 0.0)[:, None] * hw[None, :] * p
        fall = np.where(below, np.exp(-np.maximum(d, 0) / 0.011), 0.0)[:, None] * hw[None, :] * e
        # The mirror about the bottom of the base.
        my = np.clip(2 * yb * n - (np.arange(n) + 0.5) - 0.5, 0, n - 1).astype(np.float32)
        mapy = np.repeat(my[:, None], n, axis=1)
        mapx = np.repeat(np.arange(n, dtype=np.float32)[None, :], n, axis=0)
        self.cache[n] = {"o": o[..., None], "w": w[..., None], "ref": ref, "corr": corr, "shadow": shadow[..., None], "fall": fall[..., None], "mapx": mapx, "mapy": mapy, "valid": self.valid(GAIN)}
        return self.cache[n]

    def compose(self, img: np.ndarray, closed: np.ndarray) -> np.ndarray:
        """One image (or frame) of the box, BGR at n px, set on the staging; `closed`: its closed image at the same size."""
        n = img.shape[0]
        L = self.layers(n)
        small = lambda im: cv2.resize(im.astype(np.float32), (GAIN, GAIN), interpolation=cv2.INTER_AREA)
        g = soft_gain(small(img), small(closed), L["valid"])
        g = cv2.resize(self.warp(g, GAIN, cv2.BORDER_REPLICATE), (n, n), interpolation=cv2.INTER_CUBIC)[..., None]
        moved = self.warp(img.astype(np.float32), n, cv2.BORDER_REPLICATE, cv2.INTER_LANCZOS4)
        bg = L["ref"] * g * (1 - 0.5 * L["shadow"])
        inner = moved + L["corr"] * g
        layer = L["w"] * inner + (1 - L["w"]) * bg
        mirror = cv2.remap(moved * L["o"], L["mapx"], L["mapy"], cv2.INTER_LINEAR)
        mirror = cv2.GaussianBlur(mirror, (0, 0), 1.2 * n / 1440)
        refl = 0.22 * L["fall"] * mirror
        layer = layer + refl * (1 - np.clip(layer, 0, 255) / 255)
        out = L["o"] * moved + (1 - L["o"]) * layer
        return np.clip(out + 0.5, 0, 255).astype(np.uint8)

    def film(self, name: str, out: str, closed: np.ndarray):
        enc = subprocess.Popen(
            ["ffmpeg", "-loglevel", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{FILM}x{FILM}", "-r", "24", "-i", "-",
             "-c:v", "libx264", "-preset", "medium", "-crf", "10", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out],
            stdin=subprocess.PIPE,
        )
        count = 0
        for f in frames(self.src + "/" + name, FILM):
            enc.stdin.write(self.compose(f, closed).tobytes())
            count += 1
        enc.stdin.close()
        if enc.wait() != 0:
            raise SystemExit("ffmpeg failed: " + out)
        return count


def main() -> None:
    slug, src, ref, out = sys.argv[1:5]
    st = Staging(slug, src, ref)
    print(f"  {slug}: base {[[round(v, 4) for v in r] for r in st.base]}, scale {st.scale:.4f}")
    closed = st.stills["closed"]
    cv2.imwrite(out + "/closed.jpg", st.compose(closed, closed), [cv2.IMWRITE_JPEG_QUALITY, 97])
    cv2.imwrite(out + "/open.jpg", st.compose(st.stills["open"], closed), [cv2.IMWRITE_JPEG_QUALITY, 97])
    if "--stills" in sys.argv:
        return
    # The light of the films is measured against the first frame of the opening (the closed image, in the film).
    first = next(frames(src + "/ouverture.mp4", FILM)).copy()
    for name in ("ouverture.mp4", "fermeture.mp4"):
        n = st.film(name, out + "/" + name, first)
        print(f"  {slug}: {name} {n} frames")


if __name__ == "__main__":
    main()
