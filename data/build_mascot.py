"""Sezi maskotunun kare paketinden web şeritlerini üretir.

Girdi: tasarımcının `maskot/` klasörü (manifest.json + kareler/). Çıktı:
- apps/web/public/maskot/<hareket>.webp : hareketin kareleri yan yana tek satır (288 x 224 hücre)
- apps/web/public/maskot/poz.webp        : ilk boyamada görünen oturan poz
- apps/web/src/components/ask/mascot.json: hücre boyu, kare sıraları ve süreler (oynatıcı bunu okur)

Sola bakan kareler sağa bakanların aynası olduğu için heterokromi ters çıkıyor (yeşil göz kedinin sağ gözü,
mavi sol gözü). Aynalanmış karelerde yeşil ve mavi iris tonları yer değiştirir.

Kullanım (Pillow: data/README.md'deki .venv): data/.venv/Scripts/python -I data/build_mascot.py <maskot klasörü>
"""

import json
import sys
from pathlib import Path

from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "apps/web/public/maskot"
DATA = ROOT / "apps/web/src/components/ask/mascot.json"

# Aynalanmış (sola bakan) kareler: dosya adı -> 1 tabanlı kare aralığı.
MIRRORED = {"kalk_sol": range(9, 17), "yurume_sol": range(1, 9)}
# kalk_sol 8 dönüş karesi: iki göz de mavi; yalnız uzaktaki (soldaki, x < 110) göz yeşile döner.
FAR_EYE_ONLY = {("kalk_sol", 8): 110}
# Paylaşılan şeritler: otur_* kalk_* karelerini ters sırada oynatır.
STRIP_OF = {"otur_sag": "kalk_sag", "otur_sol": "kalk_sol"}
QUALITY = 90  # WebP: 4x büyütmede PNG'den ayırt edilmiyor, alfa kayıpsız kalır.


def swap_iris(frame: Image.Image, max_x: int | None = None) -> Image.Image:
    """Yeşil ve mavi iris piksellerinin tonunu değiştirir; parlaklık ve doygunluk korunur."""
    h, s, v = frame.convert("RGB").convert("HSV").split()
    alpha = frame.getchannel("A")

    def band(img: Image.Image, lo: int, hi: int) -> Image.Image:
        return img.point(lambda x: 255 if lo <= x <= hi else 0)

    iris = ImageChops.multiply(ImageChops.multiply(band(s, 91, 255), band(v, 31, 255)), band(alpha, 1, 255))
    if max_x is not None:
        region = Image.new("L", frame.size, 0)
        region.paste(255, (0, 0, max_x, frame.height))
        iris = ImageChops.multiply(iris, region)
    # PIL HSV tonu 0-255: yeşil ~76, mavi ~141 (oturan pozdan ölçüldü).
    green = ImageChops.multiply(iris, band(h, 50, 107))
    blue = ImageChops.multiply(iris, band(h, 122, 158))
    shift = 141 - 76
    hue = Image.composite(h.point(lambda x: min(255, x + shift)), h, green)
    hue = Image.composite(h.point(lambda x: max(0, x - shift)), hue, blue)
    out = Image.merge("HSV", (hue, s, v)).convert("RGB").convert("RGBA")
    out.putalpha(alpha)
    return out


def main(src: Path) -> None:
    manifest = json.loads((src / "manifest.json").read_text(encoding="utf-8"))
    cell_w, cell_h = manifest["frameWidth"], manifest["frameHeight"]
    PUBLIC.mkdir(parents=True, exist_ok=True)

    strips: dict[str, int] = {}
    for name, action in manifest["actions"].items():
        strip = STRIP_OF.get(name, name)
        if strip in strips:
            continue
        frames = []
        for i, rel in enumerate(action["frames"], start=1):
            frame = Image.open(src / rel).convert("RGBA")
            if frame.size != (cell_w, cell_h):
                raise SystemExit(f"{rel}: {frame.size} beklenen {cell_w}x{cell_h}")
            if i in MIRRORED.get(strip, ()):
                frame = swap_iris(frame)
            elif (strip, i) in FAR_EYE_ONLY:
                frame = swap_iris(frame, FAR_EYE_ONLY[(strip, i)])
            frames.append(frame)
        sheet = Image.new("RGBA", (cell_w * len(frames), cell_h))
        for i, frame in enumerate(frames):
            sheet.paste(frame, (i * cell_w, 0))
        sheet.save(PUBLIC / f"{strip}.webp", "WEBP", quality=QUALITY, alpha_quality=100, method=6)
        strips[strip] = len(frames)
        print(f"{strip}: {len(frames)} kare, {(PUBLIC / f'{strip}.webp').stat().st_size // 1024} KB")

    Image.open(src / manifest["canonical"]).convert("RGBA").save(PUBLIC / "poz.webp", "WEBP", lossless=True, method=6)

    def seq(items):
        return [[x["frame"], x["durationMs"]] for x in items]

    out = {
        "cell": [cell_w, cell_h],
        "motionBounds": manifest["motionBounds"],
        "roaming": manifest["roaming"],
        "actions": {},
    }
    for name, a in manifest["actions"].items():
        entry = {"strip": STRIP_OF.get(name, name), "sequence": seq(a["sequence"])}
        for key in ("intro", "loop", "outro"):
            if key in a:
                entry[key] = seq(a[key])
        for key in ("safeLoopFrames", "staticFrame", "strideLogical", "cycleMs"):
            if key in a:
                entry[key] = a[key]
        out["actions"][name] = entry
    DATA.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"{DATA.relative_to(ROOT)} yazıldı")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    main(Path(sys.argv[1]))
