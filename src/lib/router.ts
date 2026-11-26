import { useEffect, useState } from 'react';

export function currentPath() {
  const h = window.location.hash.replace(/^#/, '');
  return h || '/';
}

export function navigate(path: string, replace = false) {
  const url = `#${path}`;
  if (replace) window.history.replaceState(null, '', url);
  else window.history.pushState(null, '', url);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

export function back(fallback = '/') {
  if (window.history.length > 1) window.history.back();
  else navigate(fallback, true);
}

export function useRoute() {
  const [path, setPath] = useState(currentPath());
  useEffect(() => {
    const on = () => setPath(currentPath());
    window.addEventListener('hashchange', on);
    window.addEventListener('popstate', on);
    return () => {
      window.removeEventListener('hashchange', on);
      window.removeEventListener('popstate', on);
    };
  }, []);
  return path;
}

/** Match "/openings/:id" style patterns. */
export function match(pattern: string, path: string): Record<string, string> | null {
  const [p] = path.split('?');
  const a = pattern.split('/').filter(Boolean);
  const b = p.split('/').filter(Boolean);
  if (a.length !== b.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith(':')) params[a[i].slice(1)] = decodeURIComponent(b[i]);
    else if (a[i] !== b[i]) return null;
  }
  return params;
}

export function query(path: string): URLSearchParams {
  return new URLSearchParams(path.split('?')[1] ?? '');
}
