#!/usr/bin/env node
// Table-driven tests for the craft-core hooks: test-guard's rules (what counts as weakening a test)
// and the hook end to end (what it prints for ask / enforce / warn / off).
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const HOOKS = join(REPO, 'plugins', 'craft-core', 'hooks');
const R = await import(new URL(`file://${join(HOOKS, 'test-rules.mjs').replace(/\\/g, '/')}`));

let failed = 0, passed = 0;
const check = (name, ok, detail = '') => { if (ok) passed++; else { failed++; console.error(`FAIL ${name}${detail ? `\n     ${detail}` : ''}`); } };
const kinds = (f) => f.map((x) => `${x.kind}:${x.level}`).sort().join(',');

// [name, path, old, new, expected kinds ('' = no findings)]
const FILES = [
  ['adds it.skip', 'src/cart.test.ts', "it('totals', () => { expect(total()).toBe(3) })", "it.skip('totals', () => { expect(total()).toBe(3) })", 'skip:weaken'],
  ['adds pytest skip', 'tests/test_cart.py', 'def test_total():\n    assert total() == 3', '@pytest.mark.skip(reason="flaky")\ndef test_total():\n    assert total() == 3', 'skip:weaken'],
  ['skipif is a conditional skip, not flagged', 'tests/test_cart.py', 'def test_win():\n    assert x', '@pytest.mark.skipif(sys.platform != "win32", reason="windows only")\ndef test_win():\n    assert x', ''],
  ['adds .only', 'src/a.spec.js', "test('a', () => expect(1).toBe(1))\ntest('b', () => expect(2).toBe(2))", "test.only('a', () => expect(1).toBe(1))\ntest('b', () => expect(2).toBe(2))", 'focus:weaken'],
  ['removes an assertion', 'tests/test_a.py', 'def test_a():\n    assert f(1) == 2\n    assert f(2) == 4', 'def test_a():\n    assert f(1) == 2', 'fewer-asserts:weaken'],
  ['deletes a test', 'pkg/a_test.go', 'func TestA(t *testing.T) {\n  if f() != 1 { t.Errorf("x") }\n}\nfunc TestB(t *testing.T) {\n  if g() != 2 { t.Errorf("y") }\n}', 'func TestA(t *testing.T) {\n  if f() != 1 { t.Errorf("x") }\n}', 'fewer-asserts:weaken,fewer-tests:weaken'],
  ['changes expected value to match output', 'src/price.test.ts', 'expect(price(10)).toBe(11)', 'expect(price(10)).toBe(12)', 'expected-changed:review'],
  ['loosens a tolerance', 'tests/test_m.py', 'assert x == pytest.approx(1.0, rel=1e-6)', 'assert x == pytest.approx(1.0, rel=1e-1)', 'tolerance:review'],
  ['swallows an error in a test', 'tests/test_io.py', 'def test_io():\n    load()\n    assert ok', 'def test_io():\n    try:\n        load()\n    except:\n        pass\n    assert ok', 'suppress:review'],
  ['adding a new test is fine', 'src/cart.test.ts', "it('a', () => { expect(a()).toBe(1) })", "it('a', () => { expect(a()).toBe(1) })\nit('b', () => { expect(b()).toBe(2) })", ''],
  ['adding an assertion is fine', 'tests/test_a.py', 'def test_a():\n    assert f(1) == 2', 'def test_a():\n    assert f(1) == 2\n    assert f(2) == 4', ''],
  ['renaming inside a test is fine', 'tests/test_a.py', 'def test_a():\n    r = f(1)\n    assert r == 2', 'def test_a():\n    result = f(1)\n    assert result == 2', 'expected-changed:review'],
  ['source files are not test files', 'src/cart.ts', 'return a + b', 'return 3', ''],
  ['jest ignores a test path', 'jest.config.js', 'module.exports = { testEnvironment: "node" }', 'module.exports = { testEnvironment: "node",\n testPathIgnorePatterns: ["/cart/"] }', 'config:weaken'],
  ['coverage threshold lowered', 'pyproject.toml', '[tool.coverage.report]\nfail_under = 90', '[tool.coverage.report]\nfail_under = 60', 'coverage:weaken'],
  ['coverage threshold raised is fine', 'pyproject.toml', 'fail_under = 60', 'fail_under = 90', ''],
  ['CI step allowed to fail', '.github/workflows/ci.yml', '      - run: npm test', '      - run: npm test\n        continue-on-error: true', 'config:weaken'],
  ['CI masks exit code', '.github/workflows/ci.yml', '      - run: npm test', '      - run: npm test || true', 'config:weaken'],
  ['passWithNoTests in package.json', 'package.json', '"test": "jest"', '"test": "jest --passWithNoTests"', 'config:weaken'],
  ['test script changed', 'package.json', '"test": "jest"', '"test": "jest --runInBand"', 'config:review'],
  ['unrelated package.json change', 'package.json', '"version": "1.0.0"', '"version": "1.0.1"', ''],
];
for (const [name, path, o, n, want] of FILES) {
  const got = kinds(R.compareFile(path, o, n));
  check(`file: ${name}`, got === want, `expected [${want}] got [${got}]`);
}

