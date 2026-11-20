#!/usr/bin/env node
// craft skills CLI - a thin, friendly layer over Claude Code's native plugin system.
// It never copies skill files anywhere. It runs `claude plugin ...` in one of three scopes:
//   project  .claude/settings.json        (shared: commit it)            lock: .claude/craft.lock.json
//   local    .claude/settings.local.json  (just you: git-ignored)        lock: .claude/craft.lock.local.json
//   user     ~/.claude/settings.json      (global: every project)        lock: ~/.claude/craft.lock.json
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, readdirSync, cpSync, rmdirSync, appendFileSync, realpathSync } from 'node:fs';
import { join, resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { tmpdir, homedir } from 'node:os';
import { scanTree } from './lib/scan.mjs';
import * as ui from './lib/ui.mjs';
import { c, sym } from './lib/ui.mjs';
import { select, multiselect, confirm, isCancel } from './lib/picker.mjs';
import * as completion from './lib/completion.mjs';
import * as update from './lib/update.mjs';
import { loadMarketplace, BLURB, HOOKS, SECTIONS, RECIPES, SCOPES, ownSkills, dependencies, skillsOf, pluginForSkill, includedIn, THIRD_PARTY_SKILLS } from './lib/catalog.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MARKET = 'craft';
const DEFAULT_SOURCE = 'notsubash/claude-skills';
const CLI = fileURLToPath(import.meta.url);
const VERSION = JSON.parse(readFileSync(join(REPO, 'package.json'), 'utf8')).version;
const UPDATE_CACHE = update.cacheFile(completion.dataDir());
const STATE = join(completion.dataDir(), 'state.json');
const MIN_CLAUDE = [2, 1, 300];
const CONFIG_DIR = process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude');
const WIN = process.platform === 'win32';

// Safeguards from third_party/REVIEW.md, applied by `skills add` and undone by `skills remove`.
// env / deny / ask go into the scope's settings file; options go through `claude plugin configure`
// (stored in your user settings). Skip all of it with --no-safeguards.
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

// ---------- arguments ----------
const argv = process.argv.slice(2);
const cmd = argv[0];
const VALUED = new Set(['dir', 'project', 'source', 'bundle', 'description', 'path', 'sha', 'name', 'scope']);
const positional = [];
for (let i = 1; i < argv.length; i++) {
  const a = argv[i];
  if (a.startsWith('--') && VALUED.has(a.slice(2))) { i++; continue; }
  if (!a.startsWith('-')) positional.push(a);
}
const opt = (n) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : undefined; };
const flag = (...ns) => ns.some((n) => argv.includes(n.length === 1 ? `-${n}` : `--${n}`));
const projectDir = resolve(opt('dir') || opt('project') || process.cwd());
const assumeYes = flag('yes', 'y');

function scopeFromFlags() {
  const s = opt('scope');
  if (s) { if (!['project', 'local', 'user', 'global'].includes(s)) die(`--scope must be project, local or user (got "${s}")`); return s === 'global' ? 'user' : s; }
  if (flag('global', 'g', 'user')) return 'user';
  if (flag('local', 'just-me')) return 'local';
  if (flag('shared')) return 'project';
  return null;
}

// ---------- helpers ----------
class Fatal extends Error {}
function die(msg) { throw new Fatal(msg); }
const readJson = (p, fallback) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : fallback);
const writeJson = (p, v) => { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, JSON.stringify(v, null, 2) + '\n'); };
// Real paths, so macOS /var → /private/var and symlinked folders compare equal. Case-insensitive on Windows.
const real = (p) => { try { return realpathSync.native(resolve(p)); } catch { return resolve(p); } };
const samePath = (a, b) => (WIN ? real(a).toLowerCase() === real(b).toLowerCase() : real(a) === real(b));

function ctxFor(scope, dir = projectDir) {
  if (scope === 'user') return { scope, dir, settings: join(CONFIG_DIR, 'settings.json'), lock: join(CONFIG_DIR, 'craft.lock.json') };
  if (scope === 'local') return { scope, dir, settings: join(dir, '.claude', 'settings.local.json'), lock: join(dir, '.claude', 'craft.lock.local.json') };
  return { scope: 'project', dir, settings: join(dir, '.claude', 'settings.json'), lock: join(dir, '.claude', 'craft.lock.json') };
}
const ALL_SCOPES = ['user', 'project', 'local'];
const scopeName = (s) => SCOPES[s].short;
const scopeFlag = (s) => (SCOPES[s].flag ? ` ${SCOPES[s].flag}` : '');

