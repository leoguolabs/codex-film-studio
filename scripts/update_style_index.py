#!/usr/bin/env python3
"""Sync the style catalog and bilingual README galleries; --check detects drift."""
import argparse
from html import escape
import json
from pathlib import Path
from urllib.parse import urlencode

ROOT = Path(__file__).resolve().parents[1]
SITE = 'https://leoguolabs.github.io/codex-film-studio/'
LOCAL_SITE = 'http://127.0.0.1:8249/'


def style_page(entry):
    pages = entry.get('showcases', [])
    return (entry.get('landing') or next((p for p in pages if p['access'] == 'release'), None)
            or next(iter(pages), None))


def page_url(page, language='en'):
    base = LOCAL_SITE if page.get('access') == 'local' else SITE
    return (base + page['page'] + '?' + urlencode({'lang': language})
            + ('#' + page['anchor'] if page.get('anchor') else ''))


def page_actions(entry, language='en'):
    """Link every distinct page; prefer a release over the same local player."""
    zh = language == 'zh'
    primary = style_page(entry)
    if not primary:
        return []
    key = lambda p: (p['page'], p.get('anchor', ''))
    pages = {key(p): p for p in sorted(entry.get('showcases', []),
                                     key=lambda p: p['access'] == 'release')}
    label = ('本地风格页' if zh else 'Local style page') if primary.get('access') == 'local' else ('独立风格页' if zh else 'Style page')
    actions = [(page_url(primary, language), label)]
    for page in pages.values():
        if key(page) != key(primary):
            title = page.get('title_zh', page['title']) if zh else page['title']
            if page['access'] == 'local':
                title += '（本地）' if zh else ' (local)'
            actions.append((page_url(page, language), title))
    if primary.get('project') and primary.get('access') == 'release':
        local = {**primary, 'access': 'local'}
        actions.append((page_url(local, language), '本地预览' if zh else 'Local preview'))
    return actions


def production_kit_summary(catalog, language):
    kits = [entry for entry in catalog['styles'] if entry['capabilities']['project_creation']
            and entry['capabilities']['scene_renderer']]
    samples = [entry for entry in kits if entry['template_kind'] == 'demo']
    if language == 'zh':
        summary = f'{len(kits)} 个可执行制作包'
        if samples:
            names = '、'.join(entry['name_zh'] for entry in samples)
            summary += f'，其中 {len(samples)} 个附完整可编辑样片工程（{names}）'
        return summary

    noun = 'kit' if len(kits) == 1 else 'kits'
    summary = f'{len(kits)} executable production {noun}'
    if samples:
        names = ', '.join(entry['name'] for entry in samples)
        summary += f', including {len(samples)} with a complete editable sample project ({names})'
    return summary


def render_summary(catalog, language):
    count = len(catalog['styles'])
    label = '种风格' if language == 'zh' else 'styles'
    return f'**{count} {label}** · {production_kit_summary(catalog, language)}'


