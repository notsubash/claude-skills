#!/usr/bin/env node
// UserPromptSubmit hook: on the first substantial prompt of a session, ask Claude
// to deepen the request (see skills/deepen/SKILL.md) before acting on it.
// Off switches: CRAFT_DEEPEN=off (everywhere), or start a prompt with "!raw" (this session).
import { readFileSync, mkdirSync, existsSync, writeFileSync, readdirSync, statSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const MIN_CHARS = 40;
const WEEK_MS = 7 * 24 * 3600 * 1000;

const META = `Before acting on this first request of the session, deepen it. The goal is a deeper version of the task, not a bigger one.
Before rewriting it: (1) say what a top professional in this field would do here that the user isn't asking for; (2) name the rawest material they would start from instead of what has already been digested; (3) name the specific methods and tools they would use; (4) say what, other than you or the user, would show the result is right.
Then rewrite the user's prompt to ask for exactly that, as one copyable fenced block, and ask whether to run it, edit it, or keep the original. Don't start the task until the user answers.
(Injected by the craft-core plugin's deepen hook. The user turns it off with CRAFT_DEEPEN=off or a prompt starting with !raw.)`;

function main() {
  // EVAL_CRAFT_DEEPEN lets `claude plugin eval` cases (which only pass EVAL_* vars) turn it off.
  if ([process.env.CRAFT_DEEPEN, process.env.EVAL_CRAFT_DEEPEN].some((v) => (v || '').toLowerCase() === 'off')) return;
  let input;
  try { input = JSON.parse(readFileSync(0, 'utf8')); } catch { return; }
  const prompt = String(input.prompt ?? '').trim();
  const session = String(input.session_id ?? '').replace(/[^A-Za-z0-9_-]/g, '');
  if (!session) return;

  const dataArg = process.argv[2];
  const base = dataArg && !dataArg.includes('${') ? dataArg : join(tmpdir(), 'craft-core');
  const dir = join(base, 'deepen');
  mkdirSync(dir, { recursive: true });
  const marker = join(dir, session);
  if (existsSync(marker)) return;

  if (prompt.startsWith('!raw')) { writeFileSync(marker, 'raw'); return; }
  // Slash commands and short replies don't count as the first real request.
  if (prompt.startsWith('/') || prompt.length < MIN_CHARS) return;

  writeFileSync(marker, new Date().toISOString());
  prune(dir);
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: META },
  }));
}

function prune(dir) {
  const now = Date.now();
  for (const f of readdirSync(dir)) {
    try { if (now - statSync(join(dir, f)).mtimeMs > WEEK_MS) rmSync(join(dir, f)); } catch { /* best effort */ }
  }
}

try { main(); } catch { /* a hook must never break the user's prompt */ }
