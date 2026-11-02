"""Static, source-backed discovery pages and metadata for the Pages artifact."""
from html import escape
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import subprocess
from urllib.parse import urlsplit
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_ORIGIN = 'https://visiontrail.github.io'
REPO = 'https://github.com/visiontrail/codex-film-studio'
AUTHOR = 'https://x.com/LeoGuoLabs'


def site_base(origin, base_path):
    parsed = urlsplit(origin)
    if parsed.scheme not in {'https', 'http'} or not parsed.netloc or parsed.path not in {'', '/'} or parsed.query or parsed.fragment:
        raise ValueError('--site-origin must be an HTTP(S) origin without a path, query or fragment')
    if any(part in {'.', '..'} for part in base_path.split('/')) or any(c in base_path for c in '?#'):
        raise ValueError('Invalid base path')
    prefix = '/' + base_path.strip('/') + '/' if base_path.strip('/') else '/'
    return origin.rstrip('/') + prefix, prefix


def canonical(base, path):
    return base + (path[:-10] if path.endswith('index.html') else path)


def modified(*paths):
    # Content history, not deployment time. Shallow CI checkouts must fetch history.
    result = subprocess.run(['git', 'log', '-1', '--format=%cs', '--', *paths], cwd=ROOT, text=True, capture_output=True)
    value = result.stdout.strip()
    return value if re.fullmatch(r'\d{4}-\d{2}-\d{2}', value) else None


def loc(entry, key, lang):
    return entry.get(key + '_zh', entry.get(key, '')) if lang == 'zh' else entry.get(key, '')


def route(style, lang):
    return ('zh/' if lang == 'zh' else '') + f"styles/{style['id']}/"


class Head(HTMLParser):
    def __init__(self, source):
        super().__init__(); self.title = ''; self.description = ''; self.in_title = False
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'title': self.in_title = True
        if tag == 'meta' and attrs.get('name') == 'description': self.description = attrs.get('content', '')

    def handle_endtag(self, tag):
        if tag == 'title': self.in_title = False

    def handle_data(self, data):
        if self.in_title: self.title += data


class ImplicitHead(HTMLParser):
    """Locate an implicit body without touching script/style text or base URLs."""
    def __init__(self, source):
        super().__init__(); self.source = source; self.boundary = len(source); self.raw = None
        self.lines = source.splitlines(keepends=True); self.feed(source)

    def handle_starttag(self, tag, attrs):
        if self.raw: return
        if tag in {'script', 'style', 'title', 'noscript', 'template'}: self.raw = tag
        elif tag not in {'html', 'head', 'base', 'link', 'meta'} and self.boundary == len(self.source):
            line, column = self.getpos()
            self.boundary = sum(len(x) for x in self.lines[:line - 1]) + column

    def handle_endtag(self, tag):
        if tag == self.raw: self.raw = None

    def handle_data(self, data):
        if not self.raw and data.strip() and self.boundary == len(self.source):
            line, column = self.getpos()
            self.boundary = sum(len(x) for x in self.lines[:line - 1]) + column


def explicit_document(source):
    """Some legacy players legally omit head/body tags; make a metadata slot."""
    if re.search(r'</head\s*>', source, re.I): return source
    boundary = ImplicitHead(source).boundary
    prefix, body = source[:boundary], source[boundary:]
    html = re.search(r'<html\b[^>]*>', prefix, re.I)
    html = html[0] if html else '<html lang="en">'
    prefix = re.sub(r'<!doctype[^>]*>|</?(?:html|head)\b[^>]*>', '', prefix, flags=re.I)
    body = re.sub(r'</html\s*>\s*$', '', body, flags=re.I)
    if not re.match(r'<body\b', body, re.I): body = '<body>' + body
    if not re.search(r'</body\s*>\s*$', body, re.I): body += '</body>'
    return '<!doctype html>' + html + '<head>' + prefix + '</head>' + body + '</html>'


