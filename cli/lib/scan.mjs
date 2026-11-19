// Static scan of a third-party skill or plugin tree. Reads every file and executes nothing.
// It flags what a reviewer must read by hand: scripts, hooks, network, process spawning,
// secrets access, home-directory writes, package installs, prompt-injection phrases and
// hidden unicode. A clean scan is not a security review. It's a reading list.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, extname, sep } from 'node:path';
import { createHash } from 'node:crypto';

const EXEC = new Set(['.sh', '.bash', '.ps1', '.psm1', '.py', '.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.bat', '.cmd', '.rb', '.go', '.rs']);
export const PATTERNS = {
  network: /\b(curl|wget|Invoke-WebRequest|Invoke-RestMethod)\b|\bfetch\(|requests\.(get|post|put)|urllib|http\.client|https?\.request|\baxios\b|new WebSocket|XMLHttpRequest|socket\.(socket|connect)|net\.connect|sendBeacon/g,
  process: /subprocess|child_process|\bspawn(Sync)?\(|\bexecSync\(|\bexec(File)?\(|os\.system|os\.popen|Start-Process|\beval\(|new Function\(/g,
  secrets: /ANTHROPIC_API_KEY|CLAUDE_CODE_OAUTH|OPENAI_API_KEY|GITHUB_TOKEN|\.ssh\/|\.aws\/|keychain|credential/g,
  home_write: /~\/\.claude|\.config\/|USERPROFILE|os\.homedir|expanduser|Path\.home/g,
  installs: /npm (i|install)\b|pip install|npx |uvx |bunx |postinstall|preinstall/g,
  injection: /ignore (all |any )?(previous|prior) instructions|do not (tell|inform|mention to) the user|without (asking|telling) the user|dangerously-skip-permissions|bypassPermissions|you are now/gi,
};
const HIDDEN = /[​-‏‪-‮⁦-⁩﻿]/;

export function scanTree(root) {
  const res = { files: 0, bytes: 0, exec: [], binary: [], hooks: [], hidden: [], flags: Object.fromEntries(Object.keys(PATTERNS).map((k) => [k, []])), manifest: [] };
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (e.name === '.git' || e.name === 'node_modules') { if (e.name === 'node_modules') res.binary.push(relative(root, join(d, e.name)) + '/ (node_modules: not scanned, flag it)'); continue; }
      const p = join(d, e.name);
      if (e.isDirectory()) { walk(p); continue; }
      const rel = relative(root, p).split(sep).join('/');
      const buf = readFileSync(p);
      res.files++; res.bytes += buf.length;
      res.manifest.push({ path: rel, sha256: createHash('sha256').update(buf).digest('hex'), size: buf.length });
      if (buf.subarray(0, 8000).includes(0)) { res.binary.push(rel); continue; }
      const text = buf.toString('utf8');
      if (EXEC.has(extname(rel).toLowerCase()) || text.startsWith('#!')) res.exec.push(rel);
      if (/(^|\/)hooks?(\/.*)?\.json$/.test(rel) || (rel.endsWith('plugin.json') && text.includes('"hooks"'))) res.hooks.push(rel);
      if (HIDDEN.test(text)) res.hidden.push(rel);
      const lines = text.split('\n');
      for (const [k, rx] of Object.entries(PATTERNS)) {
        rx.lastIndex = 0;
        let m;
        while ((m = rx.exec(text))) {
          const ln = text.slice(0, m.index).split('\n').length;
          res.flags[k].push(`${rel}:${ln}: ${lines[ln - 1].trim().slice(0, 140)}`);
        }
      }
    }
  };
  if (!statSync(root).isDirectory()) throw new Error(`${root} is not a directory`);
  walk(root);
  return res;
}
