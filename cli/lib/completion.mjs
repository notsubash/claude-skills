// Tab completion. Each shell's script is a thin hook that calls back into the CLI:
//   skills __complete <words before the cursor...> _<word under the cursor>
// The current word is always sent with a leading "_" because Windows PowerShell 5.1 drops empty
// arguments to native commands. The CLI prints one candidate per line as "value<TAB>description",
// so plugin, skill and scenario names come from the marketplace at Tab time and never go stale.
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';

export const SHELLS = ['bash', 'zsh', 'fish', 'powershell'];

const SCOPE = { '--global': 'every project on this machine', '--local': 'this project, just me', '--shared': 'this project, committed', '--scope': 'project, local or user' };
const DIR = { '--dir': 'act on another folder' };
const INSTALL = { '--source': 'github, local or a PATH', '--no-safeguards': 'skip third-party safeguards', '--yes': 'don\'t ask' };

// name: [description, flags, positional kind, how many positionals (Infinity = many)]
const COMMANDS = {
  add: ['install a plugin, bundle or skill', { ...SCOPE, ...DIR, ...INSTALL, '--accept-impeccable': 'allow impeccable\'s binary hooks' }, 'installable', Infinity],
  remove: ['uninstall and prune unused deps', { ...SCOPE, ...DIR, '--yes': 'don\'t ask' }, 'enabled', Infinity],
  use: ['install a scenario recipe', { ...SCOPE, ...DIR, ...INSTALL }, 'recipe', 1],
  list: ['everything, with what\'s enabled where', DIR, null, 0],
  info: ['skills, hooks, safeguards, pin', {}, 'installable', 1],
  doctor: ['check tools, settings, downloads', DIR, null, 0],
  sync: ['download what this project enables', { ...DIR, '--source': INSTALL['--source'], '--no-safeguards': INSTALL['--no-safeguards'] }, null, 0],
  update: ['marketplace + plugins, refresh lock', { ...SCOPE, ...DIR, '--dry-run': 'show what would change' }, null, 0],
  'new-skill': ['skill + 7 eval cases from templates', { '--bundle': 'plugin to add it to', '--description': 'when Claude should use it' }, null, 1],
  vet: ['scan a third-party skill before pinning', { '--sha': 'full 40-char commit', '--path': 'sub/dir in the repo', '--name': 'plugin name' }, null, 1],
  completion: ['tab completion for your shell', {}, 'completion', 2],
  'self-update': ['update this CLI', {}, null, 0],
  help: ['show commands', {}, null, 0],
};
const ALIASES = { ls: 'list', install: 'add', rm: 'remove', uninstall: 'remove', show: 'info', pick: null };
const VALUED = new Set(['--dir', '--project', '--source', '--bundle', '--description', '--path', '--sha', '--name', '--scope']);
const SCOPE_FLAGS = ['--global', '-g', '--user', '--local', '--just-me', '--shared', '--scope'];

