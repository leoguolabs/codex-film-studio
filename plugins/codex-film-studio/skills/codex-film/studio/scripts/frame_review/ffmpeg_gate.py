"""Serialize this film's FFmpeg calls; respect unrelated encoders already running."""
import fcntl, os, subprocess, sys, time
from pathlib import Path


def running_ffmpeg():
    rows = subprocess.check_output(['ps', '-axo', 'pid=,comm='], text=True).splitlines()
    return [int(row.split(None, 1)[0]) for row in rows if len(row.split(None, 1)) == 2 and Path(row.split(None, 1)[1]).name == 'ffmpeg']


def run(args, **kwargs):
    lock_path = Path('/tmp/codex-film-ffmpeg.lock')
    with lock_path.open('a+') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        previous = None
        while busy := running_ffmpeg():
            if busy != previous:
                print(f'Waiting for existing FFmpeg processes {busy}', file=sys.stderr, flush=True)
                previous = busy
            time.sleep(3)
        return subprocess.run(['ffmpeg', *args], check=True, **kwargs)

if __name__ == '__main__':
    run(sys.argv[1:])
