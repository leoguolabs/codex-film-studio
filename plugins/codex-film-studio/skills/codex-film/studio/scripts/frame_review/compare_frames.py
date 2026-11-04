#!/usr/bin/env python3
"""Decode and pair every frame by visual function; never certify visual equivalence.

Usage:
  python compare_frames.py output.mp4 reference.mp4 timeline.json mapping.json review

All inputs and output directories belong to an external film project.
The candidate must cover the supplied timeline unless --allow-partial is explicit.
PyAV decodes in-process; this command does not invoke the ffmpeg executable.
To serve an external project with seekable byte ranges:
  python compare_frames.py serve /absolute/path/to/project --port 8876
"""
from __future__ import annotations

import argparse
from bisect import bisect_right
import csv
from datetime import datetime, timezone
import hashlib
import html
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from io import BytesIO
import json
import os
from pathlib import Path
import re
import sys
import time
from urllib.parse import quote

import av

try:
    from .frame_color import COLOR_POLICY, rgb_frame
except ImportError:
    from frame_color import COLOR_POLICY, rgb_frame
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageOps

from audit_frames import PALETTE, palette_ratios, sha256

THUMB = (160, 90)
PAIR_COLUMNS, PAIRS_PER_PAGE = 5, 50
CELL_W, CELL_H, PAGE_TOP = 328, 112, 40


class RangeRequestHandler(SimpleHTTPRequestHandler):
    """Local review-only static server with HTTP single-byte-range support."""

    def send_head(self):
        self._range_remaining = None
        requested = self.headers.get('Range')
        path = Path(self.translate_path(self.path))
        if not requested or not path.is_file():
            return super().send_head()
        match = re.fullmatch(r'bytes=(\d*)-(\d*)', requested.strip())
        source = path.open('rb')
        stat = os.fstat(source.fileno())
        modified = self.date_time_string(stat.st_mtime)
        if self.headers.get('If-Range') not in (None, modified):
            source.close()
            return super().send_head()
        size = stat.st_size
        if match and any(match.groups()):
            first, last = match.groups()
            if first:
                start, end = int(first), min(int(last) if last else size - 1, size - 1)
            else:
                start, end = max(0, size - int(last)), size - 1
        else:
            start, end = size, -1
        if start >= size or start > end or (match and match.group(1) == '' and match.group(2) == '0'):
            source.close()
            self.send_response(416)
            self.send_header('Content-Range', f'bytes */{size}')
            self.send_header('Content-Length', '0')
            self.end_headers()
            return None
        source.seek(start)
        self._range_remaining = end - start + 1
        self.send_response(206)
        self.send_header('Content-Type', self.guess_type(str(path)))
        self.send_header('Content-Length', str(self._range_remaining))
        self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
        self.send_header('Last-Modified', modified)
        self.end_headers()
        return source

    def end_headers(self):
        self.send_header('Accept-Ranges', 'bytes')
        super().end_headers()

    def copyfile(self, source, outputfile):
        remaining = self._range_remaining
        try:
            while remaining is None or remaining > 0:
                data = source.read(min(1024 * 1024, remaining) if remaining is not None else 1024 * 1024)
                if not data:
                    break
                outputfile.write(data)
                if remaining is not None:
                    remaining -= len(data)
        except (BrokenPipeError, ConnectionResetError):
            pass  # A seek or closed tab may cancel an in-progress video request.


