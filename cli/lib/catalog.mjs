// What's in the marketplace, in words a person picks from: short blurbs, skill lists,
// hooks, and the scenario recipes the picker and `skills use` offer.
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export function loadMarketplace(repo) {
  return JSON.parse(readFileSync(join(repo, '.claude-plugin', 'marketplace.json'), 'utf8'));
}

// One line each, for lists and the picker. The marketplace description stays the long form.
export const BLURB = {
  core: 'The everyday stack: craft-core + ops + superpowers + matt-eng + ponytail',
  'craft-core': 'Senior PRs, security gate, project docs, product lens, deepen',
  ops: 'Bug triage, observability, dependency updates, releases, maintenance',
  web: 'UI/UX stack: craft-web + stageshow + charles + emil + playwright',
  'craft-web': 'ui-pipeline: critique → demo → unslop → polish → verify',
  security: 'Heavy engines: Anthropic security-guidance + Cloudflare audit',
  oss: 'Contribute upstream the maintainers\' way, sync your PR portfolio',
  writing: 'Write in your own voice, recompute every number you publish',
  superpowers: 'Brainstorm → plan → TDD → subagent-driven development',
  'matt-eng': 'Grilling interviews, DDD, codebase design, specs and tickets',
  ponytail: 'Simplest-solution mode: YAGNI, stdlib first',
  'security-guidance': 'Edit-time warnings + LLM diff and commit review',
  'security-audit': 'Evidence-driven security audit with a findings schema',
  'skill-creator': 'Create skills and run the description + eval loop',
  'playwright-cli': 'Drive a real browser from the shell for UI checks',
  impeccable: 'Design critique engine (opt-in: unreviewable binary hooks)',
  stageshow: 'Faux product UI and cursor demos in React/CSS',
  'charles-design': 'charles-unslop + charles-polish: remove the AI look',
  'emil-design-eng': 'Design-engineering details for UI polish and motion',
};

// Skills inside third-party plugins (own plugins are read from disk). Kept in step with
// tests/expected/core.json for the core deps; the rest are single-skill plugins.
export const THIRD_PARTY_SKILLS = {
  superpowers: ['brainstorming', 'writing-plans', 'executing-plans', 'test-driven-development', 'subagent-driven-development', 'systematic-debugging', 'dispatching-parallel-agents', 'requesting-code-review', 'receiving-code-review', 'verification-before-completion', 'using-git-worktrees', 'finishing-a-development-branch', 'writing-skills', 'using-superpowers', 'diagnosing-superpowers'],
  'matt-eng': ['grill-with-docs', 'grilling', 'domain-modeling', 'codebase-design', 'to-spec', 'to-tickets', 'improve-codebase-architecture', 'setup-matt-pocock-skills'],
  ponytail: ['ponytail', 'ponytail-audit', 'ponytail-review', 'ponytail-debt', 'ponytail-gain', 'ponytail-help'],
  'security-audit': ['security-audit'],
  'skill-creator': ['skill-creator'],
  'playwright-cli': ['playwright-cli'],
  impeccable: ['impeccable'],
  stageshow: ['stageshow'],
  'charles-design': ['charles-unslop', 'charles-polish'],
  'emil-design-eng': ['emil-design-eng'],
  'security-guidance': [],
};

// What runs without being asked. Shown before install so nothing is a surprise.
export const HOOKS = {
  'craft-core': 'first-prompt deepen (CRAFT_DEEPEN=off) + push guard on git push / gh pr create',
  superpowers: 'SessionStart: injects using-superpowers into every session',
  ponytail: 'SessionStart ruleset + codebase map, SubagentStart, status band',
  'security-guidance': 'every edit and turn: pattern warnings + LLM diff review (pip install, network)',
  impeccable: 'prebuilt engine binary with network on session start, every edit and stop',
};

export const SECTIONS = { bundle: 'Bundles', own: 'My plugins', 'third-party': 'Third-party (pinned)' };

