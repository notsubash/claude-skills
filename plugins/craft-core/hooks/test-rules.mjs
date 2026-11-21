// Rules for spotting changes that make tests weaker rather than code better.
// Shared by the test-guard hook (one edit at a time) and check-test-diff.mjs (a whole diff).
// Pure functions, no I/O, so they're cheap to run on every tool call and easy to unit test.

const norm = (p) => String(p || '').replace(/\\/g, '/');

const TEST_FILE = /(^|\/)(tests?|__tests__|specs?|e2e|integration-tests?)\/|(^|\/)test_[^/]+\.py$|_test\.(py|go|rb|exs?)$|\.(test|spec)\.[cm]?[jt]sx?$|_spec\.rb$|(Tests?|Spec|IT)\.(java|kt|cs|scala|swift)$|(^|\/)Test[A-Z][^/]*\.(java|kt|cs)$/i;
const TEST_CONFIG = /(^|\/)(jest|vitest|playwright|karma|cypress|mocha|ava|wdio)\.config\.[cm]?[jt]s$|(^|\/)\.mocharc(\.\w+)?$|(^|\/)(pytest\.ini|tox\.ini|setup\.cfg|pyproject\.toml|conftest\.py|\.coveragerc|codecov\.ya?ml|\.nycrc(\.json)?|phpunit\.xml(\.dist)?|Makefile|justfile|\.gitlab-ci\.ya?ml|package\.json)$|(^|\/)\.github\/workflows\/[^/]+\.ya?ml$|(^|\/)\.husky\//i;

export const isTestFile = (p) => TEST_FILE.test(norm(p));
export const isTestConfig = (p) => TEST_CONFIG.test(norm(p));

