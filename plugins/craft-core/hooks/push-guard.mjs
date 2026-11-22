#!/usr/bin/env node
// PreToolUse hook: before `git push` or `gh pr create`, check that the security gate
// cleared the current HEAD (.claude/security-gate/<sha12>.md).
// CRAFT_SECURITY_GATE=warn (default) warns only when the branch touches sensitive files,
// =enforce blocks any push without a clearance, =off does nothing.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const SHIP = /(^|[\s;&|(])(git\s+push|gh\s+pr\s+create)\b/;

// Changes to these paths are worth a clearance: secrets, auth and input-handling code,
// dependency manifests and lockfiles, CI and infra.
const SENSITIVE = [
  /(^|\/)\.env(\.|$)/,
  /\.(pem|key|p12|pfx)$/i,
  /(auth|login|session|oauth|jwt|token|passw|secret|credential|crypto|permission|rbac|cors|csp|webhook|upload|middleware)/i,
  /(^|\/)(package(-lock)?\.json|npm-shrinkwrap\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml|yarn\.lock|\.yarnrc\.yml|\.npmrc|bun\.lockb?|bunfig\.toml|requirements[^/]*\.txt|pyproject\.toml|poetry\.lock|uv\.lock|Pipfile(\.lock)?|go\.(mod|sum)|Cargo\.(toml|lock)|Gemfile(\.lock)?|composer\.(json|lock)|pom\.xml|build\.gradle(\.kts)?)$/,
  /(^|\/)\.github\/workflows\//,
  /(^|\/)\.gitlab-ci\.yml$/,
  /(^|\/)Dockerfile[^/]*$/,
  /(^|\/)docker-compose[^/]*\.ya?ml$/,
  /\.tf$/,
];

// True when the branch (since it left the default branch) touches a sensitive path.
// If the base can't be found, assume it does: better a spare warning than a silent miss.
function touchesSensitive(cwd) {
  let base = null;
  for (const ref of ['origin/HEAD', 'main', 'master']) {
    try { base = git(['merge-base', 'HEAD', ref], cwd); break; } catch { /* try the next */ }
  }
  if (!base) return true;
  let files;
  try { files = git(['diff', '--name-only', `${base}...HEAD`], cwd).split('\n').filter(Boolean); } catch { return true; }
  return files.some((f) => SENSITIVE.some((re) => re.test(f)));
}

function main() {
  const mode = (process.env.CRAFT_SECURITY_GATE || 'warn').toLowerCase();
  if (mode === 'off') return;
  let input;
  try { input = JSON.parse(readFileSync(0, 'utf8')); } catch { return; }
  const command = String(input?.tool_input?.command ?? '');
  if (!SHIP.test(command)) return;

  const cwd = input.cwd || process.cwd();
  let root, sha;
  try {
    root = git(['rev-parse', '--show-toplevel'], cwd);
    sha = git(['rev-parse', '--short=12', 'HEAD'], cwd);
  } catch { return; } // not a git repo: nothing to guard
  if (mode !== 'enforce' && !touchesSensitive(cwd)) return;

  const report = join(root, '.claude', 'security-gate', `${sha}.md`);
  let problem = null;
  if (!existsSync(report)) {
    problem = `No security clearance for HEAD ${sha}. Run the security-gate skill first.`;
  } else {
    const verdict = (readFileSync(report, 'utf8').match(/^Verdict:\s*(.+)$/m)?.[1] ?? '').trim();
    if (!verdict.startsWith('CLEARED')) problem = `Security gate verdict for ${sha} is "${verdict || 'missing'}". Fix the findings and re-run security-gate.`;
  }
  if (!problem) return;

  const out = mode === 'enforce'
    ? { hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: problem } }
    : { systemMessage: `craft security gate: ${problem}`, hookSpecificOutput: { hookEventName: 'PreToolUse', additionalContext: `${problem} (warn mode: the push is allowed; tell the user.)` } };
  process.stdout.write(JSON.stringify(out));
}

function git(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
}

try { main(); } catch { /* never break the user's command on a hook bug */ }
