import copy from './strings.mjs';
const REPO = 'https://github.com/leoguolabs/codex-film-studio';
const SITE = 'https://leoguolabs.github.io/codex-film-studio/';
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
  whiteboard:['drawn'], 'art-collage':['material'],
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
  impasto:['material','drawn','animation'],
  'hologram-hud':['animation'],
  'workbench-clay':['material','animation'],
  'colored-pencil':['drawn','material','animation'],
  'ink-wash':['drawn','material','animation'],
  'paper-lantern':['material','animation','drawn'],
  'papercut-red':['drawn','material','animation'],
  'marker-paper':['drawn','material','animation'],
  'ipad-sketch':['drawn','animation','material'],
  'city-symphony':['geography','material'],
  'ukiyoe':['drawn','material','animation'],
};
const $ = selector => document.querySelector(selector);
const styleGrid = $('#style-grid');
const toolbar = $('.library-toolbar');
const searchInput = $('#style-search');
const filterButtons = [...document.querySelectorAll('[data-filter]')];
const compareButton = $('#open-comparison');
const compareDialog = $('#compare-dialog');
const searchParams = new URLSearchParams(location.search);
const requestedFilter = filterButtons.find(button => button.dataset.filter === searchParams.get('category'));
const state = {
  catalog: null,
  frames: {},
  availability: { mode: 'public', pages: {} },
  language: 'en',
  filter: requestedFilter?.dataset.filter ?? 'all',
  query: searchParams.get('q') ?? '',
  detail: null,
  comparison: [],
};
const t = key => copy[state.language][key] ?? copy.en[key] ?? key;
const format = (key, values) => t(key).replace(/\{(\w+)\}/g, (_, name) => values[name]);
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
function samplePage(entry) {
  if (!(entry.capabilities.published_film ?? entry.capabilities.published_demo)) return null;
  const preview = previewPage(entry);
  if (preview?.access === 'release') return preview;
  return entry.showcases?.find(page => page.access === 'release');
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
    url.hash = location.hash;
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
      document.querySelectorAll('a[href]:not([data-language], [href^="#"])').forEach(link => {
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
  searchInput.placeholder = t('search');
  searchInput.setAttribute('aria-label', t('search'));
  $('.filters').setAttribute('aria-label',t('filterLabel'));
  $('.desk-scrub').setAttribute('aria-label', t('deskScrub'));
  $('[data-cut="-1"]').setAttribute('aria-label', t('deskPrevious'));
  $('[data-cut="1"]').setAttribute('aria-label', t('deskNext'));
  $('#style-dialog .dialog-close').setAttribute('aria-label',t('close'));
  $('#compare-dialog .dialog-close').setAttribute('aria-label', t('compareClose'));
  try { localStorage.setItem('film-studio-language',language); } catch { /* Private browsing can disable storage. */ }
  if (!PAGE_LANGUAGE) { const url = new URL(location.href); url.searchParams.set('lang',language); history.replaceState(null,'',url); }
  if (state.catalog) {
    renderStyles();
    updateDeskLinks();
    if (state.detail) renderDetail();
    if (compareDialog.open) renderComparison();
  }
  window.scrollTo({top: position, behavior: 'instant'});
}
function guideURL(entry) {
  return new URL(`${state.language === 'zh' ? 'zh/' : ''}styles/${entry.id}/`, SITE_ROOT).href;
}
function guideLink(entry, compact = false) {
  if (!PAGE_LANGUAGE) return '';
  const label = t('styleGuidePage');
  const title = compact ? t('guide') : label;
  return `<a class="card-page" href="${escape(guideURL(entry))}" aria-label="${escape(label)}">${escape(title)}<span aria-hidden="true">→</span></a>`;
}
function capabilitySummary(entry, includeStatus = false) {
  const caps = entry.capabilities;
  const source = {'public-inputs-and-repository':'sourcePublic', 'local-source-bundle':'sourceLocal', 'not-audited':'sourceUnaudited', 'unavailable':'sourceUnavailable'};
  const rebuild = {'clip':'rebuildClip', 'full':'rebuildFull', 'not-yet-revalidated':'rebuildUnvalidated'};
  const rows = [['renderer', caps.scene_renderer ? 'rendererIncluded' : 'rendererAuthored'],
    ['originalSource', source[caps.original_source] ?? 'sourceUnknown'],
    ['sampleRebuild', rebuild[caps.sample_rebuild] ?? 'rebuildUnknown']];
  const facts = rows.map(([label, value]) => [t(label), t(value)]);
  if (includeStatus) facts.unshift([t('compareReadiness'), localized(state.catalog.statuses[entry.status], 'name')]);
  return `<dl class="capability-facts">${facts.map(([label, value]) => `<div><dt>${escape(label)}</dt><dd>${escape(value)}</dd></div>`).join('')}</dl>`;
}

function updateDeskLinks() {
  document.querySelectorAll('[data-desk-style]').forEach(link => {
    const entry = state.catalog.styles.find(style => style.id === link.dataset.deskStyle);
    const page = entry && (samplePage(entry) ?? stylePage(entry));
    if (page) {
      const url = new URL(pageURL(page));
      if (!url.hash) url.hash = link.hash;
      link.href = url.href;
    }
  });
}

function normalizeSearch(value) {
  return value.normalize('NFKC').toLowerCase().replace(/[\p{Dash_Punctuation}_\s]+/gu, ' ').trim();
}

function sampleLink(entry) {
  const sample = samplePage(entry);
  const page = sample ?? stylePage(entry);
  if (!page) return '';
  const title = sample ? t('compareWatch') : stylePageLabel(page);
  return `<a class="card-page" href="${escape(pageURL(page))}">${escape(title)}<span aria-hidden="true">↗</span></a>`;
}

function renderStyles() {
  if (!state.catalog) return;
  const query = normalizeSearch(state.query);
  const terms = query ? query.split(' ') : [];
  const matches = [];
  for (const entry of state.catalog.styles) {
    const tags = categories[entry.id] ?? [];
    if (state.filter !== 'all' && !tags.includes(state.filter)) continue;
    if (!query) {
      matches.push({ entry, score: 0 });
      continue;
    }
    const names = normalizeSearch([entry.name, entry.name_zh, entry.id].join(' '));
    const descriptions = normalizeSearch([entry.description, entry.description_zh].join(' '));
    const labels = tags.flatMap(tag => [copy.en[tag], copy.zh[tag]]);
    const haystack = [names, descriptions, normalizeSearch(labels.join(' '))].join(' ');
    if (!terms.every(term => haystack.includes(term))) continue;
    const titleMatches = terms.filter(term => names.includes(term)).length;
    const phraseMatch = names.includes(query) ? 2 : Number(descriptions.includes(query));
    matches.push({ entry, score: titleMatches * 3 + phraseMatch });
  }
  const entries = matches.sort((a, b) => b.score - a.score).map(match => match.entry);
  const count = entries.length, total = state.catalog.styles.length;
  const resultText = format(count === total && state.filter === 'all' && !terms.length ? 'totalStyles' : 'results', { count, total });
  const resultCount = $('#style-count');
  if (resultCount.textContent !== resultText) resultCount.textContent = resultText;
  styleGrid.innerHTML = entries.map(entry => {
    const name = localized(entry, 'name');
    const kind = entry.preview_kind === 'frame' ? '' : `<span class="preview-kind">${t('sketch')}</span>`;
    return `<article class="style-card">
      <div class="card-content">
        <div class="card-art">${preview(entry)}${kind}</div>
        <div class="card-heading"><h3><button type="button" class="card-open" data-style="${escape(entry.id)}" aria-haspopup="dialog" aria-controls="style-dialog">
          ${escape(name)}<span aria-hidden="true">＋</span>
        </button></h3></div>
        <p class="card-description">${escape(localized(entry, 'description'))}</p>
      </div>
      <div class="card-meta"><span>${escape(localized(state.catalog.statuses[entry.status], 'name'))}</span></div>
      <div class="card-actions">
        ${sampleLink(entry)}
        ${guideLink(entry, true)}
        <button type="button" class="card-compare" data-compare-style="${escape(entry.id)}" aria-label="${escape(format('compareAdd', {style:name}))}" aria-pressed="false">
          <span aria-hidden="true" class="is-unselected">＋</span><span aria-hidden="true" class="is-selected">✓</span>${t('compareCard')}
        </button>
      </div>
    </article>`;
  }).join('') || `<div class="empty-state"><p>${t('noResults')}</p><button type="button" data-reset-search>${t('resetSearch')}</button></div>`;
  updateComparisonControls();
}
function renderDetail() {
  const entry = state.catalog.styles.find(s => s.id === state.detail);
  if (!entry) return;
  const primary = stylePage(entry);
  const sample = previewPage(entry);
  const missing = primary?.access === 'local' && !isAvailable(primary);
  const links = primary ? `<a class="primary-page" href="${escape(pageURL(primary))}">${stylePageLabel(primary)}<span aria-hidden="true">↗</span></a>` : '';
  const art = preview(entry, true);
  const previewLink = sample ? `<a class="preview-player" href="${escape(pageURL(sample))}">${art}</a>` : art;
  $('#style-detail').innerHTML = `<div class="detail-art" data-preview-kind="${escape(entry.preview_kind ?? 'schematic')}">${previewLink}<span class="preview-kind">${t(entry.preview_kind === 'frame' ? 'frame' : 'sketch')}</span></div>
    <div class="detail-copy">
      <h2 id="detail-title">${escape(localized(entry, 'name'))}</h2>
      <p class="detail-description">${escape(localized(entry, 'description'))}</p>
      <div class="detail-pages">${links}${guideLink(entry)}</div>
      ${!primary ? `<p class="local-help">${t('noShowcase')}</p>` : ''}
      ${missing ? `<p class="local-help">${t(state.availability.mode === 'local' ? 'missingProject' : 'localHelp')}</p>` : ''}
      ${capabilitySummary(entry, true)}
      <div class="detail-links"><a href="${repoLink(entry.guide)}" target="_blank" rel="noopener noreferrer">${t('guide')} ↗</a><a href="${repoLink(entry.prompt)}" target="_blank" rel="noopener noreferrer">${t('prompt')} ↗</a><a href="${REPO}/tree/main/${entry.template}" target="_blank" rel="noopener noreferrer">${t('files')} ↗</a></div>
      <h3>${t('startStyle')}</h3><film-agent-start style-id="${escape(entry.id)}" compact></film-agent-start>
    </div>`;
}
function openStyle(id) {
  state.detail = id; renderDetail();
  $('#create film-agent-start').setAttribute('style-id',id);
  const url = new URL(location.href); url.searchParams.set('style',id); history.replaceState(null,'',url);
  if (!$('#style-dialog').open) $('#style-dialog').showModal();
}
function closeStyle() { $('#style-dialog').close(); }

function updateURL(parameters) {
  const url = new URL(location.href);
  for (const [key, value] of Object.entries(parameters)) {
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
  }
  history.replaceState(history.state, '', url);
}

function applySearch(revealResults = false) {
  const firstRowIsAbove = revealResults && styleGrid.getBoundingClientRect().top < toolbar.getBoundingClientRect().bottom - 12;
  for (const button of filterButtons) {
    const selected = button.dataset.filter === state.filter;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  }
  updateURL({ q: state.query.trim(), category: state.filter === 'all' ? '' : state.filter });
  renderStyles();
  if (firstRowIsAbove) $('#library').scrollIntoView({behavior:'instant'});
}

function updateComparisonControls() {
  const count = state.comparison.length;
  compareButton.disabled = count === 0;
  compareButton.dataset.ready = String(count === 2);
  compareButton.querySelector('.compare-count').textContent = count + '/2';
  compareButton.setAttribute('aria-label', t('compareStyles') + ', ' + format('compareSelection', {count}));
  document.querySelectorAll('[data-compare-style]').forEach(button => {
    const selected = state.comparison.includes(button.dataset.compareStyle);
    button.setAttribute('aria-pressed', String(selected));
  });
}

let toastTimeout;
function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('visible');
    toast.textContent = '';
  }, 3600);
}

