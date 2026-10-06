import { readdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fetchNoteViewSnapshot } from './lib/note-views.mjs';

const root = new URL('../src/content/notes/', import.meta.url);
const snapshotUrl = new URL('../src/data/note-views.json', import.meta.url);
const notes = [];

async function walk(directory) {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, item.name);
    if (item.isDirectory()) await walk(path);
    else if (item.isFile() && item.name.endsWith('.md')) {
      const localeMatch = item.name.match(/_(EN|VI)\.md$/iu);
      if (!localeMatch) continue;
      const slug = relative(root.pathname, path).replaceAll('\\', '/').replace(/_(EN|VI)\.md$/iu, '');
      const locale = localeMatch[1].toLowerCase();
      const markdown = await readFile(path, 'utf8');
      const frontmatter = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/u)?.[1] ?? '';
      if (/^draft:\s*true\s*$/imu.test(frontmatter)) continue;
      notes.push({ locale, slug });
    }
  }
}

await walk(root.pathname);
const code = process.env.GOATCOUNTER_CODE?.trim() ?? '';
if (!code) {
  console.log('GOATCOUNTER_CODE is not set; leaving the current note-view snapshot unchanged.');
  process.exit(0);
}
if (!/^[a-z0-9-]+$/iu.test(code)) throw new Error('GOATCOUNTER_CODE must be the GoatCounter site code.');

const previous = JSON.parse(await readFile(snapshotUrl, 'utf8'));
const result = await fetchNoteViewSnapshot({
  notes,
  previous,
  code,
  basePath: process.env.PUBLIC_BASE_PATH ?? '',
});

if (result.successCount === 0 && result.errorCount > 0) {
  console.error(`Could not refresh any of ${result.errorCount} note view counts; preserving the previous snapshot.`);
  process.exitCode = 1;
} else if (result.successCount > 0) {
  const temporaryUrl = new URL('../src/data/note-views.json.tmp', import.meta.url);
  await writeFile(temporaryUrl, `${JSON.stringify(result.snapshot, null, 2)}\n`);
  await rename(temporaryUrl, snapshotUrl);
  console.log(`Updated view counts for ${result.successCount} notes${result.errorCount ? `; preserved ${result.errorCount} previous counts` : ''}.`);
}
