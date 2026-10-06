import type { StatsSnapshot } from '../data/types';

type PlatformId = 'codeforces' | 'leetcode' | 'cses' | 'vnoi' | 'lqdoj';

type PlatformPresentation = {
  username: string;
  solved: number | null;
  metric: { label: string; value: string; badge: string | null; tone: 'codeforces' | 'leetcode' } | null;
};

const formatRank = (rank: string | null): string | null => rank
  ? rank.replace(/\b\w/g, (letter) => letter.toUpperCase())
  : null;

export function getPlatformPresentation(id: PlatformId, stats: StatsSnapshot): PlatformPresentation {
  if (id === 'codeforces') {
    return {
      username: stats.codeforces.username,
      solved: stats.codeforces.solved,
      metric: stats.codeforces.rating === null ? null : {
        label: 'Rating',
        value: stats.codeforces.rating.toLocaleString('en-US'),
        badge: formatRank(stats.codeforces.rank),
        tone: 'codeforces',
      },
    };
  }

  if (id === 'leetcode') {
    const { rating, topPercentage } = stats.leetcode;
    return {
      username: stats.leetcode.username,
      solved: stats.leetcode.solved,
      metric: rating === null ? null : {
        label: 'Rating',
        value: Math.round(rating).toLocaleString('en-US'),
        badge: topPercentage === null ? null : `Top ${topPercentage.toFixed(2)}%`,
        tone: 'leetcode',
      },
    };
  }

  const platformStats = stats[id];
  return { username: platformStats.username, solved: platformStats.solved, metric: null };
}