def metadata(source, title, description, url, image, lang='en', alternates=None, graph=None, noindex=False):
    # Metadata is emitted exactly once in the initial HTML response.
    source = explicit_document(source)
    source = re.sub(r'<title\b[^>]*>.*?</title>', '', source, flags=re.I | re.S)
    source = re.sub(r'<meta\b[^>]*(?:name|property)=["\'](?:description|robots|author|og:[^"\']+|twitter:[^"\']+)["\'][^>]*>', '', source, flags=re.I)
    source = re.sub(r'<link\b[^>]*rel=["\'](?:canonical|alternate)["\'][^>]*>', '', source, flags=re.I)
    tags = [f'<title>{escape(title)}</title>', f'<meta name="description" content="{escape(description, quote=True)}">',
            f'<meta name="robots" content="{"noindex, follow" if noindex else "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"}">',
            f'<link rel="canonical" href="{escape(url, quote=True)}">', '<meta name="author" content="LeoGuoLabs">']
    for name, content in {'og:type': 'website', 'og:site_name': 'Codex Film Studio', 'og:title': title,
                          'og:description': description, 'og:url': url, 'og:image': image,
                          'og:image:alt': 'Codex Film Studio — animation and video styles',
                          'og:locale': 'zh_CN' if lang == 'zh' else 'en_US'}.items():
        tags.append(f'<meta property="{name}" content="{escape(content, quote=True)}">')
    for name, content in {'twitter:card': 'summary_large_image', 'twitter:title': title,
                          'twitter:description': description, 'twitter:image': image,
                          'twitter:image:alt': 'Codex Film Studio — animation and video styles'}.items():
        tags.append(f'<meta name="{name}" content="{escape(content, quote=True)}">')
    if alternates:
        for language, href in alternates.items():
            tags.append(f'<link rel="alternate" hreflang="{language}" href="{escape(href, quote=True)}">')
    if graph:
        payload = json.dumps({'@context': 'https://schema.org', '@graph': graph}, ensure_ascii=False).replace('<', '\\u003c')
        tags.append(f'<script type="application/ld+json">{payload}</script>')
    return re.sub(r'</head\s*>', lambda _: '\n' + '\n'.join(tags) + '\n</head>', source, count=1, flags=re.I)


def schema(base, url, title, description, lang, date=None, items=None):
    graph = [
        {'@type': 'Person', '@id': base + '#author', 'name': 'LeoGuoLabs', 'url': AUTHOR},
        {'@type': 'WebSite', '@id': base + '#website', 'url': base, 'name': 'Codex Film Studio', 'inLanguage': ['en', 'zh-CN']},
        {'@type': 'CollectionPage' if items else 'WebPage', '@id': url + '#page', 'url': url, 'name': title,
         'description': description, 'inLanguage': 'zh-CN' if lang == 'zh' else 'en',
         'isPartOf': {'@id': base + '#website'}, 'author': {'@id': base + '#author'}}]
    if date: graph[-1]['dateModified'] = date
    if items:
        graph[-1]['mainEntity'] = {'@type': 'ItemList', 'itemListElement': [
            {'@type': 'ListItem', 'position': i + 1, 'name': title, 'url': href} for i, (title, href) in enumerate(items)]}
    return graph


def credit(lang, date, source):
    label = '文档更新' if lang == 'zh' else 'Documentation updated'
    time = f' · {label} <time datetime="{date}">{date}</time>' if date else ''
    return f'<p class="search-credit"><a href="{AUTHOR}">LeoGuoLabs</a>{time} · <a href="{source}">{"源码与修订记录" if lang == "zh" else "Source & revision history"} ↗</a></p>'


def capability_facts(style, strings):
    caps = style['capabilities']
    source = {'public-inputs-and-repository': 'sourcePublic', 'local-source-bundle': 'sourceLocal', 'not-audited': 'sourceUnaudited', 'unavailable': 'sourceUnavailable'}
    rebuild = {'clip': 'rebuildClip', 'full': 'rebuildFull', 'not-yet-revalidated': 'rebuildUnvalidated'}
    rows = [('renderer', 'rendererIncluded' if caps['scene_renderer'] else 'rendererAuthored'),
            ('originalSource', source.get(caps.get('original_source'), 'sourceUnknown')),
            ('sampleRebuild', rebuild.get(caps.get('sample_rebuild'), 'rebuildUnknown'))]
    return '<dl class="capability-facts">' + ''.join(f'<div><dt>{escape(strings[k])}</dt><dd>{escape(strings[v])}</dd></div>' for k, v in rows) + '</dl>'


def capability_overview(catalog, lang, strings):
    counts = {key: sum(s['status'] == key for s in catalog['styles']) for key in catalog['statuses']}
    renderers = sum(s['capabilities']['scene_renderer'] for s in catalog['styles'])
    summary = ' · '.join(f'{counts[key]} {escape(strings["demoKit"] if key == "demo-ready" else loc(value, "name", lang))}' for key, value in catalog['statuses'].items())
    if lang == 'zh':
        title = f"{len(catalog['styles'])} 种风格，{renderers} 种提供场景渲染器"
        note = '制作包状态描述可复用工具。新题材仍需创作场景；公开样片、本地原工程与完整重建验证分别记录。'
        link = '比较原工程获取与重建范围'
    else:
        title = f"{len(catalog['styles'])} styles, {renderers} with scene renderers"
        note = 'Readiness describes reusable tools. New subjects still need authored scenes. Public films, local source bundles and full rebuild verification are separate.'
        link = 'Compare source access and rebuild scope'
    return f'<section class="capability-overview" aria-labelledby="capability-title"><h3 id="capability-title">{title}</h3><p>{summary}</p><p>{note} <a href="{REPO}/blob/main/styles/README.md#capabilities--能力与网页">{link} →</a></p></section>'


