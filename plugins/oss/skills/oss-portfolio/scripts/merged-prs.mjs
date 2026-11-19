#!/usr/bin/env node
// List the authenticated user's merged PRs via the gh CLI. Works in PowerShell and bash.
// Usage: node merged-prs.mjs [--repo owner/name] [--since YYYY-MM-DD] [--include-own] [--json]
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const flag = (name) => args.includes(name);

function gh(ghArgs) {
  return execFileSync('gh', ghArgs, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], maxBuffer: 64 * 1024 * 1024 });
}

const me = gh(['api', 'user', '--jq', '.login']).trim();
const query = ['is:pr', 'is:merged', `author:${me}`];
if (opt('--repo')) query.push(`repo:${opt('--repo')}`);
if (opt('--since')) query.push(`merged:>=${opt('--since')}`);

const prs = [];
for (let page = 1; page <= 10; page++) {
  const res = JSON.parse(gh(['api', '-X', 'GET', 'search/issues', '-f', `q=${query.join(' ')}`, '-f', 'per_page=100', '-f', `page=${page}`, '-f', 'sort=updated']));
  for (const it of res.items) {
    const repo = it.repository_url.replace('https://api.github.com/repos/', '');
    if (!flag('--include-own') && !opt('--repo') && repo.split('/')[0].toLowerCase() === me.toLowerCase()) continue;
    prs.push({
      repo,
      number: it.number,
      title: it.title,
      mergedAt: it.pull_request?.merged_at ?? it.closed_at,
      labels: it.labels.map((l) => l.name),
      url: it.html_url,
    });
  }
  if (res.items.length < 100) break;
}
prs.sort((a, b) => (b.mergedAt ?? '').localeCompare(a.mergedAt ?? ''));

if (flag('--json')) {
  process.stdout.write(JSON.stringify(prs, null, 2) + '\n');
} else {
  for (const p of prs) {
    console.log(`${(p.mergedAt ?? '').slice(0, 10)}  ${p.repo}#${p.number}  ${p.title}${p.labels.length ? `  [${p.labels.join(', ')}]` : ''}`);
  }
  console.log(`\n${prs.length} merged PRs by ${me}`);
}
