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


def home_answers(lang, date):
    if lang == 'zh':
        heading = '如何用 Codex Film Studio 制作视频？'
        intro = 'Codex Film Studio 是由 LeoGuoLabs 维护的可复用动画与视频风格库。每种风格提供视觉规则、创作提示和项目入口；根据风格不同，还提供工具、可编辑渲染工程或公开展示。'
        qa = [('应该选择哪种风格？', '逐步解释可以从白板讲解开始；材质叙事可考虑艺术拼贴或蜡笔绘本；空间关系适合卫星影像；数据变化可用动态折线图喜剧。先阅读风格指南，再查看样片或交互示意。'),
              ('如何开始一个新项目？', '在 Agent 中打开已克隆的仓库，直接描述主题、观众、风格、语言和时长。Agent 会创建独立项目、准备环境、制作并检查影片，再交付 MP4 和可编辑工程；尚未克隆时，也可以让 Agent 完成。'),
              ('每种风格都有可直接渲染的影片吗？', '并非如此。白板风格提供已发布样片和可编辑渲染工程，其他条目包含不同程度的起步项目或工具包。公开展示与可复用工程能力是两回事，请核对每种风格的说明。'),
              ('如何核验制作方法和素材来源？', '风格指南链接到对应的 STYLE.md、创作提示和源码历史。公开样片和参考素材应遵守各自的署名与许可；新制作的事实、角色和素材需要单独核验。')]
    else:
        heading = 'How do you make a video with Codex Film Studio?'
        intro = 'Codex Film Studio is a reusable animation and video style library maintained by LeoGuoLabs. Each style provides visual rules, an authoring prompt and a project entry point, with tools, editable rendering code or public showcases depending on the package.'
        qa = [('Which style should I choose?', 'Start with Whiteboard Explainer for a step-by-step argument, Art Collage or Crayon Picture Book for material-led storytelling, Satellite Briefing for spatial relationships, or Animated Line Chart Comedy for changing data. Read the guide, then inspect a sample or interactive study.'),
              ('How do I start a new project?', 'Open the cloned repository in your coding Agent and describe the subject, audience, style, language and duration. The Agent creates the project, prepares the environment, produces and reviews the film, then delivers an MP4 and editable project. You can also ask it to clone the studio first.'),
              ('Does every style include a ready-to-render film?', 'No. Whiteboard includes released samples and an editable renderer; the other packages provide different combinations of starters and tools. A public showcase and a reusable scene renderer are separate capabilities. Check each style guide before planning production.'),
              ('Where can I verify the methods and sources?', 'Each guide links to its STYLE.md, authoring prompt and source history. Public samples and reference assets retain their own attribution and licensing requirements. Verify facts, characters and assets separately for each new production.')]
    return f'''<section class="search-answers section-wrap" aria-labelledby="answers-title"><p class="eyebrow">CODEX FILM STUDIO / FIELD GUIDE</p><h2 id="answers-title">{heading}</h2><p class="search-intro">{intro}</p><div class="answer-grid">{''.join(f'<article><h3>{q}</h3><p>{a}</p></article>' for q, a in qa)}</div>{credit(lang,date,REPO+'/commits/main/styles.json')}</section>'''


def static_cards(catalog, base, lang):
    cards = []
    for index, style in enumerate(catalog['styles'], 1):
        name, description = loc(style, 'name', lang), loc(style, 'description', lang)
        href = base + route(style, lang)
        preview = loc(style, 'preview', lang) or style.get('poster', '')
        kind = ('样片剧照' if lang == 'zh' else 'FILM FRAME') if style.get('preview_kind') == 'frame' else ('风格示意' if lang == 'zh' else 'STYLE STUDY')
        cards.append(f'''<article class="style-card"><a class="card-open" href="{href}"><div class="card-art"><img src="{base + preview}" alt="{escape(name)} — {kind}" loading="lazy"><span class="card-index">{index:02}</span><span class="preview-kind">{kind}</span></div><div class="card-heading"><h3>{escape(name)}</h3><span aria-hidden="true">↗</span></div><p class="card-description">{escape(description)}</p></a><a class="card-page" href="{href}">{'风格与制作指南' if lang == 'zh' else 'Style & production guide'} →</a></article>''')
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


