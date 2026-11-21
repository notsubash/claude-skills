#!/usr/bin/env node
// Fixture tests for the checker scripts that skills run as their verify step:
// check-adrs.mjs, check-postmortem.mjs, check-test-diff.mjs. Each gets a good input (exit 0)
// and a bad one (exit 1, with the expected problems named).
import { spawnSync, execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const S = (p) => join(REPO, 'plugins', p);
const ADRS = S('craft-core/skills/architecture-decisions/scripts/check-adrs.mjs');
const PM = S('ops/skills/incident-response/scripts/check-postmortem.mjs');
const DIFF = S('craft-core/skills/test-integrity/scripts/check-test-diff.mjs');

let failed = 0, passed = 0;
const tmp = mkdtempSync(join(tmpdir(), 'craft-scripts-'));
const write = (p, s) => { mkdirSync(dirname(join(tmp, p)), { recursive: true }); writeFileSync(join(tmp, p), s); };
const run = (script, args, cwd = tmp) => { const r = spawnSync(process.execPath, [script, ...args], { cwd, encoding: 'utf8' }); return { code: r.status, out: r.stdout + r.stderr }; };
const expect = (name, r, code, mustInclude = []) => {
  const miss = mustInclude.filter((s) => !r.out.includes(s));
  if (r.code === code && !miss.length) passed++;
  else { failed++; console.error(`FAIL ${name}: exit ${r.code} (want ${code})${miss.length ? `, missing: ${miss.join(' | ')}` : ''}\n${r.out.trim().split('\n').map((l) => `     ${l}`).join('\n')}`); }
};

// check-adrs
write('good/0001-record-decisions.md', '# 1. Record decisions\n\n- Status: Superseded by [0002](0002-use-madr.md)\n');
write('good/0002-use-madr.md', '---\nstatus: accepted\n---\n# 2. Use MADR\n\nSupersedes [0001](0001-record-decisions.md).\n');
write('good/README.md', '| # | D |\n|---|---|\n| [0001](0001-record-decisions.md) | a |\n| [0002](0002-use-madr.md) | b |\n');
expect('check-adrs: good folder', run(ADRS, ['good']), 0, ['2 ADRs']);
write('bad/0001-a.md', '# A\n\nStatus: Done\n');
write('bad/0002-b.md', '# B\n\n## Status\n\nSuperseded by 0009\n\n[x](missing.md)\n');
write('bad/0002-c.md', '# C\nStatus: Accepted\n');
write('bad/3-bad.md', 'no title\n');
write('bad/README.md', '[0001](0001-a.md) [0007](0007-gone.md)\n');
expect('check-adrs: bad folder', run(ADRS, ['bad']), 1, ['also used by', 'NNNN-kebab', 'not one of', "doesn't exist", 'broken link', "doesn't list 0002-b.md", 'lists 0007-gone.md']);

// check-postmortem
const GOOD_PM = `# 2026-11-20: Checkout failed for 38% of users for 47 minutes

- Status: Draft

## Summary

Checkout returned errors after deploy v143. We rolled back.

## Impact

- Users affected: 38% of checkout attempts

## Detection and response

- Time to detect: 22 min, by a customer report
- Time to mitigate: 25 min

## Timeline (UTC)

| Time | Event | Source |
|---|---|---|
| 10:02 | Deploy v143 starts | log |
| 10:04 | First 5xx | graph |
| 10:26 | Ticket arrives | ticket |
| 10:51 | Rollback complete | log |

## Causes

- Trigger: deploy v143. Root cause: config with no schema validation.

## What went well

- Rollback took 3 minutes.

## Action items

| # | Action | Type | Owner | Priority | Due | Ticket |
|---|---|---|---|---|---|---|
| 1 | CI rejects a config missing the region key | prevent | Asha | P1 | 2026-11-28 | https://x/1 |
| 2 | Page on checkout 5xx above 2% for 5 min | detect | Ben | P0 | 2026-11-25 | https://x/2 |
`;
write('pm-good.md', GOOD_PM);
expect('check-postmortem: good', run(PM, ['pm-good.md']), 0, ['2 action items']);
write('pm-bad.md', GOOD_PM
  .replace('| detect | Ben | P0 | 2026-11-25 | https://x/2 |', '| process | team | P0 | soon | TBD |')
  .replace('We rolled back.', 'Ravi should have checked; human error.')
  .replace('- Time to mitigate: 25 min', '')
  .replace('| 1 | CI rejects a config missing the region key', '| 1 | Improve monitoring')
  .replace('- Rollback took 3 minutes.', '') + '\n- <something>\n');
expect('check-postmortem: bad', run(PM, ['pm-bad.md']), 1, ['"what went well" is empty', 'time to mitigate', 'too vague', 'named owner', 'due date', 'ticket link', 'no action item has type "detect"', 'blame or hindsight', 'placeholders left: <something>']);

// check-test-diff, in a throwaway git repo
const g = join(tmp, 'repo');
mkdirSync(join(g, 'src'), { recursive: true }); mkdirSync(join(g, 'tests'), { recursive: true });
const git = (...a) => execFileSync('git', a, { cwd: g, stdio: 'ignore' });
git('init', '-q', '-b', 'main'); git('config', 'user.email', 't@t'); git('config', 'user.name', 't'); git('config', 'core.autocrlf', 'false');
writeFileSync(join(g, 'src/price.py'), 'def price(x):\n    return x * 1.1\n');
writeFileSync(join(g, 'tests/test_price.py'), 'def test_price():\n    assert price(10) == 11\n    assert price(0) == 0\n\ndef test_name():\n    assert label("premium-gold") == "Gold"\n');
writeFileSync(join(g, 'tests/test_old.py'), 'def test_old():\n    assert True\n');
writeFileSync(join(g, 'pyproject.toml'), '[tool.coverage.report]\nfail_under = 90\n');
git('add', '-A'); git('commit', '-qm', 'base'); git('checkout', '-qb', 'feat');
writeFileSync(join(g, 'tests/test_price.py'), 'def test_price():\n    assert price(10) == 11\n    assert price(0) == 0\n    assert price(5) == 5.5\n\ndef test_name():\n    assert label("premium-gold") == "Gold"\n');
expect('check-test-diff: a stronger test passes', run(DIFF, [], g), 0, ['no weakened tests']);
writeFileSync(join(g, 'tests/test_price.py'), 'def test_price():\n    assert price(10) == 12\n\n@pytest.mark.skip\ndef test_name():\n    assert label("premium-gold") == "Gold"\n');
writeFileSync(join(g, 'src/price.py'), 'def price(x):\n    try:\n        return x * 1.1\n    except:\n        pass\n\ndef label(s):\n    if s == "premium-gold": return "Gold"\n');
git('rm', '-q', 'tests/test_old.py');
writeFileSync(join(g, 'pyproject.toml'), '[tool.coverage.report]\nfail_under = 50\n');
expect('check-test-diff: a weakened branch fails', run(DIFF, [], g), 1, ['lowers a coverage threshold', 'test file deleted', 'skip/xfail', 'removes 1 assertion', 'changes an existing assertion', 'swallows an exception', 'premium-gold']);

rmSync(tmp, { recursive: true, force: true });
if (failed) { console.error(`\n${failed} failed, ${passed} passed`); process.exit(1); }
console.log(`ok  ${passed} checker-script fixtures`);
