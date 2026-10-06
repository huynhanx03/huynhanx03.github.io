import { describe, expect, it } from 'vitest';
import type { StatsSnapshot } from '../../src/data/types';
import { getPlatformPresentation } from '../../src/lib/competitive-presentation';

const stats: StatsSnapshot = {
  generatedAt: '2026-10-04T00:00:00.000Z',
  codeforces: { username: 'nhan43', rating: 2021, rank: 'candidate master', solved: 660 },
  leetcode: { username: 'nhan43', rating: 1606.6088, topPercentage: 23.58, solved: 821 },
  cses: { username: 'nhan43', solved: 45 },
  vnoi: { username: 'nhan43', solved: 352 },
  lqdoj: { username: 'nhan43', solved: 161 },
  sources: { codeforces: '', leetcode: '', cses: '', vnoi: '', lqdoj: '' },
};

describe('competitive platform presentation', () => {
  it('pairs Codeforces rating with the official rank color tone', () => {
    expect(getPlatformPresentation('codeforces', stats)).toEqual({
      username: 'nhan43',
      solved: 660,
      metric: { label: 'Rating', value: '2,021', badge: 'Candidate Master', tone: 'codeforces' },
    });
  });

  it('shows LeetCode contest rating and top percentage without a numbered global rank', () => {
    expect(getPlatformPresentation('leetcode', stats)).toEqual({
      username: 'nhan43',
      solved: 821,
      metric: { label: 'Rating', value: '1,607', badge: 'Top 23.58%', tone: 'leetcode' },
    });
  });

  it('keeps other platform panels focused on account and solved count', () => {
    expect(getPlatformPresentation('cses', stats)).toEqual({ username: 'nhan43', solved: 45, metric: null });
  });
});
