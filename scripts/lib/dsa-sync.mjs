import { lstat, mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { sanitizeStatementHtml } from './dsa-data.mjs';

const LEETCODE_GRAPHQL = 'https://leetcode.com/graphql/';
const DEFAULT_CURSOR = '2026-07-02T00:00:00+07:00';
const PAGE_SIZE = 20;
const submissionListQuery = `query submissionList($offset: Int!, $limit: Int!, $slug: String) {
  submissionList(offset: $offset, limit: $limit, questionSlug: $slug) {
    hasNext
    submissions { id statusDisplay lang langName: langVerboseName timestamp title titleSlug }
  }
}`;
const submissionDetailsQuery = `query submissionDetails($id: Int!) {
  submissionDetails(submissionId: $id) {
    id code runtimeDisplay runtimePercentile memoryDisplay memoryPercentile statusCode
    lang { name verboseName }
  }
}`;
const questionDataQuery = `query questionData($titleSlug: String!) {
  question(titleSlug: $titleSlug) {
    questionFrontendId title titleSlug content difficulty topicTags { name }
  }
}`;
const languageInfo = new Map([
  ['c', ['C', 'c']], ['cpp', ['C++', 'cpp']], ['csharp', ['C#', 'cs']], ['dart', ['Dart', 'dart']],
  ['golang', ['Go', 'go']], ['go', ['Go', 'go']], ['java', ['Java', 'java']], ['javascript', ['JavaScript', 'js']],
  ['kotlin', ['Kotlin', 'kt']], ['mysql', ['MySQL', 'sql']], ['php', ['PHP', 'php']], ['python', ['Python', 'py']],
  ['python3', ['Python', 'py']], ['ruby', ['Ruby', 'rb']], ['rust', ['Rust', 'rs']], ['scala', ['Scala', 'scala']],
  ['swift', ['Swift', 'swift']], ['typescript', ['TypeScript', 'ts']],
]);

function languageFor(slug, verboseName = '') {
  const normalized = String(slug ?? '').toLowerCase();
  const known = languageInfo.get(normalized);
  if (known) return { slug: normalized, display: verboseName || known[0], extension: known[1] };
  const safe = normalized.replace(/[^a-z0-9]+/gu, '') || 'txt';
  return { slug: normalized || safe, display: verboseName || String(slug || 'Unknown'), extension: safe };
}

function metricWithPercentile(metric, percentile) {
  if (!metric) return 'unavailable';
  if (percentile === null || percentile === undefined || percentile === '') return String(metric);
  return `${metric} (${Number(percentile).toFixed(2)}%)`;
}

/** Prepend the LeetCode submission metadata so it is visible with the saved source code. */
export function formatLeetCodeSolution({ id, title, language, runtime, runtimePercentile, memory, memoryPercentile, topics, source }) {
  const metadata = [
    `Problem: ${id}. ${title}`,
    `Language: ${language}`,
    `Runtime: ${metricWithPercentile(runtime, runtimePercentile)}`,
    `Memory: ${metricWithPercentile(memory, memoryPercentile)}`,
    `Tags: ${topics.join(', ')}`,
  ];
  const isHashCommentLanguage = ['python', 'python3', 'ruby', 'bash', 'sh'].includes(String(language).toLowerCase());
  const comment = isHashCommentLanguage
    ? metadata.map((line) => `# ${line}`).join('\n')
    : `/*\n ${metadata.join('\n ')}\n*/`;
  return `${comment}\n${String(source).replace(/^\uFEFF/u, '')}`;
}

function timestampMilliseconds(value) {
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) return numeric < 1e12 ? numeric * 1000 : numeric;
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : NaN;
}

async function requestGraphql(fetchImpl, credentials, operationName, query, variables) {
  const response = await fetchImpl(LEETCODE_GRAPHQL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Portfolio DSA snapshot sync',
      Origin: 'https://leetcode.com',
      Referer: 'https://leetcode.com/',
      Cookie: `LEETCODE_SESSION=${credentials.LEETCODE_SESSION}; csrftoken=${credentials.LEETCODE_CSRF}`,
      'X-CSRFToken': credentials.LEETCODE_CSRF,
    },
    body: JSON.stringify({ operationName, query, variables }),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`LeetCode request failed (${response.status})`);
  const payload = await response.json();
  if (payload.errors?.length) throw new Error(`LeetCode ${operationName} failed: ${payload.errors.map((error) => error.message).join('; ')}`);
  if (!payload.data) throw new Error(`LeetCode ${operationName} returned no data`);
  return payload.data;
}

