import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseFragment, serialize } from 'parse5';

const allowedTags = new Set([
  'a', 'b', 'blockquote', 'br', 'code', 'dd', 'del', 'details', 'div', 'dl', 'dt',
  'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'li', 'ol', 'p', 'pre',
  's', 'small', 'span', 'strong', 'sub', 'summary', 'sup', 'table', 'tbody', 'td',
  'th', 'thead', 'tr', 'u', 'ul',
]);
const dangerousTags = new Set(['applet', 'embed', 'form', 'iframe', 'math', 'object', 'script', 'style', 'svg', 'template']);
const languageByExtension = new Map([
  ['c', 'C'], ['cc', 'C++'], ['cpp', 'C++'], ['cxx', 'C++'], ['h', 'C'], ['hh', 'C++'], ['hpp', 'C++'],
  ['cs', 'C#'], ['go', 'Go'], ['java', 'Java'], ['js', 'JavaScript'], ['jsx', 'JavaScript'],
  ['kt', 'Kotlin'], ['php', 'PHP'], ['py', 'Python'], ['rb', 'Ruby'], ['rs', 'Rust'],
  ['scala', 'Scala'], ['swift', 'Swift'], ['ts', 'TypeScript'], ['tsx', 'TypeScript'],
]);

/** @typedef {{key: string, platform: 'leetcode'|'cses', id: string, slug: string, title: string, url: string, difficulty?: string, topics: string[], statementHtml: string, solutions: Array<{language: string, relativePath: string, source: string}>}} DsaProblem */

function walkText(node) {
  if (node.nodeName === '#text') return node.value;
  return (node.childNodes ?? []).map(walkText).join('');
}

export function normalizeDsaTaskTitle(value) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function sourceLanguage(filePath) {
  const extension = path.extname(filePath).slice(1).toLowerCase();
  return languageByExtension.get(extension) ?? null;
}

function solutionTopics(solutions) {
  const topics = new Set();
  for (const solution of solutions) {
    const match = solution.source.match(/(?:^|\n)\s*\*?\s*Tags:\s*([^\r\n*]+)/iu);
    if (!match) continue;
    for (const topic of match[1].split(',')) {
      const clean = topic.trim();
      if (clean) topics.add(clean);
    }
  }
  return [...topics];
}

function relativePosix(root, filePath) {
  return path.relative(root, filePath).split(path.sep).join('/');
}

function readLeetCodeTopics(markdown) {
  const topics = new Map();
  let currentTopic = '';
  for (const line of markdown.split(/\r?\n/u)) {
    const heading = line.match(/^##\s+(.+?)\s*$/u);
    if (heading) {
      currentTopic = heading[1].trim();
      continue;
    }
    const row = line.match(/^\|\s*(\d+)\s*\|\s*\[[^\]]+\]\(([^)]+)\)\s*\|/u);
    if (!row || !currentTopic) continue;
    const id = String(Number(row[1]));
    const entry = topics.get(id) ?? new Set();
    entry.add(currentTopic);
    topics.set(id, entry);
  }
  return topics;
}

function leetCodeStatement(markdown) {
  const separator = markdown.match(/<hr\b[^>]*>/iu);
  const statement = separator ? markdown.slice(separator.index + separator[0].length) : markdown;
  const fragment = parseFragment(statement);
  const html = serialize(fragment).trim();
  return sanitizeStatementHtml(html);
}

function parseLeetCodeMetadata(markdown, directoryName) {
  const header = markdown.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/iu)?.[1] ?? '';
  const link = header.match(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/iu);
  const titleText = link ? walkText(parseFragment(link[2])).trim() : '';
  const directoryMatch = directoryName.match(/^(\d+)-(.+)$/u);
  const id = String(Number(directoryMatch?.[1] ?? titleText.match(/^(\d+)\s*\./u)?.[1] ?? ''));
  const title = titleText.replace(/^\d+\s*\.\s*/u, '').trim() || directoryMatch?.[2]?.replace(/-/g, ' ') || '';
  const slug = directoryMatch?.[2] ?? directoryName;
  const url = link?.[1]?.startsWith('https://leetcode.com/')
    ? link[1]
    : `https://leetcode.com/problems/${slug}/`;
  return { id, title, slug, url };
}

