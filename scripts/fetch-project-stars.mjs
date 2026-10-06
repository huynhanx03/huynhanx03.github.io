import { readFile, rename, writeFile } from 'node:fs/promises';

const output = new URL('../src/data/projects.json', import.meta.url);
const data = JSON.parse(await readFile(output, 'utf8'));
const repositories = data.projects.filter((project) => project.github && !project.hidden).flatMap((project) => {
  try {
    const url = new URL(project.github);
    const parts = url.pathname.split('/').filter(Boolean);
    return url.hostname === 'github.com' && parts.length === 2 ? [{ project, slug: `${parts[0]}/${parts[1].replace(/\.git$/, '')}` }] : [];
  } catch {
    return [];
  }
});
const errors = [];
let refreshed = 0;

await Promise.all(repositories.map(async ({ project, slug }) => {
  try {
    const response = await fetch(`https://api.github.com/repos/${slug}`, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'huynhnan-portfolio' },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    const repository = await response.json();
    if (!Number.isInteger(repository.stargazers_count)) throw new Error('response did not contain a star count');
    project.stars = repository.stargazers_count;
    refreshed += 1;
  } catch (error) {
    errors.push(`${slug}: ${error.message}`);
  }
}));

if (refreshed > 0) {
  const temporary = new URL('./projects.json.tmp', output);
  await writeFile(temporary, `${JSON.stringify(data, null, 4)}\n`);
  await rename(temporary, output);
}

console.log(`GitHub stars refreshed for ${refreshed} of ${repositories.length} visible repositories.`);
if (errors.length) {
  console.warn(`Kept previous values for ${errors.length} unavailable repositories:`);
  errors.forEach((error) => console.warn(`- ${error}`));
}
