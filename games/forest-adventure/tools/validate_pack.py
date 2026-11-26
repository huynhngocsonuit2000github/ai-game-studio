"""Validate import data and exported media. Writes an evidence file and CSV manifest."""
import csv
from hashlib import sha256
import json
from pathlib import Path
import subprocess

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
RUNTIME = ASSETS / "runtime"
IMAGE_SPEC = {
    "pip.png": ("character", "Pip character animation atlas", "S01","hero.png;motion.png"),
    "creatures.png": ("enemies", "Beetle and moth animation atlas", "S01","creatures.png"),
    "forest-props.png": ("props", "Seed, lantern, gate, fern and bramble", "S01","props.png"),
    "terrain.png": ("tileset", "Grass lips, alternating fill and caps", "S01","props.png"),
    "soil-body.webp": ("tileset", "Continuous mirrored soil body fill", "S01","props.png"),
    "forest-vfx.png": ("vfx", "Particle and firefly animation atlas", "S02",None),
    "hud.png": ("ui", "Heart, seed, pause, audio and focus icons", "S02",None),
    "ui-panel.png": ("ui", "Nine-slice panel", "S02",None),
    "bg-fernlight.webp": ("background", "Fernlight Trail far parallax", "S01","bg.png"),
    "bg-near.webp": ("background", "Transparent near foliage parallax", "S02","near.png"),
    "bg-willow.webp": ("background", "Willow Run far parallax", "S04","willow.png"),
    "bg-oak.webp": ("background", "Lantern Oak far parallax", "S04","oak.png"),
    "cover.webp": ("promotion", "Studio cover art", "S02","key.png"),
    "banner.webp": ("promotion", "Wide promo banner", "S02","key.png"),
}
ATLAS = {"pip":11,"creatures":6,"forest-props":7,"terrain":4,"forest-vfx":24,"hud":8}
LICENSE = "Original pack asset; see assets/source/PROVENANCE.md; public release approval pending"


def load(path):
    return json.loads(path.read_text(encoding="utf-8"))


def check(condition, message):
    if not condition:
        raise ValueError(message)


def checksum(path):
    return sha256(path.read_bytes()).hexdigest()


def rel(path):
    return path.relative_to(ROOT).as_posix()


def verify_atlas(stem, pixels):
    data = load(RUNTIME / f"{stem}.json")
    w,h = pixels.size
    check(data["meta"]["size"] == {"w":w,"h":h},f"{stem} mismatch")
    check(data["meta"]["image"] == f"{stem}.png",f"{stem} image reference")
    frames = data["frames"]
    check(len(frames)==ATLAS[stem],f"{stem} wrong frame count")
    registered = {}
    alpha = pixels.getchannel("A")
    for f in frames:
        n = f["filename"]
        check(n not in registered,f"{stem} duplicate {n}")
        x,y,fw,fh=(f["frame"][k] for k in ("x","y","w","h"))
        check(0 <= x < x+fw <= w and 0 <= y < y+fh <= h,f"{stem}/{n} outside atlas")
        check(all(0<=f["pivot"][k]<=1 for k in ("x","y")),f"{stem}/{n} pivot out of bounds")
        crop = alpha.crop((x,y,x+fw,y+fh))
        check(crop.getextrema()[0]==0 and crop.getextrema()[1]>=(24 if stem=="forest-vfx" else 200),f"{stem}/{n} alpha invalid")
        if stem in ("pip","creatures","forest-props"):
            box = crop.point(lambda p: 255 if p >= 18 else 0).getbbox()
            check(box and box[0]>0 and box[1]>0 and box[2]<fw and box[3]<fh,f"{stem}/{n} frame clipped")
            if stem=="pip":
                check(abs(box[3]-round(fh*f["pivot"]["y"]))<=3, f"{stem}/{n} foot pivot drift")
        for px,py,pw,ph in registered.values():
            check(x+fw<=px or px+pw<=x or y+fh<=py or py+ph<=y,f"{stem}/{n} frame overlap")
        registered[n]=(x,y,fw,fh)
    clips = {}
    path = RUNTIME / f"{stem}-clips.json"
    if path.exists():
        clips=load(path)
        for name,value in clips.items():
            check(value["fps"]>0 and bool(value["frames"]),f"{stem}/{name} invalid clip")
            check(set(value["frames"])<=registered.keys(),f"{stem}/{name} missing clip frame")
    dim = f'{frames[0]["frame"]["w"]}x{frames[0]["frame"]["h"]}'
    return len(frames), dim, " | ".join(f'{name}:{len(x["frames"])}@{x["fps"]}fps' for name,x in clips.items())


