const REPO = 'https://github.com/visiontrail/codex-film-studio';
const SITE = 'https://visiontrail.github.io/codex-film-studio/';
const LOCAL_SITE = 'http://127.0.0.1:8249/';
const assetRevision = new URL(import.meta.url).searchParams.get('v');
function assetURL(path) {
  const url = new URL(path,SITE_ROOT);
  if (assetRevision) url.searchParams.set('v',assetRevision);
  return url.href;
}
const copy = {
  en: {
    skip:'Skip to the style library', styles:'Styles', watch:'Screening room', create:'Create a film',
    heroEyebrow:'A COLLECTION OF VISUAL POSSIBILITIES', heroLine1:'One story.', heroLine2:'So many ways.',
    heroDescription:'A little ink. A cut of paper. A whole new world.<br>Find a visual language, then make it your own.',
    explore:'Explore the styles', watchSample:'Watch a sample', signature:'DRAWN WITH INTENTION. DIRECTED WITH CODEX.',
    heroCaption:'Different materials. A shared imagination.', originalArtwork:'ORIGINAL STYLE STUDY', collection:'THE STYLE COLLECTION',
    libraryEyebrow:'THE COLLECTION', libraryTitle:'Find your visual language.', all:'All styles', drawn:'Hand-drawn',
    animation:'Animation', material:'Paper & texture', geography:'Geography', search:'Find a style', loading:'Opening the collection…',
    collectionNote:'A style is a starting point. Each includes its own visual rules and tools; sample films and package readiness are listed separately.',
    compare:'Compare capabilities', screeningEyebrow:'FROM THE STUDIO', screeningTitle:'Ideas, in motion.',
    screeningAside:'Watch the films. Explore what made them.', publishedFilm:'PUBLISHED FILM',
    filmTitle:'Does AI help you learn—<br>or just finish?', filmDescription:'A continuous board. A moving marker. An argument that builds, one drawing at a time.',
    shortFilm:'3-minute film', longFilm:'12-minute film', filmSubtitle:'English narration · Subtitles & chapters',
    moreFromStudio:'More from the studio', localLabel:'FILMS & SHOWCASES',
    createEyebrow:'YOUR TURN IN THE DIRECTOR’S CHAIR', createLine1:'Bring the story.', createLine2:'Make it yours.',
    createDescription:'Pick a style and tell your Agent what you want to make. It handles setup, production and review; you guide the story.',
    readGuide:'Read the getting-started guide',
    footerTagline:'A visual language for your next film.',
    source:'Source & documentation ↗', previewCredits:'Preview credits ↗', inspiration:'With inspiration from', noResults:'No styles match. Try another name or category.',
    sketch:'STYLE STUDY', frame:'FILM FRAME', previewMissing:'Preview to come', available:'Available locally', localOnly:'Local project',
    publicSample:'Watch the sample', noFilm:'No player yet', localPages:'Local showcase', stylePage:'Open style page', localStylePage:'Open local style page', guide:'Style guide', prompt:'Style prompt', files:'Project files',
    openPages:'Films & showcase pages', startStyle:'Create in this style', localHelp:'Ask your Agent to open the local studio and check that the original production files are available.',
    missingProject:'The retained project is unavailable on this machine.', noShowcase:'A film page is not available for this style yet. Explore the guide and tools to create your own.',
    loadFailed:'The collection could not be loaded. Reload the page or open the style guide.',
    publicNote:'Watch the films online. For local previews, ask your Agent to open the studio and check the available production files.',
    localNote:'Local showcases use retained project files. Availability is checked on this machine. A preview frame does not mean the complete film is published.',
    previous:'Previous showcases', next:'Next showcases', close:'Close style details', filterLabel:'Filter styles',
  },
  zh: {
    skip:'跳转到风格片库', styles:'风格片库', watch:'放映室', create:'开始创作',
    heroEyebrow:'让每个故事，找到自己的画面', heroLine1:'一个故事。', heroLine2:'不止一种可能。',
    heroDescription:'几笔墨线，一叠纸张，一个全新的世界。<br>找到喜欢的视觉语言，拍出自己的故事。',
    explore:'探索全部风格', watchSample:'观看样片', signature:'用心构思画面，与 CODEX 一起执导。',
    heroCaption:'不同的材质，同样自由的想象。', originalArtwork:'原创风格示意', collection:'风格片库',
    libraryEyebrow:'风格片库', libraryTitle:'故事，从喜欢的画风开始。', all:'全部风格', drawn:'手绘',
    animation:'动画', material:'纸材与纹理', geography:'地理影像', search:'搜索风格', loading:'正在打开风格片库…',
    collectionNote:'每种风格都是一个起点，包含各自的视觉规则和工具。可复用内容的完成状态与已有样片分别标注。',
    compare:'比较各风格能力', screeningEyebrow:'工作室出品', screeningTitle:'让想法，动起来。',
    screeningAside:'看看影片，也看看它们如何被创作。', publishedFilm:'已发布影片',
    filmTitle:'AI 帮你学会了，<br>还是只是做完了？', filmDescription:'一块持续保留内容的白板，一支移动的笔。让论证随着画面，一步步展开。',
    shortFilm:'三分钟版', longFilm:'十二分钟完整版', filmSubtitle:'英语旁白 · 字幕与章节',
    moreFromStudio:'更多工作室作品', localLabel:'影片与展示',
    createEyebrow:'这一次，由你执导', createLine1:'带上你的故事。', createLine2:'拍出你的表达。',
    createDescription:'选一种画风，告诉 Agent 你想拍什么。它负责环境准备、制作与检查，你来决定故事和修改方向。',
    readGuide:'阅读创作入门指南',
    footerTagline:'为下一个故事，找到自己的视觉语言。',
    source:'源码与文档 ↗', previewCredits:'预览素材署名 ↗', inspiration:'灵感参考', noResults:'没有匹配的风格，试试其他名称或分类。',
    sketch:'风格示意', frame:'样片剧照', previewMissing:'预览待补充', available:'本机可用', localOnly:'本地项目',
    publicSample:'可观看样片', noFilm:'暂无播放器', localPages:'本地展示页', stylePage:'打开独立风格页', localStylePage:'打开本地风格页', guide:'风格说明', prompt:'风格提示词', files:'创作工程',
    openPages:'影片与展示页面', startStyle:'用这个风格创作', localHelp:'让 Agent 打开本地工作室，并检查原始制作项目是否齐全。',
    missingProject:'本机暂未找到保留的项目文件。', noShowcase:'这个风格尚未提供可打开的影片页面，可以从说明和工具开始创作。',
    loadFailed:'风格目录暂时无法加载，请刷新页面，或前往风格说明。',
    publicNote:'可以直接在线看片；本地预览则交给 Agent 启动工作室，并检查制作项目是否可用。',
    localNote:'本地展示读取保留项目的文件，可用状态根据本机文件检查。展示剧照不代表完整影片已发布。',
    previous:'上一组展示', next:'下一组展示', close:'关闭风格详情', filterLabel:'筛选风格',
  },
};

