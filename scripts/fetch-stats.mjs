import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const output = new URL('../src/data/stats.json', import.meta.url);
const fallback = JSON.parse(await readFile(output, 'utf8'));
const timeout = (ms) => AbortSignal.timeout(ms);
const json = async (url, init = {}) => {
  const response = await fetch(url, { ...init, signal: timeout(8000), headers: { Accept: 'application/json', ...(init.headers ?? {}) } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
};
const snapshot = structuredClone(fallback);
const errors = [];
let successfulSources = 0;

try {
  const submissions = await json('https://codeforces.com/api/user.status?handle=nhan43');
  if (!Array.isArray(submissions.result)) throw new Error('response did not contain submissions');
  snapshot.codeforces.solved = new Set(submissions.result
    .filter((submission) => submission.verdict === 'OK' && submission.problem?.contestId !== undefined && submission.problem?.index)
    .map((submission) => `${submission.problem.contestId}:${submission.problem.index}`)).size;
  successfulSources += 1;
  await new Promise((resolve) => setTimeout(resolve, 2200));
  const codeforces = await json('https://codeforces.com/api/user.info?handles=nhan43');
  const user = codeforces.result?.[0];
  if (user && (user.rating === undefined || Number.isFinite(user.rating))) { snapshot.codeforces = { ...snapshot.codeforces, rating: user.rating ?? null, rank: user.rank ?? null }; }
  else throw new Error('response did not contain a valid user');
} catch (error) { errors.push(`Codeforces: ${error.message}`); }

try {
  const leetcode = await json('https://leetcode.com/graphql', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: 'query userProfile($username: String!) { matchedUser(username: $username) { submitStats { acSubmissionNum { difficulty count } } } userContestRanking(username: $username) { rating topPercentage } }', variables: { username: 'nhan43' } }) });
  const profile = leetcode.data?.matchedUser;
  if (profile) { snapshot.leetcode = { username: 'nhan43', rating: leetcode.data?.userContestRanking?.rating ?? null, topPercentage: leetcode.data?.userContestRanking?.topPercentage ?? null, solved: profile.submitStats?.acSubmissionNum?.find((item) => item.difficulty === 'All')?.count ?? null }; successfulSources += 1; }
  else throw new Error('response did not contain a valid user');
} catch (error) { errors.push(`LeetCode: ${error.message}`); }

try {
  const response = await fetch('https://oj.vnoi.info/user/nhan43', { signal: timeout(12000), headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  const profile = await response.text();
  const solved = profile.match(/Số bài đã giải:\s*(\d+)/)?.[1];
  if (!solved) throw new Error('profile did not expose a solved-problem count');
  snapshot.vnoi.solved = Number(solved);
  successfulSources += 1;
} catch (error) { errors.push(`VNOI: ${error.message}`); }

if (successfulSources > 0) {
  snapshot.generatedAt = new Date().toISOString();
  await mkdir(dirname(output.pathname), { recursive: true });
  const temporary = new URL('./stats.json.tmp', output);
  await writeFile(temporary, `${JSON.stringify(snapshot, null, 2)}\n`);
  await rename(temporary, output);
  console.log(`Stats snapshot written at ${snapshot.generatedAt} from ${successfulSources} source(s).`);
} else {
  console.warn(`All stat sources were unavailable; kept snapshot from ${fallback.generatedAt}.`);
}
if (errors.length) { console.warn(`Kept previous values for ${errors.length} unavailable source(s):`); errors.forEach((error) => console.warn(`- ${error}`)); }
