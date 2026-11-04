const root = document.documentElement;
const player = document.querySelector('#film-player');
const message = document.querySelector('#playback-message');
const status = document.querySelector('#copy-status');
const chapterRoot = document.querySelector('#chapters');
const chapters = [
  [0, 'Opening', '开场'], [192, 'Wake up', '起床'], [432, 'Get dressed', '穿衣'],
  [792, 'Ready to go', '准备出发'], [987, 'The animals', '农场动物'], [1347, 'Feeding time', '喂食'],
  [1611, 'Milk the cow', '挤牛奶'], [1875, 'Vegetables', '菜园'], [2163, 'Pull it up', '拔蔬菜'],
  [2403, 'The orchard', '果园'], [2691, 'Pick the fruit', '摘果子'], [2907, 'Carry it home', '搬回家'],
  [3195, 'Pack it up', '装箱'], [3411, 'A little rest', '小憩'], [3703, 'Turn the page', '翻过一页'],
];
const time = seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
let language = 'en', failed = false;
const text = (en, zh) => language === 'zh' ? zh : en;
const nodes = [...document.querySelectorAll('[data-zh]')];
for (const node of nodes) node.dataset.en = node.textContent;
const buttons = chapters.map(([frame, en, zh]) => {
  const button = document.createElement('button'); button.type = 'button';
  const stamp = document.createElement('time'); stamp.textContent = time(frame / 24);
  const label = document.createElement('span'); button.append(stamp, label);
  button.addEventListener('click', async () => {
    player.currentTime = frame / 24;
    try { await player.play(); failed = false; } catch { failed = true; }
    updateMessage(); updateChapter();
  });
  chapterRoot.append(button); return {button, label, en, zh};
});
function updateChapter() {
  let active = 0;
  chapters.forEach(([frame], index) => { if (player.currentTime >= frame / 24) active = index; });
  buttons.forEach(({button}, index) => button.setAttribute('aria-current', String(active === index)));
}
function updateMessage() {
  message.hidden = !failed;
  message.textContent = text('Playback could not start. Use the video controls to retry, or open the MP4 below.', '播放未能开始。请用播放器控件重试，或打开下方 MP4。');
}
function setLanguage(next) {
  language = next === 'zh' ? 'zh' : 'en'; root.lang = language === 'zh' ? 'zh-CN' : 'en';
  nodes.forEach(node => { node.textContent = node.dataset[language]; });
  buttons.forEach(({label, en, zh}) => { label.textContent = text(en, zh); });
  document.querySelectorAll('[data-lang]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.lang === language)));
  document.title = text('Crayon Picture Book — Codex Film Studio', '蜡笔绘本 — Codex Film Studio');
  const url = new URL(location.href); url.searchParams.set('lang', language); history.replaceState(null, '', url);
  document.querySelectorAll('[data-home]').forEach(link => {
    const target = new URL('../../../index.html', location.href); target.searchParams.set('lang', language);
    if (link.getAttribute('href').includes('#library')) target.hash = 'library'; link.href = target;
  });
  document.querySelectorAll('a[data-comparison]').forEach(link => {
    const target = new URL(link.href); target.searchParams.set('lang', language); link.href = target;
  });
  status.textContent = ''; updateMessage();
  try { localStorage.setItem('film-studio-language', language); } catch {}
}
for (const button of document.querySelectorAll('[data-lang]')) button.addEventListener('click', () => setLanguage(button.dataset.lang));
player.addEventListener('loadedmetadata', () => {
  if (Number.isFinite(player.duration)) document.querySelector('#duration').textContent = time(player.duration);
});
player.addEventListener('timeupdate', updateChapter); player.addEventListener('seeked', updateChapter);
player.addEventListener('error', () => { failed = true; updateMessage(); });
player.addEventListener('playing', () => { failed = false; updateMessage(); });
document.querySelector('#copy-creative').addEventListener('click', async () => {
  const prompt = document.querySelector('#creative-prompt');
  try {
    await navigator.clipboard.writeText(prompt.textContent);
    status.textContent = text('Prompt copied. Paste it into your Agent.', '提示词已复制，粘贴给 Agent 即可。');
  } catch {
    const range = document.createRange(); range.selectNodeContents(prompt);
    const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range);
    status.textContent = text('Text selected. Use your device’s Copy action.', '文字已选中，请使用设备的复制功能。');
  }
});
let saved;
try { saved = localStorage.getItem('film-studio-language'); } catch {}
const requested = new URLSearchParams(location.search).get('lang');
setLanguage(requested === 'en' || requested === 'zh' ? requested : saved || 'en'); updateChapter();
