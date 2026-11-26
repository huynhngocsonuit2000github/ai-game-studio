"""Bake original source paintings into browser asset formats. Asset tooling only."""
import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "assets/source"
OUT = ROOT / "assets/runtime"
PALE = "#fff1cb"
LIME = "#d6e781"
INK = "#173436"


def put_json(path, value):
    path.write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8")


def transparent_crop(img):
    alpha = img.getchannel("A")
    box = alpha.point(lambda a: 255 if a >= 18 else 0).getbbox()
    if box is None:
        raise ValueError("Empty source cell")
    return img.crop(box)


def cell(stem, row, col, box=None):
    img = Image.open(SRC / f"{stem}.png").convert("RGBA")
    explicit = {
        "creatures": [(48,88,492,443),(565,100,952,446),(1054,149,1488,435),
                      (74,502,438,930),(512,605,1015,926),(1062,612,1463,990)],
        "props": [(55,148,476,494),(620,21,896,539),(994,40,1523,511),
                  (7,702,522,900),(535,605,960,915),(1009,627,1517,914)]
    }
    if box is None and stem in explicit:
        box = explicit[stem][3*row+col]
    if box is None:
        w, h = img.size
        box = (round(w * col / 3), round(h * row / 2),
               round(w * (col + 1) / 3), round(h * (row + 1) / 2))
    return transparent_crop(img.crop(box))


def fitting(sprite, max_size):
    sprite = sprite.copy()
    sprite.thumbnail(max_size, Image.Resampling.LANCZOS)
    return sprite


