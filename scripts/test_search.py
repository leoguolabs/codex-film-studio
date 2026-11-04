"""Check crawler-visible HTML, language routes and canonical deployment URLs."""
from html.parser import HTMLParser
import json
from pathlib import Path
import shutil
import tempfile
import unittest
from urllib.parse import urlsplit
import xml.etree.ElementTree as ET

from build_search import ROOT, build_search, site_base, metadata, renderer_summary


class Document(HTMLParser):
    def __init__(self, text):
        super().__init__(); self.tags=[]; self.text=[]; self.json=[]; self.in_json=False
        self.feed(text)

    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs); self.tags.append((tag,attrs))
        if tag=='script' and attrs.get('type')=='application/ld+json': self.in_json=True

    def handle_endtag(self,tag):
        if tag=='script': self.in_json=False

    def handle_data(self,data):
        if self.in_json: self.json.append(json.loads(data))
        else: self.text.append(data)

    def attrs(self,tag,**filters):
        return [attrs for name,attrs in self.tags if name==tag and all(attrs.get(k)==v for k,v in filters.items())]


class SearchTests(unittest.TestCase):
    def make_site(self,output,origin,path):
        catalog=json.loads((ROOT/'styles.json').read_text())
        shutil.copyfile(ROOT/'index.html',output/'index.html')
        (output/'catalog').mkdir()
        shutil.copyfile(ROOT/'catalog/studio.mjs',output/'catalog/studio.mjs')
        for s in catalog['styles']:
            pages={p['page'] for p in s.get('showcases',[]) if p['access']=='release'}
            if s.get('landing'): pages.add(s['landing']['page'])
            pages.add(f"styles/{s['id']}/showcase/_assets/internal.html")
            for name in pages:
                p=output/name; p.parent.mkdir(parents=True,exist_ok=True)
                p.write_text('<html><head><title>A sample</title><meta name="description" content="A real sample."></head><body><h1>A sample</h1></body></html>')
        build_search(output,catalog,origin,path,'test-revision')
        return catalog

    def test_static_language_pages_and_sitemap_under_root_and_project_path(self):
        for prefix in ['/', '/codex-film-studio/']:
            with self.subTest(prefix=prefix),tempfile.TemporaryDirectory() as directory:
                out=Path(directory); base='https://films.example'+prefix
                catalog=self.make_site(out,'https://films.example',prefix)
                ns={'s':'http://www.sitemaps.org/schemas/sitemap/0.9'}
                urls=[n.text for n in ET.parse(out/'sitemap.xml').findall('s:url/s:loc',ns)]
                self.assertEqual(len(urls),len(set(urls)))
                self.assertFalse(any('_assets' in u or '?' in u or '#' in u or '404' in u for u in urls))
                for u in urls:
                    self.assertTrue(u.startswith(base),u)
                    target=out/u[len(base):]; target=target/'index.html' if u.endswith('/') else target
                    self.assertTrue(target.is_file(),u)
                    doc=Document(target.read_text())
                    self.assertEqual([a['href'] for a in doc.attrs('link',rel='canonical')],[u])
                    self.assertEqual(len(doc.attrs('meta',name='description')),1)
                    self.assertNotIn('noindex',doc.attrs('meta',name='robots')[0]['content'])
                    self.assertEqual(doc.attrs('meta',property='og:url')[0]['content'],u)
                for lang in ['en','zh']:
                    home=base+('zh/' if lang=='zh' else '')
                    homepage=out/('zh/index.html' if lang=='zh' else 'index.html')
                    doc=Document(homepage.read_text())
                    self.assertEqual(len(doc.attrs('h1')),1)
                    self.assertEqual(doc.attrs('html')[0]['data-site-root'],prefix)
                    self.assertEqual(doc.attrs('html')[0]['lang'],'zh-CN' if lang=='zh' else 'en')
                    text=' '.join(doc.text)
                    self.assertNotIn('Opening the collection',text)
                    self.assertNotIn('正在打开风格片库',text)
                    self.assertIn('如何用 Codex' if lang=='zh' else 'How do you make a video',text)
                    graph=doc.json[0]['@graph']; listing=next(n for n in graph if n['@type']=='CollectionPage')['mainEntity']
                    self.assertEqual(len(listing['itemListElement']),len(catalog['styles']))
                    for style in catalog['styles']:
                        url=home+f"styles/{style['id']}/"
                        self.assertIn(url,[a['href'] for a in doc.attrs('a')])
                        target=out/url[len(base):]/'index.html'; guide=Document(target.read_text())
                        self.assertEqual(len(guide.attrs('h1')),1)
                        self.assertGreater(len(' '.join(guide.text)),600)
                        self.assertIn(style['guide'],' '.join(a.get('href','') for a in guide.attrs('a')))
                        self.assertEqual(guide.attrs('link',rel='alternate',hreflang='zh-CN')[0]['href'],base+'zh/styles/'+style['id']+'/')
                        self.assertEqual(guide.attrs('link',rel='alternate',hreflang='en')[0]['href'],base+'styles/'+style['id']+'/')
                        # Copy/mode controls progressively enhance a readable
                        # prompt; crawlers and no-JS visitors still see it.
                        self.assertEqual(guide.attrs('script',type='module'), [{
                            'type': 'module', 'src': prefix + 'catalog/agent-start.mjs?v=test-revision'}])
                        self.assertEqual(guide.attrs('film-agent-start')[0]['style-id'], style['id'])
                        self.assertIn('请你自动创建项目' if lang == 'zh' else 'Handle project setup', ' '.join(guide.text))
                        self.assertNotIn('new_film.py', target.read_text())
                        self.assertNotIn('127.0.0.1',target.read_text())
                    for attr in doc.attrs('link',rel='alternate'):
                        self.assertIn(attr['href'],urls)
                private=Document((out/'styles/whiteboard/showcase/_assets/internal.html').read_text())
                self.assertIn('noindex',private.attrs('meta',name='robots')[0]['content'])
                self.assertIn(base+'sitemap.xml',(out/'robots.txt').read_text())
                self.assertIn('OAI-SearchBot',(out/'robots.txt').read_text())
                self.assertIn('noindex',(out/'404.html').read_text())
                self.assertIn("strings.mjs?v=test-revision",(out/'catalog/studio.mjs').read_text())

    def test_renderer_heading_tracks_registered_capabilities(self):
        entries = [{'capabilities': {'scene_renderer': True}},
                   {'capabilities': {'scene_renderer': False}}]
        catalog = {'styles': entries}
        self.assertEqual(renderer_summary(catalog, 'zh'), '2 种风格，1 种提供场景渲染器')
        self.assertEqual(renderer_summary(catalog, 'en'), '2 styles, 1 with scene renderers')
        entries[1]['capabilities']['scene_renderer'] = True
        self.assertEqual(renderer_summary(catalog, 'zh'), '2 种风格均提供场景渲染器')
        self.assertEqual(renderer_summary(catalog, 'en'), 'All 2 styles include scene renderers')

    def test_editable_demo_is_counted_as_an_executable_kit(self):
        from update_style_index import production_kit_summary
        from build_search import capability_overview

        def entry(kind, renderer):
            return {'template_kind': kind, 'name': 'Whiteboard', 'name_zh': '白板',
                    'capabilities': {'project_creation': True, 'scene_renderer': renderer}}

        catalog = {'styles': [entry('demo', True), entry('blank', True), entry('blank', False)]}
        for lang, expected in [
            ('zh', '2 个可执行制作包，其中 1 个附完整可编辑样片工程（白板）'),
            ('en', '2 executable production kits, including 1 with a complete editable sample project (Whiteboard)'),
        ]:
            self.assertEqual(production_kit_summary(catalog, lang), expected)
            self.assertIn(expected, Document(capability_overview(catalog, lang)).text)

    def test_shared_metadata_capabilities_and_case_evidence(self):
        strings=json.loads((ROOT/'catalog/strings.mjs').read_text().split('export default ',1)[1].strip().removesuffix(';'))
        template=Document((ROOT/'index.html').read_text())
        self.assertEqual(template.attrs('meta',name='description')[0]['content'],strings['en']['pageDescription'])
        self.assertIn(strings['en']['pageTitle'],' '.join(template.text))
        with tempfile.TemporaryDirectory() as directory:
            out=Path(directory); base='https://films.example/'
            catalog=self.make_site(out,'https://films.example','/')
            for lang in ['en','zh']:
                prefix='zh/' if lang=='zh' else ''
                doc=Document((out/prefix/'index.html').read_text())
                self.assertIn(strings[lang]['pageTitle'],' '.join(doc.text))
                for attrs in [dict(name='description'),dict(property='og:description'),dict(name='twitter:description')]:
                    self.assertEqual(doc.attrs('meta',**attrs)[0]['content'],strings[lang]['pageDescription'])
                self.assertIn(strings[lang]['productDefinition'],' '.join(doc.text))
                self.assertEqual(len(doc.attrs('dl',**{'class':'capability-facts'})),len(catalog['styles']))
                self.assertEqual(len(doc.attrs('section',**{'class':'capability-overview'})),1)
                self.assertIn(renderer_summary(catalog, lang), doc.text)
                for style in catalog['styles']:
                    guide=Document((out/prefix/'styles'/style['id']/'index.html').read_text())
                    key='rendererIncluded' if style['capabilities']['scene_renderer'] else 'rendererAuthored'
                    self.assertIn(strings[lang][key],' '.join(guide.text))
                    if style['capabilities']['original_source']=='local-source-bundle':
                        self.assertIn(strings[lang]['sourceLocal'],' '.join(guide.text))
                case=Document((out/prefix/'cases/whiteboard-rebuild/index.html').read_text())
                self.assertEqual(len(case.attrs('h1')),1)
                self.assertEqual(case.attrs('link',rel='canonical')[0]['href'],base+prefix+'cases/whiteboard-rebuild/')
                self.assertEqual(case.attrs('link',rel='alternate',hreflang='zh-CN')[0]['href'],base+'zh/cases/whiteboard-rebuild/')
                manifest=json.loads((ROOT/'styles/whiteboard/demo-assets.json').read_text())['editions']['short']
                for asset in ['inputs','video']:
                    self.assertIn(manifest[asset]['url'],[a['href'] for a in case.attrs('a')])
                self.assertIn(base+prefix+'cases/whiteboard-rebuild/',[a['href'] for a in doc.attrs('a')])
                self.assertIn('media/asr/review.json',' '.join(case.text))
                self.assertFalse(any(node['@type']=='FAQPage' for node in doc.json[0]['@graph']))

    def test_legacy_implicit_heads_keep_media_and_gain_head_metadata(self):
        for name in ['crayon-book/showcase/index.html', 'midcentury-cartoon/showcase/motion.html',
                     'satellite-briefing/showcase/comparison.html', 'scifi-sitcom/showcase/index.html']:
            with self.subTest(name=name):
                source=(ROOT/'styles'/name).read_text()
                before=Document(source)
                result=metadata(source,'A title','A description','https://films.example/sample/',
                                'https://films.example/image.jpg')
                after=Document(result)
                self.assertEqual(len(after.attrs('head')),1)
                self.assertEqual(len(after.attrs('body')),1)
                self.assertEqual(after.attrs('base'),before.attrs('base'))
                self.assertEqual(after.attrs('video'),before.attrs('video'))
                self.assertEqual(after.attrs('script'),before.attrs('script'))
                self.assertEqual(len(after.attrs('meta',name='description')),1)
                self.assertLess(result.index('rel="canonical"'),result.index('</head>'))
                self.assertLess(result.index('</head>'),result.index('<body>'))

    def test_origin_rejects_ambiguous_canonical_configuration(self):
        for origin in ['example.com','https://films.example/other','https://films.example?x=y','ftp://films.example']:
            with self.subTest(origin=origin),self.assertRaises(ValueError): site_base(origin,'/')


if __name__=='__main__': unittest.main()
