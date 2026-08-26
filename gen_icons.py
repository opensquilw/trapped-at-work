"""App icon for 打工仔失自由 / Trapped At Work.

Drawn in the same flat-mascot house style as the duck icons in
money-tracker-app/duck_icon.svg and sister-money-tracker-app/duck_tree_icon.svg:
  - thick uniform black ink outline
  - flat solid fills (no gradients, no shading, no highlights)
  - simple solid-black dot eyes
  - single flat-colour rounded-square background

Concept: the calendar itself is the mascot, grinning, with one day off circled in red.
"""
from PIL import Image, ImageDraw

BG = (240, 112, 96)
INK = (17, 17, 17)
WHITE = (255, 255, 255)
GOLD = (240, 173, 78)   # the duck-bill orange, reused for family continuity
RED = (226, 80, 72)


def ink_w(S, f=0.030):
    return max(2, round(S * f))


def make_icon(S, path, rounded=True):
    out = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(out)
    d.rounded_rectangle([0, 0, S, S], radius=S * 0.223 if rounded else 0, fill=BG + (255,))

    cx = S / 2
    w, h, top = S * 0.56, S * 0.50, S * 0.26
    left = cx - w / 2

    # hangers
    for hx in (-w * 0.25, w * 0.25):
        d.line([cx + hx, top - S * 0.07, cx + hx, top + S * 0.04],
               fill=INK, width=ink_w(S, 0.026))

    # calendar body
    d.rounded_rectangle([left, top, left + w, top + h], radius=S * 0.04,
                        fill=WHITE, outline=INK, width=ink_w(S))

    # gold header band
    band = top + h * 0.22
    d.rounded_rectangle([left, top, left + w, band], radius=S * 0.04,
                        fill=GOLD, corners=(True, True, False, False))
    d.line([left, band, left + w, band], fill=INK, width=ink_w(S, 0.018))

    # face
    eye_r = S * 0.024
    eye_y = top + h * 0.50
    for s in (-1, 1):
        ex = cx + s * w * 0.18
        d.ellipse([ex - eye_r, eye_y - eye_r, ex + eye_r, eye_y + eye_r], fill=INK)

    mw = w * 0.28
    my = top + h * 0.70
    d.arc([cx - mw / 2, my - S * 0.05, cx + mw / 2, my + S * 0.03],
          start=20, end=160, fill=INK, width=ink_w(S, 0.018))

    # the day off, circled in red
    r = S * 0.055
    ox, oy = cx + w * 0.26, top + h * 0.78
    d.ellipse([ox - r, oy - r, ox + r, oy + r], outline=RED, width=ink_w(S, 0.020))

    out.save(path)


make_icon(192, 'icons/icon-192.png')
make_icon(512, 'icons/icon-512.png')
make_icon(180, 'icons/apple-touch-icon.png', rounded=False)
print('icons generated')
