"""Hojas de contacto para revisar el montaje: saca los fotogramas pedidos y los pone en rejillas de 4 x 3, cada uno con
su número.

  python tools/sheet.py out/meshmind-v3.mp4 out/qa 20,40,60,...
"""
import pathlib
import subprocess
import sys

from PIL import Image, ImageDraw, ImageFont

video, folder, frames = sys.argv[1], pathlib.Path(sys.argv[2]), sorted({int(n) for n in sys.argv[3].split(',')})
folder.mkdir(parents=True, exist_ok=True)
for old in folder.glob('frame-*.png'):
    old.unlink()
pick = '+'.join(f'eq(n\\,{n})' for n in frames)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', video, '-vf', f"select='{pick}',scale=640:-1", '-fps_mode', 'passthrough', str(folder / 'frame-%03d.png')], check=True)

shots = sorted(folder.glob('frame-*.png'))
try:
    font = ImageFont.truetype('arialbd.ttf', 26)
except OSError:
    font = ImageFont.load_default(size=26)
COLS, ROWS, TW, TH = 4, 3, 640, 360
for sheet in range(0, len(shots), COLS * ROWS):
    page = Image.new('RGB', (COLS * TW, ROWS * TH), 'white')
    for k, (path, n) in enumerate(zip(shots[sheet:sheet + COLS * ROWS], frames[sheet:sheet + COLS * ROWS])):
        x, y = (k % COLS) * TW, (k // COLS) * TH
        page.paste(Image.open(path), (x, y))
        draw = ImageDraw.Draw(page)
        draw.rectangle([x, y, x + 70, y + 34], fill='black')
        draw.text((x + 8, y + 3), str(n), fill='yellow', font=font)
    target = folder / f'sheet-{sheet // (COLS * ROWS) + 1}.png'
    page.save(target)
    print(target)