def render_gallery(catalog, language='en', prefix='', include_resource_links=True):
    """GitHub-safe HTML: images and links work without CSS or JavaScript."""
    zh = language == 'zh'
    lines = ['<table>']
    for number, entry in enumerate(catalog['styles'], 1):
        name = entry['name_zh'] if zh else entry['name']
        other_name = entry['name'] if zh else entry['name_zh']
        description = entry.get('description_zh', entry['description']) if zh else entry['description']
        state = catalog['statuses'][entry['status']]['name_zh' if zh else 'name']
        guide = escape(prefix + entry['guide'], quote=True)
        primary = style_page(entry)
        preview_page = next((p for p in entry.get('showcases', [])
                             if p['id'] == entry.get('preview_showcase')), None)
        preview_target_page = preview_page or primary
        preview_url = page_url(preview_target_page, language) if preview_target_page else None
        preview_target = escape(preview_url, quote=True) if preview_url else guide
        preview = entry.get('preview_zh') if zh else entry.get('preview')
        preview = preview or entry.get('preview', entry.get('poster'))
        if preview:
            kind = entry.get('preview_kind', 'schematic')
            label = ('风格示意' if zh else 'style sketch') if kind == 'schematic' else ('影片截图' if zh else 'film frame')
            visual = (f'<a href="{preview_target}"><img src="{escape(prefix + preview, quote=True)}" '
                      f'alt="{escape(name)} — {label}" width="320"></a>')
        else:
            visual = '预览待补充' if zh else 'Preview to come'
        actions = page_actions(entry, language) + [
            (entry['guide'], '风格说明' if zh else 'Style guide'),
            (entry['prompt'], '提示词' if zh else 'Prompt'),
            (entry['template'], '创作工程' if zh else 'Project files'),
        ]
        links = ' · '.join(f'<a href="{escape(path if path.startswith(("https://", "http://")) else prefix + path, quote=True)}">{escape(label)}</a>' for path, label in actions)
        local_pages = [p for p in entry.get('showcases', []) if p['access'] == 'local']
        public_pages = [p for p in entry.get('showcases', []) if p['access'] == 'release']
        if public_pages:
            page = public_pages[0]
            player = page_url(page, language)
            availability = '<a href="' + player + '">' + ('▶ 在线播放' if zh else '▶ Watch online') + '</a>'
        elif local_pages:
            availability = '<a href="' + escape(prefix + 'docs/pages.md#local-style-catalog', quote=True) + '">' + ('本地影片与审阅页' if zh else 'Local films & review pages') + '</a>'
        elif entry.get('preview_kind') == 'frame':
            availability = '<a href="' + escape(prefix + 'docs/readme/README.md#frame-sources', quote=True) + '">' + ('本地影片截图' if zh else 'Local film frame') + '</a>'
        else:
            availability = '尚无样片' if zh else 'No sample yet'
        lines += [
            '<tr>',
            f'<td width="38%" valign="middle">{visual}</td>',
            '<td width="62%" valign="top">',
            f'<sub>{number:02d} / <code>{escape(entry["id"])}</code></sub>',
            f'<h3>{escape(name)}</h3>',
            f'<sub>{escape(other_name)}</sub>',
            f'<p>{escape(description)}</p>',
            f'<p><b>{escape(state)}</b> · {availability}</p>',
        ]
        if include_resource_links:
            lines.append(f'<sub>{links}</sub>')
        lines += ['</td>', '</tr>']
    lines += ['</table>']
    return '\n'.join(lines)


def replace_block(document, name, content):
    start, end = f'<!-- {name}:start -->', f'<!-- {name}:end -->'
    if document.count(start) != 1 or document.count(end) != 1:
        raise ValueError(f'Expected exactly one {name} block')
    before, remainder = document.split(start)
    _, after = remainder.split(end)
    return f'{before}{start}\n\n{content}\n\n{end}{after}'