const CMDS = [
  ['rm a test file', 'rm tests/test_cart.py', 'delete:weaken'],
  ['git rm a test', 'git rm -q src/cart.test.ts', 'delete:weaken'],
  ['Remove-Item a test (PowerShell)', 'Remove-Item src\\cart.test.ts -Force', 'delete:weaken'],
  ['rename test to .bak', 'mv tests/test_cart.py tests/test_cart.py.bak', 'rename:weaken'],
  ['move test out of the test tree', 'git mv tests/test_cart.py scratch.py', 'rename:weaken'],
  ['rename a test to another test is fine', 'git mv tests/test_cart.py tests/test_basket.py', ''],
  ['mask test failure with || true', 'npm test || true', 'mask:weaken'],
  ['mask with ; exit 0', 'pytest -q; exit 0', 'mask:weaken'],
  ['PowerShell reset exit code', 'npx vitest run; $global:LASTEXITCODE = 0', 'mask:weaken'],
  ['commit --no-verify', 'git commit --no-verify -m "wip"', 'no-verify:weaken'],
  ['commit -n', 'git commit -n -m wip', 'no-verify:weaken'],
  ['sed -i on a test', "sed -i 's/toBe(3)/toBe(4)/' src/cart.test.ts", 'shell-edit:review'],
  ['redirect into a test file', 'echo "" > tests/test_cart.py', 'shell-edit:review'],
  ['plain test run is fine', 'npm test -- --watch=false', ''],
  ['running one test file is fine', 'pytest tests/test_cart.py -k total', ''],
  ['rm of a build dir is fine', 'rm -rf dist node_modules/.cache', ''],
  ['|| true on a non-test command is fine', 'mkdir -p out || true', ''],
  ['git commit -m with "-n" in message is fine', 'git commit -m "add -n flag docs"', ''],
  ['push guard words are fine', 'git push -u origin feat/x', ''],
];
for (const [name, cmd, want] of CMDS) {
  const got = kinds(R.analyzeCommand(cmd));
  check(`cmd: ${name}`, got === want, `expected [${want}] got [${got}]`);
}

check('source suppression: ts-ignore', kinds(R.sourceSuppressions(['// @ts-ignore'])) === 'suppress:review');
check('source suppression: plain code is fine', kinds(R.sourceSuppressions(['const x = 1'])) === '');