/** List accepted user submissions after the last successful cursor, keeping the latest per problem/language. */
async function listNewAcceptedSubmissions({ credentials, cursor, fetchImpl }) {
  const since = Date.parse(cursor);
  if (!Number.isFinite(since)) throw new Error(`Invalid LeetCode sync cursor: ${cursor}`);
  const selected = new Map();
  let offset = 0;
  let keepPaging = true;

  while (keepPaging) {
    const data = await requestGraphql(fetchImpl, credentials, 'submissionList', submissionListQuery, { offset, limit: PAGE_SIZE, slug: null });
    const page = data.submissionList;
    if (!page || !Array.isArray(page.submissions)) throw new Error('LeetCode submissionList returned an invalid page');
    let oldestTimestamp = Infinity;
    for (const submission of page.submissions) {
      const submittedAt = timestampMilliseconds(submission.timestamp);
      oldestTimestamp = Math.min(oldestTimestamp, submittedAt);
      if (Number.isFinite(submittedAt) && submittedAt <= since) continue;
      if (submission.statusDisplay !== 'Accepted' || !submission.titleSlug || !submission.id) continue;
      const language = languageFor(submission.lang, submission.langName);
      const key = `${submission.titleSlug}:${language.slug}`;
      if (!selected.has(key)) selected.set(key, { ...submission, language, submittedAt });
    }
    if (!page.hasNext || page.submissions.length === 0 || oldestTimestamp <= since) keepPaging = false;
    else offset += page.submissions.length;
  }
  return [...selected.values()];
}

async function getProblemDetails({ submission, credentials, fetchImpl, existingProblem, questionCache }) {
  const data = await requestGraphql(fetchImpl, credentials, 'submissionDetails', submissionDetailsQuery, { id: Number(submission.id) });
  const detail = data.submissionDetails;
  if (!detail?.code || detail.statusCode !== 10) throw new Error(`Accepted submission ${submission.id} did not include accepted source code`);
  let question = existingProblem ? {
    questionFrontendId: existingProblem.id,
    title: existingProblem.title,
    titleSlug: existingProblem.slug,
    content: existingProblem.statementHtml,
    difficulty: existingProblem.difficulty,
    topicTags: existingProblem.topics.map((name) => ({ name })),
  } : questionCache.get(submission.titleSlug);
  if (!question) {
    const questionData = await requestGraphql(fetchImpl, credentials, 'questionData', questionDataQuery, { titleSlug: submission.titleSlug });
    question = questionData.question;
    questionCache.set(submission.titleSlug, question);
  }
  if (!question?.questionFrontendId || !question.title || !question.content) throw new Error(`LeetCode problem ${submission.titleSlug} did not include its full statement`);
  const language = languageFor(detail.lang?.name || submission.lang, detail.lang?.verboseName || submission.langName);
  const topics = (question.topicTags ?? []).map((topic) => topic.name).filter(Boolean);
  const problemId = String(question.questionFrontendId);
  return {
    problem: {
      key: `leetcode:${problemId}`,
      platform: 'leetcode',
      id: problemId,
      slug: question.titleSlug || submission.titleSlug,
      title: question.title,
      url: `https://leetcode.com/problems/${question.titleSlug || submission.titleSlug}/`,
      difficulty: question.difficulty,
      topics,
      statementHtml: sanitizeStatementHtml(question.content),
    },
    solution: {
      language: language.display,
      relativePath: `leetcode/${question.difficulty}/${problemId}-${question.titleSlug}.${language.extension}`,
      source: formatLeetCodeSolution({
        id: problemId,
        title: question.title,
        language: language.slug,
        runtime: detail.runtimeDisplay,
        runtimePercentile: detail.runtimePercentile,
        memory: detail.memoryDisplay,
        memoryPercentile: detail.memoryPercentile,
        topics,
        source: detail.code,
      }),
    },
  };
}

async function exists(filePath) {
  try { await lstat(filePath); return true; }
  catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}

function makeIndex(problems, metadata) {
  const byPlatform = { leetcode: 0, cses: 0 };
  const topics = new Set();
  const difficulties = new Set();
  const languages = new Set();
  const summaries = problems.map((problem) => {
    byPlatform[problem.platform] += 1;
    problem.topics.forEach((topic) => topics.add(topic));
    if (problem.difficulty) difficulties.add(problem.difficulty);
    problem.solutions.forEach((solution) => languages.add(solution.language));
    return {
      key: problem.key, platform: problem.platform, id: problem.id, slug: problem.slug,
      title: problem.title, url: problem.url, ...(problem.difficulty ? { difficulty: problem.difficulty } : {}),
      topics: problem.topics, languages: problem.solutions.map((solution) => solution.language),
    };
  });
  return {
    ...metadata,
    counts: { all: problems.length, ...byPlatform },
    filters: { topics: [...topics].sort((a, b) => a.localeCompare(b)), difficulties: [...difficulties].sort(), languages: [...languages].sort() },
    problems: summaries,
  };
}

async function loadSnapshotProblems(outputRoot) {
  const dataRoot = path.join(outputRoot, 'dsa');
  const problems = [];
  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true }).catch((error) => {
      if (error.code === 'ENOENT') return [];
      throw error;
    });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(target);
      else if (entry.isFile() && entry.name.endsWith('.json')) {
        try {
          const problem = JSON.parse(await readFile(target, 'utf8'));
          problem.solutions = problem.solutions.map(({ githubUrl, ...solution }) => solution);
          problems.push(problem);
        }
        catch (error) { throw new Error(`Invalid DSA data file ${path.relative(outputRoot, target)}: ${error.message}`); }
      }
    }
  }
  await visit(dataRoot);
  return problems;
}

