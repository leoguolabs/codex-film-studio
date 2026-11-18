// Resolve the palette before the homepage styles are painted.
(() => {
  const key = 'film-studio-home-theme';
  const system = matchMedia('(prefers-color-scheme: light)');
  let preference;
  try { preference = localStorage.getItem(key); } catch { /* Storage is optional. */ }

  function applyTheme() {
    const theme = ['light', 'dark'].includes(preference) ? preference : system.matches ? 'light' : 'dark';
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]').content = theme === 'light' ? '#f8f5ec' : '#101816';
    document.querySelector('.theme-toggle')?.setAttribute('aria-pressed', String(theme === 'light'));
  }

  applyTheme();
  system.addEventListener('change', applyTheme);
  document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.querySelector('.theme-toggle');
    applyTheme();
    toggle.hidden = false;
    toggle.addEventListener('click', () => {
      preference = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
      try { localStorage.setItem(key, preference); } catch { /* Keep the choice for this visit. */ }
      applyTheme();
    });
  });
})();