def home_answers(lang, date, catalog, base):
    home = base + ('zh/' if lang == 'zh' else '')
    case = home + 'cases/whiteboard-rebuild/'
    renderers = sum(s['capabilities']['scene_renderer'] for s in catalog['styles'])
    if lang == 'zh':
        heading = '如何用 Codex Film Studio 制作视频？'
        intro = '从选风格、编写场景到检查交付，先确认所选制作包和样片的实际范围。'
        qa = [
            ('如何用 Codex 开始制作？', '在 Codex 中打开完整仓库，描述主题、观众、风格、语言和时长。Agent 按仓库流程创建外部项目，准备依赖并执行制作与审阅；交付范围包括 MP4、可编辑工程和实际检查说明。', home+'#create', '创作入口'),
            ('应该选择哪种风格？', '逐步解释可选白板讲解，材质叙事可选艺术拼贴或蜡笔绘本，空间关系可选卫星影像，数据变化可选动态折线图喜剧。结合场景需求、能力摘要和样片选择。', home+'#library', '浏览风格'),
            ('哪些包带场景渲染器？', f'当前 {len(catalog["styles"])} 种风格中有 {renderers} 种标记为提供场景渲染器。已有渲染器仍需要为新选题编写画面、准备输入和检查结果；创作起步包与材质工具包的能力另行标注。', REPO+'/blob/main/styles/README.md#capabilities--能力与网页', '能力速查'),
            ('样片能原样复现吗？', '需要原始场景、素材、已接受的音频和时间信息。白板样片提供公开输入与仓库代码；本地原工程包并非公开下载，观看 MP4 也不意味着已取得可编辑工程。', case, '白板样片案例'),
            ('需要什么依赖和输入？', '完整仓库包含根脚本、风格和共享方法，单独复制 Skill 目录不够。依赖按风格检查；白板示例用 Node、Python 与 FFmpeg。新主题需脚本、可用素材、录音或可访问的语音服务。', case+'#inputs', '依赖与公开输入'),
            ('如何理解验证范围？', 'clip 仅表示片段；full 表示记录所覆盖的整片重建。技术检查、画面审阅、播放与听审需分别报告。尚未重新验证不能视为成功，新片也需独立验收。', REPO+'/blob/main/methods/reproduction.md', '复现与验证方法'),
            ('能在其他 Agent 中直接安装吗？', '当前可靠入口是完整 checkout 与仓库内 codex-film Skill。尚未提供其他 Agent 的独立安装与完整流程验证；复制 Skill 子目录不能获得全部工作室资源。', REPO+'/tree/main/.agents/skills/codex-film', '仓库内 Skill')]
    else:
        heading = 'How do you make a video with Codex Film Studio?'
        intro = 'Choose a style, author the scenes and review the delivery against the actual scope of the package and sample.'
        qa = [
            ('How do I start with Codex?', 'Open the complete repository in Codex and describe the subject, audience, style, language and duration. The Agent follows the project workflow to create an external project, prepare dependencies, produce and review it. Delivery includes an MP4, editable project and actual review coverage.', home+'#create', 'Start a film'),
            ('Which style should I choose?', 'Use Whiteboard Explainer for step-by-step arguments, Art Collage or Crayon Picture Book for material-led stories, Satellite Briefing for spatial relationships, or Animated Line Chart Comedy for changing data. Compare the scene needs, capabilities and samples.', home+'#library', 'Explore styles'),
            ('Which packages include scene renderers?', f'{renderers} of the current {len(catalog["styles"])} styles are marked as including scene renderers. New subjects still need authored scenes, inputs and review. Authoring starters and material toolkits have separately documented capabilities.', REPO+'/blob/main/styles/README.md#capabilities--能力与网页', 'Compare capabilities'),
            ('Can I reproduce a sample exactly?', 'You need its composition, assets, accepted recordings and timing. Whiteboard has public inputs plus repository code. Local source bundles are not public downloads, and a playable MP4 is not an editable source package.', case, 'Whiteboard sample walkthrough'),
            ('What dependencies and inputs do I need?', 'Use the full checkout, including root scripts, styles and shared methods; copying the Skill directory alone is insufficient. Dependencies vary by style. Whiteboard uses Node, Python and FFmpeg. New subjects need a script, usable assets, recordings or access to a voice service.', case+'#inputs', 'Dependencies and public inputs'),
            ('What does the verification scope mean?', 'clip covers an excerpt; full covers the complete rebuild identified in its record. Technical checks, visual review, playback and listening are reported separately. Not revalidated is not a pass, and each new film needs its own acceptance.', REPO+'/blob/main/methods/reproduction.md', 'Reproduction and verification'),
            ('Can I install it in another Agent?', 'The documented entry point is a complete checkout with the repo-local codex-film Skill. Standalone installation and end-to-end validation for other Agents are not provided. Copying the Skill subdirectory does not install the whole studio.', REPO+'/tree/main/.agents/skills/codex-film', 'Repo-local Skill')]
    articles = ''.join(f'<article><h3>{escape(q)}</h3><p>{escape(a)} <a href="{escape(url, quote=True)}">{escape(label)} →</a></p></article>' for q, a, url, label in qa)
    return f'<section class="search-answers section-wrap" aria-labelledby="answers-title"><p class="eyebrow">CODEX FILM STUDIO / FIELD GUIDE</p><h2 id="answers-title">{heading}</h2><p class="search-intro">{intro}</p><div class="answer-grid">{articles}</div>{credit(lang,date,REPO+"/commits/main/scripts/build_search.py")}</section>'


