#!/usr/bin/env node
// End-to-end install test, run by CI on clean Windows and Ubuntu runners:
//   1. make an empty git project and an isolated Claude config dir
//   2. `skills add <bundle> --source local` (native claude plugin install underneath)
//   3. start a fresh `claude -p` session and read the skills it reports in its init event
//   4. compare to tests/expected/<bundle>.json exactly
//   5. `skills remove <bundle>` and require `git status --porcelain` to be empty
// Step 3 needs no API credentials: the init event is emitted before any model call.
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const bundle = process.argv[2] || 'core';
const update = process.argv.includes('--update-expected');
const root = mkdtempSync(join(tmpdir(), 'craft-install-'));
const project = join(root, 'project');
const env = { ...process.env, CLAUDE_CONFIG_DIR: join(root, 'config'), CRAFT_DEEPEN: 'off' };
delete env.ANTHROPIC_API_KEY; // prove the check needs no credentials

const q = (a) => (/^[A-Za-z0-9_@%+=:,./\\-]+$/.test(a) ? a : `"${a.replace(/"/g, '\\"')}"`);
function sh(bin, args, opts = {}) {
  const r = spawnSync([bin, ...args].map(q).join(' '), { cwd: project, env, shell: true, encoding: 'utf8', ...opts });
  if (r.status !== 0 && !opts.allowFail) { console.error(r.stdout, r.stderr); throw new Error(`${bin} ${args.join(' ')} -> exit ${r.status}`); }
  return r;
}
const step = (m) => console.log(`\n== ${m}`);

let failed = false;
try {
  step(`empty project at ${project}`);
  spawnSync('git', ['init', '-q', project]);
  sh('git', ['-c', 'user.email=ci@example.com', '-c', 'user.name=ci', 'commit', '-q', '--allow-empty', '-m', 'init']);

  step(`skills add ${bundle} --source local`);
  sh('node', [join(REPO, 'cli', 'skills.mjs'), 'add', bundle, '--source', 'local'], { stdio: 'inherit' });

  step('fresh session: skills reported by the init event');
  const r = sh('claude', ['-p', 'hi', '--output-format', 'stream-json', '--verbose', '--max-turns', '1'], { allowFail: true });
  const init = r.stdout.split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return {}; } }).find((d) => d.type === 'system' && d.subtype === 'init');
  if (!init) throw new Error(`no init event from claude -p\n${r.stdout.slice(0, 2000)}\n${r.stderr.slice(0, 2000)}`);
  const ours = new Set(init.plugins.filter((p) => p.source?.endsWith('@craft')).map((p) => p.name));
  const seen = init.skills.filter((s) => ours.has(s.split(':')[0])).sort();
  const expectedPath = join(REPO, 'tests', 'expected', `${bundle}.json`);
  if (update) { writeFileSync(expectedPath, JSON.stringify({ plugins: [...ours].sort(), skills: seen }, null, 2) + '\n'); console.log(`wrote ${expectedPath}`); }
  const expected = JSON.parse(readFileSync(expectedPath, 'utf8'));
  const missing = expected.skills.filter((s) => !seen.includes(s));
  const extra = seen.filter((s) => !expected.skills.includes(s));
  const plugins = [...ours].sort();
  console.log(`plugins: ${plugins.join(', ')}\nskills (${seen.length}): ${seen.join(', ')}`);
  if (missing.length || extra.length || JSON.stringify(plugins) !== JSON.stringify(expected.plugins)) {
    failed = true;
    console.error(`FAIL skill set differs from ${expectedPath}\n  missing: ${missing.join(', ') || '-'}\n  extra: ${extra.join(', ') || '-'}\n  plugins: ${plugins.join(',')} vs ${expected.plugins.join(',')}`);
  } else console.log('ok  exactly the expected skills');

  step(`skills remove ${bundle}`);
  sh('node', [join(REPO, 'cli', 'skills.mjs'), 'remove', bundle], { stdio: 'inherit' });
  const status = sh('git', ['status', '--porcelain', '--untracked-files=all']).stdout.trim();
  if (status) { failed = true; console.error(`FAIL project not clean after remove:\n${status}`); }
  else console.log('ok  git status is empty after remove');
} catch (e) {
  failed = true;
  console.error(`FAIL ${e.message}`);
} finally {
  rmSync(root, { recursive: true, force: true, maxRetries: 3 });
}
process.exit(failed ? 1 : 0);
