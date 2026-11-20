#!/usr/bin/env node
// Versioning: the update check's version compare, its cache, and that the version in package.json
// has a CHANGELOG.md section (so a version bump can't merge without release notes).
import { readFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { newer, check as checkUpdate } from '../cli/lib/update.mjs';

let failed = 0;
const check = (name, ok, got) => { console.log(`${ok ? '✔' : '✘'} ${name}${ok ? '' : `\n    got: ${JSON.stringify(got)}`}`); if (!ok) failed++; };

check('1.10.0 is newer than 1.9.9', newer('1.10.0', '1.9.9'));
check('2.0.0 is newer than v1.9.9', newer('2.0.0', 'v1.9.9'));
check('same version is not newer', !newer('1.2.3', '1.2.3'));
check('older is not newer', !newer('1.2.2', '1.2.3'));
check('garbage is never newer', !newer(null, '1.0.0') && !newer('1.2', '1.0.0') && !newer('1.2.3-beta', '1.0.0'));

const dir = mkdtempSync(join(tmpdir(), 'skills-update-'));
const file = join(dir, 'update-check.json');
const noop = [process.execPath, '-e', ''];
writeFileSync(file, JSON.stringify({ checked: Date.now(), latest: '9.0.0' }));
check('fresh cache with a newer release: report it, no fetch', checkUpdate({ current: '1.0.0', file, respawn: ['does-not-exist'] }) === '9.0.0');
check('fresh cache, already current: nothing', checkUpdate({ current: '9.0.0', file, respawn: ['does-not-exist'] }) === null);
writeFileSync(file, JSON.stringify({ checked: 0, latest: null }));
checkUpdate({ current: '1.0.0', file, respawn: noop });
check('day-old cache: claims today before checking again', Date.now() - JSON.parse(readFileSync(file, 'utf8')).checked < 5000);
rmSync(dir, { recursive: true, force: true });

const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
check(`CHANGELOG.md has a ## [${version}] section`, readFileSync('CHANGELOG.md', 'utf8').includes(`## [${version}]`));

if (failed) { console.error(`\n${failed} version check${failed > 1 ? 's' : ''} failed`); process.exit(1); }
console.log('\nversioning ok');
