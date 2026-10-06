import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { formatLeetCodeSolution, runDsaSync } from '../../scripts/lib/dsa-sync.mjs';

const roots: string[] = [];

async function temporaryDirectory() {
  const root = await mkdtemp(path.join(tmpdir(), 'portfolio-dsa-sync-'));
  roots.push(root);
  return root;
}

async function createExistingSnapshot(outputRoot: string) {
  const dataRoot = path.join(outputRoot, 'dsa');
  await mkdir(path.join(dataRoot, 'cses'), { recursive: true });
  await mkdir(path.join(dataRoot, 'leetcode'), { recursive: true });
  await writeFile(path.join(outputRoot, 'dsa-index.json'), JSON.stringify({ leetcodeCursor: '2026-10-01T00:00:00.000Z' }));
  await writeFile(path.join(dataRoot, 'cses', '1070-permutations.json'), JSON.stringify({
    key: 'cses:1070', platform: 'cses', id: '1070', slug: 'permutations', title: 'Permutations',
    url: 'https://cses.fi/problemset/task/1070/', topics: [], statementHtml: '<p>CSES statement</p>',
    solutions: [{ language: 'C++', relativePath: 'cses/Permutations.cpp', source: 'int main() {}' }],
  }));
  await writeFile(path.join(dataRoot, 'leetcode', '1-two-sum.json'), JSON.stringify({
    key: 'leetcode:1', platform: 'leetcode', id: '1', slug: 'two-sum', title: 'Two Sum',
    url: 'https://leetcode.com/problems/two-sum/', difficulty: 'Easy', topics: ['Array'], statementHtml: '<p>Old statement</p>',
    solutions: [{ language: 'C++', relativePath: 'leetcode/Easy/1-two-sum.cpp', source: 'class Solution {};' }],
  }));
}

