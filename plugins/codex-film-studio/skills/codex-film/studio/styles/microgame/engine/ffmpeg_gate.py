"""Run one command while serializing all cooperating studio FFmpeg jobs.
Also wait for unrelated live FFmpeg processes. Never remove another lock or kill
another process. A lock file alone is not evidence that a job is alive.
"""
import fcntl,subprocess,time,sys,os,json
from pathlib import Path
if len(sys.argv)<2:raise SystemExit('usage: ffmpeg_gate.py COMMAND ...')
lock=Path('/tmp/codex-film-studio-ffmpeg.lock').open('a+')
fcntl.flock(lock,fcntl.LOCK_EX)
last=None
while True:
 r=subprocess.run(['pgrep','-x','ffmpeg'],capture_output=True,text=True)
 pids=r.stdout.split()
 if not pids:break
 if pids!=last:print('Waiting for live FFmpeg PIDs: '+','.join(pids),file=sys.stderr,flush=True);last=pids
 time.sleep(5)
print('FFmpeg slot acquired by '+str(os.getpid()),file=sys.stderr,flush=True)
raise SystemExit(subprocess.call(sys.argv[1:]))
