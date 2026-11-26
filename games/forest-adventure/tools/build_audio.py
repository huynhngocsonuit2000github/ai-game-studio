"""Render original Forest Adventure score and cues to Ogg Vorbis and AAC."""
import json
import math
from pathlib import Path
import subprocess
import tempfile
import wave

import numpy as np
from scipy.signal import butter, sosfilt

RATE = 44100
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets/runtime/audio"
RNG = np.random.default_rng(260611)
BPM = 108
BEAT = 60 / BPM


def timeline(duration):
    return np.arange(round(duration*RATE)) / RATE


def hz(note):
    return 440 * 2 ** ((note-69)/12)


def soft_tail(t, seconds=.045):
    return np.sin(np.minimum(1,(t[-1]-t)/seconds) * np.pi/2)**2


def env(t, attack, decay, tail=.055):
    return (1-np.exp(-t/attack))*np.exp(-t/decay)*soft_tail(t,tail)


def sines(phase, harmonics):
    return sum(gain*np.sin(phase*ratio) for ratio,gain in harmonics)


def voice(note, duration, kind):
    t = timeline(duration)
    phase = 2*np.pi*hz(note)*t
    if kind == "wood":
        return sines(phase,((1,.8),(2.006,.18),(3.02,.145),(4.17,.07)))*env(t,.003,.19)
    if kind == "bell":
        return sines(phase,((1,.82),(2.005,.19),(3.01,.10),(5.43,.05)))*env(t,.008,.23)
    if kind == "bass":
        return sines(phase,((1,.9),(2,.14),(3,.06)))*env(t,.03,.51)
    vibrato = .15*np.sin(t*2*np.pi*4.8)
    return sines(phase+vibrato,((1,.85),(2,.14),(3,.04)))*env(t,.083,.49)


def noise(duration, band, gain=1):
    t = timeline(duration)
    source = RNG.normal(0,1,len(t))
    filtered = sosfilt(butter(2,band,fs=RATE,btype="bandpass",output="sos"),source)
    return gain*filtered*env(t,.005,duration/3,tail=min(.08,duration*.4))


def slide(duration, start, end, decay=.13):
    t = timeline(duration)
    phase = 2*np.pi*np.cumsum(np.linspace(start,end,len(t)))/RATE
    return sines(phase,((1,.85),(2.006,.16),(3,.03)))*env(t,.006,decay)


def mix_into(buffer, data, seconds, gain=1, pan=0):
    start = round(seconds*RATE)
    indices = (np.arange(len(data))+start)%len(buffer)
    if buffer.ndim == 1:
        buffer[indices] += data*gain
    else:
        phi = (pan+1)*math.pi/4
        buffer[indices] += data[:,None]*gain*np.array([math.cos(phi),math.sin(phi)])


def score(oak=False):
    # Sixteen bars. The C/G/D/Em motif is reprised in a lower register at the Oak.
    chords = [(48,[60,64,67,74]),(43,[55,59,62,69]),(50,[57,62,66,69]),(45,[57,60,64,67]),
              (48,[55,60,64,67]),(43,[55,59,62,67]),(50,[57,62,66,74]),(47,[59,63,66,69]),
              (52,[55,59,64,71]),(48,[55,60,64,67]),(43,[55,59,62,69]),(50,[57,62,66,74]),
              (45,[57,60,64,67]),(48,[60,64,67,74]),(50,[57,62,66,69]),(43,[55,59,62,67])]
    motifs = [[76,79,81,79],[74,71,74,None],[76,78,81,78],[76,72,74,None],
              [76,79,81,83],[79,74,71,None],[74,78,81,86],[83,81,78,None],
              [83,79,76,79],[81,79,76,None],[74,76,79,81],[86,81,78,None],
              [72,76,79,84],[81,79,76,None],[78,76,74,69],[71,74,67,None]]
    duration = 16*4*BEAT
    out = np.zeros((round(duration*RATE),2))
    for bar,(bass,chord) in enumerate(chords):
        at = bar*BEAT*4
        for step,degree in enumerate((0,1,2,3,1,2,0,2)):
            pan = -.35 + .1*(step%5)
            mix_into(out,voice(chord[degree],.59,"wood"),at+step*BEAT/2,.105,pan)
        for offset,note in ((0,bass),(2,bass+7 if bar%2==0 else bass+12)):
            mix_into(out,voice(note,.86,"bass"),at+offset*BEAT,.22,.03)
        for step,note in enumerate(motifs[bar]):
            if note is None:
                continue
            note -= 12 if oak and step%2==0 else 0
            when = at+(step+.15+(step==2)*.25)*BEAT
            lead = voice(note,.73,"flute" if oak or step%3 else "bell")
            mix_into(out,lead,when,.16,.18)
            mix_into(out,lead,when+.135,.032,-.48)
            mix_into(out,lead,when+.267,.016,.55)
        for step in (1,3):
            mix_into(out,noise(.16,(900,2200)),at+step*BEAT,.044,-.24)
    # Micro-crossfade with the seam's first sample for smooth loop transport.
    n = round(.008*RATE)
    for j in range(n):
        weight = .5-.5*math.cos(math.pi*(j+1)/n)
        out[-n+j] = out[-n+j]*(1-weight)+out[0]*weight
    return out


