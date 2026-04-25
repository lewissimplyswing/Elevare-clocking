#!/usr/bin/env python3
"""Generate simple PWA icons using only stdlib (no Pillow needed)."""
import struct, zlib, os

def png_chunk(name, data):
    c = zlib.crc32(name + data) & 0xffffffff
    return struct.pack('>I', len(data)) + name + data + struct.pack('>I', c)

def make_png(size):
    bg   = (15, 17, 23)      # --bg dark
    acc  = (232, 255, 71)    # --accent yellow-green
    w = h = size

    # Build raw pixel rows
    rows = []
    cx, cy, r = w // 2, h // 2, int(w * 0.36)
    cr = int(w * 0.22)

    for y in range(h):
        row = b'\x00'          # filter type None
        for x in range(w):
            # rounded-square background
            pad = int(w * 0.12)
            in_sq = (pad <= x < w - pad) and (pad <= y < h - pad)
            # clock circle
            dx, dy = x - cx, y - cy
            in_circle = (dx*dx + dy*dy) <= r*r
            # clock hands (crude)
            in_h_hand = in_circle and abs(dy) <= max(2, w//64) and cx - cr//2 <= x <= cx
            in_v_hand = in_circle and abs(dx) <= max(2, w//64) and cy - cr <= y <= cy

            if in_circle and (in_h_hand or in_v_hand):
                row += bytes([bg[0], bg[1], bg[2]])
            elif in_circle:
                row += bytes([acc[0], acc[1], acc[2]])
            elif in_sq:
                row += bytes([bg[0], bg[1], bg[2]])
            else:
                row += bytes([0, 0, 0])
        rows.append(row)

    raw   = b''.join(rows)
    comp  = zlib.compress(raw, 9)

    sig   = b'\x89PNG\r\n\x1a\n'
    ihdr  = png_chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0))
    idat  = png_chunk(b'IDAT', comp)
    iend  = png_chunk(b'IEND', b'')
    return sig + ihdr + idat + iend

os.makedirs('icons', exist_ok=True)
for sz in (192, 512):
    with open(f'icons/icon-{sz}.png', 'wb') as f:
        f.write(make_png(sz))
    print(f'Generated icons/icon-{sz}.png')
