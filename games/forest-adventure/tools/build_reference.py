"""Render non-interactive composition targets from the shipped game assets."""
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets/runtime"
OUT = ROOT / "assets/concept"
W, H = 960, 540
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"


def sprite(atlas, key):
    data = json.loads((ASSETS/f"{atlas}.json").read_text())
    r = next(f["frame"] for f in data["frames"] if f["filename"]==key)
    return Image.open(ASSETS/f"{atlas}.png").convert("RGBA").crop(
        (r["x"],r["y"],r["x"]+r["w"],r["y"]+r["h"]))


def place(canvas, atlas, key, xy, scale=.5):
    image = sprite(atlas,key)
    image = image.resize(tuple(round(d*scale) for d in image.size),Image.Resampling.LANCZOS)
    canvas.alpha_composite(image,xy)


def platform(canvas, start, stop, y):
    names = ("ground-left","ground-middle","ground-middle-reverse","ground-right")
    strips = [sprite("terrain",key).resize((32,64),Image.Resampling.LANCZOS) for key in names]
    soil = Image.open(ASSETS/"soil-body.webp").convert("RGBA").resize((256,80),Image.Resampling.LANCZOS)
    for depth in range(y+35,H,80):
        for x in range(start,stop,256):
            body = soil.crop((0,0,min(256,stop-x),80))
            canvas.alpha_composite(body,(x,depth))
    for x in range(start,stop,32):
        i = (x-start)//32
        choice = 0 if x==start else (3 if x+32>=stop else 1+((i-1)%2))
        canvas.alpha_composite(strips[choice],(x,y-5))


def target(name, title, subtitle, number):
    sky = Image.open(ASSETS/f"bg-{name}.webp").convert("RGBA")
    # Choose the unmirrored part of the parallax master.
    canvas = sky.crop((0,80,1536,944)).resize((W,H),Image.Resampling.LANCZOS)
    platform(canvas,-32,384,431)
    platform(canvas,480,992,431)
    platform(canvas,635,795,352)
    place(canvas,"forest-props","fern",(12,327),.45)
    place(canvas,"forest-props","fern",(524,330),.43)
    place(canvas,"forest-props","bramble",(745,314),.54)
    place(canvas,"forest-props","lantern",(530,287),.61)
    place(canvas,"creatures","moth-up",(664,175),.62)
    place(canvas,"creatures","beetle-a",(220,352),.61)
    place(canvas,"pip","rise",(344,239),.63)
    place(canvas,"forest-props","heartseed",(643,230),.63)
    place(canvas,"forest-vfx","seed-spark-2",(708,280),.46)
    place(canvas,"forest-vfx","firefly-2",(417,282),.42)
    place(canvas,"forest-vfx","firefly-2",(463,267),.38)
    for x in (34,72,110):
        place(canvas,"hud","heart",(x,25),.26)
    for i in range(3):
        place(canvas,"hud","seed-marker" if i==0 else "seed-empty",(176+i*32,25),.244)
    place(canvas,"hud","pause",(889,25),.26)
    layer = Image.new("RGBA",canvas.size)
    draw = ImageDraw.Draw(layer)
    draw.rounded_rectangle((33,92,350,180),radius=14,fill="#123631e8",outline="#aabc8d",width=1)
    draw.text((50,105),title,font=ImageFont.truetype(BOLD,28),fill="#fff4d3")
    draw.text((52,151),subtitle,font=ImageFont.truetype(FONT,13),fill="#e4e5ce")
    draw.text((762,506),f"L{number}  ·  ART TARGET",font=ImageFont.truetype(FONT,14),fill="#fff1cd",
              stroke_width=2,stroke_fill="#142d2f")
    canvas.alpha_composite(layer)
    canvas.convert("RGB").save(OUT/f"{name}-target.webp",quality=90,method=6)


if __name__=="__main__":
    OUT.mkdir(parents=True,exist_ok=True)
    target("fernlight","Fernlight Trail","Collect three Heartseeds to open the gate.",1)
    target("willow","Willow Run","Read the moth’s dip before crossing.",2)
    target("oak","Lantern Oak","One last seed to wake the forest.",3)
