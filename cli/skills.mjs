#!/usr/bin/env node
// craft skills CLI - a thin wrapper over Claude Code's native plugin system.
// It never copies skill files into a project. It runs `claude plugin ...` with
// --scope project, which records enabledPlugins + extraKnownMarketplaces in
// .claude/settings.json, and it writes one file of its own: .claude/craft.lock.json.
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, readdirSync, cpSync, rmdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { scanTree } from './lib/scan.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MARKET = 'craft';
const DEFAULT_SOURCE = 'notsubash/claude-skills';
const MIN_CLAUDE = [2, 1, 300];

// Safeguards from third_party/REVIEW.md, applied by `skills add` and undone by `skills remove`.
// env / deny / ask go into the project's .claude/settings.json; options go through
// `claude plugin configure` (stored in your user settings). Skip all of it with --no-safeguards.
const pw = (sub) => [`Bash(playwright-cli ${sub}:*)`, `PowerShell(playwright-cli ${sub}:*)`];
const SAFEGUARDS = {
  superpowers: { env: { SUPERPOWERS_DISABLE_TELEMETRY: '1' }, why: 'no third-party logo request from the brainstorming page' },
  ponytail: { options: { ledger: 'false', sendNames: 'false' }, why: 'no prompt snippets in ~/.config/ponytail or in any webhook' },
  'security-guidance': { env: { SECURITY_REVIEW_MODEL: 'claude-sonnet-5-5', SG_AGENTIC_MODEL: 'claude-sonnet-5-5' }, why: 'per-turn reviews on Sonnet instead of uncapped Opus' },
  'playwright-cli': {
    deny: [...pw('attach'), 'Bash(npx playwright cli attach:*)'],
    ask: ['cookie-get', 'cookie-list', 'cookie-set', 'cookie-delete', 'cookie-clear', 'state-save', 'state-load', 'run-code', 'kill-all', 'delete-data'].flatMap(pw),
    why: 'never attach to your everyday browser profile; ask before cookie, auth-state, run-code and kill commands',
  },
};
// Plugins that need an explicit flag because they run code nobody can review.
const OPT_IN = {
  impeccable: {
    flag: 'accept-impeccable',
    warning: `impeccable's hooks run a prebuilt engine binary (not reviewable) with network access on every
session start, edit and stop. It also asks you to sign in to an Impeccable account, uploads critiques
when signed in, sends a telemetry ping, can write hook entries into .claude/settings files, and in live
mode treats its tool output as overriding the skill. Details: third_party/REVIEW.md#impeccable`,
  },
};

// ---------- helpers ----------
const argv = process.argv.slice(2);
const cmd = argv[0];
const positional = argv.slice(1).filter((a, i, all) => !a.startsWith('--') && !(all[i - 1] || '').match(/^--(project|source|bundle|description|path|sha|name)$/));
const opt = (n) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : undefined; };
const flag = (n) => argv.includes(`--${n}`);
const projectDir = resolve(opt('project') || process.cwd());
const settingsPath = join(projectDir, '.claude', 'settings.json');
const lockPath = join(projectDir, '.claude', 'craft.lock.json');

function die(msg, code = 1) { console.error(`skills: ${msg}`); process.exit(code); }
const readJson = (p, fallback) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : fallback);
const writeJson = (p, v) => { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, JSON.stringify(v, null, 2) + '\n'); };

