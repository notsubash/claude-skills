#!/usr/bin/env node
// Check a postmortem against the craft template: required sections, a timestamped timeline,
// detection and mitigation times, complete action items, no leftover placeholders, no blame language.
// Usage: node check-postmortem.mjs <postmortem.md>   (exit 1 and a list of problems if any are found)
import { readFileSync, existsSync } from 'node:fs';

const file = process.argv[2];
if (!file || !existsSync(file)) { console.error('usage: node check-postmortem.mjs <postmortem.md>'); process.exit(2); }
const text = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const problems = [];
const bad = (m) => problems.push(m);

// Sections: split on "## " headings.
const sections = new Map();
for (const part of text.split(/^## +/m).slice(1)) {
  const nl = part.indexOf('\n');
  sections.set(part.slice(0, nl < 0 ? undefined : nl).trim().toLowerCase(), nl < 0 ? '' : part.slice(nl + 1).trim());
}
const section = (...names) => { for (const [k, v] of sections) if (names.some((n) => k.startsWith(n))) return v; return null; };
const REQUIRED = [['summary'], ['impact'], ['detection'], ['timeline'], ['causes', 'root cause', 'contributing'], ['what went well'], ['action items', 'actions']];
for (const names of REQUIRED) {
  const s = section(...names);
  if (s === null) bad(`missing section "## ${names[0][0].toUpperCase()}${names[0].slice(1)}"`);
  else if (!s.replace(/<!--[\s\S]*?-->/g, '').trim()) bad(`section "${names[0]}" is empty`);
}
if (!/^#\s+\S/m.test(text)) bad('no "# title" line');

// Placeholders left from the template.
const placeholders = [...new Set([...text.matchAll(/<(?!!--)[^<>\n]{2,80}>/g)].map((m) => m[0]).filter((p) => !/^<\/?(?:br|hr|img|p|a|b|i|em|strong|code|pre|kbd|sub|sup|div|span|details|summary|table|tr|td|th)\b[^>]*\/?>$/i.test(p) && !/^<https?:/.test(p)))];
if (placeholders.length) bad(`template placeholders left: ${placeholders.slice(0, 5).join(', ')}${placeholders.length > 5 ? ` and ${placeholders.length - 5} more` : ''}`);

// Detection and mitigation times.
const det = section('detection') || '';
if (!/time to detect[^\n]*\d/i.test(det)) bad('no time to detect (with a number) in "Detection and response"');
if (!/time to mitigate[^\n]*\d/i.test(det)) bad('no time to mitigate (with a number) in "Detection and response"');

// Timeline: a table or list with timestamps, at least 4 entries.
const tl = section('timeline') || '';
const stamped = tl.split('\n').filter((l) => /\b\d{1,2}:\d{2}\b/.test(l));
if (stamped.length < 4) bad(`timeline has ${stamped.length} timestamped entr${stamped.length === 1 ? 'y' : 'ies'}; expected at least 4 (trigger, impact, detection, mitigation)`);

// Action items: table rows need type, owner, due date and ticket.
const ai = section('action items', 'actions') || '';
const rows = ai.split('\n').filter((l) => /^\|/.test(l) && !/^\|\s*-/.test(l));
const header = (rows.shift() || '').toLowerCase().split('|').map((c) => c.trim());
const col = (name) => header.findIndex((h) => h.startsWith(name));
const need = { type: col('type'), owner: col('owner'), due: col('due'), ticket: col('ticket') };
for (const [k, i] of Object.entries(need)) if (i < 0 && rows.length) bad(`action items table has no "${k}" column`);
if (!rows.length) bad('no action items table rows');
if (rows.length > 10) bad(`${rows.length} action items; keep it to the few that matter (about 3 to 7)`);
const VAGUE = /^\s*(?:improve|investigate|look into|review|monitor|be (?:more )?careful|add more|better)\b[^,.;]{0,30}$/i;
for (const [n, r] of rows.entries()) {
  const c = r.split('|').map((x) => x.trim());
  const id = `action ${n + 1}`;
  if (need.owner >= 0 && (!c[need.owner] || /^(tbd|\?|-|team|everyone|eng(ineering)?|all)$/i.test(c[need.owner]))) bad(`${id}: needs one named owner (got "${c[need.owner] || ''}")`);
  if (need.due >= 0 && !/\d{4}-\d{2}-\d{2}/.test(c[need.due] || '')) bad(`${id}: needs a due date as YYYY-MM-DD`);
  if (need.ticket >= 0 && (!c[need.ticket] || /^(tbd|\?|-|none)$/i.test(c[need.ticket]))) bad(`${id}: needs a ticket link`);
  if (need.type >= 0 && !/prevent|detect|mitigate|process|investigate|repair/i.test(c[need.type] || '')) bad(`${id}: type should be prevent, detect, mitigate, process, investigate or repair`);
  const action = c[2] || '';
  if (VAGUE.test(action)) bad(`${id}: "${action}" is too vague; say exactly what changes and how we'll know it's done`);
}
const slow = /time to detect[^\n]*?(\d+)\s*(?:min|m\b)|time to detect[^\n]*?(\d+)\s*h/i.exec(det);
const detMin = slow ? (slow[1] ? +slow[1] : +slow[2] * 60) : 0;
if (detMin >= 15 && need.type >= 0 && !rows.some((r) => /detect/i.test(r.split('|')[need.type + 0] || ''))) bad(`time to detect was ${detMin} min but no action item has type "detect"`);

// Blame and hindsight language, outside quotes and code.
const prose = text.replace(/```[\s\S]*?```/g, '').replace(/`[^`]*`/g, '').replace(/^>.*$/gm, '');
const BLAME = [/\bhuman error\b/i, /\bshould have\b/i, /\bshould've\b/i, /\bfailed to\b/i, /\bcareless(ly|ness)?\b/i, /\bnegligen(t|ce)\b/i, /\bobviously\b/i, /\bjust had to\b/i, /\bfault of\b/i, /\bblame[ds]?\b(?!less)/i];
const blamed = new Set();
for (const re of BLAME) {
  const m = prose.match(new RegExp(`[^.\\n]*${re.source}[^.\\n]*`, 'i'));
  if (m && !blamed.has(m[0])) blamed.add(m[0]), bad(`blame or hindsight language: "${m[0].trim().slice(0, 100)}". Describe what people knew then, and what in the system allowed it`);
}

if (problems.length) { console.error(problems.map((p) => `FAIL ${p}`).join('\n')); process.exit(1); }
console.log(`ok  ${file}: ${rows.length} action items, ${stamped.length} timeline entries, no blame language`);