def static_cards(catalog, base, lang, strings):
    cards = []
    for index, style in enumerate(catalog['styles'], 1):
        name, description = loc(style, 'name', lang), loc(style, 'description', lang)
        href = base + route(style, lang)
        preview = loc(style, 'preview', lang) or style.get('poster', '')
        kind = ('样片剧照' if lang == 'zh' else 'FILM FRAME') if style.get('preview_kind') == 'frame' else ('风格示意' if lang == 'zh' else 'STYLE STUDY')
        cards.append(f'''<article class="style-card"><a class="card-open" href="{href}"><div class="card-art"><img src="{base + preview}" alt="{escape(name)} — {kind}" loading="lazy"><span class="card-index">{index:02}</span><span class="preview-kind">{kind}</span></div><div class="card-heading"><h3>{escape(name)}</h3><span aria-hidden="true">↗</span></div><p class="card-description">{escape(description)}</p></a><div class="card-meta"><span>{escape(loc(catalog["statuses"][style["status"]],"name",lang))}</span><span>{escape(strings["publicSample"] if style["capabilities"].get("published_film",style["capabilities"].get("published_demo")) else strings["noFilm"])}</span></div>{capability_facts(style, strings)}<a class="card-page" href="{href}">{'风格与制作指南' if lang == 'zh' else 'Style & production guide'} →</a></article>''')
    return ''.join(cards)


def translate_home(source, strings):
    pattern = r'<([a-z][a-z0-9]*)([^>]*\bdata-i18n="([^"]+)"[^>]*)>.*?</\1>'
    return re.sub(pattern, lambda m: f'<{m[1]}{m[2]}>{strings[m[3]]}</{m[1]}>', source, flags=re.S)


def agent_entry(style, lang):
    if lang == 'zh':
        intro = '在 Agent 中打开已克隆的仓库，复制提示词并替换方括号内容。'
        prompt = f'请用 {style} 风格，为[观众]制作关于[主题]的[时长]视频，使用[语言]配音和字幕。请你自动创建项目、准备环境、完成制作与检查，交付 MP4 和可编辑工程。'
    else:
        intro = 'Open the cloned repository in your coding Agent. Copy the prompt and replace the brackets.'
        prompt = f'Use the {style} style to make a [duration] film about [subject] for [audience], with narration and captions in [language]. Handle project setup, production and review, then deliver an MP4 and editable project.'
    return f'<film-agent-start style-id="{escape(style, quote=True)}"><p>{intro}</p><blockquote>{escape(prompt)}</blockquote></film-agent-start>'