// data: { plugins: [{name, blurb, own}], skills: [{name, plugin}], recipes: [{id, title}], enabled: (scope|null) => [name] }
export function complete(words, data) {
  const cur = (words.at(-1) ?? '_').replace(/^_/, '');
  const prev = words.slice(0, -1);
  const match = (pairs) => {
    const seen = new Set(); // the first wins: "ponytail" is a plugin and a skill
    return pairs.filter(([v]) => v.startsWith(cur) && !seen.has(v) && seen.add(v)).map(([v, d]) => (d ? `${v}\t${d}` : v));
  };

  if (!prev.length) return match(cur.startsWith('-') ? [['--help', 'show commands']] : Object.entries(COMMANDS).map(([n, [d]]) => [n, d]));

  const name = prev[0] in ALIASES ? ALIASES[prev[0]] : prev[0];
  const spec = COMMANDS[name];
  if (!spec) return [];
  const [, flags, kind, max] = spec;
  const last = prev.at(-1);

  if (prev.length > 1 && VALUED.has(last)) {
    if (last === '--scope') return match([['project', 'shared'], ['local', 'just me'], ['user', 'global']]);
    if (last === '--source') return match([['github', 'the published marketplace'], ['local', 'this clone']]);
    if (last === '--bundle') return match(data.plugins.filter((p) => p.own).map((p) => [p.name, p.blurb]));
    return []; // --dir, --path, free text: the shell falls back to file names
  }

  const rest = prev.slice(1);
  const typed = rest.filter((w, i) => !w.startsWith('-') && !VALUED.has(rest[i - 1]));
  const hasScope = rest.some((w) => SCOPE_FLAGS.includes(w));
  const flagPairs = () => Object.entries(flags).filter(([f]) => !rest.includes(f) && !(hasScope && SCOPE_FLAGS.includes(f)));

  if (cur.startsWith('-')) return match(flagPairs());

  let args = [];
  if (typed.length < max) {
    if (kind === 'installable') {
      args = data.plugins.map((p) => [p.name, p.blurb]);
      // Skills only once you've typed something: there are dozens, and plugins are what you usually mean.
      if (cur) args.push(...data.skills.map((s) => [s.name, `skill in ${s.plugin}`]));
    } else if (kind === 'enabled') {
      const scope = rest.includes('--global') || rest.includes('-g') || rest.includes('--user') ? 'user'
        : rest.includes('--local') || rest.includes('--just-me') ? 'local' : rest.includes('--shared') ? 'project' : null;
      args = [...new Set(data.enabled(scope))].map((n) => [n, data.plugins.find((p) => p.name === n)?.blurb || '']);
    } else if (kind === 'recipe') {
      args = data.recipes.map((r) => [r.id, r.title]);
    } else if (kind === 'completion') {
      args = typed.length === 0
        ? [...SHELLS.map((s) => [s, `print the ${s} script`]), ['install', 'set it up for your shell'], ['uninstall', 'remove it again']]
        : ['install', 'uninstall'].includes(typed[0]) ? SHELLS.map((s) => [s, '']) : [];
    }
    args = args.filter(([v]) => !typed.includes(v));
  }
  // Nothing left to name? Offer the flags, so Tab always shows what comes next.
  return args.length || cur ? match(args) : match(flagPairs());
}

// ---------- shell scripts ----------
const MARK = '# craft-skills tab completion';

export function script(shell) {
  if (shell === 'bash') return `${MARK} (bash)
_skills_complete() {
  local v _d
  COMPREPLY=()
  while IFS=$'\\t' read -r v _d; do [ -n "$v" ] && COMPREPLY+=("$v"); done < <(skills __complete "\${COMP_WORDS[@]:1:COMP_CWORD-1}" "_\${COMP_WORDS[COMP_CWORD]}" 2>/dev/null)
}
complete -o default -F _skills_complete skills
`;
  if (shell === 'zsh') return `${MARK} (zsh)
_skills() {
  local -a lines vals; local l v d
  lines=("\${(@f)$(skills __complete "\${(@)words[2,CURRENT-1]}" "_\${words[CURRENT]}" 2>/dev/null)}")
  for l in $lines; do
    [[ -z $l ]] && continue
    v=\${l%%$'\\t'*}; d=\${l#*$'\\t'}; [[ $d == "$l" ]] && d=''
    vals+=("\${v//:/\\\\:}\${d:+:$d}")
  done
  if (( \${#vals} )); then _describe -t skills 'skills' vals; else _files; fi
}
(( $+functions[compdef] )) || { autoload -Uz compinit && compinit; }
compdef _skills skills
`;
  if (shell === 'fish') return `${MARK} (fish)
function __skills_complete
    set -l words (commandline -opc)
    set -e words[1]
    skills __complete $words _(commandline -ct) 2>/dev/null
end
complete -c skills -f -a '(__skills_complete)'
complete -c skills -l dir -x -a '(__fish_complete_directories)'
complete -c skills -l path -r -F
`;
  if (shell === 'powershell') return `${MARK} (PowerShell)
Register-ArgumentCompleter -Native -CommandName skills -ScriptBlock {
    param($wordToComplete, $commandAst, $cursorPosition)
    $words = @($commandAst.CommandElements | Select-Object -Skip 1 |
        Where-Object { $_.Extent.EndOffset -lt $cursorPosition -or ($_.Extent.EndOffset -eq $cursorPosition -and $wordToComplete -eq '') } |
        ForEach-Object { $_.ToString() })
    $enc = [Console]::OutputEncoding
    try {
        [Console]::OutputEncoding = [Text.Encoding]::UTF8
        $lines = @(skills __complete @words "_$wordToComplete" 2>$null)
    } finally { [Console]::OutputEncoding = $enc }
    foreach ($line in $lines) {
        if (-not $line) { continue }
        $v, $d = $line -split "\`t", 2
        if (-not $d) { $d = $v }
        [System.Management.Automation.CompletionResult]::new($v, $v, 'ParameterValue', $d)
    }
}
`;
  throw new Error(`no completion for "${shell}"`);
}

