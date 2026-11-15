// Dependency-free: also runs in Cloudflare Pages against the published output.
import { readdirSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const POLICY = 'strict-origin-when-cross-origin';
function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)]
    .map((m) => [m[1].toLowerCase(), m[2] ?? m[3] ?? m[4]]));
}

export function inspectHtml(html, label) {
  const markup = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '');
  const frames = [...markup.matchAll(/<iframe\b[^>]*>/gi)].map(m => attributes(m[0]))
    .filter(a => /^https:\/\/(?:www\.)?youtube(?:-nocookie)?\.com\/embed\//i.test(a.src ?? ''));
  const dynamic = /\bdata-(?:dm-video|yt)\s*=/i.test(markup);
  if (!frames.length && !dynamic) return false;
  const policies = [...markup.matchAll(/<meta\b[^>]*>/gi)].map(m => attributes(m[0]))
    .filter(a => a.name?.toLowerCase() === 'referrer').map(a => a.content?.toLowerCase());
  const documentSafe = policies.length === 1 && policies[0] === POLICY;
  // Untracked sponsor pages intentionally set the policy on each iframe.
  if ((dynamic && !documentSafe) || frames.some(a =>
    a.referrerpolicy ? a.referrerpolicy.toLowerCase() !== POLICY : !documentSafe)) {
    throw new Error(`${label}: YouTube referrer configuration is unsafe or missing; require ${POLICY} (Error 153 prevention).`);
  }
  return true;
}

export function videoPages(root) {
  const pages = [];
  function walk(dir) {
    for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile() && path.endsWith('.html')) {
        if (inspectHtml(readFileSync(join(root, path), 'utf8'), path)) pages.push(path);
      }
    }
  }
  walk('');
  if (!pages.length) throw new Error('No YouTube pages found; refusing an empty or incorrect artifact.');
  return pages.sort();
}

export async function checkLive(root, origin, fetchPage = fetch) {
  const pages = videoPages(root);
  const failures = [];
  for (const path of pages) {
    const route = path.replace(/index\.html$/, '').replace(/\.html$/, '');
    const url = new URL(route, origin.endsWith('/') ? origin : origin + '/');
    try {
      const response = await fetchPage(url, { cache: 'no-store', signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (!inspectHtml(await response.text(), url.href)) throw new Error('expected YouTube content is missing');
    } catch (error) { failures.push(`${url.href}: ${error.message}`); }
  }
  if (failures.length) throw new Error(`Live verification FAILED (${failures.length}/${pages.length} pages):\n${failures.join('\n')}`);
  return pages;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const root = resolve(process.argv[2] ?? 'dist');
    const live = process.argv[3];
    const pages = live ? await checkLive(root, live) : videoPages(root);
    console.log(`${live ? 'Live HTML' : 'Artifact'} referrer check passed: ${pages.length} YouTube pages. Actual playback is a separate browser check.`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