def render_guide(style, content, catalog, base, prefix, lang, date, revision, strings):
    zh = lang == 'zh'; name = loc(style, 'name', lang); url = base + route(style, lang)
    title = name + ('：风格与制作指南' if zh else ' — Style & Production Guide') + ' | Codex Film Studio'
    desc = loc(style, 'description', lang); home = base + ('zh/' if zh else '')
    version = '?v=' + revision if revision else ''
    alternatives = {'en': base + route(style,'en'), 'zh-CN': base + route(style,'zh'), 'x-default': base + route(style,'en')}
    source_url = REPO + '/blob/main/' + style['guide']
    preview = loc(style, 'preview', lang) or style.get('poster','')
    links = []
    if landing := style.get('landing'):
        if landing.get('access') != 'local': links.append((landing['page'], '风格展示' if zh else 'Style showcase'))
    for page in style.get('showcases', []):
        if page['access'] == 'release' and page['page'] not in [p for p, _ in links]: links.append((page['page'], loc(page,'title',lang)))
    if style['id'] == 'whiteboard':
        links.append((('zh/' if zh else '')+'cases/whiteboard-rebuild/', '公开输入制作案例' if zh else 'Public-input production walkthrough'))
    showcases = ''.join(f'<li><a href="{base+p}{"?lang="+lang if not p.endswith("/") else ""}">{escape(label)} ↗</a></li>' for p, label in links)
    if not showcases: showcases = '<li>' + ('暂无公开影片，请从风格指南和工具开始。' if zh else 'No public film is registered; start with the guide and tools.') + '</li>'
    method_links = [(style['guide'],'视觉规则' if zh else 'Visual rules'), (style['prompt'],'创作提示' if zh else 'Authoring prompt'), ('methods/WORKFLOW.md','制作流程' if zh else 'Production workflow'), ('methods/REVIEW.md','审阅方法' if zh else 'Review method')]
    related = ''.join(f'<a href="{base + route(other,lang)}">{escape(loc(other,"name",lang))} →</a>' for other in catalog['styles'] if other['id'] != style['id'])
    page = f'''<!doctype html><html lang="{'zh-CN' if zh else 'en'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#101816"><link rel="icon" href="{prefix}catalog/brand/studio-logo.svg{version}" type="image/svg+xml"><link rel="stylesheet" href="{prefix}catalog/studio.css{version}"><link rel="stylesheet" href="{prefix}catalog/studio-header.css{version}"><link rel="stylesheet" href="{prefix}catalog/brand.css{version}"><script type="module" src="{prefix}catalog/agent-start.mjs{version}"></script></head><body class="guide-page">
<a class="skip-link" href="#guide">{'跳转到正文' if zh else 'Skip to content'}</a>
<header class="guide-header section-wrap"><a class="footer-brand studio-brand-lockup" href="{home}"><img class="studio-brand-logo" src="{prefix}catalog/brand/studio-logo.svg{version}" width="48" height="48" alt="" aria-hidden="true"><span>CODEX FILM STUDIO<span class="live-dot"></span></span></a><div class="studio-header-actions"><nav aria-label="Language"><a href="{alternatives['en']}" lang="en" hreflang="en" {'aria-current="page"' if not zh else ''}>EN</a><a href="{alternatives['zh-CN']}" lang="zh-CN" hreflang="zh-CN" {'aria-current="page"' if zh else ''}>中文</a></nav><a class="studio-x-link" href="https://x.com/LeoGuoLabs" target="_blank" rel="noopener noreferrer" aria-label="@LeoGuoLabs on X"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3L12 14.6 5.5 22H2.3l7.3-8.5L1.8 2h6.4l4.5 6.8L18.9 2Zm-1.1 18h1.7L7.2 3.9H5.4L17.8 20Z"/></svg><span>@LeoGuoLabs</span></a></div></header>
<main id="guide" class="section-wrap"><nav class="breadcrumbs" aria-label="{'面包屑导航' if zh else 'Breadcrumb'}"><a href="{home}">{'风格片库' if zh else 'Style library'}</a><span aria-hidden="true"> / </span><span>{escape(name)}</span></nav>
<section class="guide-hero"><div><p class="eyebrow">STYLE / {escape(style['id'].upper())}</p><h1>{escape(name)}</h1><p class="guide-description">{escape(desc)}</p>{credit(lang,date,REPO+'/commits/main/'+style['guide'])}</div><figure><img src="{base+preview}" alt="{escape(name)}" fetchpriority="high"><figcaption>{('样片剧照' if zh else 'Film frame') if style.get('preview_kind') == 'frame' else ('风格示意' if zh else 'Style study')}</figcaption></figure></section>
<div class="guide-body"><article><section><h2>{'什么时候适合使用？' if zh else 'When should you use this style?'}</h2><p>{escape(content['use'])}</p></section><section><h2>{'如何组织画面与运动？' if zh else 'How do you build the picture and motion?'}</h2><p>{escape(content['method'])}</p><p><a href="{source_url}">{'阅读完整视觉规则' if zh else 'Read the full visual rules'} ↗</a></p></section><section><h2>{'交付前需要检查什么？' if zh else 'What should you check before delivery?'}</h2><p>{escape(content['check'])}</p></section><section><h2>{'如何开始创作？' if zh else 'How do you start a production?'}</h2>{agent_entry(style['id'], lang)}</section></article>
<aside><section><h2>{'可复用内容' if zh else 'What is included?'}</h2><p>{escape(loc(style,'status_note',lang))}</p>{capability_facts(style, strings)}</section><section><h2>{'观看与探索' if zh else 'Watch & explore'}</h2><ul>{showcases}</ul></section><section><h2>{'方法与依据' if zh else 'Methods & sources'}</h2><ul>{''.join(f'<li><a href="{REPO}/blob/main/{p}">{label} ↗</a></li>' for p,label in method_links)}</ul></section></aside></div>
<section class="related-styles"><h2>{'继续探索风格' if zh else 'Explore the collection'}</h2><div>{related}</div></section></main><footer class="footer section-wrap"><a href="{home}">← {'返回风格片库' if zh else 'Back to the style library'}</a><a href="{REPO}">{'源码与文档' if zh else 'Source & documentation'} ↗</a><a href="{base}sitemap.xml">{'站点地图' if zh else 'Sitemap'}</a></footer></body></html>'''
    graph = schema(base,url,title,desc,lang,date)
    graph.append({'@type':'BreadcrumbList','itemListElement':[
        {'@type':'ListItem','position':1,'name':'风格片库' if zh else 'Style library','item':home},
        {'@type':'ListItem','position':2,'name':name,'item':url}]})
    return metadata(page,title,desc,url,base+'catalog/social-card.jpg',lang,alternatives,graph)


