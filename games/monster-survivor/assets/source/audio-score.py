from pathlib import Path
import argparse
import numpy as np
import json, wave
from math import tau

RATE = 24000
rng = np.random.default_rng(994173)
parser = argparse.ArgumentParser(description='Render the original Monster Survivor audio score.')
parser.add_argument('--output', required=True, type=Path)
root = parser.parse_args().output
root.mkdir(parents=True, exist_ok=True)
music = {}

def time(s):
    return np.arange(round(s*RATE))/RATE

def tone(duration, freq, decay=8, end=None, color=.36, attack=.014):
    t=time(duration)
    slope=0 if end is None else (end-freq)/duration
    phase=tau*(freq*t+.5*slope*t*t)
    color_t=np.exp(-t*(decay+2))
    wave=(np.sin(phase)*np.exp(-t*decay) +
          color*np.sin(phase*2.015+.15)*color_t +
          color*.31*np.sin(phase*3.37+.3)*np.exp(-t*(decay+6)))
    return wave*np.minimum(t/attack,1)*np.minimum((duration-t)/.045,1)

def noise(duration, center=0.2, decay=12):
    t=time(duration)
    s=rng.normal(0,.64,len(t))
    stride=max(1,round(1/center))
    shape=np.convolve(s,np.ones(stride)/stride,mode='same')
    return shape*np.minimum(t/.012,1)*np.minimum((duration-t)/.014,1)*np.exp(-t*decay)

def put(track, onset, samples, gain=1, wrap=False):
    idx=round(onset*RATE)
    if wrap:
        np.add.at(track,(np.arange(len(samples))+idx)%len(track),samples*gain)
        return
    track[idx:idx+len(samples)] += samples*gain

def write(name, samples, peak):
    vmax=np.max(np.abs(samples))
    samples=samples*(peak/vmax) if vmax else samples
    out=np.rint(np.clip(samples,-1,1)*32767).astype('<i2')
    with wave.open(str(root/(name+'.wav')),'wb') as f:
        f.setparams((1,2,RATE,len(out),'NONE','not compressed'))
        f.writeframes(out.tobytes())
    return len(out)

def hz(midi):return 440*2**((midi-69)/12)

def make_loop(name, bpm, chords, pattern, drive):
    beat=60/bpm
    cycles=4*len(chords)
    out=np.zeros(round(cycles*beat*RATE))
    t=np.arange(len(out))/RATE
    for i,chord in enumerate(chords):
        for bar_note in (0,2.5):
            put(out,(4*i+bar_note)*beat,tone(beat*2.4,hz(chord[0]-12),1.5,color=.42),
                .45+drive*.15,True)
        for offset,degree,octave,gain in pattern:
            f=hz(chord[degree]+octave)
            put(out,(4*i+offset)*beat,tone(beat*1.9,f,4,color=.45),gain,True)
            put(out,(4*i+offset+.42)*beat,tone(beat*1.9,f,4.8,color=.4),gain*.16,True)
        for offset in (0,1.5,3):
            put(out,(4*i+offset)*beat,tone(.25,72,22,end=46,color=.16,attack=.003),drive*.52,True)
        for offset in (.5,2,3.5):
            put(out,(4*i+offset)*beat,noise(.19, .22,18),drive*.2,True)
    # Quiet periodic wind bed with exact loop-period harmonics.
    phase=tau*t/(len(out)/RATE)
    out += .017*np.sin(phase*67)*(.5+.5*np.cos(phase*4))
    out += .011*np.sin(phase*138)*(.5+.5*np.cos(phase*9))
    n=write(name,out,.54)
    music[name]={"file":name+".wav","bpm":bpm,"bars":len(chords),"loopStartFrame":0,"loopEndFrame":n}

chords=[(45,52,57,64),(41,48,53,64),(48,55,60,67),(43,50,55,62),
        (45,52,57,65),(41,48,53,60),(50,57,62,65),(40,47,56,62)]
make_loop('moonlit-gate',82,chords,[(0,2,12,.33),(.75,1,12,.14),(1.5,3,0,.31),(2.5,1,12,.23),(3.25,2,0,.19)],.08)
make_loop('through-the-garden',104,chords+chords[:4],[(0,2,0,.38),(.5,1,12,.18),(1,3,0,.32),
          (1.5,2,12,.17),(2.5,1,12,.28),(3.25,3,0,.20)],.32)
make_loop('warden-toll',122,[(45,52,58,64),(46,53,57,65),(43,50,58,62),(40,47,56,64)]*2,
          [(0,2,0,.50),(.5,0,12,.29),(1.0,1,12,.28),(1.5,2,12,.25),(2.0,0,0,.38),
           (2.5,3,0,.37),(3,1,0,.31),(3.5,2,0,.20)],.59)

events={
'dart':(.17,[(0,.16,660,13,990,1)],(.1,.5,28,.38)),
'impact':(.15,[(0,.13,220,19,113,1)],(.13,.38,26,.45)),
'xp':(.22,[(0,.18,740,13,None,1),(.045,.17,990,14,None,.47)],None),
'dash':(.29,[(0,.25,166,9,530,.52)],(.29,.18,9,.9)),
'hurt':(.32,[(0,.22,160,10,70,1),(.05,.25,217,13,153,.45)],(.23,.32,15,.41)),
'level':(.79,[(0,.55,523,5,None,.8),(.09,.51,659,5,None,.7),(.18,.61,784,4,None,.65)],None),
'select':(.24,[(0,.2,493,13,None,.75),(.041,.19,740,12,None,.46)],None),
'ward':(1.27,[(0,1.21,220,2.8,None,.8),(.17,1.04,330,3.2,None,.55),(.29,.94,440,2.8,None,.5)],None),
'telegraph':(.48,[(0,.21,285,9,None,1),(.20,.26,302,10,None,.76)],None),
'bell':(.68,[(0,.68,283,5,None,.9),(0,.64,414,6,None,.45)],None),
'bloom':(.52,[(0,.43,207,6,178,.54),(.06,.34,329,8,237,.37)],(.46,.12,8,.93)),
'shield':(.36,[(0,.25,950,12,720,.63),(.07,.28,1250,15,930,.6)],(.3,.48,16,.57)),
'meteor':(.68,[(0,.24,540,5,91,.41),(.16,.52,97,7,46,.88)],(.55,.19,9,.6)),
'elite':(1.08,[(0,.61,123,6,None,.68),(.25,.77,185,4.2,None,.8)],(.54,.1,6,.4)),
'boss-arrival':(1.65,[(0,1.6,82,2.1,None,.95),(.38,1.27,123,3.1,None,.8),(.72,.93,174,3.7,None,.46)],None),
'win':(1.5,[(0,.94,440,3,None,.8),(.15,.95,554,3,None,.6),(.3,1.08,659,2.5,None,.62),(.54,.96,880,3,None,.5)],None),
'lose':(1.36,[(0,.85,330,4,None,.68),(.23,.88,262,3.1,None,.67),(.49,.85,196,3,None,.77)],None),
}
for name,(duration,notes,airy) in events.items():
    out=np.zeros(round(duration*RATE))
    for start,length,base,decay,end,volume in notes:
        put(out,start,tone(length,base,decay,end),volume)
    if airy:
        length,c,decay,volume=airy
        put(out,0,noise(length,c,decay),volume)
    write(name,out,.62 if name in ('win','ward','hurt','boss-arrival') else .47)
(root/'audio.json').write_text(json.dumps({"schemaVersion":1,"sampleRate":RATE,"music":music,
                                         "sfx":{key:key+".wav" for key in events}},indent=2)+"\n")
