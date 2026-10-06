import { describe, expect, it } from 'vitest';
import { countAcceptedProblems, sumPlatformSolves } from '../../src/lib/competitive-stats';

describe('competitive-programming totals', () => {
  it('counts unique Codeforces problems with accepted submissions only', () => {
    expect(countAcceptedProblems([
      { verdict: 'OK', problem: { contestId: 1, index: 'A' } },
      { verdict: 'WRONG_ANSWER', problem: { contestId: 1, index: 'B' } },
      { verdict: 'OK', problem: { contestId: 1, index: 'A' } },
      { verdict: 'OK', problem: { contestId: 2, index: 'A' } },
    ])).toBe(2);
  });

  it('sums all platform counts and refuses to report an incomplete total', () => {
    expect(sumPlatformSolves({ codeforces: 660, leetcode: 821, cses: 45, vnoi: 352, lqdoj: 161 })).toBe(2039);
    expect(sumPlatformSolves({ codeforces: 660, leetcode: 821, cses: null, vnoi: 352, lqdoj: 161 })).toBeNull();
  });
});