// cmd.exe needs double quotes; POSIX shells expand $ and backticks inside them, so use single quotes there.
function quote(a) {
  if (/^[A-Za-z0-9_@%+=:,./\\-]+$/.test(a)) return a;
  return WIN ? `"${a.replace(/"/g, '\\"')}"` : `'${a.replace(/'/g, `'\\''`)}'`;
}
// shell:true so `claude` resolves to claude.cmd / claude.exe on Windows and to the binary elsewhere.
function runSync(bin, args, { cwd = projectDir, capture = true, allowFail = false, input } = {}) {
  const r = spawnSync([bin, ...args].map(quote).join(' '), { cwd, shell: true, encoding: 'utf8', input, stdio: capture ? ['pipe', 'pipe', 'pipe'] : 'inherit' });
  if (r.status !== 0 && !allowFail) die(`\`${bin} ${args.join(' ')}\` failed (exit ${r.status})${capture ? `\n${(r.stderr || r.stdout || '').trim()}` : ''}`);
  return r;
}
function runAsync(bin, args, { cwd = projectDir } = {}) {
  return new Promise((res) => {
    const p = spawn([bin, ...args].map(quote).join(' '), { cwd, shell: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    p.stdout.on('data', (d) => (stdout += d)); p.stderr.on('data', (d) => (stderr += d));
    p.on('close', (status) => res({ status, stdout, stderr }));
  });
}
// A `claude ...` call behind a spinner. Prints the captured output only when it fails.
async function step(label, args, { cwd, allowFail = false, done } = {}) {
  const s = ui.spinner(label);
  const r = await runAsync('claude', args, { cwd });
  if (r.status === 0) { s.succeed(typeof done === 'function' ? done(r) : done); return r; }
  if (allowFail) { s.warn(`${label} ${c.gray('(skipped)')}`); return r; }
  s.fail();
  const outText = `${r.stdout}\n${r.stderr}`.trim().replace(/\x1b\[[0-9;]*m/g, '');
  if (outText) console.log(outText.split('\n').map((l) => `    ${c.gray(l)}`).join('\n'));
  die(`\`claude ${args.join(' ')}\` failed (exit ${r.status})`);
}

let MARKET_CACHE;
const market = () => (MARKET_CACHE ||= loadMarketplace(REPO));
const entry = (name) => market().plugins.find((p) => p.name === name);
const enabledIn = (settings) => Object.entries(settings?.enabledPlugins || {}).filter(([k, v]) => v && k.endsWith(`@${MARKET}`)).map(([k]) => k.split('@')[0]);
const enabled = (ctx) => enabledIn(readJson(ctx.settings, {}));

function resolveSource() {
  const s = opt('source') || process.env.CRAFT_SOURCE;
  if (!s || s === 'github') return DEFAULT_SOURCE;
  if (s === 'local') return REPO;
  return existsSync(s) ? resolve(s) : s;
}
function sourceCommit(source) {
  if (existsSync(source)) return runSync('git', ['-C', source, 'rev-parse', 'HEAD'], { allowFail: true }).stdout.trim() || null;
  const r = runSync('git', ['ls-remote', `https://github.com/${source}.git`, 'HEAD'], { allowFail: true });
  return r.stdout.split(/\s+/)[0] || null;
}
// Installs Claude Code has recorded for this scope (and, for project/local, this folder).
// `claude plugin list --json` reports every project on the machine, so filter by path.
function installed(ctx) {
  const r = runSync('claude', ['plugin', 'list', '--json'], { allowFail: true });
  let rows = [];
  try { rows = JSON.parse(r.stdout); } catch { return {}; }
  return Object.fromEntries(rows
    .filter((p) => p.id.endsWith(`@${MARKET}`) && p.scope === ctx.scope && (ctx.scope === 'user' || (p.projectPath && samePath(p.projectPath, ctx.dir))))
    .map((p) => [p.id.split('@')[0], p.version]));
}
function marketplaceKnown(ctx) {
  const has = (p) => Boolean(readJson(p, {})?.extraKnownMarketplaces?.[MARKET]);
  if (ctx.scope === 'project') return has(ctx.settings);
  if (ctx.scope === 'user') return has(ctx.settings);
  return has(ctx.settings) || has(ctxFor('project', ctx.dir).settings) || has(ctxFor('user').settings);
}
function isGitRepo(dir) { return runSync('git', ['-C', dir, 'rev-parse', '--is-inside-work-tree'], { allowFail: true }).status === 0; }
function guardScope(ctx) {
  if (ctx.scope === 'user') return;
  if (!existsSync(ctx.dir)) die(`folder not found: ${ctx.dir}`);
  if (samePath(ctx.dir, homedir()) || samePath(join(ctx.dir, '.claude'), CONFIG_DIR)) die(`you're in your home folder, where project settings are your global settings. Use --global, or cd into a project.`);
}
// Just-me installs must never show up in `git status`: add them to .git/info/exclude.
function excludeLocalFiles(ctx) {
  if (ctx.scope !== 'local' || !isGitRepo(ctx.dir)) return;
  const gitDir = runSync('git', ['-C', ctx.dir, 'rev-parse', '--git-common-dir'], { allowFail: true }).stdout.trim();
  if (!gitDir) return;
  const exclude = resolve(ctx.dir, gitDir, 'info', 'exclude');
  for (const f of ['.claude/settings.local.json', '.claude/craft.lock.local.json']) {
    if (runSync('git', ['-C', ctx.dir, 'check-ignore', '-q', f], { allowFail: true }).status === 0) continue;
    mkdirSync(dirname(exclude), { recursive: true });
    const cur = existsSync(exclude) ? readFileSync(exclude, 'utf8') : '';
    appendFileSync(exclude, `${cur && !cur.endsWith('\n') ? '\n' : ''}${f}\n`);
  }
}

// Resolve what the user typed: a plugin, a bundle, or a skill (installs the plugin that ships it).
function resolveName(name) {
  if (entry(name)) return name;
  const plugin = pluginForSkill(REPO, market(), name);
  if (plugin) { ui.info(`${c.bold(name)} ships in ${c.accent(plugin)}. Claude Code installs whole plugins, so adding ${c.accent(plugin)}.`); return plugin; }
  const near = market().plugins.map((p) => p.name).filter((n) => n.includes(name) || name.includes(n));
  die(`nothing called "${name}".${near.length ? ` Did you mean ${near.join(', ')}?` : ''} Run \`skills list\`.`);
}

function applySafeguards(ctx, plugins, lock) {
  if (flag('no-safeguards')) return;
  const s = readJson(ctx.settings, {});
  lock.safeguards ||= {};
  let changed = false;
  for (const p of plugins) {
    const g = SAFEGUARDS[p];
    if (!g || lock.safeguards[p]) continue;
    const added = { env: [], deny: [], ask: [] };
    for (const [k, v] of Object.entries(g.env || {})) if (!(s.env && k in s.env)) { (s.env ||= {})[k] = v; added.env.push(k); changed = true; }
    for (const kind of ['deny', 'ask']) for (const rule of g[kind] || []) {
      s.permissions ||= {}; s.permissions[kind] ||= [];
      if (!s.permissions[kind].includes(rule)) { s.permissions[kind].push(rule); added[kind].push(rule); changed = true; }
    }
    if (g.options && configureOptions(p, ctx)) added.options = Object.keys(g.options);
    lock.safeguards[p] = added;
    ui.log(`  ${c.cyan('⛨')} ${c.gray(`safeguard · ${p}: ${g.why}`)}`);
  }
  if (changed) writeJson(ctx.settings, s);
}
function configureOptions(p, ctx) {
  const g = SAFEGUARDS[p];
  const r = runSync('claude', ['plugin', 'configure', `${p}@${MARKET}`, '--values-stdin'], { cwd: ctx.dir, allowFail: true, input: JSON.stringify(g.options) });
  if (r.status !== 0) ui.warn(`could not set ${p} options (${Object.entries(g.options).map(([k, v]) => `${k}=${v}`).join(', ')}); run \`claude plugin configure ${p}@${MARKET}\``);
  return r.status === 0;
}
function removeSafeguards(ctx, lock, stillEnabled) {
  if (!lock?.safeguards) return;
  const s = readJson(ctx.settings, null);
  for (const [p, added] of Object.entries(lock.safeguards)) {
    if (stillEnabled.has(p)) continue;
    if (s) {
      for (const k of added.env || []) if (s.env) delete s.env[k];
      for (const kind of ['deny', 'ask']) if (s.permissions?.[kind]) s.permissions[kind] = s.permissions[kind].filter((r) => !(added[kind] || []).includes(r));
    }
    delete lock.safeguards[p]; // plugin options stay in your user settings; they are harmless without the plugin
  }
  if (s) writeJson(ctx.settings, s);
  if (Object.keys(lock.safeguards).length === 0) delete lock.safeguards;
}
// Drop the empty keys we may have left. Never deletes your global settings file.
function cleanupSettings(ctx) {
  const s = readJson(ctx.settings, null);
  if (!s) return;
  if (s.permissions) {
    for (const k of ['allow', 'deny', 'ask']) if (Array.isArray(s.permissions[k]) && s.permissions[k].length === 0) delete s.permissions[k];
    if (Object.keys(s.permissions).length === 0) delete s.permissions;
  }
  for (const k of ['enabledPlugins', 'extraKnownMarketplaces', 'env']) if (s[k] && Object.keys(s[k]).length === 0) delete s[k];
  if (ctx.scope === 'user') { writeJson(ctx.settings, s); return; }
  if (Object.keys(s).length === 0) rmSync(ctx.settings); else writeJson(ctx.settings, s);
  const dir = join(ctx.dir, '.claude');
  if (existsSync(dir) && readdirSync(dir).length === 0) rmdirSync(dir);
}
function writeLock(ctx, lock) {
  if (Object.keys(lock.plugins).length) writeJson(ctx.lock, lock);
  else if (existsSync(ctx.lock)) rmSync(ctx.lock);
}

// ---------- add / remove (shared by the commands and the picker) ----------
// Fail with the fix, not a shell error, when Claude Code isn't installed.
let claudeChecked = false;
function requireClaude() {
  if (claudeChecked) return;
  if (runSync('claude', ['--version'], { allowFail: true }).status !== 0) die('Claude Code is not installed (or not on PATH).\nInstall it: npm i -g @anthropic-ai/claude-code   then run skills again.');
  claudeChecked = true;
}

async function addPlugins(ctx, names) {
  requireClaude();
  guardScope(ctx);
  for (const n of names) {
    const o = OPT_IN[n];
    if (o && !flag(o.flag)) die(`${o.warning}\n\nTo install it anyway: skills add ${n} --${o.flag}`);
  }
  const source = resolveSource();
  const before = new Set(enabled(ctx));
  if (!marketplaceKnown(ctx)) {
    await step(`Adding the craft marketplace ${c.gray(`(${scopeName(ctx.scope)}, from ${existsSync(source) ? 'local clone' : source})`)}`,
      ['plugin', 'marketplace', 'add', source, '--scope', ctx.scope], { cwd: ctx.dir, done: `Marketplace ${c.accent('craft')} ready ${c.gray(`(${scopeName(ctx.scope)})`)}` });
  }
  const requested = [];
  for (const name of names) {
    if (before.has(name)) { ui.ok(`${c.bold(name)} ${c.gray(`already enabled (${scopeName(ctx.scope)})`)}`); continue; }
    requested.push(name);
    await step(`Installing ${c.bold(name)}`, ['plugin', 'install', `${name}@${MARKET}`, '--scope', ctx.scope], {
      cwd: ctx.dir,
      done: (r) => { const deps = r.stdout.match(/\+ \d+ dependenc\w+: ([^)]+)/)?.[1]; return `Installed ${c.bold(name)}${deps ? c.gray(` + ${deps}`) : ''}`; },
    });
  }
  const after = enabled(ctx);
  const versions = installed(ctx);
  const lock = readJson(ctx.lock, { lockfileVersion: 1, scope: ctx.scope, marketplace: {}, plugins: {} });
  lock.scope = ctx.scope;
  lock.marketplace = { name: MARKET, source, commit: sourceCommit(source) };
  for (const p of after) {
    const e = entry(p) || {};
    const prev = lock.plugins[p] || { requestedBy: [] };
    const by = new Set(prev.requestedBy);
    if (names.includes(p)) by.add('user');
    else if (!before.has(p)) { const via = names.filter((n) => dependencies(REPO, entry(n) || {}).includes(p)); for (const n of via.length ? via : names) by.add(n); }
    if (!by.size) by.add('user'); // enabled before this CLI tracked it
    lock.plugins[p] = { version: versions[p] ?? null, ...(typeof e.source === 'object' ? { upstream: e.source.url, path: e.source.path, sha: e.source.sha } : {}), requestedBy: [...by] };
  }
  applySafeguards(ctx, after, lock);
  writeLock(ctx, lock);
  excludeLocalFiles(ctx);
  return { added: after.filter((p) => !before.has(p)), requested };
}

async function removePlugins(ctx, names) {
  const on = enabled(ctx);
  for (const name of names) {
    if (!on.includes(name)) { ui.warn(`${c.bold(name)} isn't enabled ${c.gray(`(${scopeName(ctx.scope)}: ${ctx.settings})`)}`); continue; }
    await step(`Removing ${c.bold(name)}`, ['plugin', 'uninstall', `${name}@${MARKET}`, '--scope', ctx.scope, '--prune', '-y'], {
      cwd: ctx.dir,
      done: (r) => { const pr = r.stdout.match(/Removed \d+ auto-installed plugins?: (.+)/)?.[1]; return `Removed ${c.bold(name)}${pr ? c.gray(` + ${pr.trim()}`) : ''}`; },
    });
  }
  const still = new Set(enabled(ctx));
  const lock = readJson(ctx.lock, null);
  if (lock) {
    for (const p of Object.keys(lock.plugins)) if (!still.has(p)) delete lock.plugins[p];
    removeSafeguards(ctx, lock, still);
    writeLock(ctx, lock);
  }
  // Project and just-me installs leave no trace once empty. A global marketplace entry is kept.
  if (still.size === 0 && ctx.scope !== 'user' && readJson(ctx.settings, {})?.extraKnownMarketplaces?.[MARKET]) {
    await step(`Removing the craft marketplace ${c.gray(`(${scopeName(ctx.scope)})`)}`, ['plugin', 'marketplace', 'remove', MARKET, '--scope', ctx.scope], { cwd: ctx.dir, allowFail: true, done: 'Marketplace entry removed' });
  }
  cleanupSettings(ctx);
  return still;
}

function nextSteps(ctx) {
  ui.blank();
  if (ctx.scope === 'project') {
    ui.log(`  ${c.bold('Next')}`);
    ui.log(`  ${sym.arrow} commit ${c.cyan('.claude/settings.json')} and ${c.cyan('.claude/craft.lock.json')}`);
    ui.log(`  ${sym.arrow} teammates and other machines run ${c.accent('skills sync')} once ${c.gray('(settings enable plugins; they don\'t download them)')}`);
  } else if (ctx.scope === 'local') {
    ui.log(`  ${c.bold('Next')}  ${c.gray('nothing to commit: just-me files are excluded from git')}`);
  } else {
    ui.log(`  ${c.bold('Next')}  ${c.gray('available in every project on this machine')}`);
  }
  ui.log(`  ${sym.arrow} restart Claude Code, or run ${c.accent('/reload-plugins')} in an open session`);
}

// ---------- commands ----------
async function cmdAdd() {
  if (!positional.length) die('usage: skills add <plugin|bundle|skill>... [--global | --local] [--dir PATH] [--source github|local|PATH]');
  const ctx = ctxFor(scopeFromFlags() || 'project');
  const names = [...new Set(positional.map(resolveName))];
  ui.banner(`adding to ${SCOPES[ctx.scope].label}`);
  const { added } = await addPlugins(ctx, names);
  summarize(ctx, added);
  nextSteps(ctx);
}

function summarize(ctx, added) {
  if (!added.length) return;
  const skills = new Set(added.flatMap((p) => skillsOf(REPO, market(), p, new Set(added.filter((x) => x !== p)))));
  ui.blank();
  ui.box([
    `${sym.ok} ${c.bold(`${added.length} plugin${added.length > 1 ? 's' : ''}`)} ${c.gray('·')} ${c.bold(`${skills.size} skills`)} ${c.gray(`→ ${SCOPES[ctx.scope].label}`)}`,
    c.gray(ui.clip(added.join(', '), 70)),
  ], c.green);
}

async function cmdRemove() {
  if (!positional.length) die('usage: skills remove <plugin|bundle>... [--global | --local] [--dir PATH]');
  let scope = scopeFromFlags();
  if (!scope) {
    const where = ALL_SCOPES.filter((s) => positional.some((n) => enabled(ctxFor(s)).includes(n)));
    scope = where.includes('project') ? 'project' : where[0] || 'project';
    if (where.length > 1) ui.info(`${positional.join(', ')} is enabled in ${where.map(scopeName).join(' and ')}; removing from ${scopeName(scope)}. Pass --global or --local to choose.`);
  }
  const ctx = ctxFor(scope);
  ui.banner(`removing from ${SCOPES[ctx.scope].label}`);
  const still = await removePlugins(ctx, positional);
  ui.blank();
  ui.log(`  ${still.size ? `${c.gray('still enabled:')} ${[...still].join(', ')}` : c.gray(`no craft plugins left in ${scopeName(ctx.scope)} scope`)}`);
}

async function cmdUse() {
  const id = positional[0];
  const r = RECIPES.find((x) => x.id === id);
  if (!r) {
    ui.banner('scenarios');
    for (const x of RECIPES) ui.log(`  ${c.accent(x.id.padEnd(14))} ${x.title}\n  ${' '.repeat(14)} ${c.gray(`${x.plugins.join(' + ')} · ${SCOPES[x.scope].short}`)}`);
    ui.blank(); ui.hint('skills use <scenario> [--global | --local | --shared]');
    if (id) die(`no scenario called "${id}"`);
    return;
  }
  const ctx = ctxFor(scopeFromFlags() || r.scope);
  ui.banner(r.title);
  ui.log(`  ${c.gray(r.why)}`);
  ui.log(`  ${c.gray('plugins')} ${r.plugins.map(c.accent).join(' + ')}  ${c.gray('scope')} ${SCOPES[ctx.scope].label}`);
  ui.blank();
  const { added } = await addPlugins(ctx, r.plugins);
  summarize(ctx, added);
  nextSteps(ctx);
}

// Plugins this folder's settings enable that this machine hasn't downloaded yet.
function missingDownloads() {
  return ['project', 'local'].flatMap((scope) => {
    const ctx = ctxFor(scope);
    const want = enabled(ctx);
    if (!want.length) return [];
    const have = installed(ctx);
    return want.filter((p) => !(p in have)).map((p) => ({ scope, p }));
  });
}

async function cmdSync({ banner = true } = {}) {
  requireClaude();
  if (banner) ui.banner('sync this machine with the project');
  let any = false;
  for (const scope of ['project', 'local']) {
    const ctx = ctxFor(scope);
    const want = enabled(ctx);
    if (!want.length) continue;
    any = true;
    const have = installed(ctx);
    const missing = want.filter((p) => !(p in have));
    ui.log(`  ${c.bold(SCOPES[scope].label)} ${c.gray(`· ${want.length} enabled, ${missing.length} to download`)}`);
    if (!missing.length) { ui.ok('already in sync'); continue; }
    const decl = readJson(ctx.settings, {})?.extraKnownMarketplaces?.[MARKET]?.source;
    const source = decl ? decl.repo || decl.path || decl.url : resolveSource();
    const known = JSON.parse(runSync('claude', ['plugin', 'marketplace', 'list', '--json'], { allowFail: true }).stdout || '[]').some((m) => m.name === MARKET);
    if (!known && source) await step(`Adding the craft marketplace ${c.gray(`(${source})`)}`, ['plugin', 'marketplace', 'add', source, '--scope', scope], { cwd: ctx.dir, allowFail: true, done: 'Marketplace ready' });
    for (const p of missing) await step(`Downloading ${c.bold(p)}`, ['plugin', 'install', `${p}@${MARKET}`, '--scope', scope], { cwd: ctx.dir, done: `Installed ${c.bold(p)}` });
    for (const p of want.filter((x) => SAFEGUARDS[x]?.options)) if (!flag('no-safeguards')) configureOptions(p, ctx);
  }
  if (!any) { ui.info(`no craft plugins enabled in ${projectDir}`); ui.hint('Start with `skills` (interactive) or `skills add core`.'); return; }
  ui.blank(); ui.log(`  ${sym.arrow} restart Claude Code, or run ${c.accent('/reload-plugins')}`);
}

function statusLine() {
  const parts = ALL_SCOPES.map((s) => [s, enabled(ctxFor(s))]).filter(([, on]) => on.length);
  return parts.length ? parts.map(([s, on]) => `${c.gray(`${scopeName(s)}:`)} ${on.join(', ')}`).join(c.gray('  ·  ')) : c.gray('nothing from craft yet');
}

function cmdList() {
  const m = market();
  const on = Object.fromEntries(ALL_SCOPES.map((s) => [s, new Set(enabled(ctxFor(s)))]));
  const tags = (n) => ALL_SCOPES.filter((s) => on[s].has(n)).map((s) => c.green(`[${scopeName(s)}]`)).join(' ');
  ui.banner(`marketplace "${m.name}" · ${m.plugins.length} plugins`);
  for (const cat of ['bundle', 'own', 'third-party']) {
    ui.log(`  ${c.bold(SECTIONS[cat])}`);
    for (const p of m.plugins.filter((x) => x.category === cat)) {
      const n = skillsOf(REPO, m, p.name).length;
      const pin = typeof p.source === 'object' ? c.gray(` @${p.source.sha.slice(0, 7)}`) : '';
      ui.log(`  ${tags(p.name) ? sym.ok : c.gray('·')} ${c.accent(ui.pad(p.name, 18))}${c.gray(String(n).padStart(3) + (n === 1 ? ' skill ' : ' skills'))}  ${BLURB[p.name] || ''}${pin} ${tags(p.name)}`);
    }
    ui.blank();
  }
  ui.kv('here', projectDir, 6);
  ui.kv('status', statusLine(), 6);
  ui.blank();
  ui.hint('skills info <name>  ·  skills use  ·  skills   (interactive)');
}

function cmdInfo() {
  let name = positional[0];
  if (!name) die('usage: skills info <plugin|bundle|skill>');
  const m = market();
  let e = entry(name);
  let skillHit = null;
  if (!e) {
    const p = pluginForSkill(REPO, m, name);
    if (!p) die(`nothing called "${name}". Run \`skills list\`.`);
    skillHit = name; name = p; e = entry(p);
  }
  ui.banner(e.category === 'bundle' ? 'bundle' : e.category === 'own' ? 'my plugin' : 'third-party plugin');
  ui.log(`  ${c.accent(c.bold(name))}  ${BLURB[name] || ''}`);
  ui.blank();
  ui.log(ui.wrap(e.description, ui.cols() - 6, '  '));
  ui.blank();
  if (skillHit) {
    const s = ownSkills(REPO, name).find((x) => x.name === skillHit);
    ui.log(`  ${c.bold(skillHit)} ${c.gray(`is in ${name}`)}`);
    if (s) ui.log(c.gray(ui.wrap(s.description, ui.cols() - 8, '    ')));
    ui.blank();
  }
  const deps = dependencies(REPO, e);
  if (deps.length) { ui.kv('includes', deps.map(c.accent).join(', ')); }
  const own = typeof e.source === 'string' ? ownSkills(REPO, name) : [];
  if (own.length) {
    ui.kv('skills', '');
    for (const s of own) ui.log(`    ${c.bold(ui.pad(s.name, 20))}${c.gray(ui.clip(s.description.split(/ - | Use when/)[0], ui.cols() - 28))}${s.manual ? c.yellow('  /manual') : ''}`);
  } else if (THIRD_PARTY_SKILLS[name]) ui.kv('skills', THIRD_PARTY_SKILLS[name].join(', ') || c.gray('hooks only'));
  else if (deps.length) ui.kv('skills', `${skillsOf(REPO, m, name).length} across the included plugins`);
  if (HOOKS[name]) ui.kv('hooks', c.yellow(HOOKS[name]));
  if (SAFEGUARDS[name]) ui.kv('safeguard', SAFEGUARDS[name].why);
  if (OPT_IN[name]) ui.kv('opt-in', c.red(`needs --${OPT_IN[name].flag}`));
  if (typeof e.source === 'object') ui.kv('pinned', `${e.source.url.replace('https://github.com/', '').replace('.git', '')}@${e.source.sha.slice(0, 12)}${e.source.path ? ` /${e.source.path}` : ''}`);
  const inB = includedIn(REPO, m, name);
  if (inB.length) ui.kv('part of', inB.join(', '));
  const where = ALL_SCOPES.filter((s) => enabled(ctxFor(s)).includes(name));
  ui.kv('enabled', where.length ? c.green(where.map(scopeName).join(', ')) : c.gray('not here'));
  ui.blank();
  ui.log(`  ${c.gray('install')}  ${c.accent(`skills add ${name}`)}${c.gray('   --local just me · --global everywhere')}`);
}

async function cmdUpdate() {
  const dry = flag('dry-run');
  const scopes = scopeFromFlags() ? [scopeFromFlags()] : ALL_SCOPES.filter((s) => existsSync(ctxFor(s).lock));
  if (!scopes.length) die('nothing installed with this CLI here or globally (no craft lockfile).');
  ui.banner(dry ? 'update · dry run' : 'update');
  for (const scope of scopes) {
    const ctx = ctxFor(scope);
    const lock = readJson(ctx.lock, null);
    if (!lock) { ui.warn(`no lockfile for ${scopeName(scope)} (${ctx.lock})`); continue; }
    const source = lock.marketplace.source;
    const head = sourceCommit(source);
    const same = head === lock.marketplace.commit;
    ui.log(`  ${c.bold(SCOPES[scope].label)}  ${c.gray(source)}  ${String(lock.marketplace.commit).slice(0, 7)} → ${same ? c.gray('no change') : c.accent(String(head).slice(0, 7))}`);
    let current;
    if (existsSync(source)) current = readJson(join(source, '.claude-plugin', 'marketplace.json'));
    else current = JSON.parse(runSync('gh', ['api', `repos/${source}/contents/.claude-plugin/marketplace.json`, '-H', 'Accept: application/vnd.github.raw']).stdout);
    for (const [name, l] of Object.entries(lock.plugins)) {
      const e = current.plugins.find((p) => p.name === name);
      if (!e) { ui.warn(`${name}: removed from the marketplace`); continue; }
      if (l.sha && e.source.sha !== l.sha) {
        const repo = e.source.url.replace('https://github.com/', '').replace(/\.git$/, '');
        ui.log(`    ${c.accent(name)} ${l.sha.slice(0, 7)} → ${e.source.sha.slice(0, 7)}  ${c.under(`https://github.com/${repo}/compare/${l.sha}...${e.source.sha}`)}`);
        const r = runSync('gh', ['api', `repos/${repo}/compare/${l.sha}...${e.source.sha}`, '--jq', `.files[] | select(.filename | startswith("${e.source.path || ''}")) | "      \\(.status) \\(.filename) +\\(.additions)/-\\(.deletions)"`], { allowFail: true });
        if (r.stdout.trim()) ui.log(c.gray(r.stdout.trimEnd()));
      } else if (!l.sha && !same) ui.log(`    ${c.accent(name)} ${c.gray('own plugin, follows the marketplace commit')}`);
    }
    if (dry) continue;
    await step('Refreshing the craft marketplace', ['plugin', 'marketplace', 'update', MARKET], { cwd: ctx.dir, done: 'Marketplace refreshed' });
    for (const name of Object.keys(lock.plugins)) await step(`Updating ${c.bold(name)}`, ['plugin', 'update', `${name}@${MARKET}`, '--scope', scope], { cwd: ctx.dir, allowFail: true, done: `${c.bold(name)} up to date` });
    const versions = installed(ctx);
    lock.marketplace.commit = head;
    for (const [name, l] of Object.entries(lock.plugins)) {
      const e = current.plugins.find((p) => p.name === name);
      l.version = versions[name] ?? l.version;
      if (e && typeof e.source === 'object') l.sha = e.source.sha;
    }
    writeJson(ctx.lock, lock);
  }
  ui.blank();
  ui.log(dry ? `  ${sym.arrow} ${c.gray('dry run, nothing changed. Run')} ${c.accent('skills update')} ${c.gray('to apply.')}` : `  ${sym.arrow} restart Claude Code, or run ${c.accent('/reload-plugins')}`);
}

function cmdDoctor() {
  let bad = 0;
  const check = (cond, msg, fix) => { if (cond) ui.ok(msg); else { ui.fail(msg); if (fix) ui.log(`      ${c.gray('fix:')} ${c.accent(fix)}`); bad++; } };
  ui.banner('doctor');
  ui.log(`  ${c.bold('Tools')}`);
  ui.ok(`skills ${VERSION} ${c.gray(existsSync(join(REPO, '.git')) ? `(git clone ${REPO})` : '')}`);
  const v = runSync('claude', ['--version'], { allowFail: true }).stdout.match(/(\d+)\.(\d+)\.(\d+)/);
  const ver = v ? v.slice(1).map(Number) : null;
  check(ver && (ver[0] - MIN_CLAUDE[0] || ver[1] - MIN_CLAUDE[1] || ver[2] - MIN_CLAUDE[2]) >= 0, `Claude Code ${ver ? ver.join('.') : 'not found'} ${c.gray(`(need ≥ ${MIN_CLAUDE.join('.')})`)}`, 'npm i -g @anthropic-ai/claude-code@latest');
  const node = process.versions.node.split('.').map(Number);
  check(node[0] >= 22, `Node ${process.versions.node} ${c.gray('(need ≥ 22)')}`, 'install Node 22 LTS');
  check(runSync('git', ['--version'], { allowFail: true }).status === 0, 'git on PATH');
  const gh = runSync('gh', ['--version'], { allowFail: true }).status === 0;
  if (gh) ui.ok(`gh on PATH ${c.gray('(update --dry-run, oss-portfolio)')}`); else ui.warn(`gh not found ${c.gray('(optional: update --dry-run, oss-portfolio) https://cli.github.com')}`);
  if (WIN) check(runSync('bash', ['--version'], { allowFail: true }).status === 0, `Git Bash ${c.gray('(some third-party hooks are sh scripts)')}`, 'install Git for Windows');
  const shell = completion.detectShell();
  if (completion.SHELLS.includes(shell)) {
    const blocked = shell === 'powershell' && psInfo().find((p) => psBlocked(p.policy));
    if (blocked) ui.warn(`${blocked.exe} blocks scripts ${c.gray(`(${blocked.policy}): no profile, no skills.ps1, no tab completion. Fix: skills completion install`)}`);
    else if (completion.isInstalled(shell, psProfiles)) ui.ok(`tab completion ${c.gray(`(${shell})`)}`);
    else ui.warn(`tab completion not set up for ${shell} ${c.gray('(optional: skills completion install)')}`);
  }
  const m = runSync('claude', ['plugin', 'validate', REPO], { allowFail: true });
  check(m.status === 0, `marketplace manifest validates ${c.gray(REPO)}`, `claude plugin validate ${REPO}`);

  let anything = false;
  for (const scope of ALL_SCOPES) {
    const ctx = ctxFor(scope);
    let settings;
    try { settings = readJson(ctx.settings, {}); } catch (e) { ui.blank(); ui.log(`  ${c.bold(SCOPES[scope].label)}`); check(false, `${ctx.settings} is not valid JSON: ${e.message}`); continue; }
    const on = enabledIn(settings);
    const lock = readJson(ctx.lock, null);
    if (!on.length && !lock) continue;
    anything = true;
    ui.blank();
    ui.log(`  ${c.bold(SCOPES[scope].label)} ${c.gray(`· ${ctx.settings}`)}`);
    check(marketplaceKnown(ctx), 'craft marketplace declared', `skills add <plugin>${scopeFlag(scope)}`);
    if (lock) {
      const lp = Object.keys(lock.plugins).sort().join(', '), sp = [...on].sort().join(', ');
      check(lp === sp, `lockfile matches settings ${c.gray(`(${on.length} plugins)`)}`, `lock has [${lp}], settings has [${sp}]: run skills add/remove again`);
    } else check(false, 'lockfile present', `skills add <plugin>${scopeFlag(scope)}`);
    const have = installed(ctx);
    const missing = on.filter((p) => !(p in have));
    check(!missing.length, `${on.length - missing.length}/${on.length} plugins downloaded on this machine`, scope === 'user' ? `skills add ${missing.join(' ')} --global` : 'skills sync');
    for (const p of on.filter((x) => SAFEGUARDS[x])) check(lock?.safeguards?.[p], `${p} safeguard ${c.gray(`(${SAFEGUARDS[p].why})`)}`, `skills remove ${p}${scopeFlag(scope)} && skills add ${p}${scopeFlag(scope)}`);
  }
  if (!anything) { ui.blank(); ui.info(`no craft plugins here or globally ${c.gray('— run `skills` to pick some')}`); }
  ui.blank();
  ui.log(bad ? `  ${sym.fail} ${c.red(`${bad} problem${bad > 1 ? 's' : ''}`)}` : `  ${sym.ok} ${c.green('all good')}`);
  process.exitCode = bad ? 1 : 0;
}

// ---------- interactive ----------
async function interactive() {
  ui.banner();
  const git = isGitRepo(projectDir);
  const atHome = samePath(projectDir, homedir());
  ui.kv('folder', `${c.bold(basename(projectDir) || projectDir)} ${c.gray(git ? '(git repo)' : atHome ? '(home folder)' : '(not a git repo)')}`, 7);
  ui.kv('status', statusLine(), 7);
  ui.blank();
  requireClaude();

  // Fresh clone or new machine: offer to download what the repo already uses, first.
  if (!atHome) {
    const missing = missingDownloads();
    if (missing.length) {
      ui.warn(`this project uses ${c.bold(missing.map((m) => m.p).join(', '))}, not downloaded on this machine yet`);
      const yes = assumeYes || (await confirm({ message: 'Download them now?' }));
      if (isCancel(yes)) return;
      if (yes) { ui.blank(); await cmdSync({ banner: false }); ui.blank(); }
      const more = await confirm({ message: 'Change which plugins this project uses?', initial: false });
      if (isCancel(more) || !more) return;
      ui.blank();
    }
  }

  const choice = await select({
    message: 'What are you doing?',
    options: [
      ...RECIPES.map((r) => ({ value: r, label: r.title, hint: r.plugins.join(' + '), detail: r.why })),
      { value: 'pick', label: 'Pick plugins myself', hint: 'browse everything', detail: 'Every bundle, my plugins and the pinned third-party ones, with what each contains.' },
      { value: 'manage', label: 'Review or remove what\'s installed', hint: 'uncheck to remove' },
      { value: 'doctor', label: 'Check my setup', hint: 'skills doctor' },
    ],
  });
  if (isCancel(choice)) return;
  if (choice === 'doctor') { ui.blank(); return cmdDoctor(); }
  const recipe = typeof choice === 'object' ? choice : null;

  // Where. Home folder → only global makes sense.
  let scope;
  if (atHome) { scope = 'user'; ui.info(`home folder, so installing ${c.bold('globally')}`); }
  else {
    const installedScopes = ALL_SCOPES.filter((s) => enabled(ctxFor(s)).length);
    const initial = recipe?.scope && (recipe.scope !== 'local' || git) ? recipe.scope : choice === 'manage' && installedScopes.length ? installedScopes[0] : git ? 'project' : 'user';
    scope = await select({
      message: 'Install where?',
      initial,
      options: ['project', 'local', 'user'].map((s) => ({ value: s, label: SCOPES[s].label, hint: SCOPES[s].hint, detail: s === 'local' && !git ? 'Not a git repo, so the files can\'t be git-excluded; they still stay out of the shared settings.' : null })),
    });
    if (isCancel(scope)) return;
  }
  const ctx = ctxFor(scope);
  const m = market();
  const on = new Set(enabled(ctx));
  const lock = readJson(ctx.lock, null);
  const userPicked = new Set([...on].filter((p) => !lock?.plugins?.[p] || lock.plugins[p].requestedBy?.includes('user')));
  const start = new Set([...userPicked, ...(recipe?.plugins || [])]);

  const items = ['bundle', 'own', 'third-party'].flatMap((cat) => m.plugins.filter((p) => p.category === cat).map((p) => {
    const skills = typeof p.source === 'string' ? ownSkills(REPO, p.name).map((s) => s.name) : THIRD_PARTY_SKILLS[p.name] || [];
    const deps = dependencies(REPO, p);
    const detail = [
      c.dim(ui.wrap(BLURB[p.name] || p.description, ui.cols() - 8)),
      deps.length ? `${c.gray('includes')} ${deps.join(', ')} ${c.gray(`(${skillsOf(REPO, m, p.name).length} skills)`)}` : skills.length ? `${c.gray('skills')}   ${ui.clip(skills.join(', '), ui.cols() - 14)}` : `${c.gray('skills')}   hooks only`,
      HOOKS[p.name] ? `${c.yellow('hooks')}    ${ui.clip(HOOKS[p.name], ui.cols() - 14)}` : null,
      SAFEGUARDS[p.name] ? `${c.cyan('guard')}    ${SAFEGUARDS[p.name].why}` : null,
      OPT_IN[p.name] ? c.red('opt-in: you\'ll be asked to confirm') : null,
    ].filter(Boolean).join('\n');
    return { value: p.name, label: p.name, section: SECTIONS[cat], tag: on.has(p.name) ? '● installed' : '', hint: BLURB[p.name] || '', detail };
  }));
  const locked = (name, sel) => { const by = [...sel].find((b) => b !== name && dependencies(REPO, entry(b) || {}).includes(name)); return by ? `in ${by}` : null; };
  const picked = await multiselect({ message: `Plugins for ${SCOPES[scope].label}`, items, selected: start, locked });
  if (isCancel(picked)) return;

  // Diff against what's there. Things a selected bundle already brings aren't removed.
  const toAdd = [...picked].filter((p) => !on.has(p) || (!userPicked.has(p) && !locked(p, picked)));
  const toRemove = [...userPicked].filter((p) => !picked.has(p) && !locked(p, picked));
  if (!toAdd.length && !toRemove.length) { ui.blank(); ui.ok('nothing to change'); return; }

  ui.blank();
  ui.log(`  ${c.bold('Plan')} ${c.gray(`· ${SCOPES[scope].label}`)}`);
  for (const p of toAdd) ui.log(`  ${sym.add} ${c.bold(p)} ${c.gray(`${skillsOf(REPO, m, p).length} skills${HOOKS[p] ? ' · has hooks' : ''}`)}`);
  for (const p of toRemove) ui.log(`  ${sym.del} ${c.bold(p)}`);
  ui.blank();
  const optIns = toAdd.filter((p) => OPT_IN[p]);
  for (const p of optIns) {
    ui.log(c.yellow(OPT_IN[p].warning.split('\n').map((l) => `  ${l}`).join('\n')));
    const yes = await confirm({ message: `Install ${p} anyway?`, initial: false });
    if (isCancel(yes) || !yes) { toAdd.splice(toAdd.indexOf(p), 1); ui.hint(`skipping ${p}`); } else argv.push(`--${OPT_IN[p].flag}`);
  }
  if (!toAdd.length && !toRemove.length) return;
  const go = assumeYes || (await confirm({ message: 'Apply?' }));
  if (isCancel(go) || !go) { ui.hint('nothing changed'); return; }
  ui.blank();
  let added = [];
  if (toRemove.length) await removePlugins(ctx, toRemove);
  if (toAdd.length) ({ added } = await addPlugins(ctx, toAdd));
  summarize(ctx, added);
  if (added.length) nextSteps(ctx);
}

// ---------- authoring ----------
function newSkill() {
  const name = positional[0];
  const bundle = opt('bundle');
  if (!name || !bundle) die('usage: skills new-skill <name> --bundle <plugin> [--description "..."]');
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name) || name.length > 64) die('name must be lowercase letters, digits and single hyphens, at most 64 characters');
  if (/claude|anthropic/.test(name)) die('names containing "claude" or "anthropic" are reserved');
  const pdir = join(REPO, 'plugins', bundle);
  if (!existsSync(join(pdir, '.claude-plugin', 'plugin.json'))) die(`no plugin "${bundle}" (plugins/${bundle}/.claude-plugin/plugin.json)`);
  if (dependencies(REPO, entry(bundle) || {}).length) die(`"${bundle}" is a bundle with dependencies; put skills in a dependency-free plugin like craft-core`);
  const sdir = join(pdir, 'skills', name);
  if (existsSync(sdir)) die(`${sdir} already exists`);
  const desc = opt('description') || 'TODO: what this skill does, then "Use when ..." with the words a user would actually type. Third person, under 1024 characters.';
  const fill = (s) => s.replaceAll('{{name}}', name).replaceAll('{{bundle}}', bundle).replaceAll('{{description}}', desc);
  const tdir = join(REPO, 'templates');
  mkdirSync(sdir, { recursive: true });
  writeFileSync(join(sdir, 'SKILL.md'), fill(readFileSync(join(tdir, 'skill', 'SKILL.md'), 'utf8')));
  for (const t of readdirSync(join(tdir, 'evals'))) {
    const dest = join(pdir, 'evals', `${name}-${t}`);
    cpSync(join(tdir, 'evals', t), dest, { recursive: true });
    for (const f of walk(dest)) writeFileSync(f, fill(readFileSync(f, 'utf8')));
  }
  ui.banner('new skill');
  ui.ok(`plugins/${bundle}/skills/${name}/SKILL.md`);
  ui.ok(`plugins/${bundle}/evals/${name}-* ${c.gray('(3 trigger, 3 near-miss, 1 task)')}`);
  ui.blank();
  ui.log(`  ${c.bold('Next')} ${c.gray('(the skill-creator loop)')}`);
  [
    'Write the body: the steps a top professional takes, in order, under 500 lines. Detail goes in sibling files.',
    'Fill in the eval prompts: 3 that should trigger, 3 near-misses that shouldn\'t, 1 real task with graders.',
    `claude plugin validate plugins/${bundle}`,
    `claude plugin eval plugins/${bundle} --case "${name}-*trigger*" --ablation none --runs 1 --no-publish`,
    `claude plugin eval plugins/${bundle} --case "${name}-task*" --ablation with-without --runs 1 --no-publish`,
    `Try it for real: skills add ${bundle} --local --source local, then /reload-plugins after each edit.`,
  ].forEach((s, i) => ui.log(`  ${c.accent(`${i + 1}.`)} ${s}`));
}
function* walk(d) { for (const e of readdirSync(d, { withFileTypes: true })) { const p = join(d, e.name); if (e.isDirectory()) yield* walk(p); else yield p; } }

function vet() {
  const repo = positional[0];
  const sha = opt('sha'); const path = opt('path') || '';
  if (!repo || !sha) die('usage: skills vet <owner/repo> --sha <40-char commit> [--path sub/dir] [--name plugin-name]');
  if (!/^[0-9a-f]{40}$/.test(sha)) die('--sha must be a full 40-character commit SHA (pinning to a branch or tag is not reviewable)');
  const dir = join(tmpdir(), `craft-vet-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  runSync('git', ['init', '-q'], { cwd: dir });
  runSync('git', ['remote', 'add', 'origin', `https://github.com/${repo}.git`], { cwd: dir });
  runSync('git', ['fetch', '-q', '--depth', '1', 'origin', sha], { cwd: dir });
  runSync('git', ['-c', 'advice.detachedHead=false', 'checkout', '-q', 'FETCH_HEAD'], { cwd: dir });
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

// The CLI itself: a git clone pulls main; an npm install reinstalls the latest release tag.
async function selfUpdate() {
  ui.banner('self-update');
  let to = VERSION;
  if (existsSync(join(REPO, '.git'))) {
    const s = ui.spinner(`git pull ${c.gray(REPO)}`);
    const r = runSync('git', ['-C', REPO, 'pull', '--ff-only'], { allowFail: true });
    if (r.status) { s.fail(); die((r.stderr || r.stdout).trim()); }
    to = readJson(join(REPO, 'package.json'), {}).version || VERSION;
    s.succeed(r.stdout.includes('Already up to date') ? `already up to date ${c.gray(`(${VERSION}, main)`)}` : `updated to ${runSync('git', ['-C', REPO, 'rev-parse', '--short', 'HEAD']).stdout.trim()}`);
  } else {
    const s = ui.spinner('checking the latest release');
    let latest;
    try { latest = await update.latest(DEFAULT_SOURCE, 15000); } catch (e) { s.fail(); die(`couldn't reach GitHub: ${e.message}`); }
    if (!latest) { s.fail(); die(`no release published yet at github.com/${DEFAULT_SOURCE}/releases`); }
    update.writeCache(UPDATE_CACHE, { checked: Date.now(), latest });
    if (!update.newer(latest, VERSION) && !flag('force')) { s.succeed(`already on the latest release ${c.gray(`(${VERSION})`)}`); return; }
    s.succeed(`latest release ${c.bold(latest)}`);
    const spec = `github:${DEFAULT_SOURCE}#v${latest}`;
    const i = ui.spinner(`npm i -g ${spec}`);
    const r = await runAsync('npm', ['i', '-g', spec]);
    if (r.status) { i.fail(); die((r.stderr || r.stdout).trim()); }
    i.succeed('installed');
    to = latest;
  }
  if (to !== VERSION) ui.ok(`${c.gray(VERSION)} → ${c.bold(to)}`);
  // The old code is what's running, so ask the new code to rewrite any tab-completion hooks it changed.
  const r = spawnSync(process.execPath, [CLI, '__refresh-completion'], { encoding: 'utf8' });
  for (const sh of (r.stdout || '').split(/\s+/).filter(Boolean)) ui.ok(`tab completion for ${sh} refreshed`);
  ui.hint('Plugins update separately: skills update');
}

function cmdVersion() { console.log(VERSION); }

// ---------- after every command ----------
const readState = () => readJson(STATE, {});
// Tab completion sets itself up the first time the CLI runs in an interactive bash, zsh, fish or
// PowerShell, once per shell. `skills completion uninstall` is remembered, so it never comes back.
function autoCompletion() {
  const shell = completion.detectShell();
  const state = readState();
  if (!completion.SHELLS.includes(shell) || state.completion?.[shell]) return;
  const save = (v) => { try { writeJson(STATE, { ...state, completion: { ...state.completion, [shell]: v } }); } catch { /* read-only home */ } };
  if (completion.isInstalled(shell, psProfiles)) return save('installed');
  // A PowerShell that blocks scripts can't load a profile; `skills completion install` walks through that.
  if (shell === 'powershell' && psInfo().some((p) => psBlocked(p.policy))) return save('blocked');
  const { rcs } = completion.install(shell, psProfiles);
  if (!rcs.length) return;
  save('installed');
  ui.log(`\n  ${sym.info} tab completion is on for ${shell} ${c.gray(`from your next terminal · now: ${reloadHint(shell, rcs)} · undo: skills completion uninstall`)}`);
}
const reloadHint = (shell, rcs) => (shell === 'fish' ? 'exec fish' : shell === 'powershell' ? '. $PROFILE' : `source ${rcs[0].replace(completion.home(), '~').replace(/\\/g, '/')}`);

function updateNotice() {
  const latest = update.check({ current: VERSION, file: UPDATE_CACHE, respawn: [process.execPath, CLI, '__update-check'] });
  if (latest) console.error(`\n  ${sym.warn} update available: ${c.gray(VERSION)} → ${c.green(latest)} ${c.gray('·')} ${c.accent('skills self-update')}\n`);
}

function afterCommand() {
  if (cmd?.startsWith('__') || ['self-update', 'completion', 'version', '--version', '-v'].includes(cmd)) return;
  if (update.quiet()) return; // CI, pipes and scripts get nothing extra
  try { autoCompletion(); } catch { /* never let this fail a command */ }
  try { updateNotice(); } catch { /* same */ }
}

// ---------- tab completion ----------
// Hidden: the shell scripts call this on every Tab, so it only reads local files, never `claude`.
function completeWords() {
  const m = market();
  const own = new Set(m.plugins.filter((p) => p.category === 'own').map((p) => p.name));
  const data = {
    plugins: m.plugins.map((p) => ({ name: p.name, blurb: BLURB[p.name] || '', own: own.has(p.name) })),
    skills: m.plugins.flatMap((p) => (typeof p.source === 'string' ? ownSkills(REPO, p.name).map((s) => s.name) : THIRD_PARTY_SKILLS[p.name] || []).map((name) => ({ name, plugin: p.name }))),
    recipes: RECIPES,
    enabled: (scope) => (scope ? [scope] : ALL_SCOPES).flatMap((s) => { try { return enabled(ctxFor(s)); } catch { return []; } }),
  };
  const out = completion.complete(argv.slice(1), data);
  if (out.length) process.stdout.write(out.join('\n') + '\n');
}

// PowerShell keeps its profile under Documents, which OneDrive may have moved, so ask it.
// Windows PowerShell 5.1 and PowerShell 7 each have their own profile; hook up whichever exist.
let PS_INFO;
function psInfo(fresh = false) {
  if (PS_INFO && !fresh) return PS_INFO;
  return (PS_INFO = (WIN ? ['powershell', 'pwsh'] : ['pwsh']).map((exe) => {
    const r = runSync(exe, ['-NoProfile', '-NonInteractive', '-Command', '$PROFILE.CurrentUserCurrentHost; Get-ExecutionPolicy'], { allowFail: true });
    const [profile, policy] = r.status === 0 ? r.stdout.trim().split(/\r?\n/).map((s) => s.trim()) : [];
    return { exe, profile, policy };
  }).filter((p) => p.profile));
}
const psProfiles = () => psInfo().map((p) => p.profile);
// Windows ships with scripts disabled, which stops profiles (and npm's skills.ps1) from loading.
const psBlocked = (policy) => ['Restricted', 'AllSigned', 'Undefined'].includes(policy);

// A profile line that can't load prints an error on every new PowerShell, so fix the policy first.
async function allowPsScripts() {
  const blocked = psInfo().filter((p) => psBlocked(p.policy));
  if (!blocked.length) return;
  const fix = 'Set-ExecutionPolicy -Scope CurrentUser RemoteSigned';
  ui.warn(`PowerShell won't run scripts here ${c.gray(`(execution policy: ${blocked[0].policy})`)}, so it can't load completion from your profile.`);
  ui.log(`    ${c.gray('RemoteSigned for your user lets scripts on this machine run; downloaded ones still need a signature.')}`);
  ui.log(`    ${c.gray('It also lets PowerShell run npm\'s skills.ps1. Fix:')} ${c.accent(fix)}`);
  if (!assumeYes) {
    if (!process.stdin.isTTY) die(`run this in PowerShell, then try again:\n${fix}`);
    const yes = await confirm({ message: `Run ${fix} now?`, initialValue: true });
    if (isCancel(yes) || !yes) die(`left your execution policy alone. Run this when you're ready, then try again:\n${fix}`);
  }
  for (const { exe } of blocked) runSync(exe, ['-NoProfile', '-NonInteractive', '-Command', `${fix} -Force`], { allowFail: true });
  const still = psInfo(true).filter((p) => psBlocked(p.policy));
  if (still.length) die(`${still.map((p) => p.exe).join(' and ')} still blocks scripts (${still[0].policy}). A group policy may be setting it; ask your admin.`);
  ui.ok(`execution policy ${c.gray('RemoteSigned (current user)')}`);
}

async function cmdCompletion() {
  const [what, which] = positional;
  if (completion.SHELLS.includes(what)) { process.stdout.write(completion.script(what)); return; }
  const shell = which || completion.detectShell();
  if (!completion.SHELLS.includes(shell)) die(`no completion for "${shell}". Pick one of: ${completion.SHELLS.join(', ')}`);
  if (what === 'install') {
    if (shell === 'powershell') await allowPsScripts();
    const { file, rcs, changed } = completion.install(shell, psProfiles);
    if (shell === 'powershell' && !rcs.length) die('could not find a PowerShell profile path (is powershell or pwsh on PATH?)');
    ui.ok(`tab completion for ${c.bold(shell)} ${c.gray(file)}`);
    for (const rc of rcs) ui.log(`  ${changed.includes(rc) ? sym.ok : c.gray('·')} ${changed.includes(rc) ? 'loaded from' : c.gray('already in')} ${c.gray(rc)}`);
    try { writeJson(STATE, { ...readState(), completion: { ...readState().completion, [shell]: 'installed' } }); } catch { /* fine */ }
    ui.blank(); ui.hint(`open a new terminal (or run ${reloadHint(shell, rcs)}), then try: skills add <Tab>`);
    return;
  }
  if (what === 'uninstall') {
    const changed = completion.uninstall(shell, psProfiles);
    try { writeJson(STATE, { ...readState(), completion: { ...readState().completion, [shell]: 'removed' } }); } catch { /* fine */ }
    if (changed.length) for (const f of changed) ui.ok(`removed from ${c.gray(f)}`); else ui.info(`tab completion for ${shell} was not installed`);
    return;
  }
  if (what) die(`usage: skills completion [install | uninstall] [${completion.SHELLS.join(' | ')}]`);
  ui.banner('tab completion');
  ui.log(`  ${c.accent(ui.pad('skills completion install', 40))}${c.gray(`set it up for ${shell} (detected)`)}`);
  ui.log(`  ${c.accent(ui.pad('skills completion install <shell>', 40))}${c.gray(completion.SHELLS.join(', '))}`);
  ui.log(`  ${c.accent(ui.pad('skills completion <shell>', 40))}${c.gray('print the script, to wire up yourself')}`);
  ui.log(`  ${c.accent(ui.pad('skills completion uninstall', 40))}${c.gray('take it out again')}`);
  ui.blank();
}

// ---------- help ----------
function help() {
  ui.banner();
  const row = (a, b) => ui.log(`  ${c.accent(ui.pad(a, 40))}${c.gray(b)}`);
  ui.log(`  ${c.bold('Pick & install')}`);
  row('skills', 'interactive: scenario → scope → plugins');
  row('skills use [scenario]', 'install a scenario recipe (no arg: list them)');
  row('skills add <name>...', 'plugin, bundle or skill name');
  row('skills remove <name>...', 'uninstall + prune unused deps');
  ui.blank();
  ui.log(`  ${c.bold('See')}`);
  row('skills list', 'everything, with what\'s enabled where');
  row('skills info <name>', 'skills, hooks, safeguards, pin');
  row('skills doctor', 'check tools, settings, downloads');
  ui.blank();
  ui.log(`  ${c.bold('Keep current')}`);
  row('skills sync', 'download what this project enables');
  row('skills update [--dry-run]', 'marketplace + plugins, refresh lock');
  ui.blank();
  ui.log(`  ${c.bold('Author')}`);
  row('skills new-skill <name> --bundle <p>', 'skill + 7 eval cases from templates');
  row('skills vet <owner/repo> --sha <sha>', 'scan a third-party skill before pinning');
  row('skills self-update', 'update this CLI to the latest release');
  row('skills completion install', 'Tab-complete commands, plugins, skills, flags');
  ui.blank();
  ui.log(`  ${c.bold('Scope')}  ${c.gray('(default: this project, shared)')}`);
  row('--local', 'this project, just me (git-ignored)');
  row('--global', 'every project on this machine');
  ui.blank();
  ui.log(`  ${c.bold('Version')}  ${c.gray(`${VERSION} · skills --version`)}`);
  ui.log(`  ${c.bold('Other')}  ${c.gray('--dir PATH · --source github|local|PATH · --no-safeguards · --yes · --accept-impeccable')}`);
  ui.blank();
}

// ---------- main ----------
const commands = {
  list: cmdList, ls: cmdList, add: cmdAdd, install: cmdAdd, remove: cmdRemove, rm: cmdRemove, uninstall: cmdRemove,
  use: cmdUse, info: cmdInfo, show: cmdInfo, sync: cmdSync, update: cmdUpdate, doctor: cmdDoctor,
  'new-skill': newSkill, vet, help, '--help': help, '-h': help, pick: interactive, 'self-update': selfUpdate,
  completion: cmdCompletion, __complete: completeWords, version: cmdVersion, '--version': cmdVersion, '-v': cmdVersion,
  '__update-check': () => update.refreshCache(DEFAULT_SOURCE, UPDATE_CACHE),
  '__refresh-completion': () => { const r = completion.refresh(); if (r.length) console.log(r.join(' ')); },
};
try {
  if (!cmd) { if (process.stdin.isTTY || flag('interactive')) await interactive(); else help(); }
  else if (commands[cmd]) await commands[cmd]();
  else { help(); die(`unknown command "${cmd}"`); }
} catch (e) {
  if (!(e instanceof Fatal)) throw e;
  console.error(`\n  ${sym.fail} ${e.message.split('\n').join('\n    ')}\n`);
  process.exitCode = 1;
}
afterCommand();
