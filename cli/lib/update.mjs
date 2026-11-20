// Update notices. At most once a day a detached child asks GitHub for the latest release and caches
// the answer; every later command reads that cache (no network) and, if a newer release exists,
// prints one line. Silent in CI, when output is piped, and with SKILLS_NO_UPDATE_CHECK=1.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { spawn } from 'node:child_process';

const DAY = 24 * 60 * 60 * 1000;

const parse = (v) => (String(v).match(/^v?(\d+)\.(\d+)\.(\d+)$/) || []).slice(1).map(Number);
// True when version a is newer than version b. Anything unparseable is never newer.
export function newer(a, b) {
  const x = parse(a), y = parse(b);
  if (x.length !== 3 || y.length !== 3) return false;
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i];
  return false;
}

// The latest published (non-draft, non-prerelease) release, as "1.2.3", or null if there is none.
// github.com/<repo>/releases/latest redirects to .../releases/tag/<tag>. Unlike api.github.com it
// isn't capped at 60 requests an hour per IP, which a shared office or VPN address runs out of.
export async function latest(repo, timeout = 5000) {
  const r = await fetch(`https://github.com/${repo}/releases/latest`, {
    redirect: 'manual',
    headers: { 'user-agent': 'craft-skills-cli' },
    signal: AbortSignal.timeout(timeout),
  });
  if (r.status < 300 || r.status >= 400) throw new Error(`GitHub answered ${r.status}`);
  const tag = decodeURIComponent((r.headers.get('location') || '').match(/\/releases\/tag\/([^/?#]+)$/)?.[1] || '');
  return parse(tag).length === 3 ? tag.replace(/^v/, '') : null; // no tag in the redirect: no release yet
}

const readCache = (file) => { try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return {}; } };
export function writeCache(file, data) {
  try { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, JSON.stringify(data) + '\n'); } catch { /* read-only home: skip */ }
}
export const cacheFile = (dir) => join(dir, 'update-check.json');

export function quiet(env = process.env) {
  return Boolean(env.CI || env.SKILLS_NO_UPDATE_CHECK || !process.stdout.isTTY || !process.stderr.isTTY);
}

// Returns the newer version if the cache knows of one, and starts a background refresh when the
// cache is a day old. `respawn` is [node, script, ...args] for the child that does the fetch.
export function check({ current, file, respawn, now = Date.now() }) {
  const cache = readCache(file);
  if (!(now - (cache.checked || 0) < DAY)) {
    writeCache(file, { ...cache, checked: now }); // claim today's check before spawning, so parallel runs don't all fetch
    try {
      const [bin, ...args] = respawn;
      spawn(bin, args, { detached: true, stdio: 'ignore', windowsHide: true }).unref();
    } catch { /* no update check this time */ }
  }
  return newer(cache.latest, current) ? cache.latest : null;
}

// What the detached child runs.
export async function refreshCache(repo, file) {
  try {
    const v = await latest(repo);
    writeCache(file, { checked: Date.now(), latest: v });
  } catch { /* offline or rate-limited: try again tomorrow */ }
}