def render_guide(style, content, catalog, base, prefix, lang, date, revision):
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
    showcases = ''.join(f'<li><a href="{base+p}?lang={lang}">{escape(label)} ↗</a></li>' for p, label in links)
    if not showcases: showcases = '<li>' + ('暂无公开影片，请从风格指南和工具开始。' if zh else 'No public film is registered; start with the guide and tools.') + '</li>'
    method_links = [(style['guide'],'视觉规则' if zh else 'Visual rules'), (style['prompt'],'创作提示' if zh else 'Authoring prompt'), ('methods/WORKFLOW.md','制作流程' if zh else 'Production workflow'), ('methods/REVIEW.md','审阅方法' if zh else 'Review method')]
    related = ''.join(f'<a href="{base + route(other,lang)}">{escape(loc(other,"name",lang))} →</a>' for other in catalog['styles'] if other['id'] != style['id'])
    page = f'''<!doctype html><html lang="{'zh-CN' if zh else 'en'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#101816"><link rel="icon" href="{prefix}catalog/brand/studio-logo.png{version}" type="image/png"><link rel="stylesheet" href="{prefix}catalog/studio.css{version}"><link rel="stylesheet" href="{prefix}catalog/studio-header.css{version}"><link rel="stylesheet" href="{prefix}catalog/brand.css{version}"><script type="module" src="{prefix}catalog/agent-start.mjs{version}"></script></head><body class="guide-page">
<a class="skip-link" href="#guide">{'跳转到正文' if zh else 'Skip to content'}</a>
<header class="guide-header section-wrap"><a class="footer-brand studio-brand-lockup" href="{home}"><img class="studio-brand-logo" src="{prefix}catalog/brand/studio-logo.png{version}" width="64" height="64" alt="" aria-hidden="true"><span>CODEX FILM STUDIO<span class="live-dot"></span></span></a><div class="studio-header-actions"><nav aria-label="Language"><a href="{alternatives['en']}" lang="en" hreflang="en" {'aria-current="page"' if not zh else ''}>EN</a><a href="{alternatives['zh-CN']}" lang="zh-CN" hreflang="zh-CN" {'aria-current="page"' if zh else ''}>中文</a></nav><a class="studio-x-link" href="https://x.com/LeoGuoLabs" target="_blank" rel="noopener noreferrer" aria-label="@LeoGuoLabs on X"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3L12 14.6 5.5 22H2.3l7.3-8.5L1.8 2h6.4l4.5 6.8L18.9 2Zm-1.1 18h1.7L7.2 3.9H5.4L17.8 20Z"/></svg><span>@LeoGuoLabs</span></a></div></header>
<main id="guide" class="section-wrap"><nav class="breadcrumbs" aria-label="{'面包屑导航' if zh else 'Breadcrumb'}"><a href="{home}">{'风格片库' if zh else 'Style library'}</a><span aria-hidden="true"> / </span><span>{escape(name)}</span></nav>
<section class="guide-hero"><div><p class="eyebrow">STYLE / {escape(style['id'].upper())}</p><h1>{escape(name)}</h1><p class="guide-description">{escape(desc)}</p>{credit(lang,date,REPO+'/commits/main/'+style['guide'])}</div><figure><img src="{base+preview}" alt="{escape(name)}" fetchpriority="high"><figcaption>{('样片剧照' if zh else 'Film frame') if style.get('preview_kind') == 'frame' else ('风格示意' if zh else 'Style study')}</figcaption></figure></section>
<div class="guide-body"><article><section><h2>{'什么时候适合使用？' if zh else 'When should you use this style?'}</h2><p>{escape(content['use'])}</p></section><section><h2>{'如何组织画面与运动？' if zh else 'How do you build the picture and motion?'}</h2><p>{escape(content['method'])}</p><p><a href="{source_url}">{'阅读完整视觉规则' if zh else 'Read the full visual rules'} ↗</a></p></section><section><h2>{'交付前需要检查什么？' if zh else 'What should you check before delivery?'}</h2><p>{escape(content['check'])}</p></section><section><h2>{'如何开始创作？' if zh else 'How do you start a production?'}</h2>{agent_entry(style['id'], lang)}</section></article>
<aside><section><h2>{'可复用内容' if zh else 'What is included?'}</h2><p>{escape(loc(style,'status_note',lang))}</p></section><section><h2>{'观看与探索' if zh else 'Watch & explore'}</h2><ul>{showcases}</ul></section><section><h2>{'方法与依据' if zh else 'Methods & sources'}</h2><ul>{''.join(f'<li><a href="{REPO}/blob/main/{p}">{label} ↗</a></li>' for p,label in method_links)}</ul></section></aside></div>
<section class="related-styles"><h2>{'继续探索风格' if zh else 'Explore the collection'}</h2><div>{related}</div></section></main><footer class="footer section-wrap"><a href="{home}">← {'返回风格片库' if zh else 'Back to the style library'}</a><a href="{REPO}">{'源码与文档' if zh else 'Source & documentation'} ↗</a><a href="{base}sitemap.xml">{'站点地图' if zh else 'Sitemap'}</a></footer></body></html>'''
    graph = schema(base,url,title,desc,lang,date)
    graph.append({'@type':'BreadcrumbList','itemListElement':[
        {'@type':'ListItem','position':1,'name':'风格片库' if zh else 'Style library','item':home},
        {'@type':'ListItem','position':2,'name':name,'item':url}]})
    return metadata(page,title,desc,url,base+'catalog/social-card.jpg',lang,alternatives,graph)


