/** Public giscus configuration for the notes discussion widget. */
export const noteCommentsConfig = {
  repo: 'huynhanx03/huynhanx03.github.io',
  repoId: 'R_kgDOQ_HTeQ',
  category: 'Announcements',
  categoryId: 'DIC_kwDOQ_HTec4DIhHq',
} as const;

export const noteCommentsEnabled = Boolean(
  noteCommentsConfig.repoId && noteCommentsConfig.categoryId,
);