def render_case(case, base, prefix, lang, date, revision):
    zh = lang == 'zh'; content = case[lang]
    relative = 'cases/' + case['id'] + '/'
    home = base + ('zh/' if zh else '')
    url = home + relative
    alternatives = {'en': base + relative, 'zh-CN': base + 'zh/' + relative, 'x-default': base + relative}
    title = content['title'] + ' | Codex Film Studio'
    version = '?v=' + revision if revision else ''
    sections = []
    for section in content['sections']:
        body = ''.join('<p>' + escape(p) + '</p>' for p in section['paragraphs'])
        if section.get('code'): body += '<pre><code>' + escape(section['code']) + '</code></pre>'
        sections.append(f'<section id="{section["id"]}"><h2>{escape(section["heading"])}</h2>{body}</section>')
    manifest = json.loads((ROOT / case['media']['manifest']).read_text())['editions'][case['media']['edition']]
    resources = [(base + 'styles/whiteboard/studio/index.html?edition=short', '观看三分钟样片' if zh else 'Watch the three-minute sample'),
                 (manifest['video']['url'], '下载公开 MP4' if zh else 'Download the public MP4'),
                 (manifest['inputs']['url'], '下载原始输入（含 ASR 记录）' if zh else 'Download original inputs (including ASR record)'),
                 (home + 'styles/whiteboard/', '白板风格指南' if zh else 'Whiteboard style guide')]
    links = ''.join(f'<li><a href="{escape(href, quote=True)}">{escape(label)} ↗</a></li>' for href,label in resources)
    sources = ''.join(f'<li><a href="{escape(s["url"], quote=True)}">{escape(s[lang])} ↗</a></li>' for s in case['sources'])
    page = f'''<!doctype html><html lang="{'zh-CN' if zh else 'en'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#101816"><link rel="icon" href="{prefix}catalog/brand/studio-logo.svg{version}"><link rel="stylesheet" href="{prefix}catalog/studio.css{version}"><link rel="stylesheet" href="{prefix}catalog/studio-header.css{version}"><link rel="stylesheet" href="{prefix}catalog/brand.css{version}"></head><body class="guide-page">
<a class="skip-link" href="#case">{'跳转到正文' if zh else 'Skip to content'}</a><header class="guide-header section-wrap"><a class="footer-brand studio-brand-lockup" href="{home}"><img class="studio-brand-logo" src="{prefix}catalog/brand/studio-logo.svg{version}" width="48" height="48" alt=""><span>CODEX FILM STUDIO</span></a><div class="studio-header-actions"><nav aria-label="Language"><a href="{alternatives['en']}" lang="en" hreflang="en" {'aria-current="page"' if not zh else ''}>EN</a><a href="{alternatives['zh-CN']}" lang="zh-CN" hreflang="zh-CN" {'aria-current="page"' if zh else ''}>中文</a></nav><a class="studio-x-link" href="{AUTHOR}">@LeoGuoLabs</a></div></header>
<main id="case" class="section-wrap"><nav class="breadcrumbs"><a href="{home}">{'风格片库' if zh else 'Style library'}</a> / {'制作案例' if zh else 'Production walkthrough'}</nav><section class="guide-hero"><div><p class="eyebrow">WHITEBOARD / PUBLIC SAMPLE</p><h1>{escape(content['title'])}</h1><p class="guide-description">{escape(content['description'])}</p>{credit(lang,date,REPO+'/commits/main/catalog/case-studies.json')}</div><figure><img src="{base}docs/readme/previews/whiteboard.{'zh' if zh else 'en'}.jpg" alt="{'白板样片剧照' if zh else 'Whiteboard sample frame'}"><figcaption>{'已发布样片剧照' if zh else 'Published sample frame'}</figcaption></figure></section><article class="case-body"><section><h2>{'观看与获取' if zh else 'Watch and obtain the inputs'}</h2><ul>{links}</ul></section>{''.join(sections)}<section><h2>{'源码与证据' if zh else 'Source and evidence'}</h2><ul>{sources}</ul></section></article></main><footer class="footer section-wrap"><a href="{home}">← {'返回风格片库' if zh else 'Back to the style library'}</a><a href="{REPO}">GitHub ↗</a></footer></body></html>'''
    graph = schema(base,url,title,content['description'],lang,date)
    graph.append({'@type':'BreadcrumbList','itemListElement':[
        {'@type':'ListItem','position':1,'name':'风格片库' if zh else 'Style library','item':home},
        {'@type':'ListItem','position':2,'name':content['title'],'item':url}]})
    return metadata(page,title,content['description'],url,base+'catalog/social-card.jpg',lang,alternatives,graph)


