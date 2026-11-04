#!/usr/bin/env python3
"""Acquire a film source bundle from a supplied local or HTTPS release index."""
import argparse
import json
from pathlib import Path
import urllib.request
from urllib.parse import urljoin
from reproduction import acquire


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--index',required=True,help='Trusted supplier index JSON path or HTTPS URL')
    p.add_argument('--style',required=True)
    p.add_argument('--output',required=True,type=Path)
    a=p.parse_args()
    remote=a.index.startswith('https://')
    if remote:
        with urllib.request.urlopen(a.index,timeout=60) as response:
            data=json.loads(response.read(2*1024*1024))
    else:data=json.loads(Path(a.index).read_text())
    entries=data if isinstance(data,list) else data['bundles']
    matches=[e for e in entries if e['style']==a.style]
    if len(matches)!=1:raise ValueError('Index must identify exactly one bundle for this style')
    entry=matches[0]; name=entry['file']
    if Path(name).name!=name or name in ['.','..'] or '\\' in name:raise ValueError('Archive name must be a basename')
    source=entry.get('url') or (urljoin(a.index,name) if remote else str(Path(a.index).resolve().parent/name))
    if entry.get('url') and not source.startswith('https://'):raise ValueError('Public source URL must use HTTPS')
    print(acquire(source,a.output,entry['sha256']))


if __name__=='__main__':main()
