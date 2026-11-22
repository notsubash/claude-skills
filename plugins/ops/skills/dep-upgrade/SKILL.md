---
name: dep-upgrade
description: Update dependencies without importing a supply-chain attack - a 7-day release-age cooldown in the package manager and update bot, install scripts off, lockfile diffs reviewed, majors one at a time, advisories triaged by reachability, new packages vetted, compromised packages handled. Use when the user asks to update or upgrade dependencies or a framework, set up Dependabot or Renovate, fix npm audit or a CVE alert, harden installs, evaluate adding a package, or check exposure to a compromised package. Not for auditing the app's own code (security-gate).
---

# Dependency updates

Malicious package versions are usually detected and pulled within days: in one analysis of ten supply-chain attacks, eight had a window under a week. A malicious version nobody installs in its first week usually does no harm. So the policy is: **nothing younger than 7 days gets installed**, install scripts don't run by default, and every lockfile change is reviewed like code.

Do the part the user asked for. If the cooldown or script controls below are missing, say so in one line and offer to add them; don't reconfigure the project unasked.

## 1. Look first

- Package manager and its version (`npm -v`, `pnpm -v`, `yarn -v`, `bun -v`, `uv -V`). Settings below depend on the version; check the tool's docs if a setting is rejected.
- Lockfile present and committed? CI installs with the lockfile-exact command (`npm ci`, `pnpm install --frozen-lockfile`, `yarn install --immutable`, `bun install --frozen-lockfile`, `uv sync --locked`)? If not, fix that first: without it, nothing below holds.
- Existing `.npmrc`, `pnpm-workspace.yaml`, `.yarnrc.yml`, `bunfig.toml`, `pyproject.toml`, `.github/dependabot.yml`, `renovate.json`.

## 2. Enforce the 7-day cooldown in every layer

Set it in the package manager (protects local and CI installs, including the agent's own `npm install`) **and** in the update bot (stops PRs for fresh versions). Units differ per tool; copy exactly. Full table with script controls: [references/package-managers.md](references/package-managers.md).

| Tool | Setting | 7 days |
|---|---|---|
| npm | `.npmrc`: `min-release-age` (days) | `min-release-age=7` |
| pnpm | `pnpm-workspace.yaml`: `minimumReleaseAge` (minutes) | `minimumReleaseAge: 10080` |
| Yarn | `.yarnrc.yml`: `npmMinimalAgeGate` (duration) | `npmMinimalAgeGate: "1w"` |
| Bun | `bunfig.toml` `[install]`: `minimumReleaseAge` (seconds) | `minimumReleaseAge = 604800` |
| uv | `[tool.uv]`: `exclude-newer` (duration) | `exclude-newer = "7 days"` |
| Dependabot | `cooldown.default-days` per ecosystem | `default-days: 7` |
| Renovate | `minimumReleaseAge` | `"minimumReleaseAge": "7 days"` |

Exceptions go in the tool's exclude list (`min-release-age-exclude`, `minimumReleaseAgeExclude`, `npmPreapprovedPackages`, `minimumReleaseAgeExcludes`, `exclude-newer-package`), each with a comment saying why and until when. Never lower the global value to get one package in.

**Verify it works:** try to install a version published in the last 7 days (`npm view <pkg> time --json` shows dates). The install must refuse or resolve to an older version. Record the result.

## 3. Close the other install-time doors

- **Install scripts off by default.** pnpm (`strictDepBuilds`) and Yarn (`enableScripts: false`) block them already. npm: `ignore-scripts=true`, or an `allowScripts` map with `strict-allow-scripts=true`. Bun: `ignoreScripts = true` plus an explicit trusted list. Allow a package's build script only after reading it.
- **pnpm:** `trustPolicy: no-downgrade` refuses a version with weaker publish evidence (trusted publisher > provenance > none) than earlier ones. Keep `blockExoticSubdeps: true` (no git or tarball URLs in transitive deps).
- **CI:** no secrets in the job that installs dependencies; least-privilege, short-lived tokens; GitHub Actions pinned to full commit SHAs (tags can be moved); the update bot's PRs run without access to deploy secrets.
- **Local:** the same configs apply to you and to coding agents. Don't run `npx <pkg>@latest` for a package you haven't vetted.

## 4. Weekly routine (batch, don't trickle)

1. One grouped PR for patch and minor updates that have cleared the cooldown (Dependabot `groups`, Renovate `packageRules` grouping).
2. **Review the lockfile diff**, not only `package.json`: new transitive packages, changed `resolved` hosts, git or tarball URLs, newly added install scripts, a package whose maintainer or publisher changed. Anything unexplained blocks the merge.
3. Run the full test suite, typecheck, build and a smoke test of the critical flows. Deploy through the normal pipeline and watch errors after release.
4. **Majors one at a time:** read the changelog and migration guide, run the official codemod if there is one, upgrade, fix, test. Don't stack a major with other changes. Check the runtime's end-of-life dates (Node, Python) on the same cadence.

## 5. Security advisories

- Triage by **reachability and exposure**, not by count: is the vulnerable function used, with attacker-controlled input, in production? `npm audit` severity alone is noise.
- Order: known-exploited (CISA KEV, high EPSS) and reachable in prod > reachable > dev-only. Build-time tools count as production-adjacent: they run in CI with secrets.
- **Security fixes and the cooldown:** Dependabot security updates skip its cooldown; npm's `min-release-age` does not and reports the blocked fix. Fake "security fix" releases are a known attack pattern, so for a fix younger than 7 days: prefer a mitigation (config change, input validation, disabling the feature) until it ages; if it's exploited in the wild and you must take it now, check the publisher matches earlier releases, provenance is present if it was before, and diff the published package (`npm diff --diff=<pkg>@<old> --diff=<pkg>@<new>`). Then add a dated exclude entry and remove it after 7 days.

## 6. Adding a new dependency

Before `install`: could the standard library or 20 lines of our own code do it? If not, check maintenance (recent releases, open issues answered), maintainer count, install scripts, transitive dependency count, size, license, and provenance. Pin via the lockfile. Prefer one well-known package over several tiny ones.

## 7. When a dependency is compromised

1. **Am I affected?** Search every lockfile (all branches and deployed artifacts) for the named versions. Check CI logs and dev machines for installs during the exposure window.
2. **If yes, assume the install ran:** rotate every secret reachable from those environments (registry tokens, GitHub tokens, cloud keys, `.env` values), revoke sessions, check for unexpected publishes from your accounts and new workflow files.
3. Pin to the last known-good version, add an override for transitive copies, reinstall from a clean cache.
4. Write down the timeline and what would have stopped it; feed that into sections 2–3.

## 8. Verify and report

Report: cooldown setting per layer and the install test showing it blocks a fresh version; script policy; packages updated (from → to) with test and build results; advisories with reachability calls; anything excluded, why, and its expiry date.