// End to end: run the hook as Claude Code would, with JSON on stdin.
const tmp = mkdtempSync(join(tmpdir(), 'craft-hook-'));
const run = (input, mode) => {
  const env = { ...process.env }; if (mode) env.CRAFT_TEST_GUARD = mode; else delete env.CRAFT_TEST_GUARD;
  const r = spawnSync(process.execPath, [join(HOOKS, 'test-guard.mjs')], { input: JSON.stringify({ cwd: tmp, ...input }), env, encoding: 'utf8' });
  return { code: r.status, out: r.stdout ? JSON.parse(r.stdout) : null };
};
const skipEdit = { tool_name: 'Edit', tool_input: { file_path: 'src/a.test.ts', old_string: "it('a', () => expect(1).toBe(1))", new_string: "it.skip('a', () => expect(1).toBe(1))" } };
let r = run(skipEdit);
check('hook: default mode asks on a skip', r.code === 0 && r.out?.hookSpecificOutput?.permissionDecision === 'ask');
r = run(skipEdit, 'enforce');
check('hook: enforce denies', r.out?.hookSpecificOutput?.permissionDecision === 'deny');
r = run(skipEdit, 'warn');
check('hook: warn only adds context', r.out && !r.out.hookSpecificOutput.permissionDecision && /test guard/.test(r.out.hookSpecificOutput.additionalContext));
r = run(skipEdit, 'off');
check('hook: off prints nothing', r.code === 0 && r.out === null);
r = run({ tool_name: 'Edit', tool_input: { file_path: 'src/a.test.ts', old_string: 'expect(f()).toBe(1)', new_string: 'expect(f()).toBe(2)' } });
check('hook: changed expected value is let through with context', r.out && !r.out.hookSpecificOutput.permissionDecision && /say so in your reply/.test(r.out.hookSpecificOutput.additionalContext));
r = run({ tool_name: 'Edit', tool_input: { file_path: 'src/a.ts', old_string: 'a', new_string: 'b' } });
check('hook: source edit is silent', r.out === null);
r = run({ tool_name: 'Bash', tool_input: { command: 'npm test || true' } });
check('hook: masked test run asks', r.out?.hookSpecificOutput?.permissionDecision === 'ask');
writeFileSync(join(tmp, 'b.test.js'), "test('a', () => { expect(1).toBe(1); expect(2).toBe(2) })\n");
r = run({ tool_name: 'Write', tool_input: { file_path: 'b.test.js', content: "test('a', () => { expect(1).toBe(1) })\n" } });
check('hook: Write that drops an assertion asks', r.out?.hookSpecificOutput?.permissionDecision === 'ask');
r = run({ tool_name: 'Write', tool_input: { file_path: 'new.test.js', content: "test.skip('a', () => {})\n" } });
check('hook: Write of a new file is not compared', r.out === null);
const bad = spawnSync(process.execPath, [join(HOOKS, 'test-guard.mjs')], { input: 'not json', encoding: 'utf8' });
check('hook: bad input fails open', bad.status === 0 && bad.stdout === '');
rmSync(tmp, { recursive: true, force: true });

// Push guard, end to end in a throwaway repo: warn mode speaks only when the branch touches sensitive files.
const repo = mkdtempSync(join(tmpdir(), 'push-guard-'));
const g = (...args) => spawnSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', '-c', 'commit.gpgsign=false', ...args], { cwd: repo, encoding: 'utf8' });
const commit = (file, msg) => { writeFileSync(join(repo, file), msg); g('add', '-A'); g('commit', '-qm', msg); };
g('init', '-q', '-b', 'main');
commit('README.md', 'init');
g('switch', '-qc', 'feat');
const push = (mode) => {
  const env = { ...process.env, CRAFT_SECURITY_GATE: mode || '' };
  if (!mode) delete env.CRAFT_SECURITY_GATE;
  const r = spawnSync(process.execPath, [join(HOOKS, 'push-guard.mjs')], { input: JSON.stringify({ cwd: repo, tool_input: { command: 'git push -u origin feat' } }), env, encoding: 'utf8' });
  return r.stdout ? JSON.parse(r.stdout) : null;
};
commit('docs.md', 'docs only');
check('push guard: docs-only branch is silent in warn mode', push() === null);
check('push guard: enforce still blocks a docs-only branch', push('enforce')?.hookSpecificOutput?.permissionDecision === 'deny');
commit('package.json', '{}');
check('push guard: a manifest change warns', /No security clearance/.test(push()?.systemMessage || ''));
check('push guard: off is silent', push('off') === null);
rmSync(repo, { recursive: true, force: true });

if (failed) { console.error(`\n${failed} failed, ${passed} passed`); process.exit(1); }
console.log(`ok  ${passed} hook checks`);
