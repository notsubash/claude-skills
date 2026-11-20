#!/usr/bin/env node
// Tag a release: node scripts/release.mjs
// 1. In a PR: bump "version" in package.json and add a "## [x.y.z] - YYYY-MM-DD" section to CHANGELOG.md.
// 2. After it merges, run this on main. It checks main is clean and in sync with origin, that the
//    version isn't tagged yet and has a changelog section, then tags vX.Y.Z and pushes the tag.
// Pushing the tag runs .github/workflows/release.yml, which publishes the GitHub release that
// `skills self-update` and the update notice look for.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const git = (...a) => execFileSync('git', a, { encoding: 'utf8' }).trim();
const fail = (m) => { console.error(`✖ ${m}`); process.exit(1); };

const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
const tag = `v${version}`;
if (git('rev-parse', '--abbrev-ref', 'HEAD') !== 'main') fail('release from main');
if (git('status', '--porcelain')) fail('commit or stash your changes first');
git('fetch', '--quiet', '--tags', 'origin', 'main');
if (git('rev-parse', 'HEAD') !== git('rev-parse', 'origin/main')) fail('main is not in sync with origin/main: git pull');
if (git('tag', '-l', tag)) fail(`${tag} already exists. Bump "version" in package.json (in a PR) first`);
if (!readFileSync('CHANGELOG.md', 'utf8').includes(`## [${version}]`)) fail(`CHANGELOG.md has no "## [${version}]" section`);

git('tag', '-a', tag, '-m', tag);
git('push', 'origin', tag);
console.log(`✔ ${tag} pushed. The release workflow publishes it: https://github.com/notsubash/claude-skills/actions`);
