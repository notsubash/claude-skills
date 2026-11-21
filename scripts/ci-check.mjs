#!/usr/bin/env node
// Static checks CI runs on every push. These complement `claude plugin validate`, which
// checks the manifests' schema but not this repo's own rules.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const err = (m) => errors.push(m);
const json = (p) => JSON.parse(readFileSync(join(REPO, p), 'utf8'));

const market = json('.claude-plugin/marketplace.json');
const manifest = json('third_party/manifest.json');
const reviewed = new Map(manifest.plugins.map((p) => [p.name, p]));

// 1. Every third-party plugin is pinned to a full commit SHA and has a matching review entry.
for (const p of market.plugins) {
  if (typeof p.source === 'string') {
    if (!existsSync(join(REPO, p.source, '.claude-plugin', 'plugin.json'))) err(`${p.name}: ${p.source}/.claude-plugin/plugin.json missing`);
    continue;
  }
  if (p.category !== 'third-party') err(`${p.name}: remote source but category is not "third-party"`);
  if (!/^[0-9a-f]{40}$/.test(p.source.sha || '')) err(`${p.name}: source.sha must be a full 40-char commit SHA (got "${p.source.sha}")`);
  if (p.source.ref) err(`${p.name}: use sha only; a ref can move`);
  const r = reviewed.get(p.name);
  if (!r) err(`${p.name}: no entry in third_party/manifest.json`);
  else if (r.sha !== p.source.sha) err(`${p.name}: marketplace sha ${p.source.sha} != reviewed sha ${r.sha}. Re-review before bumping`);
}
for (const name of reviewed.keys()) if (!market.plugins.some((p) => p.name === name)) err(`third_party/manifest.json lists ${name}, which is not in the marketplace`);

// 2. Bundle dependencies resolve inside this marketplace.
const names = new Set(market.plugins.map((p) => p.name));
for (const p of market.plugins.filter((p) => typeof p.source === 'string')) {
  const pj = json(join(p.source, '.claude-plugin', 'plugin.json'));
  if (pj.name !== p.name) err(`${p.name}: plugin.json name is "${pj.name}"`);
  for (const d of pj.dependencies || []) if (!names.has(d.split('@')[0])) err(`${p.name}: dependency ${d} is not in the marketplace`);
  if ((pj.dependencies || []).length && existsSync(join(REPO, p.source, 'skills'))) err(`${p.name}: a bundle with dependencies must not ship its own skills (claude plugin eval can't load it). Put skills in a craft-* plugin`);
}

// 3. Own skills: frontmatter rules from the Agent Skills spec, plus eval coverage.
const fm = (text) => {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const o = {};
  for (const line of m[1].split(/\r?\n/)) { const k = line.match(/^([a-z-]+):\s*(.*)$/); if (k) o[k[1]] = k[2].replace(/^["']|["']$/g, ''); }
  return o;
};
let skillCount = 0;
for (const p of market.plugins.filter((p) => typeof p.source === 'string')) {
  const sdir = join(REPO, p.source, 'skills');
  if (!existsSync(sdir)) continue;
  const evals = existsSync(join(REPO, p.source, 'evals')) ? readdirSync(join(REPO, p.source, 'evals')) : [];
  for (const s of readdirSync(sdir)) {
    const f = join(sdir, s, 'SKILL.md');
    if (!existsSync(f)) continue;
    skillCount++;
    const text = readFileSync(f, 'utf8');
    const meta = fm(text);
    if (!meta) { err(`${s}: SKILL.md has no frontmatter`); continue; }
    if (meta.name !== s) err(`${s}: frontmatter name "${meta.name}" != folder name`);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(s) || s.length > 64) err(`${s}: name must be lowercase-hyphenated, at most 64 chars`);
    if (/claude|anthropic/.test(s)) err(`${s}: reserved word in name`);
    if (!meta.description || meta.description.length > 1024) err(`${s}: description missing or over 1024 chars (${(meta.description || '').length})`);
    if (/<[a-z]/i.test(meta.description || '')) err(`${s}: no XML tags in description`);
    const lines = text.split('\n').length;
    if (lines > 500) err(`${s}: SKILL.md is ${lines} lines (keep under 500)`);
    const manual = /^(true|yes|on|1)$/i.test(meta['disable-model-invocation'] || '');
    const n = (kind) => evals.filter((e) => new RegExp(`^${s}-${kind}-\\d+$`).test(e)).length;
    if (!manual && n('trigger') < 3) err(`${s}: needs >= 3 should-trigger evals (has ${n('trigger')})`);
    if (n('no-trigger') < 3) err(`${s}: needs >= 3 should-not-trigger evals (has ${n('no-trigger')})`);
    if (n('task') < 1) err(`${s}: needs >= 1 task eval`);
  }
}

// 4. The CLI catalog (picker blurbs, third-party skill lists) covers every marketplace entry.
const catalog = await import(new URL('../cli/lib/catalog.mjs', import.meta.url));
for (const p of market.plugins) {
  if (!catalog.BLURB[p.name]) err(`${p.name}: add a one-line BLURB in cli/lib/catalog.mjs`);
  if (typeof p.source !== 'string' && !(p.name in catalog.THIRD_PARTY_SKILLS)) err(`${p.name}: list its skills in THIRD_PARTY_SKILLS in cli/lib/catalog.mjs`);
}
for (const r of catalog.RECIPES) for (const n of r.plugins) if (!names.has(n)) err(`recipe ${r.id}: plugin ${n} is not in the marketplace`);

// 5. GitHub Actions are pinned to full commit SHAs, like third-party skills. Dependabot bumps them.
const wf = join(REPO, '.github', 'workflows');
for (const f of existsSync(wf) ? readdirSync(wf) : []) {
  for (const [, action] of readFileSync(join(wf, f), 'utf8').matchAll(/^\s*-?\s*uses:\s*([^\s#]+)/gm)) {
    if (action.startsWith('./') || action.startsWith('docker://')) continue;
    if (!/@[0-9a-f]{40}$/.test(action)) err(`.github/workflows/${f}: ${action} must be pinned to a full commit SHA (add "# vX.Y.Z" after it)`);
  }
}

if (errors.length) { console.error(errors.map((e) => `FAIL ${e}`).join('\n')); process.exit(1); }
console.log(`ok  ${market.plugins.length} marketplace entries, ${reviewed.size} pinned third-party reviews, ${skillCount} own skills with eval coverage`);