function quote(a) { return /^[A-Za-z0-9_@%+=:,./\\-]+$/.test(a) ? a : `"${a.replace(/"/g, '\\"')}"`; }
// shell:true so `claude` resolves to claude.cmd / claude.exe on Windows and to the binary elsewhere.
function run(bin, args, { cwd = projectDir, capture = false, allowFail = false } = {}) {
  const r = spawnSync([bin, ...args].map(quote).join(' '), { cwd, shell: true, encoding: 'utf8', stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit' });
  if (r.status !== 0 && !allowFail) die(`\`${bin} ${args.join(' ')}\` failed (exit ${r.status})${capture ? `\n${r.stderr || r.stdout}` : ''}`);
  return r;
}
const claude = (args, o) => run('claude', args, o);

function marketplace() { return readJson(join(REPO, '.claude-plugin', 'marketplace.json')); }
function pluginEntry(name) { return marketplace().plugins.find((p) => p.name === name); }
function ownSkills(bundle) {
  const dir = join(REPO, 'plugins', bundle, 'skills');
  return existsSync(dir) ? readdirSync(dir).filter((d) => existsSync(join(dir, d, 'SKILL.md'))) : [];
}
function findSkillBundle(skill) {
  for (const p of marketplace().plugins) if (typeof p.source === 'string' && ownSkills(p.name).includes(skill)) return p.name;
  return null;
}
function enabledCraft(settings) {
  return Object.entries(settings.enabledPlugins || {}).filter(([k, v]) => v && k.endsWith(`@${MARKET}`)).map(([k]) => k.split('@')[0]);
}
function resolveSource() {
  const s = opt('source') || process.env.CRAFT_SOURCE;
  if (!s || s === 'github') return DEFAULT_SOURCE;
  if (s === 'local') return REPO;
  return s;
}
function sourceCommit(source) {
  if (existsSync(source)) return run('git', ['-C', source, 'rev-parse', 'HEAD'], { capture: true, allowFail: true }).stdout.trim() || null;
  const r = run('git', ['ls-remote', `https://github.com/${source}.git`, 'HEAD'], { capture: true, allowFail: true });
  return r.stdout.split(/\s+/)[0] || null;
}
function installedVersions() {
  const r = claude(['plugin', 'list', '--json'], { capture: true, allowFail: true });
  try { return Object.fromEntries(JSON.parse(r.stdout).filter((p) => p.scope === 'project').map((p) => [p.id.split('@')[0], p.version])); } catch { return {}; }
}
function applySafeguards(plugins, lock) {
  if (flag('no-safeguards')) return;
  const s = readJson(settingsPath, {});
  lock.safeguards ||= {};
  for (const p of plugins) {
    const g = SAFEGUARDS[p];
    if (!g || lock.safeguards[p]) continue;
    const added = { env: [], deny: [], ask: [] };
    for (const [k, v] of Object.entries(g.env || {})) if (!(s.env && k in s.env)) { (s.env ||= {})[k] = v; added.env.push(k); }
    for (const kind of ['deny', 'ask']) for (const rule of g[kind] || []) {
      s.permissions ||= {}; s.permissions[kind] ||= [];
      if (!s.permissions[kind].includes(rule)) { s.permissions[kind].push(rule); added[kind].push(rule); }
    }
    if (g.options) {
      const r = spawnSync('claude plugin configure ' + quote(`${p}@${MARKET}`) + ' --values-stdin', { cwd: projectDir, shell: true, input: JSON.stringify(g.options), encoding: 'utf8' });
      if (r.status !== 0) console.warn(`skills: could not set ${p} options (${Object.entries(g.options).map(([k, v]) => `${k}=${v}`).join(', ')}); run \`claude plugin configure ${p}@${MARKET}\``);
      else added.options = Object.keys(g.options);
    }
    lock.safeguards[p] = added;
    console.log(`  safeguard for ${p}: ${g.why}`);
  }
  writeJson(settingsPath, s);
}

function removeSafeguards(lock, stillEnabled) {
  if (!lock?.safeguards) return;
  const s = readJson(settingsPath, null);
  for (const [p, added] of Object.entries(lock.safeguards)) {
    if (stillEnabled.has(p)) continue;
    if (s) {
      for (const k of added.env || []) if (s.env) delete s.env[k];
      for (const kind of ['deny', 'ask']) if (s.permissions?.[kind]) s.permissions[kind] = s.permissions[kind].filter((r) => !(added[kind] || []).includes(r));
    }
    delete lock.safeguards[p]; // plugin options stay in your user settings; they are harmless without the plugin
  }
  if (s) writeJson(settingsPath, s);
  if (Object.keys(lock.safeguards).length === 0) delete lock.safeguards;
}

function cleanupSettings() {
  const s = readJson(settingsPath, null);
  if (!s) return;
  if (s.permissions) {
    for (const k of ['allow', 'deny', 'ask']) if (Array.isArray(s.permissions[k]) && s.permissions[k].length === 0) delete s.permissions[k];
    if (Object.keys(s.permissions).length === 0) delete s.permissions;
  }
  for (const k of ['enabledPlugins', 'extraKnownMarketplaces', 'env']) if (s[k] && Object.keys(s[k]).length === 0) delete s[k];
  if (Object.keys(s).length === 0) rmSync(settingsPath); else writeJson(settingsPath, s);
  const dir = join(projectDir, '.claude');
  if (existsSync(dir) && readdirSync(dir).length === 0) rmdirSync(dir);
}

// ---------- commands ----------
function list() {
  const m = marketplace();
  console.log(`Marketplace "${m.name}"\n\nBundles:`);
  for (const p of m.plugins.filter((p) => p.category === 'bundle')) {
    const deps = readJson(join(REPO, 'plugins', p.name, '.claude-plugin', 'plugin.json'), {}).dependencies || [];
    console.log(`  ${p.name.padEnd(10)} = ${deps.join(' + ')}`);
  }
  console.log('\nOwn plugins (no dependencies):');
  for (const p of m.plugins.filter((p) => p.category === 'own')) console.log(`  ${p.name.padEnd(10)} skills: ${ownSkills(p.name).join(', ')}`);
  console.log('\nThird-party (pinned):');
  for (const p of m.plugins.filter((p) => p.category === 'third-party')) console.log(`  ${p.name.padEnd(18)} ${(p.source.url || '').replace('https://github.com/', '').replace('.git', '')}@${p.source.sha.slice(0, 7)}${p.source.path ? `  /${p.source.path}` : ''}`);
  const s = readJson(settingsPath, {});
  const on = enabledCraft(s);
  console.log(`\nIn ${projectDir}: ${on.length ? on.join(', ') : 'nothing from craft enabled'}`);
}

function add(name) {
  if (!name) die('usage: skills add <bundle|plugin|skill> [--project PATH] [--source github|local|PATH|owner/repo]');
  let entry = pluginEntry(name);
  if (!entry) {
    const bundle = findSkillBundle(name);
    if (!bundle) die(`no bundle, plugin or skill called "${name}". Run \`skills list\`.`);
    console.log(`"${name}" ships in the "${bundle}" bundle. Claude Code installs plugins, not single skills, so adding "${bundle}".`);
    name = bundle; entry = pluginEntry(name);
  }
  if (!existsSync(projectDir)) die(`project folder not found: ${projectDir}`);
  const optIn = OPT_IN[name];
  if (optIn && !flag(optIn.flag)) {
    console.error(`${optIn.warning}\n\nTo install it anyway: skills add ${name} --${optIn.flag}`);
    process.exit(1);
  }
  const source = resolveSource();
  const before = new Set(enabledCraft(readJson(settingsPath, {})));
  if (!readJson(settingsPath, {}).extraKnownMarketplaces?.[MARKET]) claude(['plugin', 'marketplace', 'add', source, '--scope', 'project']);
  claude(['plugin', 'install', `${name}@${MARKET}`, '--scope', 'project']);

  const after = enabledCraft(readJson(settingsPath, {}));
  const versions = installedVersions();
  const lock = readJson(lockPath, { lockfileVersion: 1, marketplace: {}, plugins: {} });
  lock.marketplace = { name: MARKET, source, commit: sourceCommit(source) };
  for (const p of after) {
    const e = pluginEntry(p) || {};
    const prev = lock.plugins[p] || { requestedBy: [] };
    const requestedBy = new Set(prev.requestedBy);
    if (p === name) requestedBy.add('user'); else if (!before.has(p)) requestedBy.add(name);
    lock.plugins[p] = { version: versions[p] ?? null, ...(typeof e.source === 'object' ? { upstream: e.source.url, path: e.source.path, sha: e.source.sha } : {}), requestedBy: [...requestedBy] };
  }
  applySafeguards(after, lock);
  writeJson(lockPath, lock);
  console.log(`\nAdded ${name}${after.length > before.size + 1 ? ` (+ ${after.filter((p) => p !== name && !before.has(p)).join(', ')})` : ''}. Commit .claude/settings.json and .claude/craft.lock.json.`);
  console.log('Each other clone runs `skills add` once, or `claude plugin install <name>@craft --scope project` per plugin (project settings enable plugins but do not download them).');
}

function remove(name) {
  if (!name) die('usage: skills remove <bundle|plugin> [--project PATH]');
  const on = enabledCraft(readJson(settingsPath, {}));
  if (!on.includes(name)) die(`"${name}" is not enabled in ${settingsPath}`);
  claude(['plugin', 'uninstall', `${name}@${MARKET}`, '--scope', 'project', '--prune', '-y']);
  const still = new Set(enabledCraft(readJson(settingsPath, {})));
  const lock = readJson(lockPath, null);
  if (lock) {
    for (const p of Object.keys(lock.plugins)) if (!still.has(p)) delete lock.plugins[p];
    removeSafeguards(lock, still);
    if (Object.keys(lock.plugins).length) writeJson(lockPath, lock); else rmSync(lockPath);
  }
  if (still.size === 0) claude(['plugin', 'marketplace', 'remove', MARKET, '--scope', 'project'], { allowFail: true });
  cleanupSettings();
  console.log(`Removed ${name}.${still.size ? ` Still enabled: ${[...still].join(', ')}` : ' No craft plugins left in this project.'}`);
}

function update() {
  const dry = flag('dry-run');
  const lock = readJson(lockPath, null);
  if (!lock) die(`no ${lockPath}. Nothing installed with this CLI.`);
  const source = lock.marketplace.source;
  const head = sourceCommit(source);
  console.log(`Marketplace ${source}: locked ${String(lock.marketplace.commit).slice(0, 7)} -> current ${String(head).slice(0, 7)}${head === lock.marketplace.commit ? ' (no change)' : ''}`);
  // Read the marketplace at its current state: a local clone or the GitHub HEAD.
  let current;
  if (existsSync(source)) current = readJson(join(source, '.claude-plugin', 'marketplace.json'));
  else current = JSON.parse(run('gh', ['api', `repos/${source}/contents/.claude-plugin/marketplace.json`, '-H', 'Accept: application/vnd.github.raw'], { capture: true }).stdout);
  let changes = 0;
  for (const [name, l] of Object.entries(lock.plugins)) {
    const e = current.plugins.find((p) => p.name === name);
    if (!e) { console.log(`  ${name}: REMOVED from marketplace`); changes++; continue; }
    if (l.sha && e.source.sha !== l.sha) {
      changes++;
      const repo = e.source.url.replace('https://github.com/', '').replace(/\.git$/, '');
      console.log(`  ${name}: ${l.sha.slice(0, 7)} -> ${e.source.sha.slice(0, 7)}  https://github.com/${repo}/compare/${l.sha}...${e.source.sha}`);
      const r = run('gh', ['api', `repos/${repo}/compare/${l.sha}...${e.source.sha}`, '--jq', `.files[] | select(.filename | startswith("${e.source.path || ''}")) | "      \\(.status) \\(.filename) +\\(.additions)/-\\(.deletions)"`], { capture: true, allowFail: true });
      if (r.stdout.trim()) console.log(r.stdout.trimEnd());
    } else if (!l.sha && head !== lock.marketplace.commit) {
      console.log(`  ${name}: own bundle, follows the marketplace commit`);
    }
  }
  if (dry) { console.log(changes || head !== lock.marketplace.commit ? '\nDry run: nothing changed. Run `skills update` to apply.' : '\nUp to date.'); return; }
  claude(['plugin', 'marketplace', 'update', MARKET]);
  for (const name of Object.keys(lock.plugins)) claude(['plugin', 'update', `${name}@${MARKET}`, '--scope', 'project'], { allowFail: true });
  const versions = installedVersions();
  lock.marketplace.commit = head;
  for (const [name, l] of Object.entries(lock.plugins)) {
    const e = current.plugins.find((p) => p.name === name);
    l.version = versions[name] ?? l.version;
    if (e && typeof e.source === 'object') l.sha = e.source.sha;
  }
  writeJson(lockPath, lock);
  console.log('Updated. Restart Claude Code or run /reload-plugins in open sessions.');
}

function doctor() {
  let bad = 0;
  const ok = (cond, msg, fix) => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${msg}${!cond && fix ? `\n     fix: ${fix}` : ''}`); if (!cond) bad++; };
  const v = claude(['--version'], { capture: true, allowFail: true }).stdout.match(/(\d+)\.(\d+)\.(\d+)/);
  const ver = v ? v.slice(1).map(Number) : null;
  ok(ver && (ver[0] - MIN_CLAUDE[0] || ver[1] - MIN_CLAUDE[1] || ver[2] - MIN_CLAUDE[2]) >= 0, `Claude Code ${ver ? ver.join('.') : 'not found'} (need >= ${MIN_CLAUDE.join('.')})`, 'npm i -g @anthropic-ai/claude-code@latest');
  ok(run('git', ['--version'], { capture: true, allowFail: true }).status === 0, 'git on PATH');
  ok(run('gh', ['--version'], { capture: true, allowFail: true }).status === 0, 'gh on PATH (used by update --dry-run and oss-portfolio)', 'https://cli.github.com');
  if (process.platform === 'win32') ok(run('bash', ['--version'], { capture: true, allowFail: true }).status === 0, 'Git Bash available (some third-party hooks are sh scripts)', 'install Git for Windows');
  let settings = null;
  try { settings = readJson(settingsPath, {}); ok(true, `${settingsPath} is valid JSON`); } catch (e) { ok(false, `${settingsPath} is not valid JSON: ${e.message}`); }
  if (settings) {
    const on = enabledCraft(settings);
    const lock = readJson(lockPath, null);
    ok(!on.length || settings.extraKnownMarketplaces?.[MARKET], 'craft marketplace declared in project settings', 'skills add <bundle>');
    if (lock) {
      const lp = Object.keys(lock.plugins).sort().join(','), sp = [...on].sort().join(',');
      ok(lp === sp, `lockfile matches settings (${on.length} plugins)`, `lock has [${lp}], settings has [${sp}]: run skills add/remove again`);
    } else ok(!on.length, 'lockfile present', 'run skills add <bundle> to write it');
    const installed = installedVersions();
    for (const p of on) ok(p in installed, `${p}@craft installed on this machine`, `claude plugin install ${p}@craft --scope project`);
    for (const p of on.filter((p) => SAFEGUARDS[p])) ok(lock?.safeguards?.[p], `${p} safeguards applied (${SAFEGUARDS[p].why})`, `skills remove ${p} && skills add ${p}, or see third_party/REVIEW.md#recommended-settings`);
  }
  const m = run('claude', ['plugin', 'validate', REPO], { capture: true, allowFail: true });
  ok(m.status === 0, 'marketplace manifest validates', 'claude plugin validate .');
  process.exit(bad ? 1 : 0);
}

function newSkill(name) {
  const bundle = opt('bundle');
  if (!name || !bundle) die('usage: skills new-skill <name> --bundle <bundle> [--description "..."]');
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name) || name.length > 64) die('name must be lowercase letters, digits and single hyphens, at most 64 characters');
  if (/claude|anthropic/.test(name)) die('names containing "claude" or "anthropic" are reserved');
  const pdir = join(REPO, 'plugins', bundle);
  if (!existsSync(join(pdir, '.claude-plugin', 'plugin.json'))) die(`no bundle "${bundle}" (plugins/${bundle}/.claude-plugin/plugin.json)`);
  const sdir = join(pdir, 'skills', name);
  if (existsSync(sdir)) die(`${sdir} already exists`);
  const desc = opt('description') || 'TODO: what this skill does, then "Use when ..." with the words a user would actually type. Third person, under 1024 characters.';
  const fill = (s) => s.replaceAll('{{name}}', name).replaceAll('{{bundle}}', bundle).replaceAll('{{description}}', desc);
  const tdir = join(REPO, 'templates');
  mkdirSync(sdir, { recursive: true });
  writeFileSync(join(sdir, 'SKILL.md'), fill(readFileSync(join(tdir, 'skill', 'SKILL.md'), 'utf8')));
  for (const c of readdirSync(join(tdir, 'evals'))) {
    const dest = join(pdir, 'evals', `${name}-${c}`);
    cpSync(join(tdir, 'evals', c), dest, { recursive: true });
    for (const f of walk(dest)) writeFileSync(f, fill(readFileSync(f, 'utf8')));
  }
  console.log(`Created plugins/${bundle}/skills/${name}/SKILL.md and plugins/${bundle}/evals/${name}-*`);
  console.log(`Next (skill-creator loop):
  1. Write the body: the steps a top professional takes, in order, under 500 lines. Put detail in sibling files.
  2. Fill in the eval prompts: 3 that should trigger, 3 near-misses that shouldn't, 1 real task with graders.
  3. claude plugin validate plugins/${bundle}
  4. claude plugin eval plugins/${bundle} --case "${name}-*trigger*" --ablation none --runs 3   (did it fire when it should?)
  5. claude plugin eval plugins/${bundle} --case "${name}-task*" --ablation with-without --runs 3   (does it beat no skill?)
  6. Tighten the description and body until both pass, then commit.`);
}
function* walk(d) { for (const e of readdirSync(d, { withFileTypes: true })) { const p = join(d, e.name); if (e.isDirectory()) yield* walk(p); else yield p; } }

