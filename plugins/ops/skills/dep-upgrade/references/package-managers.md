# Package-manager settings

Checked against official docs on 2026-11-20. Defaults and names change between versions; if a setting is rejected, read the current docs for the installed version.

## Release-age cooldown

| Tool | File | Setting | Unit | Default | Exclude option |
|---|---|---|---|---|---|
| npm | `.npmrc` | `min-release-age` | days | off | `min-release-age-exclude` (names or globs, repeatable) |
| pnpm | `pnpm-workspace.yaml` (not `.npmrc`) | `minimumReleaseAge` | minutes | 1440 (1 day) | `minimumReleaseAgeExclude` |
| Yarn | `.yarnrc.yml` | `npmMinimalAgeGate` | duration (`"1w"`; docs example. Some reports say other suffixes parse unreliably, so prefer `"1w"`) | `"1w"` in recent versions | `npmPreapprovedPackages` |
| Bun | `bunfig.toml` `[install]` | `minimumReleaseAge` | seconds | off | `minimumReleaseAgeExcludes` |
| uv | `pyproject.toml` `[tool.uv]` or `uv.toml` | `exclude-newer` | date or duration (`"7 days"`, `"P7D"`) | off | `exclude-newer-package` (value `false` exempts) |
| Dependabot | `.github/dependabot.yml`, per ecosystem | `cooldown: default-days` (+ `semver-major-days`, `-minor-`, `-patch-`) | days | 3 for version updates | `cooldown.include` / `exclude` |
| Renovate | `renovate.json` | `minimumReleaseAge` | duration (`"7 days"`) | off | scope with `packageRules` |

Notes:
- npm: `before=<date>` pins resolution to a date; if both are set, `before` wins.
- pnpm: lockfile entries are re-checked against `minimumReleaseAge` and `trustPolicy` unless `trustLockfile: true`. Setting `minimumReleaseAge` explicitly makes `minimumReleaseAgeStrict` true: resolution fails rather than silently picking an older version.
- uv: use top-level `[tool.uv]`; `[tool.uv.pip]` values are ignored by `uv lock` and `uv sync`.
- Dependabot security updates are not delayed by `cooldown`. npm's `min-release-age` does block a fresh security fix and exits non-zero. Renovate's `minimumReleaseAge` also applies to vulnerability-alert PRs unless scoped out.
- Renovate shows a pending status check on branches still inside the window; keep `internalChecksFilter: "strict"` so it doesn't open PRs early.

## Install scripts

| Tool | Default | Setting |
|---|---|---|
| npm | scripts run | `ignore-scripts=true`, or `allowScripts` in package.json (`false` denies) with `strict-allow-scripts=true` to fail on unreviewed packages. npm 12 defaults `allow-git` and `allow-remote` to `none` |
| pnpm | blocked; install fails on unreviewed build scripts (`strictDepBuilds: true`) | approve with `allowBuilds` (replaced `onlyBuiltDependencies` in v11) or `pnpm approve-builds`. Never `dangerouslyAllowAllBuilds` |
| Yarn | blocked (`enableScripts: false`) | re-enable per package via `dependenciesMeta` |
| Bun | scripts run | `[install] ignoreScripts = true`; packages in `trustedDependencies` still run |
| Renovate | scripts disabled in its own runs (`ignoreScripts: true`) | leave it |

## Example: npm

```ini
# .npmrc
min-release-age=7
ignore-scripts=true
# min-release-age-exclude=@our-scope/*   # our own packages, published by our CI
```

## Example: pnpm

```yaml
# pnpm-workspace.yaml
minimumReleaseAge: 10080   # 7 days in minutes
trustPolicy: no-downgrade
blockExoticSubdeps: true
strictDepBuilds: true
allowBuilds:
  esbuild: true            # reviewed 2026-11-20: downloads platform binary
```

## Example: Dependabot

```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule: { interval: weekly }
    cooldown:
      default-days: 7
    groups:
      minor-and-patch:
        update-types: [minor, patch]
  - package-ecosystem: github-actions
    directory: /
    schedule: { interval: weekly }
    cooldown:
      default-days: 7
```

## Example: Renovate

```json
{
  "extends": ["config:recommended"],
  "minimumReleaseAge": "7 days",
  "internalChecksFilter": "strict",
  "packageRules": [
    { "matchUpdateTypes": ["minor", "patch"], "groupName": "minor and patch" }
  ]
}
```
