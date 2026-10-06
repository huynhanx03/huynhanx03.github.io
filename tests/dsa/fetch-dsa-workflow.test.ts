import { describe, expect, it } from 'vitest';
import { EventEmitter } from 'node:events';
import { readFile } from 'node:fs/promises';
import { vi } from 'vitest';
import { readHiddenInput } from '../../scripts/fetch-dsa.mjs';

class FakeInput extends EventEmitter {
  isTTY = true;
  isRaw = false;
  setRawMode = vi.fn((enabled: boolean) => { this.isRaw = enabled; });
  setEncoding = vi.fn();
  resume = vi.fn();
  pause = vi.fn();
}

describe('fetch-dsa command and manual workflow', () => {
  it('pauses stdin and restores terminal mode after a hidden credential is entered', async () => {
    const input = new FakeInput();
    const output = { write: vi.fn() };
    const pending = readHiddenInput('cookie: ', input as never, output as never);
    input.emit('data', 'secret-cookie');
    input.emit('data', '\n');

    await expect(pending).resolves.toBe('secret-cookie');
    expect(input.pause).toHaveBeenCalledOnce();
    expect(input.isRaw).toBe(false);
  });

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
    expect(workflow).toContain('leetcode_session:');
    expect(workflow).toContain('leetcode_csrf:');
    expect(workflow).toContain('LEETCODE_SESSION: ${{ inputs.leetcode_session }}');
    expect(workflow).toContain('LEETCODE_CSRF: ${{ inputs.leetcode_csrf }}');
    expect(workflow).toContain('::add-mask::$LEETCODE_SESSION');
    expect(workflow).toContain('::add-mask::$LEETCODE_CSRF');
    expect(workflow).toContain('actions/upload-artifact@v4');
    expect(workflow).not.toContain('git push');
  });
});
