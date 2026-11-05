"""產生商店截圖用的假縮圖（避免截圖依賴網路）。

需要 Pillow：pip install pillow
輸出：store/screens/thumbs/t1..t4.png（152x86，2x 顯示尺寸）
"""

from pathlib import Path

from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "store" / "screens" / "thumbs"
SIZE = (152, 86)

PALETTE = [
    ((32, 78, 121), (12, 32, 56)),
    ((86, 52, 120), (30, 20, 52)),
    ((140, 84, 34), (52, 30, 14)),
    ((24, 96, 92), (10, 38, 38)),
]


def gradient(size, top, bottom):
    img = Image.new("RGB", size)
    px = img.load()
    w, h = size
    for y in range(h):
        t = y / max(1, h - 1)
        row = tuple(round(top[i] + (bottom[i] - top[i]) * t) for i in range(3))
        for x in range(w):
            px[x, y] = row
    return img


def make(index, colors):
    img = gradient(SIZE, *colors).convert("RGBA")
    d = ImageDraw.Draw(img, "RGBA")
    w, h = SIZE

    # 斜向裝飾
    d.polygon([(w * 0.55, h), (w, h * 0.35), (w, h), ], fill=(255, 255, 255, 18))
    d.polygon([(0, h * 0.75), (w * 0.38, h), (0, h)], fill=(0, 0, 0, 40))

    # 播放圖示
    cx, cy, r = w / 2, h / 2, h * 0.22
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(0, 0, 0, 60))
    d.polygon(
        [(cx - r * 0.32, cy - r * 0.45), (cx - r * 0.32, cy + r * 0.45), (cx + r * 0.5, cy)],
        fill=(255, 255, 255, 230),
    )
    img.convert("RGB").save(OUT / f"t{index + 1}.png")


OUT.mkdir(parents=True, exist_ok=True)
for i, colors in enumerate(PALETTE):
    make(i, colors)
print("已產生", len(PALETTE), "張縮圖 →", OUT)