def serve(argv):
    parser = argparse.ArgumentParser(description='Serve local comparison files with video seeking; loopback only.')
    parser.add_argument('directory', type=Path)
    parser.add_argument('--port', type=int, default=8876)
    args = parser.parse_args(argv)
    directory = args.directory.resolve()
    if not directory.is_dir():
        parser.error('directory must exist')
    def handler(*handler_args, **handler_kwargs):
        return RangeRequestHandler(*handler_args, directory=str(directory), **handler_kwargs)
    with ThreadingHTTPServer(('127.0.0.1', args.port), handler) as server:
        print(f'Seekable local review server: http://127.0.0.1:{args.port}/ ; directory={directory}', flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
    return 0


def dump(path, value):
    Path(path).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def font(size=14):
    for name in ['/System/Library/Fonts/Supplemental/Arial.ttf',
                 '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf']:
        if Path(name).exists():
            return ImageFont.truetype(name, size)
    return ImageFont.load_default()


def timestamp(frame, index, fps):
    return float(frame.pts * frame.time_base) if frame.pts is not None and frame.time_base else index / fps


def stream_info(stream):
    rate = stream.average_rate or stream.guessed_rate or stream.base_rate
    if not rate:
        raise ValueError('The stream has no usable frame rate; an implicit rate would mislabel frame correspondence')
    return {'codec': stream.codec_context.name, 'reported_fps': float(rate),
            'reported_rate': str(rate), 'reported_frames': stream.frames,
            'time_base': str(stream.time_base), 'width': stream.width, 'height': stream.height}


def measure(frame, width=320):
    height = max(2, round(frame.height * width / frame.width))
    pixels = rgb_frame(frame, width=width, height=height).to_ndarray()
    rgb = pixels.astype(np.float32) / 255
    luma = rgb @ np.array([.2126, .7152, .0722], dtype=np.float32)
    gx = np.diff(luma, axis=1, append=luma[:, -1:])
    gy = np.diff(luma, axis=0, append=luma[-1:, :])
    gradient = np.hypot(gx, gy)
    values = {'mean_luma': round(float(luma.mean()), 7),
              'edge_density': round(float((gradient >= .12).mean()), 7),
              'edge_strength': round(float(gradient.mean()), 7)}
    values.update({f'palette_{key}': value for key, value in palette_ratios(rgb).items()})
    thumbnail = ImageOps.pad(Image.fromarray(pixels), THUMB, Image.Resampling.LANCZOS, color='#171717')
    return values, thumbnail


def jpeg_bytes(image):
    buffer = BytesIO(); image.save(buffer, 'JPEG', quality=92, subsampling=0)
    return buffer.getvalue()


def relative_url(path, base):
    return quote(os.path.relpath(Path(path).resolve(), Path(base).resolve()), safe='/.-_')


def read_reference(path, output):
    """Full sequential decode. Retain compressed thumbnails, not the full-size sequence."""
    rows, thumbs, dimensions = [], [], set()
    with av.open(str(path)) as container:
        stream = container.streams.video[0]; stream.thread_type = 'AUTO'
        info = stream_info(stream); fps = info['reported_fps']; first_time = None; last_time = None
        with (output / 'reference-frames.jsonl').open('w') as audit_file:
            for index, frame in enumerate(container.decode(stream)):
                actual = timestamp(frame, index, fps)
                if first_time is None: first_time = actual
                seconds = actual - first_time
                if last_time is not None and seconds <= last_time:
                    raise ValueError(f'Reference PTS is not strictly increasing at frame {index}')
                values, thumb = measure(frame)
                row = {'frame_index': index, 'pts': frame.pts,
                       'time_base': str(frame.time_base), 'timestamp_seconds': seconds,
                       'absolute_timestamp_seconds': actual,
                       'timestamp_source': 'pts' if frame.pts is not None else 'index_fallback',
                       'width': frame.width, 'height': frame.height, **values}
                rows.append(row); thumbs.append(jpeg_bytes(thumb)); dimensions.add((frame.width, frame.height))
                audit_file.write(json.dumps(row, ensure_ascii=False) + '\n'); last_time = seconds
                if (index + 1) % 1000 == 0: print(f'Reference decoded {index + 1} frames', flush=True)
    if not rows: raise ValueError('Reference has no decoded video frames')
    info.update(decoded_frames=len(rows), first_absolute_timestamp=first_time,
                last_timestamp_seconds=rows[-1]['timestamp_seconds'], dimensions=sorted(dimensions),
                missing_pts_frames=sum(r['pts'] is None for r in rows))
    return info, rows, thumbs


def nearest_index(times, value, lower, upper):
    index = int(np.searchsorted(times, value))
    options = [i for i in [index - 1, index] if lower <= i <= upper]
    if not options: return lower if index < lower else upper
    return min(options, key=lambda i: (abs(float(times[i]) - value), i))


def prepare_shots(timeline, mapping, reference_rows, fps):
    shots = timeline['shots']; mapping_rows = mapping['shots']
    by_id = {str(row['shot_id']): row for row in mapping_rows}
    ids = [str(s['id']) for s in shots]
    if len(by_id) != len(mapping_rows) or set(ids) != set(by_id):
        raise ValueError('Reference map must contain exactly one entry for each supplied timeline shot')
    times = np.array([r['timestamp_seconds'] for r in reference_rows])
    duration = times[-1] + 1 / fps
    previous_end = 0
    prepared = []
    for shot in shots:
        if int(shot['start']) != previous_end or int(shot['end']) <= int(shot['start']):
            raise ValueError('Timeline must have contiguous, nonempty, zero-based shot intervals')
        previous_end = int(shot['end'])
        match = by_id[str(shot['id'])]
        if match['scene_type'] != shot['scene_type']:
            raise ValueError(f'Scene type changed for shot {shot["id"]}; refresh reference-map.json')
        start, end = float(match['reference_start_seconds']), float(match['reference_end_seconds_exclusive'])
        if not (0 <= start < end <= duration + 1e-6):
            raise ValueError(f'Invalid reference interval for shot {shot["id"]}: {start}–{end}')
        first = int(np.searchsorted(times, start, side='left'))
        last = int(np.searchsorted(times, end, side='left')) - 1
        if last < first: raise ValueError('Reference interval contains no decoded frame')
        prepared.append({**shot, 'reference_match': match, 'reference_first_frame': first,
                         'reference_last_frame': last})
    if int(timeline.get('duration_frames', previous_end)) != previous_end:
        raise ValueError('Timeline duration_frames disagrees with its shot ranges')
    return prepared, times


def write_html(path, output, final_path, reference_path, rows, shots, sheets, large, report):
    """One self-contained data/viewer file. No fetch or external library is required."""
    path = path.resolve(); path.parent.mkdir(parents=True, exist_ok=True)
    data = {
        'purpose': report['purpose'], 'finalHash': report['inputs']['final']['sha256'],
        'referenceHash': report['inputs']['reference']['sha256'],
        'frames': [[r['reference_frame'], r['final_timestamp_seconds'], r['reference_timestamp_seconds'], r['shot_id']] for r in rows],
        'shots': [{'id': s['id'], 'headline': s.get('headline', ''),
                   'scene_type': s['scene_type'], 'start': s['available_first_frame'],
                   'end': s['available_last_frame'], 'function': s['reference_match']['visual_function']}
                  for s in shots if s['available_first_frame'] is not None],
        'sheets': [{**s, 'url': relative_url(output / s['path'], path.parent)} for s in sheets],
        'large': [{**item, 'url': relative_url(output / item['path'], path.parent)} for item in large],
        'coverage': report['coverage'],
        'layout': {'columns': PAIR_COLUMNS, 'cellW': CELL_W, 'cellH': CELL_H, 'top': PAGE_TOP},
        'links': {name: relative_url(output / filename, path.parent) for name, filename in
                  [('coverage', 'coverage.json'), ('map', 'frame-map.json'), ('csv', 'frame-map.csv'),
                   ('review', 'visual-review-template.json')]},
    }
    encoded = json.dumps(data, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c')
    title = '旧试片工具验证 — 不属于最终验收' if report['purpose'] == 'trial' else '最终候选片逐帧对照 — 尚未人工验收'
    source = HTML_TEMPLATE.replace('__TITLE__', html.escape(title)).replace('__DATA__', encoded)
    source = source.replace('__FINAL_URL__', html.escape(relative_url(final_path, path.parent), quote=True))
    source = source.replace('__REF_URL__', html.escape(relative_url(reference_path, path.parent), quote=True))
    path.write_text(source)


HTML_TEMPLATE = r'''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>逐帧风格对照</title>
<style>
:root{color-scheme:dark;font-family:system-ui,sans-serif;background:#181c1b;color:#eee9dc}*{box-sizing:border-box}body{max-width:1660px;margin:auto;padding:24px}h1{font-size:25px;margin:0 0 12px}p{line-height:1.55}.note{padding:14px 18px;border-left:4px solid #c79759;background:#292a24}.controls{display:flex;gap:9px;flex-wrap:wrap;align-items:center;margin:20px 0}button,select,input,textarea{background:#303832;color:#f4f0e2;border:1px solid #738075;border-radius:4px;padding:9px;font:inherit}button{cursor:pointer}button:hover{background:#445347}input[type=range]{width:min(100%,640px);padding:0}input[type=number]{width:120px}.videos{display:grid;grid-template-columns:1fr 1fr;gap:16px}video{width:100%;background:#090909}h2{font-size:17px}.frameLabel{font:14px monospace;color:#c8d5bd}a{color:#a8d3c0}.exact{max-width:960px;width:100%;image-rendering:auto;border:1px solid #526054}.links{display:flex;gap:18px;flex-wrap:wrap}.large{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.large img{width:100%}textarea{width:100%;min-height:85px}.sheetgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:8px}.sheetgrid a{padding:10px;background:#252d28}pre{max-height:300px;overflow:auto;font-size:12px}.fine{font-size:13px;color:#bac3b7}@media(max-width:800px){.videos,.large{grid-template-columns:1fr}body{padding:14px}}
</style><h1>__TITLE__</h1><div class="note"><strong>按视觉功能匹配</strong>：每个镜头按相对进度映射到参考段落。两片内容、人物、文字和镜头时长不同，不能做同内容像素对齐。配色与边缘统计仅描述差异，不能转换成“100%相似”。<br>自动生成 ≠ 已目视审看。浏览器视频定位可能落在附近帧；精确解码帧看下方接触表裁片或完整接触表。</div>
<div class="controls"><label>镜头 <select id="shot"></select></label><button id="prev">前 1 帧</button><button id="next">后 1 帧</button><label>成片帧 <input id="number" type="number" min="0" value="0"></label><input id="slider" type="range" min="0" value="0"><label><input id="follow" type="checkbox" checked> 参考跟随定位</label></div>
<p id="function"></p><div class="videos"><section><h2>成片 / 当前输入</h2><video id="final" controls preload="metadata" src="__FINAL_URL__"></video><div id="finalLabel" class="frameLabel"></div></section><section><h2>参考原片</h2><video id="reference" controls preload="metadata" src="__REF_URL__"></video><div id="referenceLabel" class="frameLabel"></div></section></div>
<h2>当前解码帧对（原缩略图各 160 × 90）</h2><canvas id="exact" class="exact" width="640" height="180"></canvas><p><a id="currentSheet" target="_blank">打开当前完整逐帧接触表</a> · <span id="status">尚未记录实际审看</span></p>
<h2>当前镜头的三张较大对照</h2><div id="large" class="large"></div>
<h2>人工审看记录</h2><p class="fine">下列记录仅在你明确点击后写入此浏览器本地存储，绑定输入文件哈希；页面加载、播放或生成图片不会自动标记通过。导出后自行保存到项目审看记录中。</p><textarea id="note" placeholder="写下本帧/本页实际看到的构图、运动、遮挡、差异和待修问题。"></textarea><div class="controls"><button id="markFrame">记录当前帧已实际目视</button><button id="markPage">记录当前整页已逐格目视</button><button id="exportReview">导出人工记录 JSON</button></div>
<h2>自动覆盖证据</h2><div class="links"><a id="coverageLink">coverage.json</a><a id="mapLink">frame-map.json</a><a id="csvLink">frame-map.csv</a><a id="reviewLink">空白审看模板</a></div><pre id="coverage"></pre><h2>全部逐帧接触表</h2><div id="sheets" class="sheetgrid"></div>
<script id="data" type="application/json">__DATA__</script><script>
const data=JSON.parse(document.getElementById('data').textContent),$=id=>document.getElementById(id),frames=data.frames,finalVideo=$('final'),referenceVideo=$('reference');let current=0,requested=0,sheetImage=new Image(),sheetURL='';
const storageKey='collage-review-'+data.finalHash+'-'+data.referenceHash;let manual=[];try{manual=JSON.parse(localStorage.getItem(storageKey)||'[]')}catch(e){}
const setText=(id,text)=>{$(id).textContent=text};$('slider').max=$('number').max=frames.length-1;
for(const shot of data.shots){const option=document.createElement('option');option.value=shot.id;option.textContent=shot.id+' · '+shot.headline;$('shot').append(option)}
for(const [id,key] of [['coverageLink','coverage'],['mapLink','map'],['csvLink','csv'],['reviewLink','review']])$(id).href=data.links[key];
setText('coverage',JSON.stringify(data.coverage,null,2));
for(const sheet of data.sheets){const a=document.createElement('a');a.href=sheet.url;a.target='_blank';a.textContent='F '+sheet.first_frame+'–'+sheet.last_frame+' · '+sheet.pairs+' 对';$('sheets').append(a)}
function loadLarge(id){$('large').replaceChildren();for(const item of data.large.filter(v=>v.shot_id===id)){const a=document.createElement('a');a.href=item.url;a.target='_blank';const img=document.createElement('img');img.src=item.url;img.loading='lazy';img.alt='F '+item.final_frame+' / R '+item.reference_frame;const caption=document.createElement('p');caption.textContent=img.alt;a.append(img,caption);$('large').append(a)}}
function exactFrame(index){const sheet=data.sheets[Math.floor(index/50)],cell=index-sheet.first_frame,x=(cell%5)*data.layout.cellW,y=data.layout.top+Math.floor(cell/5)*data.layout.cellH+18;const canvas=$('exact'),ctx=canvas.getContext('2d');const paint=()=>{if(index!==current)return;ctx.fillStyle='#111';ctx.fillRect(0,0,640,180);ctx.drawImage(sheetImage,x,y,160,90,0,0,320,180);ctx.drawImage(sheetImage,x+168,y,160,90,320,0,320,180)};if(sheetURL!==sheet.url){sheetURL=sheet.url;sheetImage=new Image();sheetImage.onload=()=>exactFrame(current);sheetImage.src=sheet.url}else if(sheetImage.complete)paint();$('currentSheet').href=sheet.url}
function show(index,seek=true){current=Math.max(0,Math.min(frames.length-1,Math.round(index)));const row=frames[current],shot=data.shots.find(s=>String(s.id)===String(row[3]));if($('shot').value!==String(shot.id)){$('shot').value=shot.id;loadLarge(shot.id)}else if(!$('large').children.length)loadLarge(shot.id);$('number').value=$('slider').value=current;setText('function',shot.function);setText('finalLabel','F '+current+' · '+row[1].toFixed(6)+' s · shot '+row[3]);setText('referenceLabel','R '+row[0]+' · '+row[2].toFixed(6)+' s');setText('status','人工记录 '+manual.length+' 条；本次生成未自动宣称通过');if(seek){finalVideo.pause();referenceVideo.pause();finalVideo.currentTime=row[1]+.001;referenceVideo.currentTime=row[2]+.001}else if($('follow').checked){referenceVideo.pause();referenceVideo.currentTime=row[2]+.001}exactFrame(current)}
$('prev').onclick=()=>show(current-1);$('next').onclick=()=>show(current+1);$('number').onchange=e=>show(Number(e.target.value));$('slider').oninput=e=>show(Number(e.target.value));$('shot').onchange=e=>show(data.shots.find(s=>String(s.id)===e.target.value).start);
finalVideo.addEventListener('timeupdate',()=>{if(finalVideo.paused)return;let lo=0,hi=frames.length-1;while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(frames[mid][1]<=finalVideo.currentTime)lo=mid;else hi=mid-1}show(lo,false)});
function record(page){const s=data.sheets[Math.floor(current/50)];manual.push({recorded_at:new Date().toISOString(),scope:page?'explicitly_reviewed_contact_sheet':'explicitly_reviewed_frame',first_final_frame:page?s.first_frame:current,last_final_frame:page?s.last_frame:current,representation:page?'160x90 decoded paired thumbnail cells':'160x90 decoded paired thumbnail cell plus any viewer inspection stated in notes',native_resolution_certified:false,style_equivalence_certified:false,notes:$('note').value});try{localStorage.setItem(storageKey,JSON.stringify(manual))}catch(e){}setText('status','人工记录 '+manual.length+' 条；请导出归档')}
$('markFrame').onclick=()=>record(false);$('markPage').onclick=()=>record(true);$('exportReview').onclick=()=>{const value={schema_version:1,purpose:data.purpose,final_sha256:data.finalHash,reference_sha256:data.referenceHash,actual_manual_actions:manual,style_equivalence:'not_automatically_certified'},blob=new Blob([JSON.stringify(value,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='manual-visual-review.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
window.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName))return;if(e.key==='ArrowLeft'){e.preventDefault();show(current-1)}if(e.key==='ArrowRight'){e.preventDefault();show(current+1)}});show(0,false);
</script></html>'''


def compare(args):
    output = args.output.resolve()
    if output.exists() and any(output.iterdir()): raise ValueError(f'Output directory must be empty: {output}')
    output.mkdir(parents=True, exist_ok=True)
    for folder in ['contact-sheets', 'shots', 'inputs', 'sample-frames']: (output / folder).mkdir()
    started = time.monotonic()
    paths = {name: getattr(args, name).resolve(strict=True) for name in ['final', 'reference', 'timeline', 'mapping']}
    snapshots = {name: (p.stat().st_size, p.stat().st_mtime_ns) for name, p in paths.items()}
    inputs = {name: {'path': str(path), 'sha256': sha256(path), 'bytes': path.stat().st_size} for name, path in paths.items()}
    for name, filename in [('timeline', 'timeline.json'), ('mapping', 'reference-map.json')]:
        (output / 'inputs' / filename).write_bytes(paths[name].read_bytes())
    timeline = json.loads((output / 'inputs/timeline.json').read_text())
    mapping = json.loads((output / 'inputs/reference-map.json').read_text())
    timeline_fps = float(timeline['fps'])
    dump(output / 'status.json', {'state': 'running', 'purpose': args.purpose, 'phase': 'reference decode'})
    reference_info, reference_rows, reference_thumbs = read_reference(paths['reference'], output)
    shots, reference_times = prepare_shots(timeline, mapping, reference_rows, reference_info['reported_fps'])
    shot_starts = [int(s['start']) for s in shots]
    for shot in shots: shot.update(available_first_frame=None, available_last_frame=None)
    page_font, title_font = font(13), font(18)
    sheets, rows, final_dimensions = [], [], set()
    page = draw = None

    def start_page():
        image = Image.new('RGB', (CELL_W * PAIR_COLUMNS, PAGE_TOP + CELL_H * 10), '#191c1a')
        d = ImageDraw.Draw(image)
        d.text((10, 9), 'VISUAL-FUNCTION PAIRS | LEFT: FINAL INPUT / RIGHT: REFERENCE | NOT PIXEL ALIGNMENT', fill='#efe8d5', font=title_font)
        return image, d

    def save_page(last):
        first = last // PAIRS_PER_PAGE * PAIRS_PER_PAGE
        filename = f'contact-sheets/pairs-{first:07d}-{last:07d}.jpg'
        page.save(output / filename, quality=93, subsampling=0)
        sheets.append({'path': filename, 'first_frame': first, 'last_frame': last,
                       'pairs': last - first + 1, 'columns': PAIR_COLUMNS, 'rows': 10,
                       'thumbnail_dimensions': list(THUMB), 'labels_outside_images': True})

    with av.open(str(paths['final'])) as container, (output / 'frame-map.csv').open('w', newline='') as csv_file:
        stream = container.streams.video[0]; stream.thread_type = 'AUTO'
        final_info = stream_info(stream)
        if abs(final_info['reported_fps'] - timeline_fps) > .01:
            raise ValueError('Final input frame rate differs from timeline; resampling silently would invalidate frame IDs')
        writer = None; first_time = None; last_time = None; cfr_errors = []
        dump(output / 'status.json', {'state': 'running', 'purpose': args.purpose, 'phase': 'final decode and pairing'})
        for index, frame in enumerate(container.decode(stream)):
            timeline_frame = index + args.timeline_offset
            pos = bisect_right(shot_starts, timeline_frame) - 1
            if pos < 0 or pos >= len(shots) or timeline_frame >= int(shots[pos]['end']):
                raise ValueError(f'Final frame {index} falls outside the supplied timeline')
            shot = shots[pos]
            actual = timestamp(frame, index, final_info['reported_fps'])
            if first_time is None: first_time = actual
            seconds = actual - first_time
            if last_time is not None and seconds <= last_time: raise ValueError(f'Final PTS is not strictly increasing at frame {index}')
            if abs(seconds - index / timeline_fps) > .51 / timeline_fps: cfr_errors.append(index)
            fraction = (timeline_frame - int(shot['start'])) / max(1, int(shot['end']) - int(shot['start']) - 1)
            rfirst, rlast = shot['reference_first_frame'], shot['reference_last_frame']
            target = reference_times[rfirst] + fraction * (reference_times[rlast] - reference_times[rfirst])
            reference_index = nearest_index(reference_times, target, rfirst, rlast)
            reference = reference_rows[reference_index]
            values, thumb = measure(frame)
            row = {'final_frame': index, 'timeline_frame': timeline_frame, 'shot_id': str(shot['id']),
                   'scene_type': shot['scene_type'], 'shot_fraction': round(fraction, 9),
                   'final_pts': frame.pts, 'final_time_base': str(frame.time_base),
                   'final_timestamp_seconds': round(seconds, 9), 'final_absolute_timestamp_seconds': actual,
                   'reference_frame': reference_index, 'reference_pts': reference['pts'],
                   'reference_time_base': reference['time_base'],
                   'reference_timestamp_seconds': reference['timestamp_seconds'],
                   'reference_target_seconds': round(float(target), 9),
                   'reference_first_frame': rfirst, 'reference_last_frame': rlast,
                   'match_basis': 'visual_function_not_content_or_pixel_alignment'}
            for metric, value in values.items():
                row[f'final_{metric}'] = value; row[f'reference_{metric}'] = reference[metric]
                row[f'delta_{metric}'] = round(value - reference[metric], 7)
            if writer is None: writer = csv.DictWriter(csv_file, fieldnames=list(row)); writer.writeheader()
            writer.writerow(row); rows.append(row)
            if shot['available_first_frame'] is None: shot['available_first_frame'] = index
            shot['available_last_frame'] = index
            if index % PAIRS_PER_PAGE == 0: page, draw = start_page()
            cell = index % PAIRS_PER_PAGE; x = cell % PAIR_COLUMNS * CELL_W; y = PAGE_TOP + cell // PAIR_COLUMNS * CELL_H
            draw.text((x + 2, y + 1), f'F{index:06d} / S{shot["id"]}', font=page_font, fill='#f2e6ca')
            draw.text((x + 170, y + 1), f'R{reference_index:06d}', font=page_font, fill='#b9d8cc')
            page.paste(thumb, (x, y + 18))
            page.paste(Image.open(BytesIO(reference_thumbs[reference_index])), (x + 168, y + 18))
            if cell == PAIRS_PER_PAGE - 1: save_page(index)
            final_dimensions.add((frame.width, frame.height)); last_time = seconds
            if (index + 1) % 1000 == 0: print(f'Final paired {index + 1} frames', flush=True)
    if not rows: raise ValueError('Final input has no decoded frames')
    if len(rows) % PAIRS_PER_PAGE: save_page(len(rows) - 1)
    if cfr_errors: raise ValueError(f'Final PTS does not follow timeline CFR at {cfr_errors[:10]}')
    final_info.update(decoded_frames=len(rows), dimensions=sorted(final_dimensions), first_absolute_timestamp=first_time,
                      last_timestamp_seconds=rows[-1]['final_timestamp_seconds'],
                      missing_pts_frames=sum(r['final_pts'] is None for r in rows))
    expected = int(shots[-1]['end'])
    complete = args.timeline_offset == 0 and len(rows) == expected
    if not complete and args.purpose != 'trial' and not args.allow_partial:
        raise ValueError(f'Candidate has {len(rows)} frames at offset {args.timeline_offset}; complete timeline has {expected}. Use an explicitly labeled trial or --allow-partial for a partial candidate.')
    if any(frame['final_pts'] is None for frame in rows) or reference_info['missing_pts_frames']:
        raise ValueError('Missing presentation timestamps prevent a reliable browser correspondence record')

    # Three representative frames of each actually present shot, selected only now
    # that the decoded extent is known. These images are outputs, not a review.
    chosen = []
    for shot in shots:
        first, last = shot['available_first_frame'], shot['available_last_frame']
        if first is None: continue
        for index in sorted({first + round((last - first) * p) for p in [.1, .5, .9]}):
            chosen.append({'final_frame': index, 'reference_frame': rows[index]['reference_frame'], 'shot_id': str(shot['id'])})
    want_final = {r['final_frame'] for r in chosen}; want_ref = {r['reference_frame'] for r in chosen}
    selected = {}
    for name, wanted in [('final', want_final), ('reference', want_ref)]:
        with av.open(str(paths[name])) as container:
            stream = container.streams.video[0]; stream.thread_type = 'AUTO'
            for index, frame in enumerate(container.decode(stream)):
                if index in wanted:
                    picture = rgb_frame(frame).to_image().convert('RGB')
                    sample = ImageOps.pad(picture, (args.large_width, round(args.large_width * 9 / 16)), Image.Resampling.LANCZOS, color='#171717')
                    sample_path = output / 'sample-frames' / f'{name}-{index:07d}.png'
                    sample.save(sample_path, compress_level=3)
                    selected[(name, index)] = sample_path
                if index >= max(wanted): break
    large = []
    for pair in chosen:
        # Keep a bounded pair in memory, rather than hundreds of 1080p rasters.
        # Separate lossless files also allow inspection of either image at 1:1.
        a_path, b_path = selected[('final', pair['final_frame'])], selected[('reference', pair['reference_frame'])]
        with Image.open(a_path) as opened_a, Image.open(b_path) as opened_b:
            a, b = opened_a.convert('RGB'), opened_b.convert('RGB')
        image = Image.new('RGB', (args.large_width * 2, a.height + 40), '#191c1a'); d = ImageDraw.Draw(image)
        d.text((12, 10), f'FINAL F{pair["final_frame"]} / SHOT {pair["shot_id"]}', font=title_font, fill='#efe6d0')
        d.text((args.large_width + 12, 10), f'REFERENCE R{pair["reference_frame"]} / VISUAL FUNCTION ONLY', font=title_font, fill='#b9d8cc')
        image.paste(a, (0, 40)); image.paste(b, (args.large_width, 40))
        relative = f'shots/shot-{pair["shot_id"]}-final-{pair["final_frame"]:07d}-reference-{pair["reference_frame"]:07d}.jpg'
        image.save(output / relative, quality=95, subsampling=0)
        large.append({**pair, 'path': relative, 'each_image_dimensions': list(a.size),
                      'final_sample_path': str(a_path.relative_to(output)),
                      'reference_sample_path': str(b_path.relative_to(output)),
                      'actual_visual_review': 'not_recorded'})
    for name, path in paths.items():
        if snapshots[name] != (path.stat().st_size, path.stat().st_mtime_ns):
            raise ValueError(f'Input changed during comparison: {path}. Outputs must not be treated as one stable evidence set.')
    mapped_refs = sorted({row['reference_frame'] for row in rows})
    coverage = {
        'final_automated_decode': {'count': len(rows), 'first': 0, 'last': len(rows) - 1, 'gaps': []},
        'reference_automated_decode': {'count': len(reference_rows), 'first': 0, 'last': len(reference_rows) - 1, 'gaps': []},
        'frame_pair_generation': {'pairs': len(rows), 'first_final': 0, 'last_final': len(rows) - 1,
                                  'gaps': [], 'duplicate_final_frames': [], 'reference_unique_frames': len(mapped_refs),
                                  'reference_min': min(mapped_refs), 'reference_max': max(mapped_refs)},
        'timeline': {'expected_frames': expected, 'input_offset': args.timeline_offset, 'complete': complete,
                     'missing_prefix_frames': args.timeline_offset,
                     'missing_suffix_frames': max(0, expected - args.timeline_offset - len(rows))},
        'contact_sheet_pairs': sum(s['pairs'] for s in sheets), 'contact_sheet_pages': len(sheets),
        'large_comparisons': len(large), 'thumbnail_dimensions': list(THUMB),
        'actual_visual_review': 'not_recorded', 'actual_audio_listening': 'not_recorded',
        'style_equivalence': 'not_assessed_by_automation',
        'trial_is_final_validation': False,
    }
    assert len(rows) == sum(s['pairs'] for s in sheets)
    report = {'schema_version': 1, 'color_conversion': COLOR_POLICY, 'created_at_utc': datetime.now(timezone.utc).isoformat(),
              'purpose': args.purpose, 'final_acceptance': 'not_claimed',
              'trial_warning': 'Historical silent trial only; not final-video validation.' if args.purpose == 'trial' else None,
              'inputs': inputs, 'decoder': {'name': 'PyAV', 'version': av.__version__, 'ffmpeg_subprocesses': 0},
              'tools': {'compare_frames_sha256': sha256(Path(__file__)), 'audit_metrics_sha256': sha256(Path(__file__).with_name('audit_frames.py'))},
              'final_stream': final_info, 'reference_stream': reference_info, 'coverage': coverage,
              'mapping': {'label': '按视觉功能匹配', 'same_content_pixel_alignment': False,
                          'method': 'Normalized progress within each timeline shot to nearest decoded reference PTS in the assigned visual-function interval.',
                          'reference_reuse_is_intentional': True},
              'metrics': {'resolution_width': 320, 'edge_threshold': .12,
                          'interpretation': 'Signed palette/luminance/edge differences only. Different contents are not pixel-aligned. There is no similarity score, pass threshold, or percent-equivalence claim.'},
              'contact_sheets': sheets, 'large_comparisons': large,
              'elapsed_seconds': round(time.monotonic() - started, 3)}
    dump(output / 'coverage.json', report)
    dump(output / 'frame-map.json', {'schema_version': 1, 'purpose': args.purpose, 'inputs': inputs,
                                    'mapping_type': 'visual_function_not_content_or_pixel_alignment',
                                    'actual_visual_review': 'not_recorded', 'frames': rows})
    dump(output / 'visual-review-template.json', {'schema_version': 1, 'purpose': args.purpose,
          'final_sha256': inputs['final']['sha256'], 'reference_sha256': inputs['reference']['sha256'],
          'actual_opened_files': [], 'actual_reviewed_final_frame_ranges': [], 'observations': [],
          'native_resolution_review': 'not_recorded', 'audio_listening': 'not_recorded',
          'style_equivalence': 'not_certified', 'instructions': 'Only record files/frames actually opened and inspected. Generated outputs and decoded coverage are not a visual pass.'})
    write_html(output / 'index.html', output, paths['final'], paths['reference'], rows, shots, sheets, large, report)
    if args.html and args.html.resolve() != output / 'index.html':
        write_html(args.html, output, paths['final'], paths['reference'], rows, shots, sheets, large, report)
    dump(output / 'status.json', {'state': 'complete', 'purpose': args.purpose, 'final_pairs': len(rows),
                                 'reference_frames_decoded': len(reference_rows), 'actual_visual_review': 'not_recorded'})
    return report


def main():
    if len(sys.argv) > 1 and sys.argv[1] == 'serve':
        return serve(sys.argv[2:])
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    for name in ['final', 'reference', 'timeline', 'mapping', 'output']: parser.add_argument(name, type=Path)
    parser.add_argument('--purpose', choices=['candidate', 'trial'], default='candidate')
    parser.add_argument('--allow-partial', action='store_true', help='Explicitly label incomplete candidate coverage; never implies final acceptance')
    parser.add_argument('--timeline-offset', type=int, default=0)
    parser.add_argument('--large-width', type=int, default=960, help='Width of each image in the 3 larger comparisons per present shot')
    parser.add_argument('--html', type=Path, help='Also write a viewer at this path, e.g. review/index.html')
    args = parser.parse_args()
    if args.timeline_offset < 0 or args.large_width < 320: parser.error('Invalid timeline offset or large image width')
    output_was_empty = not args.output.exists() or not any(args.output.iterdir())
    try:
        result = compare(args)
    except Exception as error:
        if output_was_empty and args.output.exists() and (args.output / 'status.json').exists():
            dump(args.output / 'status.json', {'state': 'failed', 'error': str(error), 'actual_visual_review': 'not_recorded'})
        print(f'Comparison failed: {error}', file=sys.stderr); return 1
    print(json.dumps({'output': str(args.output.resolve()), 'purpose': args.purpose,
                      'final_frames': result['coverage']['final_automated_decode']['count'],
                      'reference_frames': result['coverage']['reference_automated_decode']['count'],
                      'contact_sheets': len(result['contact_sheets']), 'large_comparisons': len(result['large_comparisons']),
                      'timeline_complete': result['coverage']['timeline']['complete'],
                      'actual_visual_review': 'not_recorded'}, indent=2))
    return 0


if __name__ == '__main__': raise SystemExit(main())
