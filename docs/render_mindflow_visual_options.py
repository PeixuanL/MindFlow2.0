from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parent
W, H = 390, 844
S = 1

FONT_REGULAR = "/System/Library/Fonts/STHeiti Light.ttc"
FONT_BOLD = "/System/Library/Fonts/STHeiti Medium.ttc"


def font(size, bold=False):
    return ImageFont.truetype(FONT_BOLD if bold else FONT_REGULAR, size * S)


def rect(draw, xy, fill, radius=16, outline=None, width=1):
    xy = tuple(int(v) for v in xy)
    draw.rounded_rectangle(xy, radius=radius * S, fill=fill, outline=outline, width=width * S)


def shadowed_box(base, xy, fill, radius=18, shadow=(28, 44, 41, 26), offset=(0, 18), blur=34, outline=None):
    x1, y1, x2, y2 = [int(v) for v in xy]
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)
    ld.rounded_rectangle(
        (x1 + offset[0] * S, y1 + offset[1] * S, x2 + offset[0] * S, y2 + offset[1] * S),
        radius=radius * S,
        fill=shadow,
    )
    layer = layer.filter(ImageFilter.GaussianBlur(blur * S))
    base.alpha_composite(layer)
    d = ImageDraw.Draw(base)
    rect(d, xy, fill, radius, outline)


def text(draw, xy, value, fill, size, bold=False, spacing=8, max_width=None, line_height=1.35):
    f = font(size, bold)
    if not max_width:
        draw.text((xy[0] * S, xy[1] * S), value, fill=fill, font=f)
        return xy[1] + size
    lines = []
    current = ""
    for char in value:
        trial = current + char
        if char == "\n":
            lines.append(current)
            current = ""
        elif draw.textlength(trial, font=f) <= max_width * S:
            current = trial
        else:
            lines.append(current)
            current = char
    if current:
        lines.append(current)
    y = xy[1] * S
    for line in lines:
        draw.text((xy[0] * S, y), line, fill=fill, font=f)
        y += int(size * S * line_height) + spacing
    return y // S


def button(draw, xy, label, fill, fg, radius=10):
    rect(draw, xy, fill, radius)
    f = font(14, True)
    tw = draw.textlength(label, font=f)
    x1, y1, x2, y2 = xy
    bbox = f.getbbox(label)
    th = bbox[3] - bbox[1]
    draw.text(((x1 + x2) * S / 2 - tw / 2, (y1 + y2) * S / 2 - th / 2 - 2), label, fill=fg, font=f)


def status_bar(draw, dark=True):
    color = (36, 42, 40, 218) if dark else (255, 253, 248, 226)
    text(draw, (22, 9), "9:41", color, 12, True)
    x = 332
    draw.ellipse((x * S, 14 * S, (x + 6) * S, 20 * S), fill=color)
    draw.rounded_rectangle(((x + 13) * S, 14 * S, (x + 29) * S, 21 * S), radius=4 * S, outline=color, width=1 * S)
    draw.rounded_rectangle(((x + 38) * S, 13 * S, (x + 58) * S, 22 * S), radius=3 * S, outline=color, width=1 * S)
    draw.rectangle(((x + 41) * S, 15 * S, (x + 52) * S, 20 * S), fill=color)


def nav(draw, brand_color, chip_fill, chip_fg, dark=True, chip="今日"):
    fg = (31, 37, 36, 255) if dark else (255, 253, 248, 255)
    rect(draw, (20, 52, 48, 80), brand_color, 8)
    text(draw, (29, 58), "M", (255, 255, 255, 255) if dark else (37, 43, 40, 255), 13, True)
    text(draw, (58, 56), "MindFlow", fg, 15, True)
    rect(draw, (310, 52, 370, 80), chip_fill, 14)
    f = font(12, True)
    tw = draw.textlength(chip, font=f)
    draw.text(((340 * S) - tw / 2, 59 * S), chip, fill=chip_fg, font=f)


def make_base(bg):
    img = Image.new("RGBA", (W, H), bg)
    d = ImageDraw.Draw(img)
    rect(d, (0, 0, 390, 844), bg, 32, outline=(20, 28, 26, 35))
    return img, d


def option_a():
    img, d = make_base((246, 247, 243, 255))
    status_bar(d)
    nav(d, (36, 90, 79, 255), (228, 235, 227, 255), (53, 84, 79, 255))
    text(d, (20, 128), "先不用想清楚", (31, 37, 36, 255), 34, True, max_width=260, line_height=1.16)
    text(d, (20, 218), "想到什么都可以先放在这里。", (97, 112, 107, 255), 16)
    shadowed_box(img, (20, 282, 370, 546), (255, 254, 250, 255), 18, outline=(220, 226, 220, 255))
    text(d, (36, 303), "记一笔", (38, 49, 47, 255), 13, True)
    text(d, (252, 303), "其他想法都还在", (105, 116, 111, 255), 12)
    text(d, (36, 338), "牙医还没约，周末整理房间，保险那个事也要看，小王消息没回，论文材料有点烦...", (43, 52, 49, 255), 15, max_width=314, line_height=1.58)
    button(d, (32, 482, 358, 528), "帮我捋一捋", (36, 90, 79, 255), (255, 255, 255, 255))
    shadowed_box(img, (20, 598, 370, 812), (255, 255, 255, 255), 18, shadow=(47, 70, 63, 20), offset=(0, 12), blur=24, outline=(223, 229, 222, 255))
    text(d, (36, 618), "也许可以先看这个", (89, 112, 106, 255), 12, True)
    text(d, (36, 649), "给牙医打电话预约", (32, 41, 40, 255), 21, True)
    text(d, (36, 686), "它比较清楚，不需要一次处理太多。", (100, 115, 111, 255), 13, max_width=302, line_height=1.5)
    button(d, (36, 748, 190, 792), "看一下", (237, 243, 236, 255), (37, 79, 72, 255))
    button(d, (202, 748, 354, 792), "先不管", (246, 247, 243, 255), (104, 116, 111, 255))
    img.save(ROOT / "mindflow-visual-option-a.png")


