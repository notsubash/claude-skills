// Interactive prompts: select one, multi-select, confirm. Arrow keys in a TTY; a numbered
// prompt when stdin isn't a TTY (pipes, mintty without winpty), so every flow still works.
import readline from 'node:readline';
import { c, sym, clip, width } from './ui.mjs';

const CANCEL = Symbol('cancel');
export const isCancel = (v) => v === CANCEL;

function io(opts) {
  const input = opts.input || process.stdin;
  const output = opts.output || process.stdout;
  return { input, output, tty: opts.tty ?? Boolean(input.isTTY && output.isTTY) };
}

// Draws a frame in place: moves the cursor back over the previous frame and clears below it.
function painter(output) {
  let lines = 0;
  return {
    draw(text) {
      const cols = (output.columns || 100) - 1;
      const rows = text.split('\n').map((l) => (width(l) > cols ? clipAnsi(l, cols) : l));
      output.write((lines ? `\x1b[${lines}A\r` : '\r') + '\x1b[J' + rows.join('\n') + '\n');
      lines = rows.length;
    },
    clear() { if (lines) output.write(`\x1b[${lines}A\r\x1b[J`); lines = 0; },
  };
}
// Clip a string with ANSI codes to n visible characters, keeping the codes.
function clipAnsi(s, n) {
  let outStr = '', seen = 0;
  for (const part of s.split(/(\x1b\[[0-9;]*m)/)) {
    if (part.startsWith('\x1b[')) { outStr += part; continue; }
    for (const ch of part) { if (seen >= n - 1) return outStr + '…\x1b[0m'; outStr += ch; seen++; }
  }
  return outStr;
}

function keyloop({ input, output }, onKey) {
  return new Promise((resolve) => {
    readline.emitKeypressEvents(input);
    const raw = input.isTTY && input.setRawMode;
    if (raw) input.setRawMode(true);
    input.resume();
    output.write('\x1b[?25l');
    const done = (v) => {
      input.off('keypress', handler);
      if (raw) input.setRawMode(false);
      input.pause();
      output.write('\x1b[?25h');
      resolve(v);
    };
    const handler = (str, key = {}) => {
      if ((key.ctrl && key.name === 'c') || key.name === 'escape' || str === 'q') return done(CANCEL);
      onKey(str, key, done);
    };
    input.on('keypress', handler);
  });
}

// One line reader per input stream for the whole run. A reader per question would buffer
// piped input and lose every line after the first answer.
const readers = new WeakMap();
function lineReader(input) {
  if (readers.has(input)) return readers.get(input);
  const r = { lines: [], waiting: [], closed: false };
  const rl = readline.createInterface({ input, terminal: false });
  rl.on('line', (l) => (r.waiting.length ? r.waiting.shift()(l.trim()) : r.lines.push(l.trim())));
  rl.on('close', () => { r.closed = true; while (r.waiting.length) r.waiting.shift()(null); });
  readers.set(input, r);
  return r;
}
function ask(input, output, q) {
  output.write(q);
  const r = lineReader(input);
  if (r.lines.length) { const l = r.lines.shift(); output.write(`${l}\n`); return Promise.resolve(l); }
  if (r.closed) return Promise.resolve(null);
  // Typed answers are already echoed by the terminal; only answers read ahead from a pipe are echoed above.
  return new Promise((resolve) => r.waiting.push(resolve));
}

const title = (t, sub) => `${c.accent('?')} ${c.bold(t)}${sub ? `  ${c.gray(sub)}` : ''}`;

// ---------- select one ----------
export async function select(opts) {
  const { input, output, tty } = io(opts);
  const options = opts.options;
  let i = Math.max(0, options.findIndex((o) => o.value === opts.initial));
  if (!tty) {
    output.write(title(opts.message) + '\n');
    options.forEach((o, n) => output.write(`  ${c.accent(String(n + 1).padStart(2))}  ${o.label}${o.hint ? c.gray(`  ${o.hint}`) : ''}\n`));
    const a = await ask(input, output, `  Choose 1-${options.length} ${c.gray(`[${i + 1}]`)}: `);
    if (a === null) return CANCEL;
    const n = a === '' ? i : Number(a) - 1;
    return options[n] ? options[n].value : CANCEL;
  }
  const p = painter(output);
  const render = () => p.draw([
    title(opts.message, '↑↓ move · enter select · esc cancel'),
    ...options.map((o, n) => (n === i
      ? `  ${c.accent('❯')} ${c.bold(o.label)}${o.hint ? `  ${c.gray(o.hint)}` : ''}`
      : `    ${o.label}${o.hint ? `  ${c.gray(o.hint)}` : ''}`)),
    ...(options[i].detail ? ['', ...options[i].detail.split('\n').map((l) => `    ${c.dim(l)}`)] : []),
  ].join('\n'));
  render();
  const v = await keyloop({ input, output }, (str, key, done) => {
    if (key.name === 'up' || str === 'k') i = (i - 1 + options.length) % options.length;
    else if (key.name === 'down' || str === 'j') i = (i + 1) % options.length;
    else if (/^[1-9]$/.test(str || '') && options[Number(str) - 1]) i = Number(str) - 1;
    else if (key.name === 'return') return done(options[i].value);
    render();
  });
  p.clear();
  output.write(`${isCancel(v) ? c.gray('✖') : sym.ok} ${c.bold(opts.message)} ${c.accent(isCancel(v) ? 'cancelled' : options[i].label)}\n`);
  return v;
}

// ---------- multi-select ----------
// items: [{ value, label, tag?, hint?, detail?, section? }]
// opts.locked(value, selectedSet) -> reason string when the row is implied by another pick
export async function multiselect(opts) {
  const { input, output, tty } = io(opts);
  const items = opts.items;
  const sel = new Set(opts.selected || []);
  const locked = opts.locked || (() => null);
  const mark = (it) => (sel.has(it.value) ? c.green('◉') : locked(it.value, sel) ? c.cyan('◈') : c.gray('○'));

  if (!tty) {
    output.write(title(opts.message) + '\n');
    let section = null;
    items.forEach((it, n) => {
      if (it.section && it.section !== section) { section = it.section; output.write(`\n  ${c.bold(section)}\n`); }
      const why = locked(it.value, sel);
      output.write(`  ${c.accent(String(n + 1).padStart(2))} ${mark(it)} ${it.label}${it.hint ? c.gray(`  ${it.hint}`) : ''}${why ? c.cyan(`  (${why})`) : ''}\n`);
    });
    const a = await ask(input, output, `\n  Toggle numbers, e.g. ${c.accent('1 4 7')} ${c.gray('(Enter keeps the marked ones)')}: `);
    if (a === null) return CANCEL;
    for (const tok of a.split(/[\s,]+/).filter(Boolean)) {
      const it = items[Number(tok) - 1];
      if (it) sel.has(it.value) ? sel.delete(it.value) : sel.add(it.value);
    }
    return sel;
  }

  const p = painter(output);
  let i = 0, top = 0;
  const render = () => {
    const rows = output.rows || 30;
    const cur = items[i];
    const detail = cur.detail ? cur.detail.split('\n') : [];
    const view = Math.max(5, Math.min(items.length, rows - detail.length - 7));
    if (i < top) top = i; if (i >= top + view) top = i - view + 1;
    const labelW = Math.max(...items.map((it) => width(it.label))) + 2;
    const lines = [title(opts.message, 'space toggle · enter confirm · esc cancel')];
    let section = top > 0 ? items[top - 1].section : null;
    for (let n = top; n < Math.min(items.length, top + view); n++) {
      const it = items[n];
      if (it.section && it.section !== section) { section = it.section; lines.push(`  ${c.gray(it.section.toUpperCase())}`); }
      const why = locked(it.value, sel);
      const label = n === i ? c.bold(it.label) : it.label;
      const tag = it.tag ? c.gray(clip(it.tag, 14).padEnd(15)) : '';
      lines.push(`${n === i ? c.accent('❯') : ' '} ${mark(it)} ${label}${' '.repeat(Math.max(1, labelW - width(it.label)))}${tag}${why ? c.cyan(why) : c.gray(it.hint || '')}`);
    }
    if (items.length > view) lines.push(c.gray(`  ${top + 1}-${Math.min(items.length, top + view)} of ${items.length}`));
    if (detail.length) lines.push('', ...detail.map((l) => `    ${l}`));
    const picked = items.filter((it) => sel.has(it.value)).map((it) => it.value);
    lines.push('', `  ${c.gray('selected:')} ${picked.length ? c.green(picked.join(', ')) : c.gray('nothing')}`);
    p.draw(lines.join('\n'));
  };
  render();
  const v = await keyloop({ input, output }, (str, key, done) => {
    if (key.name === 'up' || str === 'k') i = (i - 1 + items.length) % items.length;
    else if (key.name === 'down' || str === 'j') i = (i + 1) % items.length;
    else if (key.name === 'home') i = 0;
    else if (key.name === 'end') i = items.length - 1;
    else if (key.name === 'pageup') i = Math.max(0, i - 8);
    else if (key.name === 'pagedown') i = Math.min(items.length - 1, i + 8);
    else if (key.name === 'space') { const it = items[i]; sel.has(it.value) ? sel.delete(it.value) : sel.add(it.value); }
    else if (key.name === 'return') return done(sel);
    render();
  });
  p.clear();
  output.write(`${isCancel(v) ? c.gray('✖') : sym.ok} ${c.bold(opts.message)} ${isCancel(v) ? c.accent('cancelled') : c.accent([...sel].join(', ') || 'nothing')}\n`);
  return v;
}

// ---------- confirm ----------
export async function confirm(opts) {
  const { input, output, tty } = io(opts);
  const def = opts.initial ?? true;
  const hintText = def ? 'Y/n' : 'y/N';
  if (!tty) {
    const a = await ask(input, output, `${title(opts.message)} ${c.gray(`(${hintText})`)} `);
    if (a === null) return CANCEL;
    return a === '' ? def : /^y/i.test(a);
  }
  output.write(`${title(opts.message)} ${c.gray(`(${hintText})`)} `);
  const v = await keyloop({ input, output }, (str, key, done) => {
    if (key.name === 'return') done(def);
    else if (/^y$/i.test(str || '')) done(true);
    else if (/^n$/i.test(str || '')) done(false);
  });
  output.write(`${isCancel(v) ? 'cancelled' : v ? c.green('yes') : c.red('no')}\n`);
  return v;
}
