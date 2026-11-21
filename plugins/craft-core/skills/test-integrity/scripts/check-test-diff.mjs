#!/usr/bin/env node
// Check a branch's changes for weakened tests, compared with a base (default: where this branch left
// origin/main or main). Includes uncommitted changes. Finds: deleted or disabled tests, skips, .only,
// fewer assertions, changed expected values and tolerances, test config that excludes tests or lowers
// coverage, masked exit codes in CI, swallowed errors, and source code that special-cases a literal
// that appears in the tests.
// Usage: node check-test-diff.mjs [base] [--strict]   (exit 1 on any "weaken" finding; --strict: on any finding)
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const R = await import(pathToFileURL(join(here, '..', '..', '..', 'hooks', 'test-rules.mjs')).href);

const args = process.argv.slice(2);
const strict = args.includes('--strict');
const git = (...a) => execFileSync('git', a, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
const tryGit = (...a) => { try { return git(...a).trim(); } catch { return ''; } };

const root = tryGit('rev-parse', '--show-toplevel');
if (!root) { console.error('not a git repository'); process.exit(2); }
process.chdir(root);
const baseRef = args.find((a) => !a.startsWith('--')) || ['origin/main', 'main', 'origin/master', 'master'].find((b) => tryGit('rev-parse', '--verify', '--quiet', b));
const base = baseRef && tryGit('merge-base', 'HEAD', baseRef);
if (!base) { console.error(`can't find a base to compare with (tried ${baseRef || 'origin/main, main'}). Pass one: node check-test-diff.mjs <base>`); process.exit(2); }

const oldText = (p) => tryGit('show', `${base}:${p}`);
const newText = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : '');
const added = (o, n) => { const os = new Set(o.split('\n').map((l) => l.trim())); return n.split('\n').filter((l) => l.trim() && !os.has(l.trim())); };

const rows = [];
const report = (file, list) => { for (const f of list) rows.push({ file, ...f }); };
const changes = tryGit('diff', '--name-status', '-M', base).split('\n').filter(Boolean)
  .concat(tryGit('ls-files', '--others', '--exclude-standard').split('\n').filter(Boolean).map((p) => `A\t${p}`));
const testFiles = tryGit('ls-files').split('\n').filter(R.isTestFile);
const testCorpus = testFiles.map((p) => newText(p)).join('\n');

for (const line of changes) {
  const [status, a, b] = line.split('\t');
  const kind = status[0];
  if (kind === 'D') {
    if (R.isTestFile(a)) report(a, [{ kind: 'delete', level: 'weaken', msg: 'test file deleted' }]);
    continue;
  }
  const path = kind === 'R' || kind === 'C' ? b : a;
  if (kind === 'R' && R.isTestFile(a) && !R.isTestFile(b)) report(b, [{ kind: 'rename', level: 'weaken', msg: `test moved out of the suite (was ${a})` }]);
  const o = kind === 'A' ? '' : oldText(kind === 'R' ? a : path);
  const n = newText(path);
  if (R.isTestFile(path) || R.isTestConfig(path)) {
    report(path, R.compareFile(path, o, n));
    continue;
  }
  const add = added(o, n);
  report(path, R.sourceSuppressions(add));
  // Special-casing: a condition in the code that compares with a literal the tests use.
  for (const l of add) {
    if (!/\b(?:if|elif|case|when|switch|match)\b|===?|!==?|\.equals\(|\bin\s*\[/.test(l)) continue;
    for (const [, lit] of l.matchAll(/["'`]([^"'`\n]{5,80})["'`]/g)) {
      if (testCorpus.includes(lit)) { report(path, [{ kind: 'special-case', level: 'review', msg: `a condition compares with "${lit}", which also appears in the tests. Is this a general fix or a special case for the test input? "${l.trim().slice(0, 80)}"` }]); break; }
    }
  }
}

const weaken = rows.filter((r) => r.level === 'weaken');
const label = { weaken: '❌ weakens', review: '⚠️ review' };
if (!rows.length) {
  console.log(`ok  no weakened tests in the changes since ${base.slice(0, 12)} (${changes.length} files checked)`);
  process.exit(0);
}
console.log(`| File | Finding | What |\n|---|---|---|`);
for (const r of [...weaken, ...rows.filter((r) => r.level !== 'weaken')]) console.log(`| ${r.file} | ${label[r.level]} | ${r.msg.replace(/\|/g, '\\|')} |`);
console.log(`\n${weaken.length} weakening, ${rows.length - weaken.length} to review, compared with ${base.slice(0, 12)}.`);
process.exit(weaken.length || (strict && rows.length) ? 1 : 0);
