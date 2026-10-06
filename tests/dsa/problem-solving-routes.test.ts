import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';

describe('Problem Solving routes and shared discovery', () => {
  it('adds Problem Solving to both localized navigation menus', async () => {
    const [header, messages] = await Promise.all([
      readFile(new URL('../../src/components/layout/SiteHeader.astro', import.meta.url), 'utf8'),
      readFile(new URL('../../src/i18n/messages.ts', import.meta.url), 'utf8'),
    ]);
    expect(header).toContain("localizedPath(locale, '/problem-solving')");
    expect(messages).toContain("problemSolving: 'Problem Solving'");
    expect(messages).toContain("problemSolving: 'Luyện giải thuật'");
  });

  it('exposes one shared search/filter row and links each problem to a localized full statement', async () => {
    const [index, detail, styles] = await Promise.all([
      readFile(new URL('../../src/pages/[locale]/problem-solving/index.astro', import.meta.url), 'utf8'),
      readFile(new URL('../../src/pages/[locale]/problem-solving/[key].astro', import.meta.url), 'utf8'),
      readFile(new URL('../../src/styles/global.css', import.meta.url), 'utf8'),
    ]);
    expect(index).toContain('data-ps-search');
    expect(index).not.toContain('ps-overview');
    expect(index).not.toContain('generatedDate');
    expect(index).toContain('data-platform="leetcode"');
    expect(index).toContain('data-filter-menu data-filter={key}');
    expect(index).toContain("{ key: 'topic', label: copy.topic");
    expect(index).toContain("{ key: 'difficulty', label: copy.difficulty");
    expect(index).toContain("{ key: 'language', label: copy.language");
    expect(index).toContain('data-option-search');
    expect(index).toContain('data-search-clear');
    expect(index).toContain('data-platform="all">{copy.all}');
    expect(index).toContain('class="ps-clear" data-clear aria-label={copy.clear}');
    expect(index).toContain('<span aria-hidden="true">×</span></button>');
    expect(index.indexOf('data-clear')).toBeGreaterThan(index.indexOf('data-platform="cses"'));
    expect(index.indexOf('data-clear')).toBeLessThan(index.indexOf('data-filter-menu'));
    expect(index).toContain("event.key === '/' ");
    expect(index).toContain('data-difficulty-values={JSON.stringify(problem.difficulty ? [problem.difficulty] : [])}');
    expect(index).toContain('problem.topics.slice(0, 3)');
    expect(styles).toContain('.ps-row-arrow { display: inline-block; color: var(--faint);');
    expect(styles).toContain('.ps-problem-row:hover .ps-row-arrow, .ps-problem-row:focus-visible .ps-row-arrow { transform: translate(2px, -2px); color: var(--accent); }');
    expect(index).not.toContain('problem.languages.slice(0, 2)');
    expect(index).toContain('/problem-solving/${encodeURIComponent(problem.key)}');
    expect(detail).toContain('set:html={problem.statementHtml}');
    expect(detail).toContain('problem.solutions.map');
    expect(detail).toContain('href={problem.url}');
    expect(detail).toContain('{copy.openProblem}');
    expect(detail).not.toContain('copy.source');
    expect(detail).not.toContain('href={solution.githubUrl}');
    expect(detail).not.toContain('minutes =');
    expect(detail).not.toContain('copy.minRead');
    expect(detail).toContain("['ps-difficulty', 'ps-header-difficulty'");
    expect(detail).toContain('aria-label={copy.openProblem}');
    expect(detail).toContain('role="tablist"');
    expect(detail).toContain('data-solution-tab={index}');
    expect(detail).toContain('data-solution-panel');
    expect(detail).not.toContain('solution.relativePath.split');
    expect(detail).toContain("event.key === 'ArrowRight'");
  });
});
