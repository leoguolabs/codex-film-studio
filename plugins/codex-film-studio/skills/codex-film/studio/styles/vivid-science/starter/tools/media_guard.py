#!/usr/bin/env python3
"""Serialize media commands and wait for another ffmpeg process before starting."""
import fcntl,subprocess,time,sys,pathlib,os
lock=open('/tmp/codex-film-ffmpeg.lock','a+')
fcntl.flock(lock,fcntl.LOCK_EX)
while True:
 p=subprocess.run(['pgrep','-x','ffmpeg'],capture_output=True,text=True)
 if p.returncode!=0:break
 print('Waiting for existing ffmpeg PIDs:',p.stdout.strip().replace('\n',','),flush=True);time.sleep(10)
print('Media slot acquired',flush=True)
r=subprocess.run(sys.argv[1:]);sys.exit(r.returncode)