function toggleComparison(id) {
  const index = state.comparison.indexOf(id);
  if (index !== -1) {
    state.comparison.splice(index, 1);
  } else if (state.comparison.length < 2) {
    state.comparison.push(id);
  } else {
    showToast(t('compareFull'));
    return;
  }
  updateURL({ compare: state.comparison.join(',') });
  updateComparisonControls();
  $('#compare-status').textContent = format('compareSelection', {count: state.comparison.length});
  if (compareDialog.open) {
    renderComparison();
    compareDialog.querySelector('.dialog-close').focus({preventScroll:true});
  }
}

function renderComparison() {
  const styles = state.comparison.map(id => state.catalog.styles.find(entry => entry.id === id));
  const panels = styles.map(entry => {
    const name = localized(entry, 'name');
    return `<article class="compare-cell">
      <div class="compare-image">${preview(entry, true)}</div>
      <h3>${escape(name)}</h3>
      <p>${escape(localized(entry, 'description'))}</p>
      ${capabilitySummary(entry, true)}
      <div class="compare-actions">
        ${sampleLink(entry)}
        <button type="button" data-use-style="${escape(entry.id)}">${t('compareUse')} <span aria-hidden="true">→</span></button>
        <button type="button" class="remove-comparison" data-remove-comparison="${escape(entry.id)}" aria-label="${escape(format('compareRemove', {style:name}))}">${t('compareRemoveAction')}</button>
      </div>
    </article>`;
  });
  if (styles.length < 2) {
    panels.push(`<div class="compare-empty"><p>${t(styles.length ? 'compareMore' : 'compareEmpty')}</p>
      <button type="button" data-close-comparison>${t('compareBack')}</button></div>`);
  }
  $('#compare-content').innerHTML = styles.length ? `<div class="compare-grid">${panels.join('')}</div>` : panels[0];
}