// Scenario recipes: the pathways in the README, runnable as `skills use <id>`.
// scope: where these usually belong. The picker pre-selects it; flags override it.
export const RECIPES = [
  { id: 'everyday', title: 'My own project, the full workflow', plugins: ['core'], scope: 'project',
    why: 'Think → decide → plan → build → ship → run. The default for anything you own.' },
  { id: 'existing-repo', title: 'Existing repo, I just want clean PRs + a security gate', plugins: ['craft-core'], scope: 'local',
    why: 'Only my own skills, no third-party hooks, and nothing committed to the repo.' },
  { id: 'frontend', title: 'Frontend / UI work', plugins: ['core', 'web'], scope: 'project',
    why: 'Everyday stack plus the UI pipeline, demos, unslop, polish and browser checks.' },
  { id: 'live-app', title: 'App is in production', plugins: ['ops'], scope: 'project',
    why: 'Bug triage, observability, safe dependency updates, releases, maintenance routine.' },
  { id: 'security', title: 'Security review before shipping', plugins: ['craft-core', 'security'], scope: 'project',
    why: 'The security gate plus the heavy engines it can call. security-guidance costs tokens every turn.' },
  { id: 'contribute', title: 'Contributing to someone else\'s open-source repo', plugins: ['oss', 'craft-core'], scope: 'local',
    why: 'Their repo, their rules: just-me scope keeps .claude/ out of your PR.' },
  { id: 'writing', title: 'Writing posts, replies, applications, charts', plugins: ['writing'], scope: 'user',
    why: 'Useful anywhere, so install once globally.' },
  { id: 'skill-dev', title: 'Building new skills', plugins: ['skill-creator'], scope: 'user',
    why: 'Anthropic\'s skill-creator for the description and eval loop.' },
];

export const SCOPES = {
  project: { flag: '', label: 'this project (shared)', short: 'project', hint: '.claude/settings.json — commit it, the team gets the same skills' },
  local: { flag: '--local', label: 'this project (just me)', short: 'just me', hint: '.claude/settings.local.json — git-ignored, nothing to commit' },
  user: { flag: '--global', label: 'everywhere (global)', short: 'global', hint: '~/.claude/settings.json — every project on this machine' },
};

export function ownSkills(repo, plugin) {
  const dir = join(repo, 'plugins', plugin, 'skills');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((d) => existsSync(join(dir, d, 'SKILL.md'))).map((name) => {
    const text = readFileSync(join(dir, name, 'SKILL.md'), 'utf8');
    const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] || '';
    const description = fm.match(/^description:\s*(.*)$/m)?.[1]?.replace(/^["']|["']$/g, '') || '';
    const manual = /^disable-model-invocation:\s*(true|yes)/m.test(fm);
    return { name, description, manual };
  });
}

export function dependencies(repo, entry) {
  if (typeof entry.source !== 'string') return [];
  const pj = join(repo, entry.source, '.claude-plugin', 'plugin.json');
  return existsSync(pj) ? JSON.parse(readFileSync(pj, 'utf8')).dependencies || [] : [];
}

// Every skill a plugin brings, including through its dependencies.
export function skillsOf(repo, market, name, seen = new Set()) {
  if (seen.has(name)) return [];
  seen.add(name);
  const e = market.plugins.find((p) => p.name === name);
  if (!e) return [];
  const own = typeof e.source === 'string' ? ownSkills(repo, name).map((s) => `${name}:${s.name}`) : (THIRD_PARTY_SKILLS[name] || []).map((s) => `${name}:${s}`);
  return [...own, ...dependencies(repo, e).flatMap((d) => skillsOf(repo, market, d, seen))];
}

// Which plugin ships a skill: own skills from disk, third-party from the table above.
export function pluginForSkill(repo, market, skill) {
  for (const p of market.plugins) {
    if (typeof p.source === 'string' ? ownSkills(repo, p.name).some((s) => s.name === skill) : (THIRD_PARTY_SKILLS[p.name] || []).includes(skill)) return p.name;
  }
  return null;
}

// Which bundles pull a plugin in.
export function includedIn(repo, market, name) {
  return market.plugins.filter((p) => dependencies(repo, p).includes(name)).map((p) => p.name);
}