function leetCodeFetch() {
  return vi.fn(async (_url: URL | RequestInfo, init?: RequestInit) => {
    const request = JSON.parse(String(init?.body)) as { operationName: string; variables: Record<string, unknown> };
    if (request.operationName === 'submissionList') {
      return Response.json({ data: { submissionList: { hasNext: false, submissions: [
        { id: '100', title: 'New Problem', titleSlug: 'new-problem', statusDisplay: 'Accepted', lang: 'rust', langName: 'Rust', timestamp: '1791244801' },
        { id: '101', title: 'New Problem', titleSlug: 'new-problem', statusDisplay: 'Accepted', lang: 'python3', langName: 'Python3', timestamp: '1791244800' },
        { id: '99', title: 'Wrong Attempt', titleSlug: 'wrong-attempt', statusDisplay: 'Wrong Answer', lang: 'cpp', langName: 'C++', timestamp: '1791244800' },
        { id: '98', title: 'Old Problem', titleSlug: 'old-problem', statusDisplay: 'Accepted', lang: 'cpp', langName: 'C++', timestamp: '1790812800' },
      ] } } });
    }
    if (request.operationName === 'submissionDetails') {
      const rust = request.variables.id === 100;
      return Response.json({ data: { submissionDetails: {
        code: rust ? 'fn solve() {}' : 'def solve(): pass', runtimeDisplay: '72 ms', runtimePercentile: 43.25,
        memoryDisplay: '8.6 MB', memoryPercentile: 64.42, statusCode: 10,
        lang: rust ? { name: 'rust', verboseName: 'Rust' } : { name: 'python3', verboseName: 'Python3' },
      } } });
    }
    if (request.operationName === 'questionData') {
      return Response.json({ data: { question: {
        questionFrontendId: '5000', title: 'New Problem', titleSlug: 'new-problem',
        content: '<p>Statement</p><script>unsafe()</script>', difficulty: 'Medium', topicTags: [{ name: 'Dynamic Programming' }],
      } } });
    }
    throw new Error(`Unexpected LeetCode operation ${request.operationName}`);
  });
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('LeetCode solution metadata', () => {
  it('keeps runtime, memory and topics in a source comment above the submitted code', () => {
    expect(formatLeetCodeSolution({
      id: '4348', title: 'Maximum Total Sum of K Selected Elements', language: 'cpp', runtime: '72 ms', runtimePercentile: 43.25,
      memory: '186.3 MB', memoryPercentile: 43.67, topics: ['Array', 'Greedy', 'Sorting'], source: 'class Solution {};',
    })).toBe('/*\n Problem: 4348. Maximum Total Sum of K Selected Elements\n Language: cpp\n Runtime: 72 ms (43.25%)\n Memory: 186.3 MB (43.67%)\n Tags: Array, Greedy, Sorting\n*/\nclass Solution {};');

    expect(formatLeetCodeSolution({
      id: '1', title: 'Two Sum', language: 'python3', runtime: '40 ms', runtimePercentile: null,
      memory: '16.2 MB', memoryPercentile: null, topics: ['Array'], source: 'def two_sum(): pass',
    })).toContain('# Problem: 1. Two Sum\n# Language: python3\n# Runtime: 40 ms\n# Memory: 16.2 MB\n# Tags: Array\ndef two_sum(): pass');
  });
});

describe('Portfolio-only LeetCode sync', () => {
  it('skips accepted submissions with no detail record and leaves the cursor before them for retry', async () => {
    const root = await temporaryDirectory();
    const outputRoot = path.join(root, 'src', 'data');
    await createExistingSnapshot(outputRoot);
    const progress: string[] = [];
    const fetchImpl = vi.fn(async (_url: URL | RequestInfo, init?: RequestInit) => {
      const request = JSON.parse(String(init?.body)) as { operationName: string; variables: Record<string, number> };
      if (request.operationName === 'submissionList') {
        return Response.json({ data: { submissionList: { hasNext: false, submissions: [
          { id: '110', title: 'Unavailable', titleSlug: 'unavailable', statusDisplay: 'Accepted', lang: 'cpp', langName: 'C++', timestamp: '1791244802' },
          { id: '111', title: 'Available', titleSlug: 'available', statusDisplay: 'Accepted', lang: 'rust', langName: 'Rust', timestamp: '1791244801' },
        ] } } });
      }
      if (request.operationName === 'submissionDetails' && request.variables.id === 110) {
        return Response.json({ data: { submissionDetails: null } });
      }
      if (request.operationName === 'submissionDetails') {
        return Response.json({ data: { submissionDetails: {
          code: 'fn main() {}', statusCode: 10, runtimeDisplay: '1 ms', memoryDisplay: '1 MB',
          lang: { name: 'rust', verboseName: 'Rust' },
        } } });
      }
      return Response.json({ data: { question: {
        questionFrontendId: '5001', title: 'Available', titleSlug: 'available', content: '<p>Statement</p>',
        difficulty: 'Easy', topicTags: [],
      } } });
    });

    const summary = await runDsaSync({
      outputRoot, env: { LEETCODE_SESSION: 's', LEETCODE_CSRF: 'c' }, fetchImpl,
      now: new Date('2026-10-06T00:00:00.000Z'),
      requestIntervalMs: 0,
      onProgress: (message: string) => { progress.push(message); },
    });

    expect(summary.syncedSolutions).toBe(1);
    expect(summary.skippedSolutions).toBe(1);
    expect(Date.parse(summary.cursor)).toBeLessThan(Date.parse('2026-10-06T00:00:02.000Z'));
    expect(progress.some((message) => message.includes('Skipping submission 110'))).toBe(true);
    expect(await readFile(path.join(outputRoot, 'dsa', 'leetcode', '5001-available.json'), 'utf8')).toContain('fn main() {}');
  });

  it('adds only accepted submissions after the cursor and preserves the existing snapshot in Portfolio data', async () => {
    const root = await temporaryDirectory();
    const outputRoot = path.join(root, 'src', 'data');
    await createExistingSnapshot(outputRoot);
    const fetchImpl = leetCodeFetch();
    const progress: string[] = [];

    const summary = await runDsaSync({
      outputRoot, env: { LEETCODE_SESSION: 'session-cookie', LEETCODE_CSRF: 'csrf-cookie' }, fetchImpl,
      now: new Date('2026-10-06T00:00:00.000Z'),
      requestIntervalMs: 0,
      onProgress: (message: string) => { progress.push(message); },
    });

    const index = JSON.parse(await readFile(path.join(outputRoot, 'dsa-index.json'), 'utf8'));
    const newProblem = JSON.parse(await readFile(path.join(outputRoot, 'dsa', 'leetcode', '5000-new-problem.json'), 'utf8'));
    const oldProblem = JSON.parse(await readFile(path.join(outputRoot, 'dsa', 'leetcode', '1-two-sum.json'), 'utf8'));
    const csesProblem = JSON.parse(await readFile(path.join(outputRoot, 'dsa', 'cses', '1070-permutations.json'), 'utf8'));

    expect(summary).toMatchObject({ addedSolutions: 2, syncedSolutions: 2, totalProblems: 3, byPlatform: { leetcode: 2, cses: 1 } });
    expect(newProblem.solutions.map((solution: { language: string }) => solution.language).sort()).toEqual(['Python3', 'Rust']);
    expect(newProblem.solutions[0].source).toContain('Runtime: 72 ms (43.25%)');
    expect(newProblem.solutions[0].source).toContain('Memory: 8.6 MB (64.42%)');
    expect(newProblem.solutions[0].source).toContain('Tags: Dynamic Programming');
    expect(newProblem.solutions[0].source).toContain('fn solve() {}');
    expect(newProblem.statementHtml).toBe('<p>Statement</p>');
    expect(oldProblem.solutions).toHaveLength(1);
    expect(csesProblem.statementHtml).toBe('<p>CSES statement</p>');
    expect(index.counts).toEqual({ all: 3, leetcode: 2, cses: 1 });
    expect(index.leetcodeCursor).toBe('2026-10-06T00:00:00.000Z');
    expect(progress.some((message) => message.includes('Fetching solution 1/2'))).toBe(true);
    expect(progress.at(-1)).toContain('Writing the updated DSA JSON snapshot');
    expect(fetchImpl).toHaveBeenCalledTimes(4);
    const requestHeaders = new Headers(fetchImpl.mock.calls[0][1]?.headers);
    expect(requestHeaders.get('cookie')).toContain('LEETCODE_SESSION=session-cookie');
    expect(requestHeaders.get('x-csrftoken')).toBe('csrf-cookie');
  });

  it('does not advance the cursor or replace data when a LeetCode request fails', async () => {
    const root = await temporaryDirectory();
    const outputRoot = path.join(root, 'src', 'data');
    await createExistingSnapshot(outputRoot);
    const beforeIndex = await readFile(path.join(outputRoot, 'dsa-index.json'), 'utf8');
    const fetchImpl = vi.fn(async () => Response.json({ errors: [{ message: 'unauthorized' }] }));

    await expect(runDsaSync({ outputRoot, env: { LEETCODE_SESSION: 's', LEETCODE_CSRF: 'c' }, fetchImpl, requestIntervalMs: 0 })).rejects.toThrow(/unauthorized/i);
    expect(await readFile(path.join(outputRoot, 'dsa-index.json'), 'utf8')).toBe(beforeIndex);
  });

  it('distinguishes a missing submission source from an unexpected status code', async () => {
    const root = await temporaryDirectory();
    const outputRoot = path.join(root, 'src', 'data');
    await createExistingSnapshot(outputRoot);
    const fetchImpl = vi.fn(async (_url: URL | RequestInfo, init?: RequestInit) => {
      const request = JSON.parse(String(init?.body)) as { operationName: string };
      if (request.operationName === 'submissionList') {
        return Response.json({ data: { submissionList: { hasNext: false, submissions: [
          { id: '102', title: 'No Code', titleSlug: 'no-code', statusDisplay: 'Accepted', lang: 'cpp', langName: 'C++', timestamp: '1791244801' },
        ] } } });
      }
      return Response.json({ data: { submissionDetails: { code: null, statusCode: 10, runtimeDisplay: '0 ms' } } });
    });

    await expect(runDsaSync({ outputRoot, env: { LEETCODE_SESSION: 's', LEETCODE_CSRF: 'c' }, fetchImpl, requestIntervalMs: 0 }))
      .rejects.toThrow(/omitted source code.*statusCode/iu);
  });
});
