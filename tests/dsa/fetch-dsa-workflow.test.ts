import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';

describe('fetch-dsa command and manual workflow', () => {
  it('routes local Make execution to the same DSA fetch CLI', async () => {
    const [makefile, packageJson, cli] = await Promise.all([
      readFile(new URL('../../Makefile', import.meta.url), 'utf8'),
      readFile(new URL('../../package.json', import.meta.url), 'utf8'),
      readFile(new URL('../../scripts/fetch-dsa.mjs', import.meta.url), 'utf8'),
    ]);

    expect(makefile).toContain('fetch-dsa');
    expect(makefile).toContain('$(PNPM) fetch:dsa');
    expect(JSON.parse(packageJson).scripts['fetch:dsa']).toBe('node scripts/fetch-dsa.mjs');
    expect(cli).toContain('setRawMode(true)');
    expect(cli).toContain('input.setRawMode(wasRaw)');
    expect(cli).toContain('LEETCODE_SESSION');
    expect(cli).toContain('LEETCODE_CSRF');
  });

  it('runs manually only, uses masked repository secrets, and uploads generated results without pushing', async () => {
    const workflow = await readFile(new URL('../../.github/workflows/fetch-dsa.yml', import.meta.url), 'utf8');

    expect(workflow).toMatch(/^on:\s*\n\s+workflow_dispatch:\s*$/m);
    expect(workflow).not.toContain('schedule:');
    expect(workflow).toContain('run: make fetch-dsa');
    expect(workflow).not.toContain('Data-structures-Algorithms');
    expect(workflow).toContain('LEETCODE_SESSION: ${{ secrets.LEETCODE_SESSION }}');
    expect(workflow).toContain('LEETCODE_CSRF: ${{ secrets.LEETCODE_CSRF }}');
    expect(workflow).not.toMatch(/inputs\.(?:LEETCODE_SESSION|LEETCODE_CSRF)/u);
    expect(workflow).toContain('actions/upload-artifact@v4');
    expect(workflow).not.toContain('git push');
  });
});
