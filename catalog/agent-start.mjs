// A shared, prompt-first entry point. Production commands belong to the Agent.
const REPO = 'https://github.com/visiontrail/codex-film-studio';
export function filmPrompt(style, language = 'en', mode = 'new') {
  if (mode === 'replay') return language === 'zh'
    ? `请用 Codex Film Studio 原样复刻 ${style} 的样片：[样片标题或链接]。请你查找可用的原始工程、素材和配音，创建独立制作项目，完成环境准备、渲染与检查，交付 MP4 和可编辑工程。如果缺少源工程或素材，请明确告诉我缺什么；不要用新编内容代替原片。`
    : `Recreate this ${style} sample with Codex Film Studio: [sample title or link]. Find the available original project, assets and recorded audio, create an independent production, prepare the environment, render and review it, then deliver an MP4 and editable project. If original sources or assets are missing, tell me exactly what is needed; do not substitute a new story.`;
  return language === 'zh'
    ? `请用 Codex Film Studio 的 ${style} 风格，为[目标观众]制作一部关于[主题]的[时长]视频，使用[语言]配音和字幕。请你读取风格与制作指南，自动创建独立项目、准备环境，完成脚本、画面、动画与声音。检查最终画面、运动和音轨，修复发现的问题，交付 1080p MP4 和可编辑工程，并说明实际检查范围。`
    : `Use the ${style} style in Codex Film Studio to make a [duration] film about [subject] for [audience], with narration and captions in [language]. Read the style and production guides, create an independent project, prepare the environment, and produce the script, visuals, animation and sound. Review the final pictures, motion and audio, fix observed problems, and deliver a 1080p MP4 with the editable project and a report of what you checked.`;
}

const text = {
  en: {
    eyebrow: 'YOUR IDEA → YOUR FILM', title: 'Start with a conversation.',
    intro: 'Open the cloned repository in Codex or your coding Agent. Paste a prompt below and replace the brackets with your idea. Your Agent handles project setup and production.',
    new: 'Make a new film', replay: 'Recreate a sample', copy: 'Copy prompt',
    copied: 'Prompt copied. Paste it into your Agent.', failed: 'Text selected. Use your device’s Copy action.',
    note: 'For an exact recreation, the Agent checks for the original source project and assets. A film download alone may not include them.',
    setup: 'Haven’t cloned the studio yet?',
    setupPrompt: `Clone ${REPO}.git into a new folder without overwriting existing files. Read AGENTS.md and the codex-film skill, then help me make a film from my brief. Handle the setup and commands yourself.`,
    next: 'Describe your idea → Let the Agent produce it → Review the film and ask for changes.',
  },
  zh: {
    eyebrow: '从想法，到影片', title: '说出想法，就能开始。',
    intro: '在 Codex 或你使用的编程 Agent 中打开已克隆的仓库。复制下面的提示词，把方括号换成你的想法；项目创建、环境准备与制作由 Agent 完成。',
    new: '用这个风格做新片', replay: '复刻原样片', copy: '复制提示词',
    copied: '提示词已复制，粘贴给 Agent 即可。', failed: '文字已选中，请使用设备的复制功能。',
    note: '原样复刻时，Agent 会先检查原始工程和素材是否齐全。成片下载包可能不包含这些内容。',
    setup: '还没有克隆工作室？',
    setupPrompt: `请将 ${REPO}.git 克隆到新的文件夹，不覆盖已有文件。读取 AGENTS.md 和 codex-film 技能，然后根据我的创作要求制作影片。环境准备和命令执行请你完成。`,
    next: '说出想法 → Agent 完成制作 → 看成片，再提出修改。',
  },
};

