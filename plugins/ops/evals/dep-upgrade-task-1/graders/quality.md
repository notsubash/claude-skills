---
type: llm
weight: 2
---

Judge whether this is the policy a senior engineer hardening supply-chain security would set.
It sets pnpm `minimumReleaseAge` to 10080 (minutes, 7 days) in pnpm-workspace.yaml, not in .npmrc and not as the number 7.
It sets a 7-day Dependabot cooldown (`cooldown` with `default-days: 7`).
It keeps install scripts blocked by default and allows only esbuild explicitly (allowBuilds or approve-builds), not dangerouslyAllowAllBuilds.
It changes CI to a frozen-lockfile install and separates DEPLOY_TOKEN from the job that installs dependencies.
It says how to verify the cooldown works (for example, try installing a version published in the last 7 days and confirm it is refused).
It mentions at least one of: reviewing lockfile diffs, trustPolicy no-downgrade, or pinning GitHub Actions to commit SHAs.
