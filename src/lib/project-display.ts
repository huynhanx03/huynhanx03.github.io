export function formatStarCount(count: number): string {
  if (count < 1000) return count.toLocaleString('en-US');
  return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}k`;
}

export function getGitHubRepoSlug(repositoryUrl: string): string | null {
  try {
    const url = new URL(repositoryUrl);
    if (url.hostname !== 'github.com') return null;
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length !== 2) return null;
    return `${parts[0]}/${parts[1].replace(/\.git$/, '')}`;
  } catch {
    return null;
  }
}
