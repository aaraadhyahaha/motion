// #deploy security headers on every worker response (https only; static assets get theirs from `_headers`).
// Referrer policy must keep same-origin Referer: the login page derives `next` from it (auth/routes.ts).
const BASE: [string, string][] = [
  ['strict-transport-security', 'max-age=31536000'],
  ['x-content-type-options', 'nosniff'],
  ['referrer-policy', 'strict-origin-when-cross-origin'],
];

/** Adds missing headers; a route's own value (e.g. SSR pages' `no-referrer`) wins. */
export const secure = (req: Request, res: Response): Response => {
  if (!req.url.startsWith('https:') || res.status === 101) return res;
  const out = new Response(res.body, res);
  for (const [k, v] of BASE) if (!out.headers.has(k)) out.headers.set(k, v);
  if (out.headers.get('content-type')?.startsWith('text/html')) out.headers.set('x-frame-options', 'DENY');
  return out;
};