function allowedHref(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function cleanNodes(nodes, parent) {
  const result = [];
  for (const node of nodes) {
    if (node.nodeName === '#comment') continue;
    if (!node.tagName) {
      node.parentNode = parent;
      result.push(node);
      continue;
    }
    const tagName = node.tagName === 'h1' ? 'h2' : node.tagName;
    if (dangerousTags.has(tagName)) continue;
    const children = cleanNodes(node.childNodes ?? [], node);
    if (!allowedTags.has(tagName)) {
      for (const child of children) {
        child.parentNode = parent;
        result.push(child);
      }
      continue;
    }
    node.tagName = tagName;
    node.nodeName = tagName;
    node.attrs = tagName === 'a'
      ? (node.attrs ?? []).filter((attribute) => attribute.name === 'href' && allowedHref(attribute.value))
      : [];
    if (tagName === 'a' && node.attrs.length) {
      node.attrs.push({ name: 'target', value: '_blank' }, { name: 'rel', value: 'noopener noreferrer' });
    }
    node.childNodes = children;
    node.parentNode = parent;
    result.push(node);
  }
  return result;
}

/** Sanitize judge-provided HTML to a conservative statement-only element allowlist. */
export function sanitizeStatementHtml(html) {
  const fragment = parseFragment(String(html ?? ''));
  fragment.childNodes = cleanNodes(fragment.childNodes, fragment);
  return serialize(fragment).trim();
}

/** @param {DsaProblem[]} problems */
export function validateDsaProblems(problems) {
  const keys = new Set();
  for (const problem of problems) {
    if (!problem.key || keys.has(problem.key)) throw new Error(`Duplicate or missing DSA problem key: ${problem.key || '(empty)'}`);
    keys.add(problem.key);
    if (!problem.title?.trim()) throw new Error(`Missing title for ${problem.key}`);
    if (!problem.statementHtml?.trim()) throw new Error(`Missing statement for ${problem.key}`);
    if (!problem.solutions?.length) throw new Error(`Missing solution source for ${problem.key}`);
    const languages = new Set();
    for (const solution of problem.solutions) {
      if (!solution.language || languages.has(solution.language)) throw new Error(`Duplicate or missing solution language for ${problem.key}`);
      languages.add(solution.language);
      if (!solution.source?.trim()) throw new Error(`Empty solution source for ${problem.key} (${solution.language})`);
    }
    if (!/^https?:\/\//u.test(problem.url ?? '')) throw new Error(`Missing official problem URL for ${problem.key}`);
  }
}

async function getSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true }).catch((error) => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });
  return entries.filter((entry) => entry.isFile() && sourceLanguage(entry.name)).map((entry) => entry.name).sort();
}