def frame(sprite, size, bound, anchor="feet", bottom=None, reflect=False):
    sprite = fitting(sprite, bound)
    if reflect:
        sprite = ImageOps.mirror(sprite)
    w, h = size
    foot = bottom if bottom is not None else h - 10
    y = foot - sprite.height if anchor == "feet" else (h - sprite.height) // 2
    canvas = Image.new("RGBA", size)
    canvas.alpha_composite(sprite, ((w - sprite.width) // 2, y))
    return canvas


def atlas(name, items, cols, clips=None):
    w, h = items[0][1].size
    pad = 4
    stride_x, stride_y = w + pad * 2, h + pad * 2
    rows = math.ceil(len(items) / cols)
    canvas = Image.new("RGBA", (cols * stride_x, rows * stride_y))
    rects = []
    for i, (key, image, pivot) in enumerate(items):
        x, y = (i % cols) * stride_x + pad, (i // cols) * stride_y + pad
        canvas.alpha_composite(image, (x, y))
        rects.append({
            "filename": key, "frame": {"x":x, "y":y, "w":w, "h":h},
            "rotated":False, "trimmed":False,
            "spriteSourceSize":{"x":0,"y":0,"w":w,"h":h},
            "sourceSize":{"w":w,"h":h}, "pivot":{"x":pivot[0],"y":pivot[1]}
        })
    canvas.save(OUT / (name + ".png"), optimize=True)
    put_json(OUT / (name + ".json"), {
        "frames": rects,
        "meta":{"image":name+".png","size":{"w":canvas.width,"h":canvas.height},
                "scale":"1","format":"RGBA8888","gutterPixels":pad}
    })
    if clips:
        put_json(OUT / (name + "-clips.json"), clips)


def clip(fps, keys, loop=False, pingpong=False):
    return {"fps":fps,"loop":loop,"yoyo":pingpong,"frames":keys}


def characters():
    # Same normalization for the original contact sheet and supplemental poses.
    poses = [
        ("idle-a","hero",0,0),("idle-b","motion",0,1),
        ("run-a","hero",0,1),("run-b","hero",0,2),
        ("run-c","motion",0,2),("run-d","motion",1,0),
        ("rise","hero",1,0),("fall","hero",1,1),
        ("land","motion",1,1),("hurt","hero",1,2),("cheer","motion",1,2)
    ]
    sprites = [(key,frame(cell(stem,row,col), (192,192), (158,146), bottom=174),(.5,174/192))
               for key,stem,row,col in poses]
    keys = {name for name, *_ in poses}
    def present(*names):
        return [name for name in names if name in keys]
    clips = {
        "idle":clip(3,present("idle-a","idle-a","idle-a","idle-b"),True),
        "run":clip(10,present("run-a","run-b","run-c","run-d"),True),
        "rise":clip(1,["rise"]),"fall":clip(1,["fall"]),
        "hurt":clip(1,["hurt"])
    }
    for name in ("land","cheer"):
        if name in keys:
            clips[name] = clip(1,[name])
    atlas("pip",sprites,4,clips)

    sprites = []
    for i,name in enumerate(("beetle-a","beetle-b","beetle-stomped","moth-up","moth-mid","moth-down")):
        sprite = cell("creatures",i//3,i%3)
        anchor = "feet" if i < 3 else "center"
        height = 54 if name == "beetle-stomped" else 106
        sprites.append((name,frame(sprite,(160,144),(138,height),anchor,bottom=128),
                        (.5,128/144 if i < 3 else .5)))
    atlas("creatures",sprites,3,{
        "beetle-walk":clip(6,["beetle-a","beetle-b"],True),
        "beetle-stomped":clip(1,["beetle-stomped"]),
        "moth-hover":clip(10,["moth-up","moth-mid","moth-down","moth-mid"],True),
        "moth-dip":clip(15,["moth-up","moth-mid","moth-down","moth-mid"],True)
    })


def terrain_and_props():
    names = ("heartseed","lantern","portal","platform","fern","bramble")
    items = []
    for i,name in enumerate(names):
        img = cell("props", i//3, i%3)
        if name == "platform":
            terrain = img
            continue
        anchor = "center" if name == "heartseed" else "feet"
        bounds = {"heartseed":(104,100),"lantern":(92,216),"portal":(215,214),
                  "fern":(168,142),"bramble":(168,86)}
        canvas = frame(img,(256,256),bounds[name],anchor,bottom=236)
        pivot = (.5,.5 if anchor == "center" else 236/256)
        items.append((name,canvas,pivot))
        if name in ("lantern","portal"):
            dim = ImageEnhance.Brightness(canvas.convert("RGB")).enhance(.64).convert("RGBA")
            dim.putalpha(canvas.getchannel("A"))
            items.append((name+"-dormant",dim,pivot))
    atlas("forest-props",items,4)

    # Each terrain strip has three explicit placements and a seamless reflected fill.
    tile = terrain.resize((384,124),Image.Resampling.LANCZOS)
    x_core = tile.crop((64,0,128,124))
    mirror = Image.new("RGBA",(128,124))
    mirror.alpha_composite(x_core,(0,0))
    mirror.alpha_composite(ImageOps.mirror(x_core),(64,0))
    tiles = [("ground-left",tile.crop((0,0,64,124))),
             ("ground-middle",mirror.crop((0,0,64,124))),
             ("ground-middle-reverse",mirror.crop((64,0,128,124))),
             ("ground-right",ImageOps.mirror(tile.crop((0,0,64,124))))]
    source_soil = tile.convert("RGB").crop((81,57,301,101))
    source_soil = source_soil.resize((256,80), Image.Resampling.LANCZOS)
    source_soil = ImageEnhance.Brightness(source_soil).enhance(.76)
    soil = Image.new("RGB",(512,160))
    soil.paste(source_soil,(0,0))
    soil.paste(ImageOps.mirror(source_soil),(256,0))
    soil.paste(ImageOps.flip(source_soil),(0,80))
    soil.paste(ImageOps.flip(ImageOps.mirror(source_soil)),(256,80))
    soil.save(OUT / "soil-body.webp",quality=88,method=6)
    baked = []
    for key,t in tiles:
        canvas = Image.new("RGBA",(64,128))
        canvas.alpha_composite(t,(0,0))
        baked.append((key,canvas,(0,0)))
    atlas("terrain",baked,5)
    put_json(OUT / "terrain-layout.json", {
        "pixelsPerUnit":2,"cellLogicalWidth":32,"solidVisualTopInsetLogical":5,
        "ground":{"left":"ground-left","fill":["ground-middle","ground-middle-reverse"],
                  "right":"ground-right","body":"soil-body.webp","bodyLogicalTile":[256,80],
                  "bodyStartOffsetLogical":35},
        "shortPlatform":{"layout":["ground-left","ground-right"],"minimumWidthLogical":64},
        "guidance":"Align painted top around map top Y; collision rectangles stay independent."
    })


def spark_frames():
    frames = []
    for effect in ("seed-spark","dust","hit","firefly"):
        for i in range(6):
            t = i / 6
            im = Image.new("RGBA",(96,96))
            draw = ImageDraw.Draw(im)
            if effect in ("seed-spark","hit"):
                for idx in range(6):
                    theta = idx * math.tau / 6 + .23
                    radius = 6 + 29*t
                    x,y = 48 + radius*math.cos(theta),48 + radius*math.sin(theta)
                    length = 10*(1-t)+2
                    color = (255,220,96,round(255*(1-t))) if effect=="seed-spark" else (255,126,104,round(240*(1-t)))
                    draw.polygon([(x,y-length),(x+length*.28,y),(x,y+length),(x-length*.28,y)],fill=color)
            elif effect == "dust":
                for idx in range(5):
                    x = 48+(idx-2)*(4+10*t)
                    y = 61 - 20*t + (idx%2)*5
                    r = 4 + 5*t
                    draw.ellipse((x-r,y-r,x+r,y+r),fill=(220,198,142,round(170*(1-t))))
                im = im.filter(ImageFilter.GaussianBlur(1.5))
            else:
                scale = 1 + .45*math.sin(math.tau*t)
                for r in reversed(range(4,22)):
                    alpha = int(95*(1-r/22)**1.4)
                    rr = r*scale
                    draw.ellipse((48-rr,48-rr,48+rr,48+rr),fill=(239,225,114,alpha))
                draw.ellipse((44,44,52,52),fill=(255,247,175,255))
            frames.append((f"{effect}-{i}",im,(.5,.5)))
    atlas("forest-vfx",frames,6,
          {k:clip(12,[f"{k}-{i}" for i in range(6)],k=="firefly")
           for k in ("seed-spark","dust","hit","firefly")})


def heart_mask(center, size):
    out = []
    for i in range(160):
        t = i*math.tau/160
        x = 16*math.sin(t)**3
        y = 13*math.cos(t)-5*math.cos(2*t)-2*math.cos(3*t)-math.cos(4*t)
        out.append((center[0]+x*size,center[1]-y*size))
    return out


def hud():
    items = []
    for name in ("heart","heart-empty","seed-marker","seed-empty","pause","audio","muted","focus"):
        img = Image.new("RGBA",(128,128))
        d = ImageDraw.Draw(img)
        d.rounded_rectangle((5,5,123,123),radius=30,fill="#173e3ae8",outline="#73825b",width=4)
        if name.startswith("heart"):
            d.polygon(heart_mask((64,62),2.7),fill="#ea7863" if name=="heart" else "#394a43",outline="#ffe1ad",width=4)
            if name == "heart":
                d.arc((33,35,62,67),170,279,fill="#ffd6a1",width=4)
        elif name.startswith("seed"):
            d.polygon([(64,21),(94,60),(81,86),(64,104),(45,86),(34,61)],
                      fill=LIME if name=="seed-marker" else "#394a43",outline=PALE,width=4)
            d.line((64,81,65,50),fill=INK if name=="seed-marker" else "#bfc1a2",width=4)
        elif name == "pause":
            d.rounded_rectangle((39,33,54,95),radius=5,fill=PALE)
            d.rounded_rectangle((73,33,88,95),radius=5,fill=PALE)
        elif name in ("audio","muted"):
            d.polygon([(26,51),(43,51),(64,33),(64,95),(43,77),(26,77)],fill=PALE)
            if name == "audio":
                for end in (90,104):
                    d.arc((55,128-end,end,66+end-55),280,78,fill=LIME,width=4)
            else:
                d.line((78,51,102,78),fill="#ea7863",width=5)
                d.line((102,51,78,78),fill="#ea7863",width=5)
        else:
            d.rounded_rectangle((21,21,107,107),radius=18,outline=PALE,width=6)
        items.append((name,img,(.5,.5)))
    atlas("hud",items,4)

    panel = Image.new("RGBA",(256,144))
    d = ImageDraw.Draw(panel)
    d.rounded_rectangle((3,3,252,140),radius=27,fill="#173936f5",outline="#8c996a",width=4)
    d.rounded_rectangle((11,11,244,132),radius=19,outline="#405b48",width=2)
    for x in (21,234):
        for y in (22,120):
            d.polygon(((x-5,y),(x,y-6),(x+5,y),(x,y+6)),fill="#d6cb8c")
    panel.save(OUT / "ui-panel.png",optimize=True)
    put_json(OUT / "ui-layout.json",{"panel":{"image":"ui-panel.png","slicesPx":[34,34,34,34],
                    "assetScale":2},"iconScale":.25,"text":"DOM text, local system fonts"})


def backdrop(stem, output):
    im = Image.open(SRC / f"{stem}.png").convert("RGB").resize((1536,1024),Image.Resampling.LANCZOS)
    # A mirrored cycle gives continuous joining edges during camera-driven scrolling.
    wide = Image.new("RGB",(3072,1024))
    wide.paste(im,(0,0))
    wide.paste(ImageOps.mirror(im),(1536,0))
    wide.save(OUT / (output + ".webp"),quality=84,method=6)


def scenery():
    backdrop("bg","bg-fernlight")
    backdrop("willow","bg-willow")
    backdrop("oak","bg-oak")
    im = Image.open(SRC/"near.png").convert("RGBA")
    im = transparent_crop(im).resize((1536,256),Image.Resampling.LANCZOS)
    wide = Image.new("RGBA",(3072,256))
    wide.alpha_composite(im)
    wide.alpha_composite(ImageOps.mirror(im),(1536,0))
    wide.save(OUT/"bg-near.webp",quality=83,method=6)


def marketing():
    base = Image.open(SRC / "key.png").convert("RGB")
    font_path = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"
    small_path = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    for name,dims,position in (("cover",(1200,800),(.075,.215)),("banner",(1600,640),(.07,.22))):
        im = ImageOps.fit(base,dims,Image.Resampling.LANCZOS,centering=(.5,.5)).convert("RGBA")
        mask = Image.new("L",im.size)
        alpha = ImageDraw.Draw(mask)
        for x in range(im.width):
            a = round(160*max(0,1-x/(im.width*.66))**1.65)
            alpha.line((x,0,x,im.height),fill=a)
        dark = Image.new("RGBA",im.size,"#082424")
        dark.putalpha(mask)
        im.alpha_composite(dark)
        d = ImageDraw.Draw(im)
        size = 85 if name=="cover" else 104
        x,y = (int(n*p) for n,p in zip(dims,position))
        serif = ImageFont.truetype(font_path,size)
        label = ImageFont.truetype(small_path,22)
        for i,(word,color) in enumerate((("Forest","#fff0ca"),("Adventure","#f1c472"))):
            d.text((x,y+i*int(size*.9)),word,fill=color,font=serif,stroke_width=2,stroke_fill="#153b33")
        if name=="banner":
            d.text((x+4,y+int(size*2.16)),"A lantern. A fox. A forest to wake.",font=label,fill="#fff2d1")
        im.convert("RGB").save(OUT/(name+".webp"),quality=90,method=6)


if __name__ == "__main__":
    OUT.mkdir(parents=True,exist_ok=True)
    characters()
    terrain_and_props()
    spark_frames()
    hud()
    scenery()
    marketing()