const SKIP = [
  /@pytest\.mark\.(?:skip|xfail)\b/, /\bpytest\.(?:skip|xfail)\s*\(/, /@unittest\.skip\b/, /\bself\.skipTest\s*\(/,
  /\b(?:it|test|describe|context|suite)\.(?:skip|todo)\s*\(/, /\bx(?:it|test|describe|context)\s*\(/,
  /@(?:Disabled|Ignore)\b/, /\bt\.Skip(?:Now|f)?\s*\(/, /#\[ignore\]/, /\[Ignore\]/, /Skip\s*=\s*"/,
  /^\s*(?:skip|pending)\b\s*(?:["'(]|$)/,
];
const FOCUS = [/\b(?:it|test|describe|context|suite)\.only\s*\(/, /\bf(?:it|describe)\s*\(/];
const ASSERT = /\bassert\w*!?\s*[(\s]|\bexpect\s*\(|\.should\b|\b(?:require|assert)\.\w+\s*\(|\bt\.(?:Errorf?|Fatalf?|Fail(?:Now)?)\s*\(|\bXCTAssert\w*\s*\(|\bself\.assert\w+\s*\(/g;
const TEST_DEF = /^\s*(?:async\s+)?def\s+test\w*\s*\(|^\s*[xf]?(?:it|test)(?:\.(?:skip|only|todo|concurrent|failing|each\([^)]*\)))*\s*\(|^\s*func\s+Test\w*\s*\(|@Test\b|#\[test\]|^\s*\[(?:Fact|Theory|Test)\b/gm;
const TOLERANCE = /\b(?:approx|rtol|atol|rel_tol|abs_tol|delta|places|toBeCloseTo|assertAlmostEqual|InDelta|InEpsilon|tolerance|epsilon)\b/;
const COVERAGE_KEY = /\b(?:fail_under|fail-under|coverageThreshold|branches|functions|lines|statements|minimum_coverage|min_coverage|threshold)\b/;
const CONFIG_WEAKEN = [
  [/testPathIgnorePatterns|coveragePathIgnorePatterns|modulePathIgnorePatterns|testIgnore|exclude[s]?\b|--ignore\b|--deselect\b|-k\s+["']?not\b|norecursedirs|collect_ignore/, 'excludes tests from the run'],
  [/passWithNoTests|--pass-with-no-tests/, 'lets the suite pass with no tests'],
  [/continue-on-error:\s*true/, 'lets CI continue past a failing step'],
  [/\|\|\s*(?:true\b|exit\s+0\b|:(?=\s|$|["'])|\$\?)|;\s*exit\s+0\b/, 'masks a failing exit code'],
  [/--no-verify\b/, 'skips git hooks'],
  [/\bif:\s*false\b|\bwhen:\s*never\b/, 'disables a CI job'],
];
const SUPPRESS = [
  [/^\s*except(?:\s+\w[\w.]*(?:\s+as\s+\w+)?)?\s*:\s*(?:pass|\.\.\.)?\s*$/, 'swallows an exception'],
  [/catch\s*(?:\([^)]*\))?\s*\{\s*\}/, 'empty catch block'],
  [/@ts-ignore|@ts-expect-error|@ts-nocheck/, 'turns off a type error'],
  [/eslint-disable|biome-ignore|# ?noqa\b|# ?type:\s*ignore|# ?pragma:\s*no cover|istanbul ignore|c8 ignore|#\[allow\(|@SuppressWarnings|nolint/, 'silences a linter or coverage'],
];

const count = (text, re) => (String(text).match(re) || []).length;
const countAny = (text, list) => String(text).split('\n').reduce((n, l) => n + (list.some((r) => r.test(l)) ? 1 : 0), 0);
const lines = (t) => String(t || '').split('\n').map((l) => l.trim()).filter(Boolean);
const diffLines = (oldText, newText) => {
  const o = lines(oldText), n = lines(newText);
  const os = new Set(o), ns = new Set(n);
  return { removed: o.filter((l) => !ns.has(l)), added: n.filter((l) => !os.has(l)) };
};
const nums = (s) => (s.match(/-?\d+(?:\.\d+)?(?:e-?\d+)?/gi) || []).map(Number);

// A finding: { kind, level: 'weaken' | 'review', msg }. 'weaken' makes a test weaker or hides a failure;
// 'review' is a change a human should look at (it's often legitimate).
export function compareTest(oldText, newText) {
  const f = [];
  const add = (kind, level, msg) => f.push({ kind, level, msg });
  const o = String(oldText || ''), n = String(newText || '');
  const skipD = countAny(n, SKIP) - countAny(o, SKIP);
  if (skipD > 0) add('skip', 'weaken', `adds ${skipD} skip/xfail/disabled marker${skipD > 1 ? 's' : ''}`);
  const focusD = countAny(n, FOCUS) - countAny(o, FOCUS);
  if (focusD > 0) add('focus', 'weaken', 'adds .only / fit / fdescribe, so the rest of the suite stops running');
  const defD = count(n, TEST_DEF) - count(o, TEST_DEF);
  if (defD < 0) add('fewer-tests', 'weaken', `removes ${-defD} test${defD < -1 ? 's' : ''}`);
  const asD = count(n, ASSERT) - count(o, ASSERT);
  if (asD < 0) add('fewer-asserts', 'weaken', `removes ${-asD} assertion${asD < -1 ? 's' : ''}`);
  const { removed, added } = diffLines(o, n);
  // Compare only the assertion part of each line, so `it(` → `it.skip(` on the same line isn't
  // read as a changed expected value.
  const frag = (l) => { const m = new RegExp(ASSERT.source).exec(l); return m ? l.slice(m.index) : null; };
  const oF = new Set(lines(o).map(frag).filter(Boolean)), nF = new Set(lines(n).map(frag).filter(Boolean));
  const rA = [...oF].filter((x) => !nF.has(x)), aA = [...nF].filter((x) => !oF.has(x));
  if (rA.length && aA.length) {
    const tol = rA.some((l) => TOLERANCE.test(l)) && aA.some((l) => TOLERANCE.test(l));
    add(tol ? 'tolerance' : 'expected-changed', 'review', tol
      ? `changes a tolerance: "${rA[0].slice(0, 80)}" → "${aA[0].slice(0, 80)}"`
      : `changes an existing assertion: "${rA[0].slice(0, 80)}" → "${aA[0].slice(0, 80)}". Was the test wrong, or is the code?`);
  }
  for (const l of added) for (const [re, why] of SUPPRESS) if (re.test(l)) { add('suppress', 'review', `${why}: "${l.slice(0, 80)}"`); break; }
  return f;
}

export function compareConfig(oldText, newText) {
  const f = [];
  const { removed, added } = diffLines(oldText, newText);
  for (const l of added) for (const [re, why] of CONFIG_WEAKEN) if (re.test(l)) { f.push({ kind: 'config', level: 'weaken', msg: `${why}: "${l.slice(0, 80)}"` }); break; }
  for (const r of removed.filter((l) => COVERAGE_KEY.test(l))) {
    const key = r.match(COVERAGE_KEY)[0];
    const a = added.find((l) => l.includes(key));
    const before = nums(r), after = a ? nums(a) : [];
    if (!a) f.push({ kind: 'coverage', level: 'weaken', msg: `removes a coverage threshold: "${r.slice(0, 80)}"` });
    else if (before.length && after.length && Math.max(...after) < Math.max(...before)) f.push({ kind: 'coverage', level: 'weaken', msg: `lowers a coverage threshold: "${r.slice(0, 60)}" → "${a.slice(0, 60)}"` });
  }
  const scriptRe = /"(?:test|test:\w+|pretest|coverage)"\s*:/;
  const rS = removed.filter((l) => scriptRe.test(l)), aS = added.filter((l) => scriptRe.test(l));
  if (rS.length && aS.length && !f.length) f.push({ kind: 'config', level: 'review', msg: `changes the test script: "${rS[0].slice(0, 60)}" → "${aS[0].slice(0, 60)}"` });
  return f;
}

export function compareFile(path, oldText, newText) {
  if (isTestFile(path)) return compareTest(oldText, newText);
  if (isTestConfig(path)) return compareConfig(oldText, newText);
  return [];
}

// Suppressions added to source code (not tests): often how a failing check gets "fixed".
export function sourceSuppressions(addedLines) {
  const f = [];
  for (const l of addedLines) for (const [re, why] of SUPPRESS) if (re.test(l)) { f.push({ kind: 'suppress', level: 'review', msg: `${why}: "${l.trim().slice(0, 80)}"` }); break; }
  return f;
}

const RUNNER = /\b(?:npm\s+(?:run\s+)?test|pnpm\s+(?:run\s+)?test|yarn\s+(?:run\s+)?test|bun\s+test|npx\s+(?:jest|vitest|playwright)|jest|vitest|pytest|python\s+-m\s+(?:pytest|unittest)|go\s+test|cargo\s+test|mvn\s+\S*test|gradlew?\s+\S*test|dotnet\s+test|rspec|phpunit|node\s+--test|make\s+(?:test|check)|tox|nox)\b/;
const MASK = /\|\|\s*(?:true\b|exit\s+0\b|:(?=\s|$))|;\s*(?:true|exit\s+0)\s*$|;\s*\$global:LASTEXITCODE\s*=\s*0|\$LASTEXITCODE\s*=\s*0/i;
const DELETE = /^(?:rm|unlink|del|erase|rmdir|shred|trash|remove-item|ri)$/i;
const MOVE = /^(?:mv|move|move-item|mi|ren|rename|rename-item)$/i;
const DISABLED_NAME = /\.(?:bak|old|orig|disabled|skip|skipped|ignore|tmp)$|~$|(^|\/)(?:tmp|temp)\/|^\/dev\/null$/i;

// Shell commands: deleting or renaming away tests, writing test files around the editor,
// masking a failing test run, skipping git hooks.
export function analyzeCommand(command) {
  const f = [];
  const cmd = String(command || '');
  const bare = cmd.replace(/"(?:[^"\\]|\\.)*"|'[^']*'/g, '""'); // quoted text (a commit message) can't be a flag
  const add = (kind, level, msg) => { if (!f.some((x) => x.kind === kind)) f.push({ kind, level, msg }); };
  if (/\bgit\s+(?:-\S+\s+)*(?:commit|push|merge|rebase)\b[^;&|]*(?:--no-verify\b|\s-n\b)/.test(bare)) add('no-verify', 'weaken', '--no-verify skips the repo\'s git hooks (often the test or lint gate)');
  for (const seg of cmd.split(/&&|\|\||;|\n/)) {
    const words = seg.trim().replace(/^(?:sudo|command|env(?:\s+\w+=\S+)*)\s+/, '').split(/\s+/).filter(Boolean);
    const verb = (words[0] || '').toLowerCase();
    const args = words.slice(1).filter((w) => !w.startsWith('-')).map((w) => w.replace(/^["']|["']$/g, ''));
    const gitVerb = verb === 'git' ? (words[1] || '') : '';
    if ((DELETE.test(verb) || gitVerb === 'rm') && args.some(isTestFile)) add('delete', 'weaken', `deletes a test file: ${seg.trim().slice(0, 80)}`);
    if ((MOVE.test(verb) || gitVerb === 'mv')) {
      const a = gitVerb ? args.slice(1) : args;
      if (a.length >= 2 && isTestFile(a[0]) && (DISABLED_NAME.test(a[a.length - 1]) || !isTestFile(a[a.length - 1]))) add('rename', 'weaken', `moves a test out of the suite: ${seg.trim().slice(0, 80)}`);
    }
    if (/\b(?:sed|perl|ruby)\b.*\s-(?:i|pi)\b/.test(seg) && args.some(isTestFile)) add('shell-edit', 'review', `edits a test file with ${verb}; use Edit so the change can be checked`);
    const redirect = seg.match(/>{1,2}\s*["']?([^\s"'|;&]+)/)?.[1] || (/\b(?:set-content|add-content|out-file|tee)\b/i.test(seg) ? args.find(isTestFile) : null);
    if (redirect && isTestFile(redirect)) add('shell-edit', 'review', `writes a test file from the shell (${redirect}); use Edit or Write so the change can be checked`);
  }
  if (RUNNER.test(cmd) && MASK.test(cmd)) add('mask', 'weaken', 'runs the tests but throws away the exit code, so a failure looks like a pass');
  return f;
}