def build_search(output, catalog, origin=DEFAULT_ORIGIN, base_path='/codex-film-studio/', revision=''):
    base,prefix = site_base(origin,base_path)
    content = json.loads((ROOT/'catalog/search-content.json').read_text())
    strings = json.loads((ROOT/'catalog/strings.mjs').read_text().split('export default ',1)[1].strip().removesuffix(';'))
    cases = json.loads((ROOT/'catalog/case-studies.json').read_text())
    entries = {}; home_source = (output/'index.html').read_text()
    date = modified('styles.json','catalog/search-content.json','index.html','catalog/strings.mjs','scripts/build_search.py')
    for lang in ['en','zh']:
        home_path = 'zh/index.html' if lang == 'zh' else 'index.html'; url = canonical(base,home_path)
        title = strings[lang]['pageTitle']
        desc = strings[lang]['pageDescription']
        page = translate_home(home_source, strings[lang])
        page = page.replace('<html lang="en">', f'<html lang="{"zh-CN" if lang == "zh" else "en"}" data-site-root="{prefix}" data-page-language="{lang}">')
        # Root-based asset paths also work at /zh/ and at custom-domain deployments.
        page = re.sub(r'(href|src)="((?:catalog/|styles/)[^"]*)"', lambda m:f'{m[1]}="{prefix}{m[2]}"', page)
        page = re.sub(r'href="(?:\./|#(library|create))"', lambda m:'href="'+url+('#'+m[1] if m[1] else '')+'"', page)
        page = re.sub(r'<button type="button" data-language="(en|zh)"[^>]*>(.*?)</button>', lambda m:f'<a data-language="{m[1]}" href="{base + ("zh/" if m[1]=="zh" else "")}" lang="{"zh-CN" if m[1]=="zh" else "en"}" hreflang="{"zh-CN" if m[1]=="zh" else "en"}"'+(' aria-current="page"' if m[1]==lang else '')+f'>{m[2]}</a>',page)
        page = re.sub(r'(<div class="style-grid" id="style-grid"[^>]*>).*?(</div>)', lambda m:m[1]+static_cards(catalog,base,lang,strings[lang])+m[2],page,flags=re.S)
        page = re.sub(r'(<span id="collection-range">).*?(</span>)',rf'\g<1>01 — {len(catalog["styles"]):02}\2',page)
        page = page.replace('<div class="collection-note">', capability_overview(catalog,lang,strings[lang])+'<div class="collection-note">')
        page = page.replace('</main>',home_answers(lang,date,catalog,base)+'</main>')
        page = page.replace('<div class="footer-links">', '<div class="footer-links"><a href="'+base+'sitemap.xml">'+('站点地图' if lang=='zh' else 'Sitemap')+'</a>')
        page = re.sub(r'<noscript>.*?</noscript>', '<noscript><p class="noscript">'+('风格指南可直接阅读；搜索、筛选与详情弹窗需要 JavaScript。' if lang=='zh' else 'Read all style guides without JavaScript. Search, filters and detail dialogs use JavaScript.')+'</p></noscript>',page,flags=re.S)
        page = page.replace('placeholder="Find a style" aria-label="Find a style"',f'placeholder="{strings[lang]["search"]}" aria-label="{strings[lang]["search"]}"')
        graph=schema(base,url,title,desc,lang,date,[(loc(s,'name',lang),base+route(s,lang)) for s in catalog['styles']])
        page=metadata(page,title,desc,url,base+'catalog/social-card.jpg',lang,{'en':base,'zh-CN':base+'zh/','x-default':base},graph)
        target=output/home_path; target.parent.mkdir(parents=True,exist_ok=True); target.write_text(page)
        entries[url]=date
        for style in catalog['styles']:
            style_date=modified(style['guide'],'catalog/search-content.json','styles.json','catalog/strings.mjs','scripts/build_search.py')
            target=output/route(style,lang)/'index.html'; target.parent.mkdir(parents=True,exist_ok=True)
            target.write_text(render_guide(style,content[style['id']][lang],catalog,base,prefix,lang,style_date,revision,strings[lang]))
            entries[base+route(style,lang)]=style_date
    for case in cases:
        case_date = modified('catalog/case-studies.json',case['media']['manifest'],'scripts/build_search.py')
        for lang in ['en','zh']:
            relative = ('zh/' if lang == 'zh' else '') + 'cases/' + case['id'] + '/'
            target = output/relative/'index.html'; target.parent.mkdir(parents=True,exist_ok=True)
            target.write_text(render_case(case,base,prefix,lang,case_date,revision))
            entries[base+relative] = case_date
    # Existing sample players keep their compositions. Index public entrypoints;
    # internal bundle HTML is a duplicate/implementation detail, not a search destination.
    for style in catalog['styles']:
        public={p['page'] for p in style.get('showcases',[]) if p['access']=='release'}
        if style.get('landing'): public.add(style['landing']['page'])
        for path in (output/'styles'/style['id']).rglob('*.html'):
            relative=path.relative_to(output).as_posix()
            if relative == route(style,'en')+'index.html': continue
            source=path.read_text()
            head=Head(source); url=canonical(base,relative)
            title=head.title.strip() or style['name']+' | Codex Film Studio'
            desc=head.description.strip() or style['description']+' Explore the public showcase and production guide.'
            is_public=relative in public
            language = 'zh' if re.search(r'<html[^>]*lang=[\"\']zh',source,re.I) else 'en'
            page=metadata(source,title,desc,url,base+'catalog/social-card.jpg',lang=language,noindex=not is_public)
            if is_public:
                backlink=f'<aside style="padding:20px;font:14px/1.8 system-ui;background:#101816;color:#f0eee3"><a style="color:inherit" href="{base+route(style,"en")}">{escape(style["name"])} — production guide</a> · <a style="color:inherit" href="{base+route(style,"zh")}">{escape(style["name_zh"])}：制作指南</a></aside>'
                page=page.replace('</body>',backlink+'</body>',1)
                entries[url]=None  # Release media dates are not inferred from a new deployment.
            path.write_text(page)
    ns='http://www.sitemaps.org/schemas/sitemap/0.9'; ET.register_namespace('',ns)
    sitemap=ET.Element('{'+ns+'}urlset')
    for url,lastmod in sorted(entries.items()):
        node=ET.SubElement(sitemap,'{'+ns+'}url'); ET.SubElement(node,'{'+ns+'}loc').text=url
        if lastmod: ET.SubElement(node,'{'+ns+'}lastmod').text=lastmod
    ET.ElementTree(sitemap).write(output/'sitemap.xml',encoding='utf-8',xml_declaration=True)
    (output/'robots.txt').write_text('# Effective only when served at the origin root /robots.txt.\n# A GitHub Pages project subdirectory cannot set origin-wide crawler policy.\nUser-agent: *\nAllow: /\n\nUser-agent: OAI-SearchBot\nAllow: /\n\nSitemap: '+base+'sitemap.xml\n')
    (output/'404.html').write_text(f'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, follow"><title>Page not found | Codex Film Studio</title></head><body><h1>Page not found / 页面未找到</h1><p><a href="{base}">Style library</a> · <a href="{base}zh/">风格片库</a></p></body></html>')
    if revision:
        script=output/'catalog/studio.mjs'
        script.write_text(script.read_text().replace("'./strings.mjs'", f"'./strings.mjs?v={revision}'"))
    print(f'Generated {len(entries)} canonical search destinations')
