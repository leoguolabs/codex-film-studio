#!/usr/bin/env python3
"""Cooperatively serialize media work without touching other processes."""
import argparse
import fcntl
from pathlib import Path
import shutil
import subprocess
import sys
import time

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--lock', type=Path, default=Path('/tmp/codex-film-studio-ffmpeg.lock'))
    parser.add_argument('command', nargs=argparse.REMAINDER)
    args = parser.parse_args()
    if not args.command:
        parser.error('Provide a command to run after capacity becomes available.')
    if not shutil.which('pgrep'):
        parser.error('pgrep is required to check existing encoders.')
    with args.lock.open('a+') as lock:
        announced = False
        while True:
            try:
                fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
                scan = subprocess.run(['pgrep', '-x', 'ffmpeg'], capture_output=True, text=True)
                if scan.returncode == 1:
                    break
                fcntl.flock(lock, fcntl.LOCK_UN)
                if scan.returncode not in (0, 1):
                    raise RuntimeError('Unable to inspect running encoders: ' + scan.stderr.strip())
            except BlockingIOError:
                pass
            if not announced:
                print('Waiting for shared encoder capacity; other jobs remain untouched.', flush=True)
                announced = True
            time.sleep(3)
        return subprocess.call(args.command)

if __name__ == '__main__':
    sys.exit(main())