def build_search(output, catalog, origin=DEFAULT_ORIGIN, base_path='/codex-film-studio/', revision=''):
    base,prefix = site_base(origin,base_path)
    content = json.loads((ROOT/'catalog/search-content.json').read_text())
    strings = json.loads((ROOT/'catalog/strings.mjs').read_text().split('export default ',1)[1].strip().removesuffix(';'))
    entries = {}; home_source = (output/'index.html').read_text()
    date = modified('styles.json','catalog/search-content.json','index.html')
    for lang in ['en','zh']:
        home_path = 'zh/index.html' if lang == 'zh' else 'index.html'; url = canonical(base,home_path)
        title = 'Codex Film Studio — 动画与视频风格库' if lang == 'zh' else 'Codex Film Studio — Animation & Video Style Library'
        desc = ('探索白板讲解、艺术拼贴、蜡笔绘本等动画与视频风格，查看公开样片、视觉规则和制作指南，创建独立影片项目。' if lang == 'zh' else 'Explore animation and video styles, from whiteboard explainers to paper collage. Watch public samples, read production guides and start an independent film project.')
        page = translate_home(home_source, strings[lang])
        page = page.replace('<html lang="en">', f'<html lang="{"zh-CN" if lang == "zh" else "en"}" data-site-root="{prefix}" data-page-language="{lang}">')
        # Root-based asset paths also work at /zh/ and at custom-domain deployments.
        page = re.sub(r'(href|src)="((?:catalog/|styles/)[^"]*)"', lambda m:f'{m[1]}="{prefix}{m[2]}"', page)
        page = re.sub(r'href="(?:\./|#(library|create))"', lambda m:'href="'+url+('#'+m[1] if m[1] else '')+'"', page)
        page = re.sub(r'<button type="button" data-language="(en|zh)"[^>]*>(.*?)</button>', lambda m:f'<a data-language="{m[1]}" href="{base + ("zh/" if m[1]=="zh" else "")}" lang="{"zh-CN" if m[1]=="zh" else "en"}" hreflang="{"zh-CN" if m[1]=="zh" else "en"}"'+(' aria-current="page"' if m[1]==lang else '')+f'>{m[2]}</a>',page)
        page = re.sub(r'(<div class="style-grid" id="style-grid"[^>]*>).*?(</div>)', lambda m:m[1]+static_cards(catalog,base,lang)+m[2],page,flags=re.S)
        page = re.sub(r'(<span id="collection-range">).*?(</span>)',rf'\g<1>01 — {len(catalog["styles"]):02}\2',page)
        page = page.replace('</main>',home_answers(lang,date)+'</main>')
        page = page.replace('<div class="footer-links">', '<div class="footer-links"><a href="'+base+'sitemap.xml">'+('站点地图' if lang=='zh' else 'Sitemap')+'</a>')
        page = re.sub(r'<noscript>.*?</noscript>', '<noscript><p class="noscript">'+('风格指南可直接阅读；搜索、筛选与详情弹窗需要 JavaScript。' if lang=='zh' else 'Read all style guides without JavaScript. Search, filters and detail dialogs use JavaScript.')+'</p></noscript>',page,flags=re.S)
        page = page.replace('placeholder="Find a style" aria-label="Find a style"',f'placeholder="{strings[lang]["search"]}" aria-label="{strings[lang]["search"]}"')
        graph=schema(base,url,title,desc,lang,date,[(loc(s,'name',lang),base+route(s,lang)) for s in catalog['styles']])
        page=metadata(page,title,desc,url,base+'catalog/social-card.jpg',lang,{'en':base,'zh-CN':base+'zh/','x-default':base},graph)
        target=output/home_path; target.parent.mkdir(parents=True,exist_ok=True); target.write_text(page)
        entries[url]=date
        for style in catalog['styles']:
            style_date=modified(style['guide'],'catalog/search-content.json','styles.json')
            target=output/route(style,lang)/'index.html'; target.parent.mkdir(parents=True,exist_ok=True)
            target.write_text(render_guide(style,content[style['id']][lang],catalog,base,prefix,lang,style_date,revision))
            entries[base+route(style,lang)]=style_date
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
