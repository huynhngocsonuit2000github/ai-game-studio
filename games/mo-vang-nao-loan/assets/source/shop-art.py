from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[2] / 'public'
ink = '#342338'
mint = '#b7e3d2'
glass = '#74afa1'
gold = '#ebae63'
plum = '#754d69'

def art(name, fn):
    image = Image.new('RGBA', (128, 128))
    fn(ImageDraw.Draw(image))
    image.resize((64, 64), Image.Resampling.LANCZOS).save(root / 'art' / (name + '.png'), optimize=True)

def potion(d):
    d.polygon([(52, 24), (76, 24), (77, 43), (94, 65), (103, 84), (101, 101), (88, 110),
               (40, 110), (27, 102), (25, 84), (35, 63), (51, 43)], fill=glass, outline=ink, width=5)
    d.rounded_rectangle((49, 16, 80, 30), 4, fill=gold, outline=ink, width=4)
    d.polygon([(33, 80), (51, 77), (76, 82), (95, 76), (98, 91), (94, 101),
               (82, 105), (42, 105), (33, 96)], fill='#edaa66')
    d.line([(47, 57), (40, 68), (36, 76)], fill=mint, width=6)
    d.ellipse((63, 82, 71, 90), fill='#ffebb5')
    d.ellipse((79, 90, 84, 95), fill='#ffebb5')

def scissors(d):
    d.polygon([(51, 69), (62, 52), (101, 14), (110, 16), (110, 27), (74, 69), (57, 80)],
              fill=mint, outline=ink, width=5)
    d.polygon([(67, 66), (43, 52), (20, 22), (23, 16), (37, 20), (72, 53), (92, 71)],
              fill=glass, outline=ink, width=5)
    for center in [40, 88]:
        d.ellipse((center-20, 64, center+20, 109), fill=plum, outline=ink, width=5)
        d.ellipse((center-9, 75, center+9, 98), fill=(0, 0, 0, 0), outline='#f1a285', width=4)
    d.ellipse((57, 53, 71, 67), fill=gold, outline=ink, width=3)

def magnet(d):
    d.rounded_rectangle((17, 21, 111, 105), 35, fill=plum, outline=ink, width=5)
    d.rounded_rectangle((43, 38, 85, 83), 13, fill=(0, 0, 0, 0), outline=ink, width=5)
    d.rectangle((45, 55, 83, 108), fill=(0, 0, 0, 0))
    d.rounded_rectangle((17, 75, 44, 107), 5, fill=gold, outline=ink, width=4)
    d.rounded_rectangle((85, 75, 111, 107), 5, fill=mint, outline=ink, width=4)
    d.arc((24, 29, 104, 98), 196, 345, fill='#aa7087', width=5)

for name, draw in [('potion', potion), ('scissors', scissors), ('magnet', magnet)]:
    art(name, draw)
