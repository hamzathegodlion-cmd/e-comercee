import { createApiApp } from './_app.js';

const app = createApiApp();

function normalizeApiUrl(rawUrl) {
  const parsed = new URL(rawUrl || '/api', 'http://localhost');
  const capturedPath = parsed.searchParams.get('__pathname');
  parsed.searchParams.delete('__pathname');

  let pathname = parsed.pathname;
  if (
    capturedPath !== null &&
    (pathname === '/api' ||
      pathname === '/api/' ||
      pathname === '/api/index' ||
      pathname === '/api/index.js')
  ) {
    const cleanSub = capturedPath.replace(/^\/+/, '');
    pathname = cleanSub ? `/api/${cleanSub}` : '/api';
  } else if (!pathname.startsWith('/api')) {
    pathname = `/api${pathname.startsWith('/') ? '' : '/'}${pathname}`;
  }

  const qs = parsed.searchParams.toString();
  return `${pathname}${qs ? `?${qs}` : ''}`;
}

export default function handler(req, res) {
  req.url = normalizeApiUrl(req.url);
  return app(req, res);
}
