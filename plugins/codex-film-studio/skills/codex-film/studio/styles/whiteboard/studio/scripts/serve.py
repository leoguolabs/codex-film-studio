#!/usr/bin/env python3
"""Local showcase server with byte ranges for precise video seeking."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


class MediaHandler(SimpleHTTPRequestHandler):
    def send_head(self):
        path = Path(self.translate_path(self.path))
        header = self.headers.get("Range")
        self.byte_count = None
        if not header or not path.is_file():
            return super().send_head()
        match = re.fullmatch(r"bytes=(\d*)-(\d*)", header.strip())
        size = path.stat().st_size
        if not match or not size:
            self.send_error(416, "Unsupported byte range")
            return None
        left, right = match.groups()
        if not left and not right:
            self.send_error(416, "Empty byte range")
            return None
        start = int(left) if left else max(0, size-int(right))
        end = min(size-1, int(right)) if left and right else size-1
        if start >= size or start > end:
            self.send_response(416)
            self.send_header("Content-Range", f"bytes */{size}")
            self.end_headers()
            return None
        handle = path.open("rb")
        handle.seek(start)
        self.byte_count = end-start+1
        self.send_response(206)
        self.send_header("Content-Type", self.guess_type(str(path)))
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        self.send_header("Content-Length", str(self.byte_count))
        self.send_header("Last-Modified", self.date_time_string(path.stat().st_mtime))
        self.end_headers()
        return handle

    def copyfile(self, source, outputfile):
        if self.byte_count is None:
            return super().copyfile(source, outputfile)
        remaining = self.byte_count
        try:
            while remaining:
                chunk = source.read(min(remaining, 128*1024))
                if not chunk:
                    break
                outputfile.write(chunk)
                remaining -= len(chunk)
        except (BrokenPipeError, ConnectionResetError):
            pass


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8246)
    parser.add_argument("--directory", type=Path, default=ROOT)
    args = parser.parse_args()
    server = ThreadingHTTPServer(("127.0.0.1", args.port),
                                partial(MediaHandler, directory=str(args.directory.resolve())))
    print(f"Whiteboard Studio: http://127.0.0.1:{args.port}", flush=True)
    server.serve_forever()