// Categories are presentation metadata; paths, readiness and showcases come from styles.json.
const categories = {
  'luminous-worlds':['animation'],
  whiteboard:['drawn'], 'art-collage':['material'], 'crayon-book':['drawn','material'],
  'midcentury-cartoon':['animation','drawn'], 'satellite-briefing':['geography'], 'scifi-sitcom':['animation'],
  'caption-news':['animation','material'],
  'microgame':['animation','material'],
  'line-chart-comedy':['animation'], 'art-deco':['animation','material'],
  'newsreel':['material'],
  'lidar-survey':['geography'],
  'exploded-teardown':['animation','material'],
  'halftone-dossier':['animation','material'],
  'prismatic-atlas':['animation'],
  'vivid-science':['animation','drawn'],
  'hologram-hud':['animation'],
};
const state = { catalog:null, frames:{}, availability:{mode:'public', pages:{}}, language:'en', filter:'all', query:'', detail:null };
const $ = selector => document.querySelector(selector);
const t = key => copy[state.language][key] ?? copy.en[key] ?? key;
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const localized = (entry, field) => state.language === 'zh' ? entry[`${field}_zh`] ?? entry[field] : entry[field];
const repoLink = path => `${REPO}/blob/main/${path.split('/').map(encodeURIComponent).join('/')}`;
const pageTitle = page => localized(page,'title');
const isAvailable = page => page.access === 'release' || state.availability.pages[page.id] === true;
const stylePage = entry => entry.landing ?? entry.showcases?.find(page => page.access === 'release') ?? entry.showcases?.[0];
const stylePageLabel = page => t(page.access === 'local' ? 'localStylePage' : 'stylePage');
function pageURL(page, edition) {
  const usePublicSample = page.access === 'release' && state.availability.mode === 'local' && state.availability.pages[page.id] === false;
  const base = page.access === 'local' && state.availability.mode !== 'local' ? LOCAL_SITE
    : usePublicSample ? SITE : new URL('./',location.href);
  const url = new URL(page.page,base);
  url.searchParams.set('lang', state.language);
  if (assetRevision) url.searchParams.set('v', assetRevision);
  if (page.anchor) url.hash = page.anchor;
  return url.href;
}
function preview(entry, eager = false) {
  const path = state.frames[entry.id] ?? localized(entry,'preview') ?? entry.poster;
  return path ? `<img src="${escape(assetURL(path))}" alt="${escape(localized(entry,'name'))} — ${escape(t(entry.preview_kind === 'frame' ? 'frame' : 'sketch'))}" loading="${eager ? 'eager' : 'lazy'}">` : `<div class="preview-placeholder">${t('previewMissing')}</div>`;
}
function previewPage(entry) {
  return entry.showcases?.find(page => page.id === entry.preview_showcase);
}
function previewAction(entry, contents, className = '', showDetails = false) {
  const page = showDetails ? null : previewPage(entry);
  const label = escape(localized(entry,'name'));
  return page
    ? `<a class="${className}" href="${escape(pageURL(page))}" aria-label="${label}">${contents}</a>`
    : `<button type="button" class="${className}" data-style="${escape(entry.id)}" aria-label="${label}" aria-haspopup="dialog" aria-controls="style-dialog">${contents}</button>`;
}
function readPreference() {
  if (PAGE_LANGUAGE) return PAGE_LANGUAGE;
  const query = new URLSearchParams(location.search).get('lang');
  if (['en','zh'].includes(query)) return query;
  try { return localStorage.getItem('film-studio-language') === 'zh' ? 'zh' : 'en'; } catch { return 'en'; }
}
async function setLanguage(language) {
  const request = ++languageRequest;
  const position = window.scrollY;
  if (PAGE_LANGUAGE && language !== PAGE_LANGUAGE) {
    const url = new URL(language === 'zh' ? 'zh/' : './', SITE_ROOT);
    url.search = location.search; url.searchParams.delete('lang');
    try {
      // Keep the live controls and their state; translate generated content
      // from the crawlable language page without navigating to an old fragment.
      const response = await fetch(url.href);
      if (!response.ok) throw new Error(`Language page HTTP ${response.status}`);
      const translated = new DOMParser().parseFromString(await response.text(), 'text/html');
      if (translated.documentElement.dataset.pageLanguage !== language) throw new Error('Invalid language page');
      if (request !== languageRequest) return;
      const metadata = 'link[rel="canonical"],link[rel="alternate"],meta[name="description"],meta[property^="og:"],meta[name^="twitter:"],script[type="application/ld+json"]';
      document.head.querySelectorAll(metadata).forEach(node => node.remove());
      translated.head.querySelectorAll(metadata).forEach(node => document.head.append(node.cloneNode(true)));
      for (const selector of ['.search-answers', '.capability-overview']) {
        const source = translated.querySelector(selector), target = $(selector);
        if (source && target) target.replaceWith(source.cloneNode(true));
      }
      const previousHome = new URL(PAGE_LANGUAGE === 'zh' ? 'zh/' : './', SITE_ROOT);
      document.querySelectorAll('a[href]:not([data-language])').forEach(link => {
        const target = new URL(link.href);
        if (target.origin === previousHome.origin && target.pathname === previousHome.pathname) {
          target.pathname = url.pathname;
          link.href = target.href;
        }
      });
      history.replaceState(history.state, '', url);
      PAGE_LANGUAGE = language;
      document.documentElement.dataset.pageLanguage = language;
    } catch {
      if (request === languageRequest) location.assign(url.href);
      return;
    }
  }
  state.language = language;
  document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
  document.title = t('pageTitle');
  for (const [selector, key] of [
    ['meta[name="description"]', 'pageDescription'],
    ['meta[property="og:title"],meta[name="twitter:title"]', 'pageTitle'],
    ['meta[property="og:description"],meta[name="twitter:description"]', 'pageDescription'],
  ]) document.querySelectorAll(selector).forEach(node => node.content = t(key));
  document.querySelectorAll('[data-i18n]').forEach(node => { node.innerHTML = t(node.dataset.i18n); });
  document.querySelectorAll('button[data-language]').forEach(button => button.setAttribute('aria-pressed', button.dataset.language === language));
  document.querySelectorAll('a[data-language]').forEach(link => {
    if (link.dataset.language === language) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  const search = $('#style-search');
  search.placeholder = t('search'); search.setAttribute('aria-label',t('search'));
  $('.filters').setAttribute('aria-label',t('filterLabel'));
  $('#shelf-prev').setAttribute('aria-label',t('previous')); $('#shelf-next').setAttribute('aria-label',t('next'));
  $('.dialog-close').setAttribute('aria-label',t('close'));
  try { localStorage.setItem('film-studio-language',language); } catch { /* Private browsing can disable storage. */ }
  if (!PAGE_LANGUAGE) { const url = new URL(location.href); url.searchParams.set('lang',language); history.replaceState(null,'',url); }
  if (state.catalog) { renderStyles(); if (state.detail) renderDetail(); }
  window.scrollTo({top: position, behavior: 'instant'});
}
function guideURL(entry) {
  return new URL(`${state.language === 'zh' ? 'zh/' : ''}styles/${entry.id}/`, SITE_ROOT).href;
}
function guideLink(entry) {
  return PAGE_LANGUAGE ? '<a class="card-page" href="' + escape(guideURL(entry)) + '">' + (state.language === 'zh' ? '风格与制作指南' : 'Style & production guide') + '<span aria-hidden="true">→</span></a>' : '';
}
function capabilitySummary(entry) {
  const caps = entry.capabilities;
  const source = {'public-inputs-and-repository':'sourcePublic', 'local-source-bundle':'sourceLocal', 'not-audited':'sourceUnaudited', 'unavailable':'sourceUnavailable'};
  const rebuild = {'clip':'rebuildClip', 'full':'rebuildFull', 'not-yet-revalidated':'rebuildUnvalidated'};
  const rows = [['renderer', caps.scene_renderer ? 'rendererIncluded' : 'rendererAuthored'],
    ['originalSource', source[caps.original_source] ?? 'sourceUnknown'],
    ['sampleRebuild', rebuild[caps.sample_rebuild] ?? 'rebuildUnknown']];
  return `<dl class="capability-facts">${rows.map(([label, value]) => `<div><dt>${escape(t(label))}</dt><dd>${escape(t(value))}</dd></div>`).join('')}</dl>`;
}
function renderStyles() {
  if (!state.catalog) return;
  const entries = state.catalog.styles.filter(entry => {
    const matchesCategory = state.filter === 'all' || categories[entry.id]?.includes(state.filter);
    const haystack = `${entry.name} ${entry.name_zh} ${entry.id} ${entry.description} ${entry.description_zh}`.toLocaleLowerCase();
    return matchesCategory && haystack.includes(state.query.toLocaleLowerCase().trim());
  });
  const count = entries.length, total = state.catalog.styles.length;
  $('#collection-range').textContent = `01 — ${String(total).padStart(2,'0')}`;
  $('#style-count').textContent = state.language === 'zh' ? `${total} 种视觉语言 · 无限种故事${count !== total ? ` · 显示 ${count} 种` : ''}` : `${total} visual languages. Endless stories.${count !== total ? ` · ${count} shown` : ''}`;
  $('#style-grid').innerHTML = entries.map((entry,i) => {
    const pages = entry.showcases ?? [], hasLocal = pages.some(p => p.access === 'local');
    const primary = stylePage(entry);
    const filmLabel = pages.some(p => p.access === 'release') ? 'publicSample' : hasLocal ? 'localPages' : 'noFilm';
    return `<article class="style-card" style="--delay:${i*.035}s">${previewAction(entry,`<div class="card-art">${preview(entry)}<span class="card-index">${String(state.catalog.styles.indexOf(entry)+1).padStart(2,'0')}</span><span class="preview-kind">${t(entry.preview_kind === 'frame' ? 'frame' : 'sketch')}</span><span class="card-arrow" aria-hidden="true">↗</span></div><div class="card-heading"><h3>${escape(localized(entry,'name'))}</h3><span aria-hidden="true">↗</span></div><p class="card-description">${escape(localized(entry,'description'))}</p>`,'card-open',true)}<div class="card-meta"><span>${escape(localized(state.catalog.statuses[entry.status],'name'))}</span><span class="${(entry.capabilities.published_film ?? entry.capabilities.published_demo) ? 'published' : ''}">${t(filmLabel)}</span></div>${primary ? `<a class="card-page" href="${escape(pageURL(primary))}">${stylePageLabel(primary)}<span aria-hidden="true">↗</span></a>` : ''}</article>`;
  }).join('') || `<p class="empty-state">${t('noResults')}</p>`;
}
function renderScreening() {
  const released = state.catalog.styles.flatMap(s => s.showcases ?? []).find(p => p.access === 'release');
  if (released) {
    $('#featured-watch').href = pageURL(released,'short');
    $('#short-film').href = pageURL(released,'short'); $('#long-film').href = pageURL(released,'long');
  }
  const localStyles = state.catalog.styles.filter(s => s.id !== 'whiteboard' && s.showcases?.length);
  $('#showcase-shelf').innerHTML = localStyles.map(entry => {
    const page = previewPage(entry) ?? entry.showcases.find(p => p.access === 'release') ?? entry.showcases[0];
    return `<article class="showcase-card">${previewAction(entry,`<div class="showcase-art">${preview(entry)}<span>${t(page.access === 'release' ? 'publicSample' : isAvailable(page) ? 'available' : 'localOnly')}</span></div><h4>${escape(pageTitle(page))}</h4><p>${escape(localized(entry,'name'))} · ${t(entry.preview_kind === 'frame' ? 'frame' : 'sketch')}</p>`)}</article>`;
  }).join('');
  $('#screening-note').innerHTML = state.availability.mode === 'local' ? t('localNote') : t('publicNote');
  requestAnimationFrame(updateShelfControls);
}
function renderDetail() {
  const entry = state.catalog.styles.find(s => s.id === state.detail);
  if (!entry) return;
  const primary = stylePage(entry);
  const missing = primary?.access === 'local' && !isAvailable(primary);
  const links = primary ? `<a class="primary-page" href="${escape(pageURL(primary))}">${stylePageLabel(primary)}<span aria-hidden="true">↗</span></a>` : '';
  $('#style-detail').innerHTML = `<div class="detail-art" data-preview-kind="${escape(entry.preview_kind ?? 'schematic')}">${previewPage(entry) ? previewAction(entry,preview(entry,true),'preview-player') : preview(entry,true)}<span class="preview-kind">${t(entry.preview_kind === 'frame' ? 'frame' : 'sketch')}</span></div><div class="detail-copy"><p class="eyebrow">${escape(entry.id.toUpperCase().replaceAll('-',' / '))}</p><h2 id="detail-title">${escape(localized(entry,'name'))}</h2><p class="detail-description">${escape(localized(entry,'description'))}</p><h3>${t('openPages')}</h3><div class="detail-pages">${links}</div>${!primary ? `<p class="local-help">${t('noShowcase')}</p>` : ''}${missing ? `<p class="local-help">${state.availability.mode === 'local' ? t('missingProject') : t('localHelp')}</p>` : ''}<div class="detail-links"><a href="${repoLink(entry.guide)}" target="_blank" rel="noopener noreferrer">${t('guide')} ↗</a><a href="${repoLink(entry.prompt)}" target="_blank" rel="noopener noreferrer">${t('prompt')} ↗</a><a href="${REPO}/tree/main/${entry.template}" target="_blank" rel="noopener noreferrer">${t('files')} ↗</a></div><h3>${t('startStyle')}</h3><film-agent-start style-id="${escape(entry.id)}" compact></film-agent-start></div>`;
}
function openStyle(id) {
  state.detail = id; renderDetail();
  $('#create film-agent-start').setAttribute('style-id',id);
  const url = new URL(location.href); url.searchParams.set('style',id); history.replaceState(null,'',url);
  if (!$('#style-dialog').open) $('#style-dialog').showModal();
}
function closeStyle() { $('#style-dialog').close(); }
function updateShelfControls() {
  const shelf = $('#showcase-shelf');
  $('#shelf-prev').disabled = shelf.scrollLeft <= 2;
  $('#shelf-next').disabled = shelf.scrollLeft + shelf.clientWidth >= shelf.scrollWidth - 2;
}
document.querySelectorAll('[data-language]').forEach(button => button.addEventListener('click',() => setLanguage(button.dataset.language)));
document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click',() => {
  state.filter = button.dataset.filter;
  document.querySelectorAll('[data-filter]').forEach(item => { const selected = item === button; item.classList.toggle('selected',selected); item.setAttribute('aria-pressed',selected); });
  renderStyles();
}));
$('#style-search').addEventListener('input',event => { state.query = event.target.value; if (state.catalog) renderStyles(); });
document.addEventListener('click',event => {
  const card = event.target.closest('[data-style]'); if (card) openStyle(card.dataset.style);
});
$('.dialog-close').addEventListener('click',closeStyle);
$('#style-dialog').addEventListener('click',event => {
  if (event.target !== $('#style-dialog')) return;
  const bounds = event.target.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeStyle();
});
$('#style-dialog').addEventListener('close',() => {
  state.detail = null; const url = new URL(location.href); url.searchParams.delete('style'); history.replaceState(null,'',url);
});
$('#shelf-prev').addEventListener('click',() => $('#showcase-shelf').scrollBy({left:-$('#showcase-shelf').clientWidth*.8,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'}));
$('#shelf-next').addEventListener('click',() => $('#showcase-shelf').scrollBy({left:$('#showcase-shelf').clientWidth*.8,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'}));
$('#showcase-shelf').addEventListener('scroll',updateShelfControls,{passive:true});
window.addEventListener('resize',updateShelfControls);
const navObserver = new IntersectionObserver(entries => {
  for (const entry of entries) if (entry.isIntersecting) document.querySelectorAll('.main-nav a').forEach(a => a.classList.toggle('active',a.hash === `#${entry.target.id}`));
},{rootMargin:'0px 0px -60% 0px'});
document.querySelectorAll('main section[id]').forEach(section => navObserver.observe(section));
// Old language-query links resolve to the same crawlable language URLs as the switcher.
const legacyLanguage = new URLSearchParams(location.search).get('lang');
if (PAGE_LANGUAGE && ['en','zh'].includes(legacyLanguage)) {
  const target = new URL(legacyLanguage === 'zh' ? 'zh/' : './', SITE_ROOT);
  target.search = location.search; target.searchParams.delete('lang'); target.hash = location.hash;
  location.replace(target.href);
}
setLanguage(readPreference());
try {
  const [catalog,availability,frames] = await Promise.all([
    fetch(assetURL('styles.json')).then(response => { if (!response.ok) throw new Error(`Catalog HTTP ${response.status}`); return response.json(); }),
    fetch(assetURL('catalog-availability.json')).then(response => response.ok ? response.json() : null).catch(() => null),
    fetch(assetURL('docs/readme/frames.json')).then(response => response.ok ? response.json() : null).catch(() => null),
  ]);
  state.catalog = catalog; if (availability) state.availability = availability;
  for (const frame of frames?.frames ?? []) state.frames[frame.style] = frame.image;
  renderStyles();
  // Keep old root links to a specific edition or chapter working after the homepage moves.
  const params = new URLSearchParams(location.search);
  if (params.has('edition') || location.hash === '#film') {
    const target = new URL('styles/whiteboard/studio/index.html',SITE_ROOT);
    target.search = location.search; target.hash = location.hash; location.replace(target.href);
  } else if (params.has('style') && catalog.styles.some(entry => entry.id === params.get('style'))) openStyle(params.get('style'));
} catch (error) {
  console.error(error);
  if (!$('#style-grid').querySelector('article')) $('#style-grid').innerHTML = `<p class="empty-state">${t('loadFailed')} <a href="${REPO}/blob/main/styles/README.md">↗</a></p>`;
  document.querySelectorAll('[data-filter]').forEach(button => { button.disabled = true; });
}
