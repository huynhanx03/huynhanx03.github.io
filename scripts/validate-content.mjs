import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const root = new URL('../src/content/notes/', import.meta.url);
const files = [];

async function walk(directory) {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, item.name);
    if (item.isDirectory()) await walk(path);
    else if (item.isFile() && item.name.endsWith('.md')) files.push(path);
  }
}

await walk(root.pathname);
const errors = [];
const notes = new Map();
const slugify = (value) => value.toLowerCase().trim().replace(/<[^>]+>/g, '').replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s+/g, '-');

for (const file of files) {
  const raw = await readFile(file, 'utf8');
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  const relativePath = relative(root.pathname, file).replaceAll('\\', '/');
  if (!match) { errors.push(`${relativePath}: missing frontmatter`); continue; }
  const frontmatter = match[1];
  const read = (key) => frontmatter.match(new RegExp(`^${key}:\\s*["']?(.+?)["']?$`, 'm'))?.[1]?.trim();
  const title = read('title');
  const category = read('category');
  const localeMatch = relativePath.match(/_(EN|VI)\.md$/i);
  const locale = localeMatch?.[1]?.toLowerCase();
  const slug = relativePath.replace(/_(EN|VI)\.md$/i, '');
  const translationKey = read('translationKey') || slug;
  if (!title) errors.push(`${relativePath}: title is required`);
  if (!category) errors.push(`${relativePath}: category is required`);
  if (!locale) errors.push(`${relativePath}: filename must end in _EN.md or _VI.md`);
  if (!translationKey) errors.push(`${relativePath}: translationKey must not be empty`);
  if (!raw.replace(match[0], '').trim()) errors.push(`${relativePath}: document body is empty`);
  const key = `${translationKey}:${locale}`;
  if (notes.has(key)) errors.push(`${relativePath}: duplicate locale/translationKey`);
  notes.set(key, { slug, translationKey, locale, title, draft: read('draft') === 'true' });
  const h1s = [...raw.replace(match[0], '').matchAll(/^# (?!#)(.+)$/gm)].map((heading) => heading[1].trim());
  if (h1s.length > 1) errors.push(`${relativePath}: use frontmatter title and at most one body H1`);
  const headingIds = new Set();
  for (const heading of [...raw.replace(match[0], '').matchAll(/^#{2,6} (.+)$/gm)].map((value) => slugify(value[1]))) {
    if (headingIds.has(heading)) continue;
    headingIds.add(heading);
  }
}

const groups = new Map();
for (const note of notes.values()) {
  const pair = groups.get(note.translationKey) ?? new Set();
  pair.add(note.locale);
  groups.set(note.translationKey, pair);
}
for (const [translationKey, locales] of groups) {
  if (!locales.has('en') || !locales.has('vi')) errors.push(`${translationKey}: every note must have both EN and VI variants`);
}

const topicGuidesPath = new URL('../src/data/topic-guides.json', import.meta.url);
const topicGuides = JSON.parse(await readFile(topicGuidesPath, 'utf8'));
const guideSlugs = new Set();
for (const guide of topicGuides) {
  if (!guide.slug || guideSlugs.has(guide.slug)) errors.push(`topic guide: missing or duplicate slug "${guide.slug ?? ''}"`);
  guideSlugs.add(guide.slug);
  for (const locale of ['en', 'vi']) {
    if (!guide.title?.[locale] || !guide.description?.[locale] || !guide.prerequisites?.[locale]) {
      errors.push(`topic guide ${guide.slug}: title, description, and prerequisites are required in ${locale}`);
    }
  }
  const referenced = new Set();
  for (const section of guide.sections ?? []) {
    for (const locale of ['en', 'vi']) if (!section.title?.[locale]) errors.push(`topic guide ${guide.slug}: section title is required in ${locale}`);
    for (const key of section.noteKeys ?? []) {
      if (referenced.has(key)) errors.push(`topic guide ${guide.slug}: duplicate note reference "${key}"`);
      referenced.add(key);
      for (const locale of ['en', 'vi']) {
        const note = notes.get(`${key}:${locale}`);
        if (!note) errors.push(`topic guide ${guide.slug}: missing ${locale} note "${key}"`);
        else if (note.draft) errors.push(`topic guide ${guide.slug}: draft note "${key}" cannot be listed`);
      }
    }
  }
}

if (errors.length) {
  console.error(`Content validation failed with ${errors.length} issue(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`Content validation passed: ${files.length} files, ${groups.size} bilingual note pairs.`);