def audio(path, cue):
    probe = json.loads(subprocess.check_output(["ffprobe","-v","error","-show_streams","-of","json",str(path)]))
    track, = probe["streams"]
    channels = cue["channels"]
    check(track["codec_name"] == {"ogg":"vorbis","m4a":"aac"}[path.suffix[1:]],f"{path.name} codec")
    check(track["channels"]==channels and int(track["sample_rate"])==44100,f"{path.name} sample layout")
    decoded = subprocess.check_output(["ffmpeg","-v","error","-i",str(path),"-f","f32le","-acodec","pcm_f32le","-"])
    samples = np.frombuffer(decoded,dtype="<f4").reshape(-1,channels)
    peak = float(np.max(np.abs(samples)))
    duration = len(samples)/44100
    check(.06<peak<.97 and np.isfinite(samples).all(),f"{path.name}: clipping, silence or invalid sample")
    check(abs(duration-cue["seconds"])<.085,f"{path.name}: wrong duration")
    # Check decoded seam at annotated loop end where the decoder supplies the samples.
    edge = None
    if cue["loop"]:
        left,right=cue["loopSamples"]
        check(left==0 and right>44100 and abs(right-len(samples))<4000,f"{path.name}: loop metadata")
        edge=float(np.max(np.abs(samples[left]-samples[min(right-1,len(samples)-1)])))
        check(edge<.15,f"{path.name}: abrupt decoded loop discontinuity")
    return {"codec":track["codec_name"],"seconds":round(duration,4),
            "sampleRate":44100,"channels":channels,"peakDbfs":round(20*np.log10(peak),2),
            "loopEdgeDelta":None if edge is None else round(edge,5)}


def validate_levels():
    results=[]
    data=load(ROOT/"design/LEVELS.json")
    check(data["schemaVersion"]==1 and len(data["levels"])==3,"level schema")
    for lv in data["levels"]:
        rects=lv["solids"]
        entities=[lv[k] for k in ("spawn","checkpoint","goal")]+lv["seeds"]+lv["fireflies"]+lv["enemies"]
        ids=[e["id"] for e in entities]
        check(len(ids)==len(set(ids)),f'{lv["id"]}: duplicate id')
        check(len(lv["seeds"])==3 and len(lv["fireflies"])==8,f'{lv["id"]}: wrong quota')
        for x,y,w,h in rects+lv["hazards"]:
            check(w>0 and h>0 and 0<=x<x+w<=lv["width"] and 0<=y<y+h<=lv["height"],f'{lv["id"]}: bad rectangle')
        gaps=[]
        floors=sorted((x,x+w) for x,y,w,h in rects if y==432)
        for (_,right),(next_left,_) in zip(floors,floors[1:]):
            gaps.append(next_left-right)
        check(max(gaps)<=128 and min(gaps)>0,f'{lv["id"]}: floor gap')
        for e in entities:
            x,y=e["x"],e["y"]
            check(0<=x<lv["width"] and 0<y<lv["killY"],f'{lv["id"]}: entity out of bounds')
            check(not any(rx<x<rx+rw and ry<y<ry+rh for rx,ry,rw,rh in rects),
                  f'{lv["id"]}: anchor embedded {e["id"]}')
        lantern=lv["checkpoint"]["x"]
        cw=next((r for r in floors if r[0]<lantern<r[1]),None)
        check(cw and lantern-cw[0]>=64,f'{lv["id"]}: checkpoint lacks recovery area')
        ahead = [x for x,y,w,h in lv["hazards"] if x>lantern]
        ahead += [e.get("patrolX",[e["x"]-48])[0] for e in lv["enemies"] if e["x"]>lantern]
        check(not ahead or min(ahead)-lantern>=160,f'{lv["id"]}: checkpoint hazard spacing')
        results.append({"id":lv["id"],"width":lv["width"],"floorGaps":gaps,"seeds":3,"fireflies":8})
    return results


