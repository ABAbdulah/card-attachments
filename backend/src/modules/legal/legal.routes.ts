import { readFileSync } from 'node:fs';
import { Router } from 'express';
import { marked } from 'marked';

/**
 * Public privacy policy and terms pages. The app stores require a public URL
 * for both; the text lives in backend/legal/*.md.
 */
const page = (file: string) => {
  const markdown = readFileSync(new URL(`../../../legal/${file}`, import.meta.url), 'utf8');
  const title = markdown.match(/^# (.+)$/m)?.[1] ?? 'SubTrack';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
  :root { color-scheme: light dark; --bg: #F8FAFC; --text: #0F172A; --muted: #475569; --border: #E2E8F0; }
  @media (prefers-color-scheme: dark) { :root { --bg: #0B1120; --text: #F8FAFC; --muted: #94A3B8; --border: #1B2640; } }
  body { margin: 0; background: var(--bg); color: var(--text); font: 16px/1.6 system-ui, -apple-system, "Segoe UI", sans-serif; }
  main { max-width: 720px; margin: 0 auto; padding: 32px 16px 64px; }
  h1 { font-size: 28px; line-height: 1.25; } h2 { font-size: 20px; margin-top: 32px; }
  p, li { color: var(--text); } em { color: var(--muted); }
  table { border-collapse: collapse; width: 100%; font-size: 14px; display: block; overflow-x: auto; }
  th, td { border: 1px solid var(--border); padding: 8px; text-align: left; vertical-align: top; }
</style>
</head>
<body><main>${marked.parse(markdown, { async: false })}</main></body>
</html>`;
};

const pages = { privacy: page('privacy-policy.md'), terms: page('terms.md') };

export const legalRouter = Router();
legalRouter.get('/privacy', (_req, res) => {
  res.type('html').send(pages.privacy);
});
legalRouter.get('/terms', (_req, res) => {
  res.type('html').send(pages.terms);
});