def event(notes, cadence, duration, kind="bell"):
    o = np.zeros(round(duration*RATE))
    for i,note in enumerate(notes):
        start = i*cadence
        mix_into(o,voice(note,min(.32,duration-start),kind),start,.55)
    return o


def ambience():
    t = timeline(12)
    out = np.zeros((len(t),2))
    wind = noise(12,(140,550),.19)
    wind *= .56+.17*np.cos(t*2*np.pi/6)
    mix_into(out,wind,0,.4,-.5)
    mix_into(out,np.roll(wind,int(.17*RATE)),0,.38,.6)
    for at,base,pan in ((1.4,1060,-.7),(5.2,1290,.55),(9.1,1100,-.3)):
        for offset in (0,.17,.31):
            mix_into(out,slide(.11,base,base*1.28,.039),at+offset,.04,pan)
    out *= (np.sin(np.pi*t/12)**.3)[:,None]
    return out


def encode(name, signal, peak):
    signal = np.asarray(signal)
    signal = signal / max(np.max(np.abs(signal)),1e-8)*peak
    pcm = np.rint(signal*32767).astype("<i2")
    if np.max(np.abs(pcm))>=32766:
        raise ValueError("Clipping in " + name)
    with tempfile.TemporaryDirectory() as temp:
        master = Path(temp)/"master.wav"
        with wave.open(str(master),"wb") as f:
            f.setnchannels(1 if signal.ndim==1 else 2)
            f.setsampwidth(2)
            f.setframerate(RATE)
            f.writeframes(pcm.tobytes())
        for ext,options in (
            ("ogg",["-c:a","libvorbis","-q:a","5" if signal.ndim==2 else "4"]),
            ("m4a",["-c:a","aac","-b:a","128k" if signal.ndim==2 else "64k","-movflags","+faststart"])
        ):
            subprocess.run(["ffmpeg","-loglevel","error","-y","-i",str(master),*options,str(OUT/f"{name}.{ext}")],
                           check=True)
    return {"id":name,"seconds":len(signal)/RATE,"channels":1 if signal.ndim==1 else 2,
            "peakDbfs":round(20*math.log10(peak),2),"variants":[f"{name}.ogg",f"{name}.m4a"]}


if __name__ == "__main__":
    OUT.mkdir(parents=True,exist_ok=True)
    cues = {
        "jump":slide(.22,300,620),
        "land":slide(.18,190,105,.055)*.36+noise(.18,(80,1200),.52),
        "stomp":slide(.23,250,88,.076)*.6+noise(.23,(300,1300),.38),
        "hurt":slide(.33,445,170,.12)*.48+noise(.33,(500,1900),.22),
        "seed":event([76,83,88],.086,.48),
        "firefly":event([91,95],.052,.27),
        "lantern":event([67,72,76,81],.116,.72,"wood"),
        "gate":event([60,67,72,76],.12,.82,"wood"),
        "fall":slide(.42,720,132,.14),
        "confirm":event([76,81],.046,.23,"wood"),
        "hover":event([76],.05,.14,"wood"),
        "resume":event([72,79],.078,.32),
        "clear":event([67,72,76,79,84],.17,1.42),
    }
    rows=[encode("fernlight-theme",score(),.62),encode("lantern-oak-theme",score(oak=True),.58),
          encode("forest-ambience",ambience(),.32)]
    rows.extend(encode(name,signal,.49 if name!="hover" else .29) for name,signal in cues.items())
    for row in rows:
        row["loop"] = "theme" in row["id"] or row["id"]=="forest-ambience"
        if row["loop"]:
            row["loopSamples"] = [0,round(row["seconds"]*RATE)]
    (OUT/"cues.json").write_text(json.dumps({"sampleRate":RATE,"tracks":rows},indent=2)+"\n")
