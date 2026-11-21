#!/usr/bin/env node
// PreToolUse hook: catch edits and commands that make tests weaker instead of making code right.
// Skips, .only, deleted tests or assertions, excluded tests or lowered coverage in config, a test
// run whose exit code is thrown away, --no-verify. Rules live in test-rules.mjs.
//
// CRAFT_TEST_GUARD=ask (default): a weakening change asks the user first; a change worth a look
//   (an assertion's expected value changed, an error swallowed) is let through, but Claude is told
//   to say so in its reply.
// =enforce blocks weakening changes. =warn only tells Claude. =off does nothing.
import { readFileSync, existsSync, statSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { compareFile, analyzeCommand, isTestFile, isTestConfig } from './test-rules.mjs';

const MAX_BYTES = 2 * 1024 * 1024;

function findings(input) {
  const t = input.tool_input || {};
  const name = input.tool_name;
  if (name === 'Bash' || name === 'PowerShell') return analyzeCommand(t.command);
  const path = t.file_path || t.path || '';
  if (!path || !(isTestFile(path) || isTestConfig(path))) return [];
  if (name === 'Edit') return compareFile(path, t.old_string, t.new_string);
  if (name === 'MultiEdit') return (t.edits || []).flatMap((e) => compareFile(path, e.old_string, e.new_string));
  if (name === 'Write') {
    const abs = isAbsolute(path) ? path : join(input.cwd || process.cwd(), path);
    if (!existsSync(abs) || statSync(abs).size > MAX_BYTES) return [];
    return compareFile(path, readFileSync(abs, 'utf8'), t.content);
  }
  return [];
}

function main() {
  const mode = (process.env.CRAFT_TEST_GUARD || 'ask').toLowerCase();
  if (mode === 'off') return;
  let input;
  try { input = JSON.parse(readFileSync(0, 'utf8')); } catch { return; }
  const f = findings(input);
  if (!f.length) return;

  const weaken = f.filter((x) => x.level === 'weaken');
  const where = input.tool_input?.file_path ? ` in ${input.tool_input.file_path}` : '';
  const list = f.map((x) => `- ${x.msg}`).join('\n');
  const rule = 'Tests verify the code; they don\'t define it. Never weaken, skip or delete a test, or hide a failure, to get a pass. If a test is wrong, tell the user which one and why, and get their OK first. Don\'t special-case test inputs in the code.';
  const context = `craft test guard: this change${where}\n${list}\n${rule}${weaken.length ? '' : ' If this change is intended, say so in your reply to the user and give the reason.'}`;
  const hso = (extra) => ({ hookSpecificOutput: { hookEventName: 'PreToolUse', additionalContext: context, ...extra } });

  let out;
  if (!weaken.length || mode === 'warn') out = hso({});
  else if (mode === 'enforce') out = hso({ permissionDecision: 'deny', permissionDecisionReason: `Test guard blocked a change that weakens tests${where}:\n${list}\nFix the code instead, or ask the user to approve changing the test (CRAFT_TEST_GUARD=ask).` });
  else out = hso({ permissionDecision: 'ask', permissionDecisionReason: `Test guard: this weakens tests${where}:\n${list}\nApprove only if the test itself is wrong.` });
  process.stdout.write(JSON.stringify(out));
}

try { main(); } catch { /* never break the user's tool call on a hook bug */ }