// ---------- install ----------
// Which shell is asking: Git Bash on Windows sets MSYSTEM/SHELL, plain Windows means PowerShell.
export function detectShell(env = process.env, platform = process.platform) {
  const sh = (env.SHELL || '').split(/[\\/]/).pop().replace(/\.exe$/, '');
  if (env.FISH_VERSION || sh === 'fish') return 'fish';
  if (env.ZSH_VERSION || sh === 'zsh') return 'zsh';
  if (env.MSYSTEM || sh === 'bash') return 'bash';
  if (platform === 'win32' || env.PSModulePath?.includes('PowerShell')) return 'powershell';
  return sh || 'bash';
}

const xdg = () => process.env.XDG_CONFIG_HOME || join(homedir(), '.config');
const dataDir = () => join(xdg(), 'craft-skills');

// Where each shell gets hooked in: the script file, plus the startup files that source it.
// fish autoloads its completions folder, so it needs no startup file at all.
export function targets(shell, profiles = () => []) {
  if (shell === 'fish') return { file: join(xdg(), 'fish', 'completions', 'skills.fish'), rcs: [] };
  const file = join(dataDir(), `completion.${shell === 'powershell' ? 'ps1' : shell}`);
  if (shell === 'bash') return { file, rcs: [join(homedir(), '.bashrc')] };
  if (shell === 'zsh') return { file, rcs: [join(process.env.ZDOTDIR || homedir(), '.zshrc')] };
  return { file, rcs: profiles() };
}

const sourceLine = (shell, file) => (shell === 'powershell'
  ? `if (Test-Path '${file.replace(/'/g, "''")}') { . '${file.replace(/'/g, "''")}' } ${MARK}`
  : `[ -f '${file.replace(/\\/g, '/')}' ] && . '${file.replace(/\\/g, '/')}' ${MARK}`); // Git Bash wants C:/ not C:\

const read = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : '');

export function isInstalled(shell, profiles) {
  const { file, rcs } = targets(shell, profiles);
  return existsSync(file) && (rcs.length === 0 || rcs.some((rc) => read(rc).includes(MARK)));
}

// Idempotent: rewrites the script (picking up CLI changes) and adds the source line once.
export function install(shell, profiles) {
  const { file, rcs } = targets(shell, profiles);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, script(shell));
  const changed = [];
  for (const rc of rcs) {
    const text = read(rc);
    if (text.includes(MARK)) continue;
    mkdirSync(dirname(rc), { recursive: true });
    writeFileSync(rc, `${text}${text && !text.endsWith('\n') ? '\n' : ''}${sourceLine(shell, file)}\n`);
    changed.push(rc);
  }
  return { file, rcs, changed };
}

export function uninstall(shell, profiles) {
  const { file, rcs } = targets(shell, profiles);
  const changed = [];
  if (existsSync(file)) { rmSync(file); changed.push(file); }
  for (const rc of rcs) {
    const text = read(rc);
    if (!text.includes(MARK)) continue;
    const eol = text.includes('\r\n') ? '\r\n' : '\n';
    writeFileSync(rc, text.split(/\r?\n/).filter((l) => !l.includes(MARK)).join(eol));
    changed.push(rc);
  }
  return changed;
}
