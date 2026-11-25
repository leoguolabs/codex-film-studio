"""Play an authored chord chart on nylon guitar, acoustic bass, shaker and a soft mallet."""
import argparse
import json
import subprocess
from pathlib import Path

import mido
import numpy as np
import soundfile as sf

root=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser(description=__doc__)
p.add_argument("soundfont",type=Path)
args=p.parse_args()
chart=json.loads((root/"content/score.json").read_text())
tempo=chart["bpm"]
beat=60/tempo
rng=np.random.default_rng(chart.get("seed",81))
duration=json.loads((root/"content/narration.json").read_text())["duration"]
midi=mido.MidiFile(ticks_per_beat=480)
tracks={}
for channel,program in [(0,24),(1,32),(2,11),(9,0)]:
    tracks[channel]=[]
    tr=mido.MidiTrack();midi.tracks.append(tr)
    if channel==0:tr.append(mido.MetaMessage("set_tempo",tempo=mido.bpm2tempo(tempo)))
    tr.append(mido.Message("program_change",channel=channel,program=program))
def note(ch,pitch,t,length,velocity):
    if t<0 or t>=duration:return
    tick=lambda s:round(s/beat*480)
    tracks[ch].append((tick(t),mido.Message("note_on",channel=ch,note=pitch,velocity=int(np.clip(velocity,1,127)))))
    tracks[ch].append((tick(min(duration,t+length)),mido.Message("note_off",channel=ch,note=pitch,velocity=0)))
sections=chart["sections"]
for bar in range(int(np.ceil(duration/(beat*4)))):
    at=bar*4*beat
    active=[s for s in sections if s["bar"]<=bar]
    if not active:continue
    s=active[-1]
    if not s.get("chords"):continue
    names=s["chords"]; ch=chart["voicings"][names[(bar-s["bar"])%len(names)]]
    bass,*tones=ch
    dynamic=s.get("level",1)
    for pos in s.get("guitar",[.0,1.5,2.75]):
        for j,n in enumerate(tones):
            note(0,n,at+pos*beat+j*.016+rng.uniform(0,.009),beat*.92,(49+rng.integers(-6,7))*dynamic)
    if s.get("bass",True):
        note(1,bass,at,beat*1.45,67*dynamic)
        note(1,bass+7,at+2*beat,beat*1.05,54*dynamic)
    if s.get("shaker",True):
        for j in range(8):note(9,82,at+(j*.5+.015*(j%2))*beat,.09,(30+12*(j%2))*dynamic)
for t,n in chart.get("mallet",[]):note(2,n,t,1.1*beat,54)
for tr,events in zip(midi.tracks,tracks.values()):
    prev=0
    for tick,msg in sorted(events,key=lambda q:q[0]):
        tr.append(msg.copy(time=tick-prev));prev=tick
(root/"audio").mkdir(exist_ok=True)
mid=root/"audio/score.mid"; midiwav=root/"audio/score.wav"
midi.save(mid)
subprocess.run(["fluidsynth","-ni","-r","24000","-g",".65","-F",str(midiwav),str(args.soundfont),str(mid)],check=True)
wav,sr=sf.read(midiwav,dtype="float32",always_2d=True)
track=np.zeros((round(duration*sr),2),dtype=np.float32)
l=min(len(track),len(wav)); track[:l]=wav[:l]
sec=np.arange(len(track))/sr
env=np.minimum(1,np.clip((duration-sec)/2.4,0,1))
for left,right in chart.get("rests",[]):
    env*=np.clip(np.maximum((left-sec)/.2,(sec-right)/.13),0,1)
sf.write(midiwav,track*env[:,None],sr,subtype="PCM_24")