/** Stage all generated files, then replace Portfolio's DSA snapshot and cursor atomically. */
export async function publishDsaSnapshot({ outputRoot, problems, metadata }) {
  await mkdir(outputRoot, { recursive: true });
  const nonce = `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const stageRoot = path.join(outputRoot, `.dsa-stage-${nonce}`);
  const backupData = path.join(outputRoot, `.dsa-backup-${nonce}`);
  const backupIndex = path.join(outputRoot, `.dsa-index-backup-${nonce}.json`);
  const dataRoot = path.join(outputRoot, 'dsa');
  const indexPath = path.join(outputRoot, 'dsa-index.json');
  let dataMoved = false;
  let indexMoved = false;
  let nextDataInstalled = false;
  let nextIndexInstalled = false;

  try {
    const nextData = path.join(stageRoot, 'dsa');
    await mkdir(nextData, { recursive: true });
    for (const problem of problems) {
      const filePath = path.join(nextData, problem.platform, `${problem.id}-${problem.slug}.json`);
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, `${JSON.stringify(problem, null, 2)}\n`, 'utf8');
    }
    const index = makeIndex(problems, metadata);
    const stagedIndex = path.join(stageRoot, 'dsa-index.json');
    await writeFile(stagedIndex, `${JSON.stringify(index, null, 2)}\n`, 'utf8');

    if (await exists(dataRoot)) { await rename(dataRoot, backupData); dataMoved = true; }
    if (await exists(indexPath)) { await rename(indexPath, backupIndex); indexMoved = true; }
    await rename(nextData, dataRoot);
    nextDataInstalled = true;
    await rename(stagedIndex, indexPath);
    nextIndexInstalled = true;
    await rm(backupData, { recursive: true, force: true });
    await rm(backupIndex, { recursive: true, force: true });
    return index;
  } catch (error) {
    if (nextIndexInstalled) await rm(indexPath, { recursive: true, force: true });
    if (indexMoved && await exists(backupIndex)) await rename(backupIndex, indexPath);
    if (nextDataInstalled) await rm(dataRoot, { recursive: true, force: true });
    if (dataMoved && await exists(backupData)) await rename(backupData, dataRoot);
    throw error;
  } finally {
    await rm(stageRoot, { recursive: true, force: true });
    if (!dataMoved || !await exists(backupData)) await rm(backupData, { recursive: true, force: true });
    if (!indexMoved || !await exists(backupIndex)) await rm(backupIndex, { recursive: true, force: true });
  }
}

/** Sync accepted LeetCode submissions directly into the Portfolio data snapshot. */
export async function runDsaSync({ outputRoot, env = process.env, fetchImpl = fetch, now = new Date() }) {
  if (!env.LEETCODE_SESSION || !env.LEETCODE_CSRF) throw new Error('LeetCode sync requires both LEETCODE_SESSION and LEETCODE_CSRF.');
  const outputIndexPath = path.join(outputRoot, 'dsa-index.json');
  const currentIndex = await readFile(outputIndexPath, 'utf8').then(JSON.parse).catch((error) => {
    if (error.code === 'ENOENT') return {};
    throw new Error(`Existing DSA index is invalid: ${error.message}`);
  });
  const cursor = env.DSA_SYNC_SINCE || currentIndex.leetcodeCursor || DEFAULT_CURSOR;
  const problems = await loadSnapshotProblems(outputRoot);
  const byKey = new Map(problems.map((problem) => [problem.key, problem]));
  const bySlug = new Map(problems.filter((problem) => problem.platform === 'leetcode').map((problem) => [problem.slug, problem]));
  const questionCache = new Map();
  const startedAt = now.toISOString();
  const credentials = { LEETCODE_SESSION: env.LEETCODE_SESSION, LEETCODE_CSRF: env.LEETCODE_CSRF };
  const submissions = await listNewAcceptedSubmissions({ credentials, cursor, fetchImpl });
  let addedSolutions = 0;

  for (const submission of submissions) {
    const details = await getProblemDetails({ submission, credentials, fetchImpl, existingProblem: bySlug.get(submission.titleSlug), questionCache });
    const problem = byKey.get(details.problem.key) ?? { ...details.problem, solutions: [] };
    const solutionIndex = problem.solutions.findIndex((solution) => solution.language === details.solution.language);
    if (solutionIndex === -1) {
      problem.solutions.push(details.solution);
      addedSolutions += 1;
    } else {
      problem.solutions[solutionIndex] = details.solution;
    }
    if (!byKey.has(problem.key)) {
      byKey.set(problem.key, problem);
      bySlug.set(problem.slug, problem);
      problems.push(problem);
    }
  }

  const index = await publishDsaSnapshot({
    outputRoot,
    problems,
    metadata: { generatedAt: startedAt, leetcodeCursor: startedAt },
  });
  const byPlatform = { leetcode: 0, cses: 0 };
  for (const problem of problems) byPlatform[problem.platform] += 1;
  return {
    addedSolutions,
    syncedSolutions: submissions.length,
    totalProblems: problems.length,
    byPlatform,
    languages: index.filters.languages,
    cursor: index.leetcodeCursor,
  };
}
