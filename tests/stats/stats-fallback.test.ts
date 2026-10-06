import { describe, expect, it } from 'vitest';
import { getStatsSnapshot } from '../../src/data/portfolio';
import { sumPlatformSolves } from '../../src/lib/competitive-stats';

describe('build-time stats snapshot', () => {
  it('exposes validated optional metrics so an API outage can keep the last snapshot', () => {
    const snapshot = getStatsSnapshot();
    expect(snapshot.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(snapshot.codeforces.username).toBe('nhan43');
    expect(snapshot.leetcode.username).toBe('nhan43');
    expect(snapshot.sources.codeforces).toMatch(/^https:\/\//);
    expect(sumPlatformSolves({
      codeforces: snapshot.codeforces.solved,
      leetcode: snapshot.leetcode.solved,
      cses: snapshot.cses.solved,
      vnoi: snapshot.vnoi.solved,
      lqdoj: snapshot.lqdoj.solved,
    })).toBe(2039);
  });
});