def render(catalog):
    lines = [
        '# Film styles · 统一风格目录', '',
        'All visual styles live here. `styles.json` is the source of truth for paths,',
        'package completion and showcase availability. Shared workflows live in `methods/`.', '',
        '所有风格统一放在 `styles/<id>/`。完成状态描述仓库中的可复用内容；',
        '已有本地影片网页、公开样片与新影片验收分别记录。', '',
        render_summary(catalog, 'en'), '',
        '## Visual index / 风格一览', '',
        'Film frames and original style studies are labelled separately.',
        '影片截图与原创风格示意分别标注；缺少预览的风格保留占位说明。',
        'A displayed frame does not change package completion or full-film publication.', '',
        'Ask your Agent to open local showcases and check their retained project files.',
        '本地展示由 Agent 启动并检查制作素材；公开页面可以直接访问。', '',
        render_gallery(catalog, prefix='../'), '',
        '## Capabilities / 能力与网页', '',
        '| Style / 风格 | Package / 制作包 | Renderer / 渲染 | Public film / 公开影片 | Original source / 原工程 | Rebuild / 重建验证 |',
        '| --- | --- | --- | --- | --- | --- |',
    ]
    for entry in catalog['styles']:
        relative = entry.get('readme', entry['guide']).removeprefix('styles/')
        state = catalog['statuses'][entry['status']]
        page_links = [f'[{label}]({url})' for url, label in page_actions(entry)]
        pages = ' · '.join(page_links) or '—'
        renderer = 'Included / 已有' if entry['capabilities']['scene_renderer'] else 'Author per project / 需按选题编写'
        caps = entry['capabilities']
        source = caps.get('original_source', 'unknown')
        replay = caps.get('sample_rebuild', 'not-yet-revalidated')
        public = pages if caps.get('published_film', caps.get('published_demo')) else 'Not published / 未发布'
        lines.append(f"| [{entry['name_zh']} / {entry['name']}]({relative}) | `{entry['status']}` | {renderer} | {public} | `{source}` | `{replay}` |")
    lines += ['', '## What is complete / 已完成什么', '']
    for entry in catalog['styles']:
        lines.append(f"- **{entry['id']}** — {entry['status_note_zh']} {entry['status_note']}")
    lines += ['',
        'Publication, executable rendering, source access and rebuild scope are independent.',
        '`full` means a complete rebuild; `clip` covers only the documented excerpt.',
        'Local source bundles require separate delivery and are not automatically public.',
        '`public-inputs-and-repository` means released inputs plus code in this repository.',
        '`not-audited` means access has not been verified; `unavailable` means no source is available.',
        '`not-yet-revalidated` is not a successful rebuild. Read the per-style notes for scope.',
        'See [reproduction](../methods/reproduction.md) for acquisition and verification.', '',
        '`demo-ready` includes a released sample and editable renderer. `renderer-ready`',
        'provides executable style tools and audio/export checks; author the new story scenes.',
        '`starter-ready`',
        'provides blank authoring inputs, guides and helpers. `toolkit-ready` provides',
        'material tools and an input contract. The Agent handles project creation for every style;',
        'none describes the acceptance of a new production.', '',
        '## Start with a prompt / 用提示词开始', '',
        'Open the cloned library in your coding Agent and describe your film:', '',
        '> Use [style] to make a [duration] film about [subject] for [audience] in [language].',
        '> Handle project creation, environment setup, production and review yourself.',
        '> Deliver a 1080p MP4, editable project and actual review scope.', '',
        '在 Agent 中打开已克隆的风格库，直接发送：', '',
        '> 请用[风格]为[观众]制作关于[主题]的[时长]视频，使用[语言]配音和字幕。',
        '> 请你自动创建项目、准备环境、完成制作与检查，交付 1080p MP4 和可编辑工程。', '',
        'For an exact sample, give the Agent its title or link. It checks original source',
        'and asset availability before rebuilding; a showcase MP4 is not a source bundle.',
        '原样复刻请提供样片标题或链接，Agent 会先检查源工程与素材是否齐全。', '',
        'Existing projects are preserved. New productions belong outside this library.', '',
        '## Open existing pages / 打开已有网页', '',
        'Ask your Agent: “Open the local style catalog and check the available films.”',
        '告诉 Agent：“打开本地风格片库，并检查哪些影片可以观看。”', '',
        'The HTML entrypoints are in each style package. Local showcases read media,',
        'fonts and review data from the retained projects listed in `styles.json`.',
        'A fresh clone without those projects shows their missing-resource status.',
        'Published style pages also work online with pinned Release assets. Retained projects',
        'provide the original local media. Neither is copied into new-film starters.', '',
        '## Previous paths / 旧路径', '',
        'The five former `methods/<style>/` packages moved to `styles/<style>/`.',
        'Use `scripts/new_film.py --style <id>` for all of them. `--method <id>` remains',
        'a deprecated command-line alias. Existing external projects are independent',
        'copies and retain their original files. Shared methods now live in [methods/](../methods/README.md).', '',
        '<!-- Generated by scripts/update_style_index.py; edit styles.json for catalog entries. -->', '',
    ]
    return '\n'.join(lines)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    catalog = json.loads((ROOT / 'styles.json').read_text())
    outputs = {ROOT / 'styles/README.md': render(catalog)}
    for filename, language in [('README.md', 'en'), ('README.zh-CN.md', 'zh')]:
        target = ROOT / filename
        expected = target.read_text(encoding='utf-8')
        expected = replace_block(expected, 'capability-summary', render_summary(catalog, language))
        outputs[target] = replace_block(expected, 'style-atlas', render_gallery(catalog, language, include_resource_links=False))
    stale = []
    for target, expected in outputs.items():
        if args.check:
            if not target.is_file() or target.read_text(encoding='utf-8') != expected:
                stale.append(str(target.relative_to(ROOT)))
        else:
            target.write_text(expected, encoding='utf-8')
            print(f'Updated {target.relative_to(ROOT)}')
    if stale:
        raise SystemExit(f'Style documentation is stale ({", ".join(stale)}). Run python3 scripts/update_style_index.py')
    if args.check:
        print('Style catalog and both README galleries match styles.json.')


if __name__ == '__main__':
    main()
