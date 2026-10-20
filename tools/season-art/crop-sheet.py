#!/usr/bin/env python3
"""Cuts the owner's Gemini season sheets (one card back, avatar and table per season) into the game's files.
Usage: python3 tools/season-art/crop-sheet.py   (the cards sit on top of the left edge of each table, so the tables are cropped inside it; paths below are the owner's uploads; run once, the results are committed)."""
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
SRC = '/root/.claude/uploads/e6cf8966-43a2-5750-87a3-1dc2b22b7d54/c0b677bf-image.jpg'
im = Image.open(SRC).convert('RGB'); K = im.size[0] / 2000
def box(b): return tuple(round(v * K) for v in b)

def card(b, out):
    c = im.crop(box(b)).convert('RGB')
    c = c.resize((750, 1050), Image.LANCZOS).convert('RGBA')
    m = Image.new('L', c.size, 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, 749, 1049), radius=34, fill=255); c.putalpha(m)
    c.save(out, quality=92, method=6)

def avatar(b, r_frac, out):
    a = im.crop(box(b)); s = max(a.size); sq = Image.new('RGB', (s, s)); sq.paste(a, ((s - a.width) // 2, (s - a.height) // 2))
    N = 512; sq = sq.resize((N, N), Image.LANCZOS)
    bg = ImageEnhance.Brightness(sq.filter(ImageFilter.GaussianBlur(28))).enhance(.6)
    m = Image.new('L', (N * 2, N * 2), 0); r = int(N * 2 * r_frac); ImageDraw.Draw(m).ellipse((N - r, N - r, N + r, N + r), fill=255); m = m.resize((N, N), Image.LANCZOS)
    disc = sq.convert('RGBA'); disc.putalpha(m); d = int(N * .92); disc = disc.resize((d, d), Image.LANCZOS)
    bg = bg.convert('RGBA'); bg.alpha_composite(disc, ((N - d) // 2, (N - d) // 2)); bg.convert('RGB').save(out, quality=92, method=6)

def table(b, out, banner):
    t = im.crop(box(b)); t.save(out, quality=90, method=6)
    t.crop((0, 40, t.width, 40 + int(t.width * .3))).resize((1000, 300), Image.LANCZOS).save(banner, quality=88, method=6)

card((48, 171, 511, 829), 'art/backs/ss2703-sakura.webp')
card((1042, 171, 1506, 830), 'art/backs/ss2705-deep.webp')
avatar((545, 168, 965, 592), .5, 'art/avatars/ss2703-kitsune.webp')
avatar((1538, 168, 1956, 592), .5, 'art/avatars/ss2705-octopus.webp')
table((516, 698, 956, 994), 'art/season-pass/ss2703/table.webp', 'art/season-pass/ss2703/banner.webp')
table((1512, 698, 1922, 994), 'art/season-pass/ss2705/table.webp', 'art/season-pass/ss2705/banner.webp')
