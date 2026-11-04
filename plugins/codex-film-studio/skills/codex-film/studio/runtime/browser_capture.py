#!/usr/bin/env python3
"""Capture an existing local canvas composition through the user's Ego Lite browser.

The composition owns all drawing and timing. This tool only drives its frame API.
Requires the installed ego-browser CLI and an available Ego Lite connection.
"""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import subprocess
import threading


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--entry',default='index.html')
    p.add_argument('--api',choices=['renderFrame','captureFrame','renderTime'],required=True)
    p.add_argument('--query',default='',help='Composition query parameters, e.g. draft=1')
    p.add_argument('--format',choices=['png','jpeg'],default='png')
    p.add_argument('--source-names',action='store_true',help='Five-digit source frame names for original exporters')
    p.add_argument('--start',type=int,required=True)
    p.add_argument('--end',type=int,required=True)
    p.add_argument('--fps',type=int,default=24)
    p.add_argument('--width',type=int,default=640)
    p.add_argument('--output',type=Path,default=Path('review/browser-frames'))
    p.add_argument('--space',type=int,help='Resume this active Ego task space; leave it open')
    a=p.parse_args();root=Path.cwd().resolve();output=(root/a.output).resolve()
    if not 0<=a.start<a.end or a.fps<=0 or a.width<2 or a.width%2:raise ValueError('Invalid frame range, FPS or width')
    if output.exists():raise FileExistsError(output)
    entry=(root/a.entry).resolve()
    if root not in entry.parents or not entry.is_file():raise ValueError('Entry must exist inside this project')
    class Handler(SimpleHTTPRequestHandler):
        def log_message(self,*args):pass
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(root)))
    thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
    settings=dict(url=f'http://127.0.0.1:{server.server_port}/{a.entry}'+('?' + a.query if a.query else ''),output=str(output),
                  api=a.api,start=a.start,end=a.end,fps=a.fps,width=a.width,format=a.format,sourceNames=a.source_names)
    # JSON is passed as JS data via stdin, never interpolated into a shell command.
    source='const config='+json.dumps(settings)+';\nconst task=await taskSpace('+json.dumps(a.space if a.space else 'Original composition capture')+''');
const p=task.page('p1'),fs=await import('node:fs/promises');
await p.goto(config.url);await p.waitForFunction(()=>window.READY||window.BOOT_ERROR,undefined,{timeout:30000});
const error=await p.evaluate(()=>window.BOOT_ERROR);if(error)throw Error(error);
await fs.mkdir(config.output,{recursive:false});
for(let frame=config.start;frame<config.end;frame++){
 const data=await p.evaluate(async ({frame,api,fps,width,format})=>{
  let sources;
  if(api==='captureFrame')sources=[await window.captureFrame(frame/fps)];
  else {if(api==='renderTime')await window.render(frame/fps);else await window.renderFrame(frame);sources=[...document.querySelectorAll('canvas')];}
  if(!sources.length)throw Error('No composition canvases');
  const c=document.createElement('canvas');c.width=width;c.height=Math.round(width*sources[0].height/sources[0].width/2)*2;
  const g=c.getContext('2d');for(const image of sources)g.drawImage(image,0,0,c.width,c.height);
  return c.toDataURL('image/'+format,.97).split(',')[1];
 },{frame,api:config.api,fps:config.fps,width:config.width,format:config.format});
 const name=String(config.sourceNames?frame:frame-config.start).padStart(config.sourceNames?5:6,'0');
 await fs.writeFile(config.output+'/'+name+(config.format==='jpeg'?'.jpg':'.png'),Buffer.from(data,'base64'),{flag:'wx'});
}
console.log({spaceId:task.spaceId,frames:config.end-config.start,output:config.output});
'''+('' if a.space else 'await task.finish({keep:[]});\n')
    try:subprocess.run(['ego-browser','nodejs'],input=source,text=True,check=True)
    finally:server.shutdown();server.server_close()


if __name__=='__main__':main()