def row(asset_id, kind, description, stage, by, src, path, dims="", frames="", clips="", validation=""):
    return {
        "id":asset_id,"type":kind,"description":description,"stage":stage,"source":by,
        "license":LICENSE,"source_path":src,"runtime_path":rel(path),
        "format":path.suffix[1:].upper(),"dimensions_or_media":dims,
        "frame_count":frames,"animation_clips":clips,"budget":f"{path.stat().st_size} bytes",
        "status":"verified","validation":validation,"sha256":checksum(path)
    }


def main():
    rows=[]
    evidence={"images":{},"audio":{},"levels":validate_levels()}
    art_source = ROOT/"tools/build_art.py"
    for name,(kind,desc,stage,sources) in IMAGE_SPEC.items():
        p=RUNTIME/name
        stem=p.stem
        with Image.open(p) as im:
            im.load()
            dims=f"{im.width}x{im.height}"
            count,stride,clips=verify_atlas(stem,im) if stem in ATLAS else ("","","")
            if stem in ATLAS or name in ("bg-near.webp","ui-panel.png"):
                check(im.mode=="RGBA",f"{name}: missing alpha")
        src=";".join(f"assets/source/{s}" for s in sources.split(";")) if sources else rel(art_source)
        check(all((ROOT/s).is_file() for s in src.split(";")),f"{name}: missing provenance path")
        evidence["images"][name]={"dimensions":dims,"frames":count,"frameDimensions":stride}
        validation="Decoded; atlas bounds/padding/pivots and clip references checked where applicable; Phaser import pending"
        rows.append(row(stem,kind,desc,stage,"Original AI artwork and local asset bake" if sources else "Local asset bake",
                        src,p,dims+(f" ({stride} cells)" if stride else ""),count,clips,validation))
    cues=load(RUNTIME/"audio/cues.json")
    for cue in cues["tracks"]:
        name=cue["id"]
        kind="music" if "theme" in name else ("ambience" if name=="forest-ambience" else "sfx")
        stage="S04" if name=="lantern-oak-theme" else "S03"
        for file in cue["variants"]:
            p=RUNTIME/"audio"/file
            result=audio(p,cue)
            evidence["audio"][file]=result
            media=f'{result["seconds"]} s; {result["sampleRate"]} Hz; {result["channels"]} channel(s)'
            rows.append(row(f"{name}-{p.suffix[1:]}",kind,name,stage,"Original synthetic audio",
                      "tools/build_audio.py",p,media,
                      validation=f'Decoded, peak {result["peakDbfs"]} dBFS; listening/browser pending'))
    for p in sorted(RUNTIME.rglob("*.json")):
        load(p)
        src="tools/build_audio.py" if p.name=="cues.json" else "tools/build_art.py"
        rows.append(row(p.stem+"-data","metadata",p.name,"S03" if p.name=="cues.json" else "S01",
                   "Local data export",src,p,validation="Parsed; reference validation where applicable"))
    actual={rel(p) for p in RUNTIME.rglob("*") if p.is_file()}
    check(actual=={r["runtime_path"] for r in rows},"Runtime manifest coverage differs")
    with (ROOT/"production/ASSET_MANIFEST.csv").open("w",newline="",encoding="utf-8") as f:
        writer=csv.DictWriter(f,fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)
    evidence["runtimeBytes"]=sum((ROOT/p).stat().st_size for p in actual)
    evidence["runtimeFiles"]=len(actual)
    evidence["structure"]="PASS"
    evidence["gameImportAndPlaytest"]="NOT_RUN: game code belongs to Codex Cloud stages"
    (ROOT/"reports/asset-validation.json").write_text(json.dumps(evidence,indent=2)+"\n")
    print(f'{len(actual)} runtime files; {evidence["runtimeBytes"]} bytes; 3 level layouts validated.')
    print(f'{len(evidence["images"])} images, {sum(ATLAS.values())} atlas frames and {len(evidence["audio"])} audio bitstreams checked.')


if __name__ == "__main__":
    main()
