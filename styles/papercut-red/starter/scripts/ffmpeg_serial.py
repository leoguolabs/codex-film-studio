#!/usr/bin/env python3
"""Run one FFmpeg command after existing FFmpeg processes finish (POSIX)."""
import fcntl
import os
from pathlib import Path
import subprocess
import sys
import time


def active_ffmpeg():
    rows = subprocess.check_output(['ps', '-axo', 'pid=,comm='], text=True)
    return [int(row.split(None, 1)[0]) for row in rows.splitlines()
            if len(row.split(None, 1)) == 2 and
            Path(row.split(None, 1)[1].strip()).name == 'ffmpeg']


def main():
    args = sys.argv[1:]
    if args and args[0] == '--':
        args.pop(0)
    if not args:
        raise SystemExit('Usage: ffmpeg_serial.py -- <ffmpeg arguments>')
    lockpath = Path(os.environ.get('TMPDIR', '/tmp')) / 'codex-film-ffmpeg.lock'
    with lockpath.open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        last_pids = None
        last_notice = 0.0
        while True:
            pids = active_ffmpeg()
            if not pids:
                break
            now = time.monotonic()
            if pids != last_pids or now - last_notice >= 60:
                print('Waiting for existing FFmpeg process(es):', pids, file=sys.stderr, flush=True)
                last_pids, last_notice = pids, now
            time.sleep(5)
        result = subprocess.run(['ffmpeg', *args])
        raise SystemExit(result.returncode)


if __name__ == '__main__':
    main()
