#!/usr/bin/env node
// Renders the README art: assets/banner.svg and assets/demo.svg (an animated terminal
// replay of the `skills` picker). Plain SVG + CSS keyframes, which GitHub animates.
// Re-run after changing the CLI's look: node scripts/readme-assets.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(REPO, 'assets');
mkdirSync(OUT, { recursive: true });

const K = { bg: '#121418', bar: '#1b1e24', fg: '#d7dae0', dim: '#8b939e', gray: '#5d6570', amber: '#f5a623', green: '#3fb950', cyan: '#39c5cf', yellow: '#d6a32e', red: '#f85149', white: '#ffffff' };
const MONO = `ui-monospace, 'SF Mono', 'Cascadia Mono', Menlo, Consolas, monospace`;
const SANS = `-apple-system, 'Segoe UI', 'Inter', Helvetica, Arial, sans-serif`;
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// A line is a list of [text, color, bold?] segments.
const line = (...segs) => segs.map((s) => (typeof s === 'string' ? [s, K.fg] : s));
function text(lines, x, y, lh, size = 14) {
  return lines.map((l, i) => `<text x="${x}" y="${y + i * lh}" font-size="${size}" xml:space="preserve">${l.map(([t, col, b]) => `<tspan fill="${col}"${b ? ' font-weight="700"' : ''}>${esc(t)}</tspan>`).join('')}</text>`).join('\n');
}

// ---------- demo ----------
const P = [`~/work/acme-api `, K.cyan];
const prompt = (typed, cursor = true) => line(P, ['$ ', K.dim], [typed, K.fg], ...(cursor ? [['▍', K.amber]] : []));
const head = [
  line(['  ◆ ', K.amber], ['craft', K.white, true], [' — ', K.gray], ['skills for Claude Code', K.dim]),
  line(),
  line(['  folder  ', K.gray], ['acme-api', K.fg, true], [' (git repo)', K.gray]),
  line(['  status  ', K.gray], ['global: ', K.gray], ['writing', K.fg]),
  line(),
];
const recipes = [
  ['My own project, the full workflow', 'core'],
  ['Existing repo, I just want clean PRs + a security gate', 'craft-core'],
  ['Frontend / UI work', 'core + web'],
  ['App is in production', 'ops'],
  ['Security review before shipping', 'craft-core + security'],
  ['Contributing to someone else\'s open-source repo', 'oss + craft-core'],
  ['Writing posts, replies, applications, charts', 'writing'],
  ['Pick plugins myself', 'browse everything'],
];
const why = ['Think → decide → plan → build → ship → run. The default for anything you own.', 'Only my own skills, no third-party hooks, and nothing committed to the repo.'];
const q = (t, sub) => line(['? ', K.amber], [t, K.white, true], [`  ${sub}`, K.gray]);
const done = (t, v) => line(['✔ ', K.green], [t, K.white, true], [' ' + v, K.amber]);
const menu = (at) => [
  q('What are you doing?', '↑↓ move · enter select · esc cancel'),
  ...recipes.map(([t, h], i) => (i === at ? line(['  ❯ ', K.amber], [t, K.white, true], [`  ${h}`, K.gray]) : line(`    ${t}`, [`  ${h}`, K.gray]))),
  line(),
  line(['    ' + why[at], K.dim]),
];
const scopes = [
  ['this project (shared)', '.claude/settings.json — commit it, the team gets the same skills'],
  ['this project (just me)', '.claude/settings.local.json — git-ignored, nothing to commit'],
  ['everywhere (global)', '~/.claude/settings.json — every project on this machine'],
];
const scopeMenu = (at) => [q('Install where?', '↑↓ move · enter select · esc cancel'), ...scopes.map(([t, h], i) => (i === at ? line(['  ❯ ', K.amber], [t, K.white, true], [`  ${h}`, K.gray]) : line(`    ${t}`, [`  ${h}`, K.gray])))];
const row = (cur, mark, name, hint, tag = '') => line([cur ? '❯ ' : '  ', K.amber], mark, [cur ? name.padEnd(14) : name.padEnd(14), cur ? K.white : K.fg, cur], [tag.padEnd(4), K.gray], [hint, K.gray]);
const on = ['◉ ', K.green], off = ['○ ', K.gray];
const pickRows = (checked) => [
  q('Plugins for this project (just me)', 'space toggle · enter confirm · esc cancel'),
  line(['  BUNDLES', K.gray]),
  row(false, off, 'core', 'The everyday stack: craft-core + ops + superpowers + …'),
  row(false, off, 'web', 'UI/UX stack: craft-web + stageshow + charles + emil + …'),
  line(['  MY PLUGINS', K.gray]),
  row(true, checked ? on : off, 'craft-core', 'Senior PRs, security gate, project docs, product lens, deepen'),
  row(false, off, 'ops', 'Bug triage, observability, dependency updates, releases'),
  row(false, off, 'oss', 'Contribute upstream the maintainers\' way'),
  line(),
  line(['    skills   ', K.gray], 'deepen, product-lens, project-docs, security-gate, senior-pr'),
  line(['    hooks    ', K.yellow], ['first-prompt deepen + push guard on git push / gh pr create', K.fg]),
  line(),
  line(['  selected: ', K.gray], checked ? ['craft-core', K.green] : ['nothing', K.gray]),
];
function boxed(segs) {
  const w = [...segs.map((s) => s[0]).join('')].length;
  return [line([`  ╭${'─'.repeat(w + 2)}╮`, K.green]), line(['  │ ', K.green], ...segs, [' │', K.green]), line([`  ╰${'─'.repeat(w + 2)}╯`, K.green])];
}
const answered = [done('What are you doing?', recipes[1][0])];
const answered2 = [...answered, done('Install where?', 'this project (just me)')];
const plan = [
  ...answered2, done('Plugins for this project (just me)', 'craft-core'), line(),
  line(['  Plan', K.white, true], [' · this project (just me)', K.gray]),
  line(['  + ', K.green], ['craft-core', K.white, true], [' 5 skills · has hooks', K.gray]),
  line(), line(['? ', K.amber], ['Apply?', K.white, true], [' (Y/n) ', K.gray], ['yes', K.green]), line(),
];
const installing = [...plan, line(['  ⠹ ', K.amber], 'Installing ', ['craft-core', K.white, true])];
const finished = [
  ...plan,
  line(['  ✔ ', K.green], 'Installed ', ['craft-core', K.white, true], [' 0.8s', K.gray]),
  line(),
  ...boxed([['✔ ', K.green], ['1 plugin', K.white, true], [' · ', K.gray], ['5 skills', K.white, true], [' → this project (just me)', K.gray]]),
  line(),
  line(['  Next', K.white, true], ['  nothing to commit: just-me files are excluded from git', K.gray]),
  line(['  › ', K.amber], 'restart Claude Code, or run ', ['/reload-plugins', K.amber]),
];

