export interface AcceptedSubmission {
  verdict?: string;
  problem?: { contestId?: number; index?: string; name?: string; problemsetName?: string };
}

export type PlatformSolvedCounts = Record<string, number | null>;

export function countAcceptedProblems(submissions: AcceptedSubmission[]): number {
  const accepted = new Set<string>();

  for (const submission of submissions) {
    const problem = submission.problem;
    if (submission.verdict !== 'OK' || !problem) continue;
    const key = problem.contestId !== undefined && problem.index
      ? `${problem.contestId}:${problem.index}`
      : problem.name
        ? `${problem.problemsetName ?? ''}:${problem.name}`
        : null;
    if (key) accepted.add(key);
  }

  return accepted.size;
}

export function sumPlatformSolves(platforms: PlatformSolvedCounts): number | null {
  const counts = Object.values(platforms);
  if (!counts.length || counts.some((count) => count === null || !Number.isFinite(count) || count < 0)) return null;
  return counts.reduce<number>((total, count) => total + (count ?? 0), 0);
}
