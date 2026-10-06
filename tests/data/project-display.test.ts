import { describe, expect, it } from 'vitest';
import { formatStarCount, getGitHubRepoSlug } from '../../src/lib/project-display';

describe('project display helpers', () => {
  it('formats repository stars like a compact GitHub badge', () => {
    expect(formatStarCount(76642)).toBe('76.6k');
    expect(formatStarCount(999)).toBe('999');
    expect(formatStarCount(1000)).toBe('1k');
  });

  it('extracts only public GitHub repository paths', () => {
    expect(getGitHubRepoSlug('https://github.com/redis/redis')).toBe('redis/redis');
    expect(getGitHubRepoSlug('https://github.com/redis/redis.git')).toBe('redis/redis');
    expect(getGitHubRepoSlug('https://github.com/redis/redis/pull/15150')).toBeNull();
    expect(getGitHubRepoSlug('https://example.com/redis/redis')).toBeNull();
  });
});
