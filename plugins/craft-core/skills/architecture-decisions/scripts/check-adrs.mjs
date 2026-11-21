#!/usr/bin/env node
// Check an ADR folder: numbering, status, supersede links, relative links, and the index.
// Usage: node check-adrs.mjs [dir]   (default: the first of docs/adr, doc/adr, docs/decisions,
// docs/architecture/decisions that exists). Exits 1 and lists every problem if any are found.
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';

const CANDIDATES = ['docs/adr', 'doc/adr', 'docs/decisions', 'docs/architecture/decisions', 'docs/architecture/adr'];
const dir = resolve(process.argv[2] || CANDIDATES.find((d) => existsSync(d)) || 'docs/adr');
if (!existsSync(dir) || !statSync(dir).isDirectory()) {
  console.error(`no ADR folder at ${dir}`);
  process.exit(1);
}

const problems = [];
const bad = (file, msg) => problems.push(`${file}: ${msg}`);
const INDEX = new Set(['readme.md', 'index.md']);
const STATUS = /^(proposed|accepted|rejected|deprecated|superseded by\b.*)$/i;

const md = readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.md'));
const adrs = md.filter((f) => !INDEX.has(f.toLowerCase()) && !/^template/i.test(f));
const byNumber = new Map();

for (const f of adrs) {
  const m = f.match(/^(\d{4})-([a-z0-9]+(?:-[a-z0-9]+)*)\.md$/);
  if (!m) { bad(f, 'name must be NNNN-kebab-title.md'); continue; }
  if (byNumber.has(m[1])) bad(f, `number ${m[1]} is also used by ${byNumber.get(m[1])}`);
  else byNumber.set(m[1], f);
}

const readStatus = (text) => {
  const front = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const fromFront = front?.[1].match(/^status:\s*["']?(.+?)["']?\s*$/im)?.[1];
  const fromLine = text.match(/^[-*]?\s*\**status\**:\**\s*(.+)$/im)?.[1];
  const fromHeading = text.match(/^#{2,3}\s*status\s*\r?\n+\s*(.+)$/im)?.[1];
  return (fromFront || fromLine || fromHeading || '').replace(/\*+/g, '').trim();
};

for (const [num, f] of byNumber) {
  const text = readFileSync(join(dir, f), 'utf8');
  if (!/^#\s+\S/m.test(text)) bad(f, 'no "# title" heading');
  const status = readStatus(text);
  if (!status) bad(f, 'no status (expected a "Status:" line, a "## Status" section or status: front matter)');
  else if (!STATUS.test(status)) bad(f, `status "${status}" is not one of Proposed, Accepted, Rejected, Deprecated, Superseded by NNNN`);
  if (/^superseded/i.test(status)) {
    const target = status.match(/(\d{4})/)?.[1];
    if (!target) bad(f, 'superseded, but names no ADR number');
    else if (!byNumber.has(target)) bad(f, `superseded by ${target}, which doesn't exist`);
    else if (target === num) bad(f, 'superseded by itself');
    else if (!readFileSync(join(dir, byNumber.get(target)), 'utf8').includes(num)) bad(byNumber.get(target), `doesn't mention the ADR it supersedes (${num})`);
  }
  for (const [, link] of text.matchAll(/\]\(([^)\s#]+)(?:#[^)]*)?\)/g)) {
    if (/^[a-z]+:/i.test(link) || link.startsWith('/')) continue; // external or site-absolute
    if (!existsSync(resolve(dirname(join(dir, f)), decodeURI(link)))) bad(f, `broken link ${link}`);
  }
}

const index = md.find((f) => INDEX.has(f.toLowerCase()));
if (index) {
  const text = readFileSync(join(dir, index), 'utf8');
  const listed = new Set([...text.matchAll(/\]\((?:\.\/)?(\d{4}-[^)\s#]+\.md)/g)].map((m) => m[1]));
  for (const f of byNumber.values()) if (!listed.has(f)) bad(index, `doesn't list ${f}`);
  for (const f of listed) if (!existsSync(join(dir, f))) bad(index, `lists ${f}, which doesn't exist`);
}

if (problems.length) {
  console.error(problems.map((p) => `FAIL ${p}`).join('\n'));
  process.exit(1);
}
console.log(`ok  ${byNumber.size} ADRs in ${dir}${index ? `, index ${index} in step` : ', no index file'}`);