def option_b():
    img, d = make_base((245, 242, 234, 255))
    status_bar(d)
    shadowed_box(img, (14, 46, 376, 344), (37, 43, 40, 255), 24, shadow=(41, 41, 34, 40), offset=(0, 14), blur=30)
    nav(d, (216, 169, 74, 255), (62, 68, 64, 255), (231, 223, 210, 255), dark=False, chip="已记录 5 条")
    text(d, (32, 134), "先不用想清楚", (255, 253, 247, 255), 31, True, max_width=245, line_height=1.14)
    text(d, (32, 220), "想到什么都可以先放在这里。整理的事交给下一步。", (200, 210, 198, 255), 15, max_width=292, line_height=1.55)
    shadowed_box(img, (28, 300, 362, 526), (255, 254, 249, 255), 20, shadow=(41, 41, 34, 36), offset=(0, 16), blur=32, outline=(230, 225, 214, 255))
    text(d, (46, 322), "也许可以先看这个", (123, 105, 60, 255), 12, True)
    text(d, (46, 354), "给牙医打电话预约", (37, 43, 40, 255), 22, True)
    text(d, (46, 394), "这件事边界最清楚，处理完会立刻少一点牵挂。", (108, 109, 101, 255), 13, max_width=292, line_height=1.5)
    button(d, (46, 466, 190, 510), "看一下", (37, 43, 40, 255), (255, 254, 250, 255))
    button(d, (202, 466, 344, 510), "先不管", (240, 238, 230, 255), (109, 107, 97, 255))
    shadowed_box(img, (28, 550, 362, 704), (255, 254, 250, 255), 20, shadow=(41, 41, 34, 18), offset=(0, 8), blur=20, outline=(225, 221, 210, 255))
    text(d, (46, 572), "继续放进来", (37, 43, 40, 255), 13, True)
    text(d, (230, 572), "其他想法都还在", (103, 105, 97, 255), 12)
    for y, w in [(622, 292), (648, 230), (674, 268)]:
        rect(d, (46, y, 46 + w, y + 10), (228, 224, 213, 255), 5)
    button(d, (28, 754, 362, 804), "帮我捋一捋", (216, 169, 74, 255), (37, 43, 40, 255))
    img.save(ROOT / "mindflow-visual-option-b.png")


def option_c():
    img, d = make_base((248, 245, 247, 255))
    status_bar(d)
    nav(d, (138, 93, 111, 255), (236, 228, 232, 255), (114, 82, 99, 255))
    shadowed_box(img, (18, 110, 372, 520), (255, 253, 252, 255), 22, shadow=(101, 75, 88, 28), offset=(0, 14), blur=32, outline=(230, 221, 226, 255))
    text(d, (38, 138), "先不用想清楚", (48, 39, 44, 255), 32, True)
    text(d, (38, 194), "想到什么都可以先放在这里。", (116, 102, 109, 255), 15)
    rect(d, (38, 242, 352, 384), (251, 247, 249, 255), 18, outline=(234, 223, 229, 255))
    text(d, (54, 265), "牙医还没约，周末整理房间，保险那个事也要看，小王消息没回，论文材料有点烦...", (76, 66, 72, 255), 14, max_width=282, line_height=1.58)
    button(d, (38, 430, 352, 476), "帮我捋一捋", (138, 93, 111, 255), (255, 255, 255, 255))
    shadowed_box(img, (18, 548, 372, 748), (255, 253, 252, 255), 22, shadow=(101, 75, 88, 22), offset=(0, 10), blur=24, outline=(230, 221, 226, 255))
    text(d, (38, 570), "也许可以先看这个", (138, 93, 111, 255), 12, True)
    text(d, (38, 602), "给牙医打电话预约", (48, 39, 44, 255), 21, True)
    text(d, (38, 640), "可以只看这一件。其他想法都还在。", (116, 102, 109, 255), 13, max_width=292, line_height=1.5)
    button(d, (38, 704, 190, 732), "看一下", (239, 231, 235, 255), (109, 75, 90, 255), 9)
    button(d, (202, 704, 352, 732), "先不管", (248, 243, 245, 255), (127, 114, 120, 255), 9)
    rect(d, (18, 776, 372, 822), (255, 253, 252, 255), 16, outline=(231, 223, 227, 255))
    text(d, (36, 790), "5 条 已放好", (48, 39, 44, 255), 13, True)
    text(d, (230, 790), "不用现在整理完", (116, 102, 109, 255), 12)
    img.save(ROOT / "mindflow-visual-option-c.png")


if __name__ == "__main__":
    option_a()
    option_b()
    option_c()
