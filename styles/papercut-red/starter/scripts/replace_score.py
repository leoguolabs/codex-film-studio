"""Edit a retained score under existing speech and Foley and copy the accepted picture stream."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import wave

import numpy as np

from mix import RATE, write_wav

ROOT = Path(__file__).resolve().parents[1]
SERIAL = [sys.executable, str(ROOT/'scripts/ffmpeg_serial.py'), '--', '-hide_banner', '-nostdin']


def stereo_wav(path):
    with wave.open(str(path),'rb') as source:
        if (source.getnchannels(), source.getsampwidth(), source.getframerate()) != (2,2,RATE):
            raise ValueError(f'Expected stereo PCM16 at {RATE} Hz: {path}')
        data = np.frombuffer(source.readframes(source.getnframes()), dtype='<i2')
    return data.reshape(-1,2).astype(np.float32)/32768


def db(value):
    return 20*np.log10(max(float(value),1e-9))


def gain(value_db):
    return 10**(value_db/20)


def hash_file(path):
    with path.open('rb') as raw:
        return hashlib.file_digest(raw,'sha256').hexdigest()


def sample_at(t):
    return round(t*RATE)


def level_line(length, points):
    time,value = zip(*points)
    if any(a>=b for a,b in zip(time,time[1:])):
        raise ValueError('Music level points must be in strictly increasing time order.')
    return np.interp(np.arange(length)/RATE,time,value).astype(np.float32)


def smooth_ramp(width,start,end):
    x=np.linspace(0,1,width,endpoint=False,dtype=np.float32)
    return start+(end-start)*x*x*(3-2*x)


def excerpts(source, config, size):
    result=np.zeros((size,2),dtype=np.float32)
    previous_end=0
    for cue in config['segments']:
        first=sample_at(cue['source_start'])
        duration=sample_at(cue['duration'])
        place=sample_at(cue['film_start'])
        crossfade=sample_at(cue.get('crossfade',0))
        stop=place+duration
        if first<0 or place<0 or duration<=0 or first+duration>len(source) or stop>size:
            raise ValueError(f'Score passage lies outside audio or edit: {cue}')
        if crossfade!=max(0,previous_end-place) or crossfade>=duration:
            raise ValueError(f'Score overlap must equal the specified crossfade: {cue}')
        target=result[place:stop]
        read=source[first:first+duration]
        if crossfade:
            p=smooth_ramp(crossfade,0,1)[:,None]
            target[:crossfade]=target[:crossfade]*(1-p)+read[:crossfade]*p
        target[crossfade:]=read[crossfade:]
        previous_end=stop
    return result


def voice_duck(length,cues,db_under_voice):
    duck=np.ones(length,dtype=np.float32)
    level=gain(db_under_voice)
    for cue in cues:
        start=sample_at(cue['start'])
        end=min(length,sample_at(cue['speech_end']))
        lead=max(0,start-sample_at(.16))
        tail=min(length,end+sample_at(.38))
        duck[lead:start]=np.minimum(duck[lead:start],smooth_ramp(start-lead,1,level))
        duck[start:end]=np.minimum(duck[start:end],level)
        duck[end:tail]=np.minimum(duck[end:tail],smooth_ramp(tail-end,level,1))
    return duck


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--video',type=Path,required=True,help='Accepted MP4 whose picture will be copied.')
    parser.add_argument('--design',type=Path,required=True)
    parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args()
    args.output=args.output.resolve()
    args.output.parent.mkdir(parents=True,exist_ok=True)
    if args.video.resolve()==args.output:
        raise ValueError('Use a different output path to keep the accepted picture.')
    design=json.loads(args.design.read_text())
    source=ROOT/design['source']
    if design['source_sha256']!=hash_file(source):
        raise ValueError('The downloaded score does not match the approved source hash.')
    cues=json.loads((ROOT/'content/cues.json').read_text())
    voice=stereo_wav(ROOT/'audio/voice.wav')
    foley=stereo_wav(ROOT/'audio/foley.wav')
    size=len(voice)
    if len(foley)!=size:
        raise ValueError('Voice and Foley lengths differ.')
    with tempfile.TemporaryDirectory(prefix='papercut-score-') as temp:
        pcm=Path(temp)/'source.wav'
        subprocess.run([*SERIAL,'-v','error','-xerror','-y','-i',str(source),'-map','0:a:0',
                        '-ac','2','-ar',str(RATE),'-c:a','pcm_s16le',str(pcm)],check=True)
        recording=stereo_wav(pcm)
    score=excerpts(recording,design,size)
    windows=score[:size-size%(RATE//10)].reshape(-1,RATE//10,2)
    rms=np.sqrt(np.mean(windows**2,axis=(1,2)))
    active=rms[rms>.003]
    if not len(active):
        raise ValueError('The selected score has no audible PCM.')
    raw_level=float(np.median(active))
    score*=gain(design['music_median_rms_dbfs']-db(raw_level))
    score*=gain(level_line(size,design['music_envelope_db']))[:,None]
    for side,name in [('head','fade_in'),('tail','fade_out')]:
        width=sample_at(design[name])
        if not 0<width<size:
            raise ValueError(f'Invalid edge fade: {name}')
        if side=='head':
            score[:width]*=smooth_ramp(width,0,1)[:,None]
        else:
            score[-width:]*=smooth_ramp(width,1,0)[:,None]
    duck=voice_duck(size,cues,design['music_duck_db'])
    ducked=score*duck[:,None]
    ducked_foley=foley*(.61+.39*voice_duck(size,cues,-9))[:,None]
    full=voice+ducked_foley+ducked
    peak=float(np.max(np.abs(full)))
    applied=min(1,.9/max(1e-9,peak))
    full*=applied
    folder=args.design.resolve().parent
    write_wav(folder/'score-edited.wav',score)
    write_wav(folder/'score-in-mix.wav',ducked)
    write_wav(folder/'mix-pre-encode.wav',full)
    stage=args.output.with_name(args.output.stem+'-in-progress.mp4')
    audio_filter='loudnorm=I=-14:TP=-1.5:LRA=9'
    trim=design.get('master_trim_db',0)
    if trim:
        audio_filter+=f',volume={trim}dB'
    subprocess.run([*SERIAL,'-v','error','-xerror','-y','-i',str(args.video.resolve()),
                    '-i',str(folder/'mix-pre-encode.wav'),'-map','0:v:0','-map','1:a:0',
                    '-map_metadata','0','-c:v','copy','-af',audio_filter,
                    '-ar',str(RATE),'-c:a','aac','-b:a','256k','-metadata:s:a:0','language=eng',
                    '-movflags','+faststart',str(stage)],check=True)
    stage.replace(args.output)
    results={'video_input_sha256':hash_file(args.video),'video_output_sha256':hash_file(args.output),
             'score_source_sha256':hash_file(source),'duration':size/RATE,
             'source_median_active_rms_dbfs':round(db(raw_level),2),
             'premaster_peak_dbfs':round(db(np.max(np.abs(full))),2),
             'global_protective_gain_db':round(db(applied),2),'post_normalization_trim_db':trim,
             'voice_and_foley_timeline':'Original retained PCM stems with the existing cues and Foley ducking.',
             'rendered_stems':['score-edited.wav','score-in-mix.wav','mix-pre-encode.wav']}
    (folder/'mix-report.json').write_text(json.dumps(results,indent=2)+'\n')
    print(args.output, results['video_output_sha256'])


if __name__=='__main__':
    main()
