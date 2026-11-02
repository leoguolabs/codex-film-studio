import copy from './strings.mjs';
const REPO = 'https://github.com/visiontrail/codex-film-studio';
const SITE = 'https://visiontrail.github.io/codex-film-studio/';
const LOCAL_SITE = 'http://127.0.0.1:8249/';
const SITE_ROOT = new URL(document.documentElement.dataset.siteRoot ?? './', location.href);
let PAGE_LANGUAGE = document.documentElement.dataset.pageLanguage;
let languageRequest = 0;
const assetRevision = new URL(import.meta.url).searchParams.get('v');
function assetURL(path) {
  const url = new URL(path,SITE_ROOT);
  if (assetRevision) url.searchParams.set('v',assetRevision);
  return url.href;
}


// Categories are presentation metadata; paths, readiness and showcases come from styles.json.
const categories = {
  whiteboard:['drawn'], 'art-collage':['material'], 'crayon-book':['drawn','material'],
  'midcentury-cartoon':['animation','drawn'], 'satellite-briefing':['geography'], 'scifi-sitcom':['animation'],
  'caption-news':['animation','material'],
  'microgame':['animation','material'],
  'line-chart-comedy':['animation'], 'art-deco':['animation','material'],
  'lidar-survey':['geography'], 'newsreel':['material'],
  'exploded-teardown':['animation','material'],
  'halftone-dossier':['animation','material'],
  'prismatic-atlas':['animation'],
  'luminous-worlds':['animation'],
  'vivid-science':['animation','drawn'],
  'hologram-hud':['animation'],
};
const state = { catalog:null, frames:{}, availability:{mode:'public', pages:{}}, language:'en', filter:'all', query:'', detail:null };
const $ = selector => document.querySelector(selector);
const t = key => copy[state.language][key] ?? copy.en[key] ?? key;
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const localized = (entry, field) => state.language === 'zh' ? entry[`${field}_zh`] ?? entry[field] : entry[field];
const repoLink = path => `${REPO}/blob/main/${path.split('/').map(encodeURIComponent).join('/')}`;
const isAvailable = page => page.access === 'release' || state.availability.pages[page.id] === true;
const stylePage = entry => entry.landing ?? entry.showcases?.find(page => page.access === 'release') ?? entry.showcases?.[0];
const stylePageLabel = page => t(page.access === 'local' ? 'localStylePage' : 'stylePage');
function pageURL(page) {
  const usePublicSample = page.access === 'release' && state.availability.mode === 'local' && state.availability.pages[page.id] === false;
  const base = page.access === 'local' && state.availability.mode !== 'local' ? LOCAL_SITE
    : usePublicSample ? SITE : SITE_ROOT;
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
      for (const selector of ['.search-answers', '.footer-links > a[href$="sitemap.xml"]']) {
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
  document.title = language === 'zh' ? 'Codex Film Studio — 动画与视频风格库' : 'Codex Film Studio — Animation & Video Style Library';
  document.querySelectorAll('[data-i18n]').forEach(node => { node.innerHTML = t(node.dataset.i18n); });
  document.querySelectorAll('button[data-language]').forEach(button => button.setAttribute('aria-pressed', button.dataset.language === language));
  document.querySelectorAll('a[data-language]').forEach(link => {
    if (link.dataset.language === language) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  const search = $('#style-search');
  search.placeholder = t('search'); search.setAttribute('aria-label',t('search'));
  $('.filters').setAttribute('aria-label',t('filterLabel'));
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
    return `<article class="style-card" style="--delay:${i*.035}s">${previewAction(entry,`<div class="card-art">${preview(entry)}<span class="card-index">${String(state.catalog.styles.indexOf(entry)+1).padStart(2,'0')}</span><span class="preview-kind">${t(entry.preview_kind === 'frame' ? 'frame' : 'sketch')}</span><span class="card-arrow" aria-hidden="true">↗</span></div><div class="card-heading"><h3>${escape(localized(entry,'name'))}</h3><span aria-hidden="true">↗</span></div><p class="card-description">${escape(localized(entry,'description'))}</p>`,'card-open',true)}<div class="card-meta"><span>${escape(localized(state.catalog.statuses[entry.status],'name'))}</span><span class="${(entry.capabilities.published_film ?? entry.capabilities.published_demo) ? 'published' : ''}">${t(filmLabel)}</span></div>${primary ? `<a class="card-page" href="${escape(pageURL(primary))}">${stylePageLabel(primary)}<span aria-hidden="true">↗</span></a>` : ''}${guideLink(entry)}</article>`;
  }).join('') || `<p class="empty-state">${t('noResults')}</p>`;
}
function renderDetail() {
  const entry = state.catalog.styles.find(s => s.id === state.detail);
  if (!entry) return;
  const primary = stylePage(entry);
  const missing = primary?.access === 'local' && !isAvailable(primary);
  const links = primary ? `<a class="primary-page" href="${escape(pageURL(primary))}">${stylePageLabel(primary)}<span aria-hidden="true">↗</span></a>` : '';
  $('#style-detail').innerHTML = `<div class="detail-art" data-preview-kind="${escape(entry.preview_kind ?? 'schematic')}">${previewPage(entry) ? previewAction(entry,preview(entry,true),'preview-player') : preview(entry,true)}<span class="preview-kind">${t(entry.preview_kind === 'frame' ? 'frame' : 'sketch')}</span></div><div class="detail-copy"><p class="eyebrow">${escape(entry.id.toUpperCase().replaceAll('-',' / '))}</p><h2 id="detail-title">${escape(localized(entry,'name'))}</h2><p class="detail-description">${escape(localized(entry,'description'))}</p>${guideLink(entry)}<h3>${t('openPages')}</h3><div class="detail-pages">${links}</div>${!primary ? `<p class="local-help">${t('noShowcase')}</p>` : ''}${missing ? `<p class="local-help">${state.availability.mode === 'local' ? t('missingProject') : t('localHelp')}</p>` : ''}<div class="detail-links"><a href="${repoLink(entry.guide)}" target="_blank" rel="noopener noreferrer">${t('guide')} ↗</a><a href="${repoLink(entry.prompt)}" target="_blank" rel="noopener noreferrer">${t('prompt')} ↗</a><a href="${REPO}/tree/main/${entry.template}" target="_blank" rel="noopener noreferrer">${t('files')} ↗</a></div><h3>${t('startStyle')}</h3><film-agent-start style-id="${escape(entry.id)}" compact></film-agent-start></div>`;
}
function openStyle(id) {
  state.detail = id; renderDetail();
  $('#create film-agent-start').setAttribute('style-id',id);
  const url = new URL(location.href); url.searchParams.set('style',id); history.replaceState(null,'',url);
  if (!$('#style-dialog').open) $('#style-dialog').showModal();
}
function closeStyle() { $('#style-dialog').close(); }
document.querySelectorAll('[data-language]').forEach(button => button.addEventListener('click',event => { event.preventDefault(); setLanguage(button.dataset.language); }));
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
