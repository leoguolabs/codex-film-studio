#!/usr/bin/env python3
"""Preview this independent project over loopback HTTP."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--port',type=int,default=8249)
a=p.parse_args()
root=Path(__file__).resolve().parents[2]
print(f'Open http://127.0.0.1:{a.port}/media/preview.mp4 or /media/film.mp4',flush=True)
ThreadingHTTPServer(('127.0.0.1',a.port),partial(SimpleHTTPRequestHandler,directory=str(root))).serve_forever()
