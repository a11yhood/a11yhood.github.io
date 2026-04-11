# Deployment Guide

## Overview

The site is hosted on GitHub Pages and uses three workflows working together:

| Workflow | Trigger | Role |
|----------|---------|------|
| [Deploy to GitHub Pages](.github/workflows/deploy.yml) | Push a `v*` tag | Build production, commit to `gh-pages` branch |
| [PR Preview](.github/workflows/pr-preview.yml) | PR push / close | Build preview, commit to `gh-pages` branch |
| [Publish GitHub Pages](.github/workflows/pages-deploy.yml) | Push to `gh-pages` branch | Upload & deploy Pages artifact |

**Why three workflows?** GitHub Pages environment protection rules only allow
deployments from the `gh-pages` branch, not from PR merge refs
(`refs/pull/*/merge`). The build workflows commit their output to `gh-pages`,
then `pages-deploy.yml` runs from that branch context and does the actual
`actions/deploy-pages` call.

The `gh-pages` branch root is the production build; `pr-preview/<PR#>/` subdirectories
hold active PR previews. Both are served from the same Pages deployment.

---

## Releasing to production

Production deploys are gated behind a version tag. Merging to `main`
alone does **not** deploy.

```bash
# 1. Make sure main is green (CI passes) and you are on main.
git checkout main
git pull

# 2. Tag the release.  Use semver: vMAJOR.MINOR.PATCH
git tag v1.2.3

# 3. Push the tag — this is what triggers the deploy workflow.
git push origin v1.2.3
```

The [Deploy to GitHub Pages](.github/workflows/deploy.yml) workflow then:
1. Runs `npm run test:run` against the tagged commit.
2. Builds the site with `npm run build:ghpages` (sets `VITE_BASE_URL=/`).
3. Checks out the `gh-pages` branch, `rsync`s the new build into the root
   **while preserving preview subdirectories** (active PR previews).
4. Commits the update back to `gh-pages`.
5. Pushes to `gh-pages`, which triggers [Publish GitHub Pages](.github/workflows/pages-deploy.yml)
   to upload the full branch as the Pages artifact and deploy it.

After a successful deploy, the [Accessibility Scanner](.github/workflows/a11y-scan.yml)
runs automatically against the live site.

### What to do if the deploy workflow fails

- If **tests** fail: fix the code, push to `main`, then re-tag (delete the old tag
  first with `git push --delete origin v1.2.3`, then create a new one).
- If **deploy.yml** fails before pushing to `gh-pages`: fix and re-run `deploy.yml`
   (or push a new tag).
- If **pages-deploy.yml** fails: re-run `pages-deploy.yml` from the Actions tab
   (`workflow_dispatch` is enabled there).

---

## PR previews

Every pull request automatically gets a full preview of the site at
`https://a11yhood.org/pr-preview/<PR#>/`.

The [PR Preview](.github/workflows/pr-preview.yml) workflow:
1. Runs lint and tests on the PR branch.
2. Builds the site with `VITE_BASE_URL=/pr-preview/<PR#>/` so all asset and router
   paths are scoped to the preview URL.
3. Checks out `gh-pages`, places the build under `pr-preview/<PR#>/`, and commits.
4. Pushes to `gh-pages`, which triggers [Publish GitHub Pages](.github/workflows/pages-deploy.yml)
   to deploy the merged site.
5. Posts a comment on the PR with the preview URL.

When a PR is **closed** (merged or abandoned), the `cleanup` job automatically
removes `pr-preview/<PR#>/` from `gh-pages`; that push triggers `pages-deploy.yml`
which redeploys the site without the preview.

---

## Publish workflow details

[Publish GitHub Pages](.github/workflows/pages-deploy.yml) is the only workflow
that calls `actions/deploy-pages` and targets the `github-pages` environment.
It runs from `gh-pages` branch context, which satisfies environment protection
rules and avoids PR ref deployment rejections. 

### Forked PRs

Forked PRs cannot access repository secrets, and their workflow token is
typically read-only. In practice, that means only checks that do not require
secrets or repository writes are expected to run normally.

For PR previews specifically, the build depends on repository `VITE_*` secrets
and deployment updates `gh-pages`, so preview build/deploy (and related PR
comments) may be skipped or fail for forked PRs unless the workflow explicitly
gates those steps to non-fork pull requests.
---

## Repository settings required

The following must be configured in the repository's GitHub settings for
deployments to work:

| Setting | Value |
|---------|-------|
| **Pages → Source** | GitHub Actions |
| **Environment → `github-pages`** | Must exist; `id-token: write` depends on it |
| **Secrets** | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`, `VITE_DEV_MODE`, `VITE_ENV`, `VITE_LOG_LEVEL`, `GH_TOKEN` |

The `GH_TOKEN` secret must be a personal access token with repo scope — the
default `GITHUB_TOKEN` is not supported by the `github/accessibility-scanner`
action.

