import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { sanitizeStatementHtml, scanDsaRepository, validateDsaProblems } from '../../scripts/lib/dsa-data.mjs';

const roots: string[] = [];

async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), 'dsa-data-'));
  roots.push(root);
  const lcProblem = path.join(root, 'leetcode', 'Easy', '0001-two-sum');
  const csesDir = path.join(root, 'cses', 'Introductory_Problems');
  await mkdir(lcProblem, { recursive: true });
  await mkdir(csesDir, { recursive: true });
  await writeFile(path.join(lcProblem, 'README.md'), '<h2><a href="https://leetcode.com/problems/two-sum/">1. Two Sum</a></h2><h3>Easy</h3><hr><p>Given an array.</p><pre>Example</pre>');
  await writeFile(path.join(lcProblem, '0001-two-sum.cpp'), '/*\n * Tags: Array, Greedy\n */\nint twoSum() { return 1; }');
  await writeFile(path.join(lcProblem, '0001-two-sum.rs'), 'fn two_sum() -> i32 { 1 }');
  await writeFile(path.join(root, 'leetcode', 'README.md'), [
    '## Array',
    '| # | Title | Difficulty |',
    '| 1 | [Two Sum](./Easy/0001-two-sum) | Easy |',
    '## Hash Table',
    '| # | Title | Difficulty |',
    '| 1 | [Two Sum](./Easy/0001-two-sum) | Easy |',
  ].join('\n'));
  await writeFile(path.join(csesDir, 'Permutations.cpp'), 'int main() { return 0; }');
  await writeFile(path.join(csesDir, 'Permutations.rs'), 'fn main() {}');
  return root;
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('DSA repository data', () => {
  it('groups LeetCode topic rows and language files into one problem', async () => {
    const root = await fixture();

    const result = await scanDsaRepository(root, {
      csesTasks: [{ id: '1070', title: 'Permutations', url: 'https://cses.fi/problemset/task/1070/', statementHtml: '<p>Arrange the numbers.</p>' }],
    });
    const problem = result.problems.find((item) => item.key === 'leetcode:1');

    expect(result.unresolvedCses).toEqual([]);
    expect(problem).toMatchObject({
      platform: 'leetcode', id: '1', slug: 'two-sum', title: 'Two Sum', difficulty: 'Easy',
      topics: ['Array', 'Greedy', 'Hash Table'],
    });
    expect(problem?.solutions.map((solution) => solution.language).sort()).toEqual(['C++', 'Rust']);
    expect(problem?.statementHtml).toContain('<p>Given an array.</p>');
  });

  it('matches CSES files by official title and reports unresolved files', async () => {
    const root = await fixture();
    const result = await scanDsaRepository(root, {
      csesTasks: [{ id: '1070', title: 'Permutations', url: 'https://cses.fi/problemset/task/1070/', statementHtml: '<p>Arrange the numbers.</p>' }],
    });
    const problem = result.problems.find((item) => item.key === 'cses:1070');

    expect(result.unresolvedCses).toEqual([]);
    expect(problem).toMatchObject({ platform: 'cses', id: '1070', title: 'Permutations', url: 'https://cses.fi/problemset/task/1070/' });
    expect(problem?.difficulty).toBeUndefined();
    expect(problem?.solutions.map((solution) => solution.language).sort()).toEqual(['C++', 'Rust']);
    expect(problem?.statementHtml).toContain('Arrange the numbers.');

    const unresolved = await scanDsaRepository(root);
    expect(unresolved.unresolvedCses).toEqual(['Introductory_Problems/Permutations']);
  });

  it('allows an explicit override for a local CSES filename that differs from the official task title', async () => {
    const root = await fixture();
    const dir = path.join(root, 'cses', 'Introductory_Problems');
    await rm(path.join(dir, 'Permutations.cpp'));
    await writeFile(path.join(dir, 'My_Permutation_Solution.cpp'), 'int main() {}');
    const result = await scanDsaRepository(root, {
      csesTasks: [{ id: '1070', title: 'Permutations', url: 'https://cses.fi/problemset/task/1070/', statementHtml: '<p>Full task.</p>' }],
      overrides: { 'cses/Introductory_Problems/My_Permutation_Solution': '1070' },
    });

    expect(result.unresolvedCses).toEqual([]);
    expect(result.problems.find((item) => item.key === 'cses:1070')?.solutions).toHaveLength(2);
  });

  it('sanitizes unsafe markup and links but preserves problem structure', () => {
    const clean = sanitizeStatementHtml('<h1>Input</h1><p onclick="steal()">Example</p><script>alert(1)</script><a href="javascript:alert(1)">bad</a><pre><code>x &lt; 3</code></pre>');

    expect(clean).toContain('<h2>Input</h2>');
    expect(clean).toContain('<p>Example</p>');
    expect(clean).toContain('<pre><code>x &lt; 3</code></pre>');
    expect(clean).not.toMatch(/script|onclick|javascript:/i);
  });

  it('rejects duplicate records, missing statements, and empty solution source', () => {
    const problem = {
      key: 'leetcode:1', platform: 'leetcode' as const, id: '1', slug: 'two-sum', title: 'Two Sum',
      url: 'https://leetcode.com/problems/two-sum/', difficulty: 'Easy', topics: ['Array'],
      statementHtml: '<p>Statement</p>',
      solutions: [{ language: 'C++', relativePath: 'leetcode/Easy/0001-two-sum/0001-two-sum.cpp', source: 'int main() {}' }],
    };

    expect(() => validateDsaProblems([problem])).not.toThrow();
    expect(() => validateDsaProblems([problem, problem])).toThrow(/duplicate/i);
    expect(() => validateDsaProblems([{ ...problem, statementHtml: '' }])).toThrow(/statement/i);
    expect(() => validateDsaProblems([{ ...problem, solutions: [{ ...problem.solutions[0], source: '' }] }])).toThrow(/source/i);
  });
});
