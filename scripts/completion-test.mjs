#!/usr/bin/env node
// Tab completion, end to end: loads each shell's script into the real shell, presses "Tab"
// (each shell's own way of asking for completions) and checks what comes back.
// Needs `skills` on PATH (CI installs it with npm i -g first). Shells that aren't installed are skipped.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { complete } from '../cli/lib/completion.mjs';

const WIN = process.platform === 'win32';
let failed = 0;
const check = (name, ok, got) => { console.log(`${ok ? '✔' : '✘'} ${name}${ok ? '' : `\n    got: ${JSON.stringify(got)}`}`); if (!ok) failed++; };
const has = (out, ...want) => want.every((w) => out.split(/\s+/).includes(w));

// 1. The completer itself, with fixed data.
const data = {
  plugins: [{ name: 'core', blurb: 'b' }, { name: 'craft-core', blurb: 'b', own: true }, { name: 'ponytail', blurb: 'b' }],
  skills: [{ name: 'deepen', plugin: 'craft-core' }, { name: 'ponytail', plugin: 'ponytail' }],
  recipes: [{ id: 'everyday', title: 't' }],
  enabled: (scope) => (scope === 'user' ? ['ponytail'] : ['core']),
};
const names = (words) => complete(words, data).map((l) => l.split('\t')[0]);
check('commands', has(names(['_']).join(' '), 'add', 'remove', 'use', 'completion'), names(['_']));
check('plugins, no skills until you type', names(['add', '_']).join(' ') === 'core craft-core ponytail', names(['add', '_']));
check('skills by prefix, no duplicates', names(['add', '_p']).join(' ') === 'ponytail', names(['add', '_p']));
check('skills by prefix', names(['add', '_de']).join(' ') === 'deepen', names(['add', '_de']));
check('one scope flag at a time', !names(['add', '--global', '_--']).includes('--local'), names(['add', '--global', '_--']));
check('flag values', names(['add', '--scope', '_']).join(' ') === 'project local user', names(['add', '--scope', '_']));
check('remove offers what is enabled in that scope', names(['remove', '--global', '_']).join(' ') === 'ponytail', names(['remove', '--global', '_']));
check('--bundle offers own plugins', names(['new-skill', 'x', '--bundle', '_']).join(' ') === 'craft-core', names(['new-skill', 'x', '--bundle', '_']));
check('use takes one scenario, then flags', names(['use', 'everyday', '_'])[0]?.startsWith('--'), names(['use', 'everyday', '_']));

// 2. Real shells.
const run = (bin, args, input) => spawnSync(bin, args, { encoding: 'utf8', input, shell: false, timeout: 60000 });
const gitBash = 'C:\\Program Files\\Git\\bin\\bash.exe';
const bash = WIN ? (existsSync(gitBash) ? gitBash : null) : 'bash'; // on Windows, plain `bash` may be WSL
const available = (bin) => bin && run(bin, ['--version']).status === 0;

if (available(bash)) {
  const r = run(bash, ['-c', `eval "$(skills completion bash)"
COMP_WORDS=(skills add cr); COMP_CWORD=2; _skills_complete; echo "\${COMPREPLY[*]}"
COMP_WORDS=(skills use ""); COMP_CWORD=2; _skills_complete; echo "\${COMPREPLY[*]}"`]);
  const [a, b] = r.stdout.trim().split('\n');
  check('bash: skills add cr<Tab>', has(a || '', 'craft-core', 'craft-web'), r.stdout + r.stderr);
  check('bash: skills use <Tab>', has(b || '', 'everyday', 'frontend'), r.stdout + r.stderr);
} else console.log('- bash not found, skipped');

if (available('zsh')) {
  // Stub _describe to print what it was handed, so this checks the script's own parsing.
  const r = run('zsh', ['-fc', `autoload -Uz compinit && compinit -u
eval "$(skills completion zsh)"
print -r -- "registered:$_comps[skills]"
_describe() { print -rl -- \${(P)\${@[-1]}} }
words=(skills add cr); CURRENT=3; _skills`]);
  check('zsh: compdef registered', r.stdout.includes('registered:_skills'), r.stdout + r.stderr);
  check('zsh: skills add cr<Tab> with descriptions', /^craft-core:\S/m.test(r.stdout) && /^craft-web:/m.test(r.stdout), r.stdout + r.stderr);
} else console.log('- zsh not found, skipped');

if (available('fish')) {
  const r = run('fish', ['-c', 'skills completion fish | source; complete -C "skills add cr"']);
  check('fish: skills add cr<Tab>', /^craft-core\t/m.test(r.stdout), r.stdout + r.stderr);
} else console.log('- fish not found, skipped');

for (const ps of WIN ? ['powershell', 'pwsh'] : ['pwsh']) {
  if (run(ps, ['-NoProfile', '-Command', '1']).status !== 0) { console.log(`- ${ps} not found, skipped`); continue; }
  const r = run(ps, ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', `skills completion powershell | Out-String | Invoke-Expression
foreach ($line in @('skills add cr', 'skills use ')) { ((TabExpansion2 -inputScript $line -cursorColumn $line.Length).CompletionMatches | ForEach-Object CompletionText) -join ' ' }`]);
  const [a, b] = r.stdout.trim().split(/\r?\n/);
  check(`${ps}: skills add cr<Tab>`, has(a || '', 'craft-core', 'craft-web'), r.stdout + r.stderr);
  check(`${ps}: skills use <Tab>`, has(b || '', 'everyday', 'frontend'), r.stdout + r.stderr);
}

if (failed) { console.error(`\n${failed} completion check${failed > 1 ? 's' : ''} failed`); process.exit(1); }
console.log('\ncompletion ok');
