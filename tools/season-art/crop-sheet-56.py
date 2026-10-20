#!/usr/bin/env python3
"""Seasons 5 (Ancient Greece) and 6 (Dark Magic) from the owner's Gemini sheet (card back, avatar, table; run once, results committed).
Coordinates are on the sheet scaled to 2000 wide; the cards sit on top of the tables, so the tables are cropped below the cards."""
import importlib.util, sys
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
SRC = '/root/.claude/uploads/e6cf8966-43a2-5750-87a3-1dc2b22b7d54/099ca324-image.jpg'
im = Image.open(SRC).convert('RGB'); K = im.size[0] / 2000
def box(b): return tuple(round(v * K) for v in b)
def card(b, out):
    c = im.crop(box(b)).resize((750, 1050), Image.LANCZOS).convert('RGBA')
    m = Image.new('L', c.size, 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, 749, 1049), radius=34, fill=255); c.putalpha(m); c.save(out, quality=92, method=6)
def avatar(b, out, r_frac=.5):
    a = im.crop(box(b)); s = max(a.size); sq = Image.new('RGB', (s, s)); sq.paste(a, ((s - a.width) // 2, (s - a.height) // 2))
    N = 512; sq = sq.resize((N, N), Image.LANCZOS)
    bg = ImageEnhance.Brightness(sq.filter(ImageFilter.GaussianBlur(28))).enhance(.6)
    m = Image.new('L', (N * 2, N * 2), 0); r = int(N * 2 * r_frac); ImageDraw.Draw(m).ellipse((N - r, N - r, N + r, N + r), fill=255); m = m.resize((N, N), Image.LANCZOS)
    disc = sq.convert('RGBA'); disc.putalpha(m); d = int(N * .92); disc = disc.resize((d, d), Image.LANCZOS)
    bg = bg.convert('RGBA'); bg.alpha_composite(disc, ((N - d) // 2, (N - d) // 2)); bg.convert('RGB').save(out, quality=92, method=6)
def table(b, out, banner):
    t = im.crop(box(b)); t.save(out, quality=90, method=6)
    t.crop((0, 0, t.width, int(t.width * .3))).resize((1000, 300), Image.LANCZOS).save(banner, quality=88, method=6)
import os
for d in ('art/season-pass/ss2707', 'art/season-pass/ss2709'): os.makedirs(d, exist_ok=True)
card((80, 150, 500, 730), 'art/backs/ss2707-pegasus.webp')
card((1068, 150, 1486, 730), 'art/backs/ss2709-cauldron.webp')
avatar((545, 185, 962, 607), 'art/avatars/ss2707-pegasus.webp')
avatar((1530, 150, 1960, 612), 'art/avatars/ss2709-witch.webp')
table((82, 735, 938, 1080), 'art/season-pass/ss2707/table.webp', 'art/season-pass/ss2707/banner.webp')
table((1070, 735, 1946, 1080), 'art/season-pass/ss2709/table.webp', 'art/season-pass/ss2709/banner.webp')
