import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { runDsaSync } from './lib/dsa-sync.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Read a secret from a TTY without echoing it to the terminal. */
export function readHiddenInput(label, input = process.stdin, output = process.stdout) {
  if (!input.isTTY || typeof input.setRawMode !== 'function') {
    return Promise.reject(new Error('Interactive secret entry requires a terminal. Set LEETCODE_SESSION and LEETCODE_CSRF in the environment.'));
  }
  return new Promise((resolve, reject) => {
    let value = '';
    const wasRaw = Boolean(input.isRaw);
    const cleanup = () => {
      input.off('data', onData);
      input.setRawMode(wasRaw);
      output.write('\n');
    };
    const onData = (chunk) => {
      for (const character of String(chunk)) {
        if (character === '\u0003') {
          cleanup();
          reject(new Error('Secret entry cancelled.'));
          return;
        }
        if (character === '\r' || character === '\n') {
          cleanup();
          resolve(value);
          return;
        }
        if (character === '\u007f' || character === '\b') value = value.slice(0, -1);
        else value += character;
      }
    };
    output.write(label);
    input.setRawMode(true);
    input.setEncoding('utf8');
    input.resume();
    input.on('data', onData);
  });
}

async function collectCredentials(env) {
  const credentials = { LEETCODE_SESSION: env.LEETCODE_SESSION ?? '', LEETCODE_CSRF: env.LEETCODE_CSRF ?? '' };
  if ((!credentials.LEETCODE_SESSION || !credentials.LEETCODE_CSRF) && (!process.stdin.isTTY || typeof process.stdin.setRawMode !== 'function')) {
    throw new Error('Missing LeetCode cookies in a non-interactive run. Configure LEETCODE_SESSION and LEETCODE_CSRF as GitHub Actions Secrets, or export them before running make fetch-dsa.');
  }
  if (!credentials.LEETCODE_SESSION) credentials.LEETCODE_SESSION = await readHiddenInput('LeetCode LEETCODE_SESSION (hidden): ');
  if (!credentials.LEETCODE_CSRF) credentials.LEETCODE_CSRF = await readHiddenInput('LeetCode LEETCODE_CSRF (hidden): ');
  return credentials;
}

async function writeArtifactSummary(summary, artifactRoot) {
  if (!artifactRoot) return;
  await mkdir(artifactRoot, { recursive: true });
  const safeSummary = {
    addedSolutions: summary.addedSolutions,
    syncedSolutions: summary.syncedSolutions,
    totalProblems: summary.totalProblems,
    byPlatform: summary.byPlatform,
    languages: summary.languages,
    cursor: summary.cursor,
  };
  await writeFile(path.join(artifactRoot, 'sync-summary.json'), `${JSON.stringify(safeSummary, null, 2)}\n`, 'utf8');
}

export async function main(env = process.env) {
  const credentials = await collectCredentials(env);
  const outputRoot = path.join(projectRoot, 'src', 'data');
  const summary = await runDsaSync({ outputRoot, env: { ...env, ...credentials } });
  await writeArtifactSummary(summary, env.DSA_SYNC_ARTIFACT_DIR);
  console.log(`DSA snapshot updated in Portfolio: ${summary.addedSolutions} new language solutions; ${summary.totalProblems} problems (${summary.byPlatform.leetcode} LeetCode, ${summary.byPlatform.cses} CSES).`);
  console.log(`Accepted submissions synced: ${summary.syncedSolutions}`);
  console.log(`Languages: ${summary.languages.join(', ') || 'none'} · cursor ${summary.cursor}`);
  return summary;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(`fetch-dsa failed: ${error.message}`);
    process.exitCode = 1;
  });
}