const css = `
  :host { display:block; min-width:0; color:inherit; font:inherit; }
  * { box-sizing:border-box; }
  .panel { padding:clamp(20px,3vw,36px); border:1px solid currentColor; border-radius:3px; }
  .top { display:flex; justify-content:space-between; gap:16px; align-items:center; }
  .eyebrow { margin:0; font-size:11px; letter-spacing:.13em; font-weight:700; }
  h3 { margin:16px 0 12px; font:inherit; font-size:clamp(24px,3vw,36px); line-height:1.2; }
  p { line-height:1.7; margin:0 0 20px; }
  .modes { display:flex; flex-wrap:wrap; gap:8px; margin:24px 0 18px; }
  button, summary { font:inherit; cursor:pointer; color:inherit; }
  button { border:1px solid currentColor; background:transparent; padding:10px 15px; border-radius:2px; }
  button[aria-pressed=true] { background:color-mix(in srgb,currentColor 12%,transparent); box-shadow:inset 0 -3px currentColor; }
  button:hover { background:color-mix(in srgb,currentColor 8%,transparent); }
  :focus-visible { outline:2px solid currentColor; outline-offset:4px; }
  blockquote { margin:0 0 20px; padding:0 0 0 18px; border-left:3px solid currentColor; font:inherit; font-size:16px; line-height:1.8; overflow-wrap:anywhere; white-space:pre-wrap; user-select:text; }
  .note, .status, .next, details { font-size:13px; line-height:1.6; }
  .note { margin:0 0 18px; }
  .status { min-height:1.6em; margin:10px 0; }
  .next { margin:20px 0 0; padding-top:18px; border-top:1px solid currentColor; }
  details { margin-top:12px; }
  summary { padding:8px 0; }
  details blockquote { margin-top:12px; font-size:14px; }
  .languages { display:flex; gap:6px; }
  .languages button { padding:6px 8px; font-size:12px; }
  :host([compact]) .panel { padding:20px; }
  :host([compact]) h3, :host([compact]) .eyebrow, :host([compact]) .next { display:none; }
  @media(max-width:480px) { .top { align-items:flex-start; } .modes button { flex:1; } }
`;

class FilmAgentStart extends HTMLElement {
  static observedAttributes = ['style-id'];
  constructor() {
    super();
    this.attachShadow({mode:'open'});
    this.mode = 'new';
  }
  connectedCallback() {
    this.render();
    this.observer = new MutationObserver(() => this.render());
    this.observer.observe(document.documentElement, {attributes:true, attributeFilter:['lang']});
  }
  disconnectedCallback() { this.observer?.disconnect(); }
  attributeChangedCallback() { if (this.isConnected) this.render(); }
  render() {
    const language = this.language ?? (document.documentElement.lang.startsWith('zh') ? 'zh' :
      new URLSearchParams(location.search).get('lang') === 'zh' ? 'zh' : 'en');
    const words = text[language];
    const style = this.getAttribute('style-id') || 'midcentury-cartoon';
    const root = this.shadowRoot;
    root.innerHTML = `<style>${css}</style><div class="panel" lang="${language === 'zh' ? 'zh-CN' : 'en'}">
      <div class="top"><p class="eyebrow">${words.eyebrow}</p>${this.hasAttribute('language-controls') ? '<div class="languages" role="group" aria-label="Language / 语言"><button data-language="en">EN</button><button data-language="zh">中文</button></div>' : ''}</div>
      <h3>${words.title}</h3><p>${words.intro}</p>
      <div class="modes" role="group" aria-label="${language === 'zh' ? '创作方式' : 'Film request'}"><button data-mode="new">${words.new}</button><button data-mode="replay">${words.replay}</button></div>
      <blockquote class="film-prompt" tabindex="0"></blockquote>
      <p class="note" ${this.mode === 'replay' ? '' : 'hidden'}>${words.note}</p>
      <button class="copy-prompt" type="button">${words.copy}</button><p class="status" role="status" aria-live="polite"></p>
      <details><summary>${words.setup}</summary><blockquote class="setup-prompt" tabindex="0"></blockquote><button class="copy-setup" type="button">${words.copy}</button></details>
      <p class="next">${words.next}</p></div>`;
    root.querySelector('.film-prompt').textContent = filmPrompt(style, language, this.mode);
    root.querySelector('.setup-prompt').textContent = words.setupPrompt;
    for (const button of root.querySelectorAll('[data-mode]')) {
      button.setAttribute('aria-pressed', String(button.dataset.mode === this.mode));
      button.onclick = () => { this.mode = button.dataset.mode; this.render(); this.shadowRoot.querySelector(`[data-mode="${this.mode}"]`).focus(); };
    }
    for (const button of root.querySelectorAll('[data-language]')) {
      button.setAttribute('aria-pressed', String(button.dataset.language === language));
      button.onclick = () => { this.language = button.dataset.language; this.render(); this.shadowRoot.querySelector(`[data-language="${this.language}"]`).focus(); };
    }
    const copy = async selector => {
      const source = root.querySelector(selector);
      try { await navigator.clipboard.writeText(source.textContent); root.querySelector('.status').textContent = words.copied; }
      catch {
        const range = document.createRange(); range.selectNodeContents(source);
        const selection = root.getSelection?.() ?? window.getSelection();
        selection.removeAllRanges(); selection.addRange(range);
        root.querySelector('.status').textContent = words.failed;
      }
    };
    root.querySelector('.copy-prompt').onclick = () => copy('.film-prompt');
    root.querySelector('.copy-setup').onclick = () => copy('.setup-prompt');
  }
}
customElements.define('film-agent-start', FilmAgentStart);