const typed = 'skills';
const frames = [
  ...[...Array(typed.length + 1).keys()].map((n) => ({ d: n === 0 ? 0.9 : 0.11, lines: [prompt(typed.slice(0, n))] })),
  { d: 0.35, lines: [prompt(typed, false)] },
  { d: 1.6, lines: [prompt(typed, false), line(), ...head, ...menu(0)] },
  { d: 2.0, lines: [prompt(typed, false), line(), ...head, ...menu(1)] },
  { d: 1.0, lines: [prompt(typed, false), line(), ...head, ...answered, ...scopeMenu(0)] },
  { d: 1.8, lines: [prompt(typed, false), line(), ...head, ...answered, ...scopeMenu(1)] },
  { d: 1.0, lines: [prompt(typed, false), line(), ...head, ...answered2, ...pickRows(false)] },
  { d: 2.0, lines: [prompt(typed, false), line(), ...head, ...answered2, ...pickRows(true)] },
  { d: 1.3, lines: [prompt(typed, false), line(), ...head, ...installing] },
  { d: 5.5, lines: [prompt(typed, false), line(), ...head, ...finished] },
];
const W = 920, LH = 20, TOP = 64, H = TOP + Math.max(...frames.map((f) => f.lines.length)) * LH + 28;
const total = frames.reduce((a, f) => a + f.d, 0);
let t = 0;
const css = [], groups = [];
frames.forEach((f, i) => {
  const s = (t / total) * 100, e = ((t + f.d) / total) * 100; t += f.d;
  const last = i === frames.length - 1;
  css.push(`@keyframes f${i}{0%{opacity:${i === 0 ? 1 : 0}}${i ? `${s.toFixed(3)}%{opacity:1}` : ''}${last ? '' : `${e.toFixed(3)}%{opacity:0}`}100%{opacity:${last ? 1 : 0}}}.f${i}{animation:f${i} ${total.toFixed(2)}s step-end infinite}`);
  groups.push(`<g class="f f${i}">${text(f.lines, 28, TOP, LH)}</g>`);
});
const demo = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Running skills: pick a scenario, choose just-me scope, check craft-core, install">
<style>.f{opacity:0}.f${frames.length - 1}{opacity:1}text{font-family:${MONO}}${css.join('')}@media (prefers-reduced-motion:reduce){.f{animation:none!important;opacity:0}.f${frames.length - 1}{opacity:1}}</style>
<rect width="${W}" height="${H}" rx="12" fill="${K.bg}"/>
<rect width="${W}" height="38" rx="12" fill="${K.bar}"/><rect y="26" width="${W}" height="12" fill="${K.bar}"/>
<circle cx="24" cy="19" r="6" fill="#ff5f57"/><circle cx="44" cy="19" r="6" fill="#febc2e"/><circle cx="64" cy="19" r="6" fill="#28c840"/>
<text x="${W / 2}" y="24" text-anchor="middle" font-size="12" fill="${K.gray}" font-family="${MONO}">skills — acme-api</text>
${groups.join('\n')}
</svg>
`;
writeFileSync(join(OUT, 'demo.svg'), demo);

// ---------- banner ----------
const BW = 1280, BH = 400;
const chips = ['core', 'craft-core', 'ops', 'web', 'security', 'oss', 'writing'];
let cx = 96;
const chipSvg = chips.map((n) => {
  const w = n.length * 9.6 + 28;
  const s = `<rect x="${cx}" y="292" width="${w}" height="32" rx="16" fill="#ffffff0d" stroke="#ffffff1f"/><text x="${cx + w / 2}" y="313" text-anchor="middle" font-family="${MONO}" font-size="15" fill="${K.fg}">${n}</text>`;
  cx += w + 10; return s;
}).join('');
const card = [
  line(['$ ', K.dim], 'skills use existing-repo'),
  line(),
  line(['  ✔ ', K.green], 'Installed ', ['craft-core', K.white, true], [' 0.8s', K.gray]),
  line(['  ◇ ', K.cyan], ['nothing committed · just me', K.gray]),
  line(),
  line(['$ ', K.dim], 'skills add web'),
  line(['  ✔ ', K.green], 'Installed ', ['web', K.white, true], [' + 5 plugins', K.gray]),
];
const banner = `<svg xmlns="http://www.w3.org/2000/svg" width="${BW}" height="${BH}" viewBox="0 0 ${BW} ${BH}" role="img" aria-label="craft — my Claude Code skills, picked per project">
<defs>
<radialGradient id="glow" cx="0.18" cy="0.3" r="0.7"><stop offset="0" stop-color="${K.amber}" stop-opacity="0.22"/><stop offset="1" stop-color="${K.amber}" stop-opacity="0"/></radialGradient>
<pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" fill="none" stroke="#ffffff" stroke-opacity="0.035"/></pattern>
<linearGradient id="word" x1="0" x2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#ffd9a0"/></linearGradient>
</defs>
<rect width="${BW}" height="${BH}" rx="20" fill="#0e1014"/>
<rect width="${BW}" height="${BH}" rx="20" fill="url(#grid)"/>
<rect width="${BW}" height="${BH}" rx="20" fill="url(#glow)"/>
<g transform="translate(96 150)"><path d="M0 -34 L34 0 L0 34 L-34 0 Z" transform="translate(30 0)" fill="${K.amber}"/><path d="M0 -15 L15 0 L0 15 L-15 0 Z" transform="translate(30 0)" fill="#0e1014"/></g>
<text x="190" y="176" font-family="${SANS}" font-size="84" font-weight="800" letter-spacing="-3" fill="url(#word)">craft</text>
<text x="96" y="236" font-family="${SANS}" font-size="27" fill="${K.fg}">My Claude Code skills — picked per project,</text>
<text x="96" y="270" font-family="${SANS}" font-size="27" fill="${K.dim}">installed in one command, pinned and reviewed.</text>
${chipSvg}
<g transform="translate(800 92)">
<rect width="400" height="216" rx="14" fill="${K.bg}" stroke="#ffffff1a"/>
<circle cx="22" cy="20" r="5" fill="#ff5f57"/><circle cx="40" cy="20" r="5" fill="#febc2e"/><circle cx="58" cy="20" r="5" fill="#28c840"/>
<g font-family="${MONO}">${text(card, 22, 58, 22, 14)}</g>
</g>
</svg>
`;
writeFileSync(join(OUT, 'banner.svg'), banner);
console.log(`wrote assets/banner.svg and assets/demo.svg (${frames.length} frames, ${total.toFixed(1)}s loop)`);
