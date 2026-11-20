// Terminal presentation: colors, symbols, spinners, layout. No dependencies.
// Colors turn off for NO_COLOR, a non-TTY stdout (pipes, CI logs) or TERM=dumb; FORCE_COLOR turns them on.
const out = process.stdout;
const env = process.env;
export const isTTY = Boolean(out.isTTY);
export const color = env.FORCE_COLOR ? env.FORCE_COLOR !== '0' : !env.NO_COLOR && isTTY && env.TERM !== 'dumb';

const sgr = (open, close) => (s) => (color ? `\x1b[${open}m${s}\x1b[${close}m` : String(s));
export const c = {
  bold: sgr(1, 22), dim: sgr(2, 22), italic: sgr(3, 23), under: sgr(4, 24),
  red: sgr(31, 39), green: sgr(32, 39), yellow: sgr(33, 39), blue: sgr(34, 39), magenta: sgr(35, 39), cyan: sgr(36, 39), gray: sgr(90, 39),
  // The brand accent: a warm amber (truecolor when the terminal says it supports it).
  accent: color && /truecolor|24bit/i.test(env.COLORTERM || '') ? (s) => `\x1b[38;2;245;166;35m${s}\x1b[39m` : sgr(33, 39),
};

export const sym = {
  ok: c.green('✔'), fail: c.red('✖'), warn: c.yellow('▲'), info: c.cyan('●'), arrow: c.accent('›'),
  dot: c.gray('·'), add: c.green('+'), del: c.red('−'), bullet: c.accent('◆'),
};

const strip = (s) => String(s).replace(/\x1b\[[0-9;]*m/g, '');
export const width = (s) => [...strip(s)].length;
export const pad = (s, n) => s + ' '.repeat(Math.max(0, n - width(s)));
export const cols = () => Math.min(out.columns || 100, 110);
// Cut a plain string to n visible characters.
export const clip = (s, n) => ([...s].length > n ? [...s].slice(0, Math.max(0, n - 1)).join('') + '…' : s);

export function wrap(text, w, indent = '') {
  const lines = []; let line = '';
  for (const word of String(text).split(/\s+/).filter(Boolean)) {
    if (line && width(line) + 1 + width(word) > w) { lines.push(indent + line); line = word; } else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(indent + line);
  return lines.join('\n');
}

export const log = (...a) => console.log(...a);
export const blank = () => console.log();

export function banner(subtitle = 'skills for Claude Code') {
  log();
  log(`  ${c.accent('◆')} ${c.bold('craft')} ${c.gray('—')} ${c.dim(subtitle)}`);
  log();
}
export const heading = (s) => log(`\n${c.bold(s)}`);
export const kv = (k, v, w = 10) => log(`  ${c.gray(pad(k, w))} ${v}`);
export const ok = (s) => log(`  ${sym.ok} ${s}`);
export const warn = (s) => log(`  ${sym.warn} ${s}`);
export const fail = (s) => log(`  ${sym.fail} ${s}`);
export const info = (s) => log(`  ${sym.info} ${s}`);
export const hint = (s) => log(`  ${c.gray(s)}`);
export function box(lines, tone = c.gray) {
  const w = Math.max(...lines.map(width));
  log(tone(`  ╭${'─'.repeat(w + 2)}╮`));
  for (const l of lines) log(`${tone('  │')} ${pad(l, w)} ${tone('│')}`);
  log(tone(`  ╰${'─'.repeat(w + 2)}╯`));
}

// A spinner line that resolves into ✔ or ✖ with the elapsed time.
// Falls back to plain start/end lines when output isn't a TTY.
const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
export function spinner(label) {
  const t0 = Date.now();
  let i = 0, timer = null;
  const secs = () => c.gray(`${((Date.now() - t0) / 1000).toFixed(1)}s`);
  if (isTTY) {
    out.write('\x1b[?25l');
    const draw = () => out.write(`\r\x1b[2K  ${c.accent(FRAMES[i++ % FRAMES.length])} ${label}`);
    draw(); timer = setInterval(draw, 80);
  } else log(`  … ${label}`);
  const end = (mark, text) => {
    if (timer) clearInterval(timer);
    if (isTTY) out.write(`\r\x1b[2K\x1b[?25h`);
    log(`  ${mark} ${text ?? label} ${secs()}`);
  };
  return { succeed: (t) => end(sym.ok, t), fail: (t) => end(sym.fail, t), warn: (t) => end(sym.warn, t) };
}
process.on('exit', () => { if (isTTY) out.write('\x1b[?25h'); });
