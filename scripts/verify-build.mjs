import { access, readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const root = new URL('../dist/', import.meta.url).pathname;
const base = (process.env.PUBLIC_BASE_PATH ?? '').replace(/\/$/, '');
const site = (process.env.PUBLIC_SITE_URL ?? 'https://huynhanx03.github.io').replace(/\/$/, '');
const errors = [];
const html = [];

async function walk(directory) {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, item.name);
    if (item.isDirectory()) await walk(path);
    else if (item.isFile() && item.name.endsWith('.html')) html.push(path);
  }
}
await walk(root);
let indexableCount = 0;
let redirectCount = 0;
for (const file of html) {
  if (file.endsWith('/404.html')) continue;
  const source = await readFile(file, 'utf8');
  const relativePath = `/${relative(root, file).replaceAll('\\', '/')}`;
  const routeWithoutSlash = relativePath === '/index.html' ? '' : relativePath.replace(/\/index\.html$/, '').replace(/\.html$/, '');
  const route = routeWithoutSlash ? `${routeWithoutSlash}/` : '/';
  const redirect = source.match(/<meta name="x-route-redirect" content="([^"]+)"/);
  if (redirect) {
    redirectCount += 1;
    if (!source.includes('noindex, nofollow')) errors.push(`${relativePath}: compatibility redirect must be noindex`);
    if (!source.includes('http-equiv="refresh"')) errors.push(`${relativePath}: redirect target is not present in refresh URL`);
    continue;
  }
  indexableCount += 1;
  const expected = `${site}${base}${route}`;
  const canonical = source.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  if (canonical !== expected) errors.push(`${relativePath}: canonical ${canonical ?? 'missing'} != ${expected}`);
  const lang = source.match(/<html lang="([^"]+)"/)?.[1];
  if (!lang || !['en', 'vi'].includes(lang)) errors.push(`${relativePath}: missing supported html lang`);
  if (!source.includes('<meta name="description" content="')) errors.push(`${relativePath}: missing meta description`);
  if (!source.includes('<meta property="og:locale" content="')) errors.push(`${relativePath}: missing og:locale`);
  if (!source.includes('<meta property="og:image:type" content="image/png"')) errors.push(`${relativePath}: OG image must be PNG`);
  for (const language of ['en', 'vi', 'x-default']) {
    if (!source.includes(`hreflang="${language}"`)) errors.push(`${relativePath}: missing hreflang=${language}`);
  }
  if (!source.includes('application/ld+json')) errors.push(`${relativePath}: missing JSON-LD structured data`);
  const h1Count = (source.match(/<h1(?:\s|>)/g) ?? []).length;
  if (h1Count !== 1) errors.push(`${relativePath}: expected exactly one H1, found ${h1Count}`);
}
for (const required of ['sitemap-index.xml', 'robots.txt', 'atom.xml', 'atom-vi.xml', '_pagefind/pagefind.js', 'images/og-default.png']) {
  try { await access(join(root, required)); } catch { errors.push(`dist/${required}: missing`); }
}
const robots = await readFile(join(root, 'robots.txt'), 'utf8');
if (!robots.includes(`${site}${base}/sitemap-index.xml`)) errors.push('robots.txt: sitemap URL does not include the configured site/base path');
if (errors.length) { console.error(`Build verification failed with ${errors.length} issue(s):`); errors.forEach((error) => console.error(`- ${error}`)); process.exit(1); }
console.log(`Build verification passed: ${indexableCount} indexable HTML routes, ${redirectCount} compatibility redirects, one H1 and self-canonical URL per route.`);
