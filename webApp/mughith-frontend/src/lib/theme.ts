export type ThemeMode = 'light' | 'dark';
export type AccentKey = 'green' | 'teal' | 'navy' | 'crimson';

const THEME_KEY = 'mughith_theme';
const ACCENT_KEY = 'mughith_accent';

export function loadTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  const v = window.localStorage.getItem(THEME_KEY);
  return v === 'dark' ? 'dark' : 'light';
}

export function loadAccent(): AccentKey {
  if (typeof window === 'undefined') return 'green';
  const v = window.localStorage.getItem(ACCENT_KEY);
  if (v === 'teal' || v === 'navy' || v === 'crimson' || v === 'green') return v;
  return 'green';
}

export function applyTheme(theme: ThemeMode): void {
  document.documentElement.setAttribute('data-theme', theme);
  window.localStorage.setItem(THEME_KEY, theme);
}

export function applyAccent(accent: AccentKey): void {
  document.documentElement.setAttribute('data-accent', accent);
  window.localStorage.setItem(ACCENT_KEY, accent);
}