async function scanLeetCode(root) {
  const base = path.join(root, 'leetcode');
  const topicIndexPath = path.join(base, 'README.md');
  const topicIndex = await readFile(topicIndexPath, 'utf8').catch(() => '');
  const topicMap = readLeetCodeTopics(topicIndex);
  const problems = [];
  const difficulties = ['Easy', 'Medium', 'Hard'];

  for (const difficulty of difficulties) {
    const difficultyPath = path.join(base, difficulty);
    const directories = await readdir(difficultyPath, { withFileTypes: true }).catch((error) => {
      if (error.code === 'ENOENT') return [];
      throw error;
    });
    for (const entry of directories.filter((item) => item.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
      const problemPath = path.join(difficultyPath, entry.name);
      const files = await getSourceFiles(problemPath);
      if (!files.length) continue;
      const readmePath = path.join(problemPath, 'README.md');
      const markdown = await readFile(readmePath, 'utf8').catch(() => '');
      const metadata = parseLeetCodeMetadata(markdown, entry.name);
      if (!metadata.id || !metadata.title) throw new Error(`Could not parse LeetCode metadata in ${relativePosix(root, problemPath)}`);
      const solutions = await Promise.all(files.map(async (file) => {
        const filePath = path.join(problemPath, file);
        return { language: sourceLanguage(file), relativePath: relativePosix(root, filePath), source: await readFile(filePath, 'utf8') };
      }));
      problems.push({
        key: `leetcode:${metadata.id}`,
        platform: 'leetcode',
        ...metadata,
        difficulty,
        statementHtml: leetCodeStatement(markdown),
        solutions,
        topics: [...new Set([...(topicMap.get(metadata.id) ?? []), ...solutionTopics(solutions)])].sort((a, b) => a.localeCompare(b)),
      });
    }
  }
  return problems;
}

function csesTitle(fileStem) {
  return fileStem.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
}

async function scanCses(root, tasks, overrides) {
  const base = path.join(root, 'cses');
  const matches = new Map(tasks.map((task) => [normalizeDsaTaskTitle(task.title), task]));
  const grouped = new Map();
  const unresolved = new Set();

  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true }).catch((error) => {
      if (error.code === 'ENOENT') return [];
      throw error;
    });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(target);
        continue;
      }
      if (!entry.isFile() || !sourceLanguage(entry.name)) continue;
      const relative = relativePosix(root, target);
      const stem = path.basename(entry.name, path.extname(entry.name));
      const override = overrides[relative] ?? overrides[relative.replace(/\.[^.]+$/u, '')];
      const task = override ? tasks.find((item) => String(item.id) === String(override)) : matches.get(normalizeDsaTaskTitle(csesTitle(stem)));
      if (!task) {
        unresolved.add(relative.slice('cses/'.length).replace(/\.[^.]+$/u, ''));
        continue;
      }
      const key = String(task.id);
      const record = grouped.get(key) ?? { key: `cses:${key}`, platform: 'cses', id: key, slug: normalizeDsaTaskTitle(task.title).replace(/\s+/g, '-'), title: task.title, url: task.url ?? `https://cses.fi/problemset/task/${key}/`, topics: [], statementHtml: sanitizeStatementHtml(task.statementHtml ?? ''), solutions: [] };
      record.solutions.push({ language: sourceLanguage(entry.name), relativePath: relative, source: await readFile(target, 'utf8') });
      grouped.set(key, record);
    }
  }

  await visit(base);
  return { problems: [...grouped.values()].map((problem) => ({ ...problem, solutions: problem.solutions.sort((a, b) => a.language.localeCompare(b.language)) })), unresolvedCses: [...unresolved].sort((a, b) => a.localeCompare(b)) };
}

/**
 * @param {string} repoRoot
 * @param {{csesTasks?: Array<{id: string|number, title: string, url?: string, statementHtml?: string}>, overrides?: Record<string, string|number>}} [options]
 */
/** @param {string} repoRoot @param {{csesTasks?: Array<{id: string|number, title: string, url?: string, statementHtml?: string}>, overrides?: Record<string, string|number>}} [options] @returns {Promise<{problems: DsaProblem[], unresolvedCses: string[]}>} */
export async function scanDsaRepository(repoRoot, options = {}) {
  const leetcode = await scanLeetCode(repoRoot);
  const cses = await scanCses(repoRoot, options.csesTasks ?? [], options.overrides ?? {});
  const platformOrder = { leetcode: 0, cses: 1 };
  const problems = [...leetcode, ...cses.problems].sort((a, b) => platformOrder[a.platform] - platformOrder[b.platform] || Number(b.id) - Number(a.id));
  validateDsaProblems(problems);
  return { problems, unresolvedCses: cses.unresolvedCses };
}

/** Return unique CSES source stems using paths relative to the repository root. */
export async function listCsesSourceStems(repoRoot) {
  const base = path.join(repoRoot, 'cses');
  const stems = new Set();
  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true }).catch((error) => {
      if (error.code === 'ENOENT') return [];
      throw error;
    });
    for (const entry of entries) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(target);
      else if (entry.isFile() && sourceLanguage(entry.name)) stems.add(relativePosix(repoRoot, target).replace(/\.[^.]+$/u, ''));
    }
  }
  await visit(base);
  return [...stems].sort((a, b) => a.localeCompare(b));
}
