#!/usr/bin/env python3
"""Recheck a delivery against its build receipt, including all decoded frames."""
import argparse
import json
from pathlib import Path
from build import probe, run, sha

p=argparse.ArgumentParser(description=__doc__)
p.add_argument('file',type=Path)
a=p.parse_args()
r=json.loads(a.file.with_suffix('.json').read_text())
if sha(a.file)!=r['sha256']:raise ValueError('Delivery hash changed')
info=probe(a.file)
v=next(s for s in info['streams'] if s['codec_type']=='video')
if int(v['nb_frames'])!=r['frames']:raise ValueError('Frame count changed')
if r['audio'] and not any(s['codec_type']=='audio' for s in info['streams']):raise ValueError('Missing audio')
run(['ffmpeg','-v','error','-xerror','-i',a.file,'-f','null','-'])
print('Hash, streams and complete decode passed. Visual, motion and listening review remain separate.')