document.querySelectorAll('[data-language]').forEach(button => button.addEventListener('click',event => { event.preventDefault(); setLanguage(button.dataset.language); }));
for (const button of filterButtons) button.addEventListener('click', () => {
  state.filter = button.dataset.filter;
  applySearch(true);
});
searchInput.value = state.query;
searchInput.addEventListener('input', () => {
  state.query = searchInput.value;
  applySearch(true);
});
document.addEventListener('click',event => {
  const card = event.target.closest('[data-style]');
  const compare = event.target.closest('[data-compare-style]');
  if (card && state.catalog) openStyle(card.dataset.style);
  if (compare) toggleComparison(compare.dataset.compareStyle);
  if (event.target.closest('[data-reset-search]')) {
    state.filter = 'all';
    state.query = searchInput.value = '';
    applySearch(true);
    searchInput.focus();
  }
});
compareButton.addEventListener('click', () => {
  renderComparison();
  compareDialog.showModal();
  compareDialog.scrollTop = 0;
});
compareDialog.addEventListener('click', event => {
  const remove = event.target.closest('[data-remove-comparison]');
  const create = event.target.closest('[data-use-style]');
  if (remove) toggleComparison(remove.dataset.removeComparison);
  if (create) {
    $('#create film-agent-start').setAttribute('style-id', create.dataset.useStyle);
    compareDialog.close();
    const section = $('#create');
    history.pushState(history.state, '', '#create');
    section.focus({preventScroll:true});
    section.scrollIntoView();
  }
  if (event.target.closest('.dialog-close, [data-close-comparison]')) compareDialog.close();
});
compareDialog.addEventListener('close', () => {
  if (compareButton.disabled) searchInput.focus({preventScroll:true});
});
$('#style-dialog .dialog-close').addEventListener('click',closeStyle);
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
  const styleIds = new Set(catalog.styles.map(entry => entry.id));
  const params = new URLSearchParams(location.search);
  state.comparison = [...new Set(params.get('compare')?.split(',') ?? [])].filter(id => styleIds.has(id)).slice(0, 2);
  for (const button of filterButtons) button.disabled = false;
  searchInput.disabled = false;
  applySearch();
  updateDeskLinks();
  // Keep old root links to a specific edition or chapter working after the homepage moves.
  if (params.has('edition') || location.hash === '#film') {
    const target = new URL('styles/whiteboard/studio/index.html',SITE_ROOT);
    target.search = location.search; target.hash = location.hash; location.replace(target.href);
  } else if (styleIds.has(params.get('style'))) openStyle(params.get('style'));
} catch (error) {
  console.error(error);
  if (!styleGrid.querySelector('article')) styleGrid.innerHTML = `<p class="empty-state">${t('loadFailed')} <a href="${REPO}/blob/main/styles/README.md">↗</a></p>`;
  for (const button of filterButtons) button.disabled = true;
  searchInput.disabled = true;
}