function vet(repo) {
  const sha = opt('sha'); const path = opt('path') || '';
  if (!repo || !sha) die('usage: skills vet <owner/repo> --sha <40-char commit> [--path sub/dir] [--name plugin-name]');
  if (!/^[0-9a-f]{40}$/.test(sha)) die('--sha must be a full 40-character commit SHA (pinning to a branch or tag is not reviewable)');
  const dir = join(tmpdir(), `craft-vet-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  run('git', ['init', '-q'], { cwd: dir });
  run('git', ['remote', 'add', 'origin', `https://github.com/${repo}.git`], { cwd: dir });
  run('git', ['fetch', '-q', '--depth', '1', 'origin', sha], { cwd: dir });
  run('git', ['-c', 'advice.detachedHead=false', 'checkout', '-q', 'FETCH_HEAD'], { cwd: dir });
  const root = join(dir, path);
  const r = scanTree(root);
  const name = opt('name') || (path.split('/').filter(Boolean).pop() || repo.split('/')[1]);
  const lines = [
    `## ${name}`, '', `- Upstream: https://github.com/${repo}/tree/${sha}${path ? `/${path}` : ''}`, `- Commit: \`${sha}\``,
    `- Files: ${r.files} (${(r.bytes / 1024).toFixed(0)} KB), executable: ${r.exec.length}, binary: ${r.binary.length}`,
    `- Hook configs: ${r.hooks.length ? r.hooks.join(', ') : 'none'}`,
    ...Object.entries(r.flags).map(([k, v]) => `- ${k}: ${v.length ? `${v.length} hits in ${new Set(v.map((x) => x.split(':')[0])).size} files` : 'none'}`),
    `- Hidden unicode: ${r.hidden.length ? r.hidden.join(', ') : 'none'}`, '',
    '### Flagged lines (read each one)', ...Object.entries(r.flags).flatMap(([k, v]) => v.slice(0, 25).map((x) => `- [${k}] ${x}`)), '',
    '### Reviewer verdict', '- [ ] Read every SKILL.md and every file it loads', '- [ ] Read every hook config and every script a hook or skill runs', '- [ ] Network, install and home-directory writes understood and acceptable', '- License: ', '- Security note: ',
  ];
  const out = join(REPO, 'third_party', 'reviews', `${name}.md`);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, lines.join('\n') + '\n');
  console.log(lines.slice(0, 13).join('\n'));
  console.log(`\nChecked out at ${root}. Read the files there, then finish ${out}.`);
}

const commands = { list, add: () => add(positional[0]), remove: () => remove(positional[0]), update, doctor, 'new-skill': () => newSkill(positional[0]), vet: () => vet(positional[0]) };
if (!commands[cmd]) {
  console.log(`skills - manage craft plugins in a project with Claude Code's native plugin system

  skills list [--project PATH]
  skills add <bundle|plugin|skill> [--project PATH] [--source github|local|PATH|owner/repo] [--no-safeguards]
             (impeccable also needs --accept-impeccable)
  skills remove <bundle|plugin> [--project PATH]
  skills update [--dry-run] [--project PATH]
  skills doctor [--project PATH]
  skills new-skill <name> --bundle <bundle> [--description "..."]
  skills vet <owner/repo> --sha <commit> [--path sub/dir] [--name plugin-name]`);
  process.exit(cmd && cmd !== 'help' && cmd !== '--help' ? 1 : 0);
}
commands[cmd]();
