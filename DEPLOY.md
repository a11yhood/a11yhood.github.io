# Deployment Guide

## Overview

The site is hosted on GitHub Pages. There are two kinds of deployments:

| Kind | URL | Trigger |
|------|-----|---------|
| **Production** | `https://a11yhood.org/` | Push a `v*` tag to `main` |
| **PR preview** | `https://a11yhood.org/draft/<PR#>/` | Any push to a pull request |

Both are served from the same GitHub Pages deployment so previews and production
coexist under one domain. The `gh-pages` branch is the source of truth — its root
is the production build and its `draft/` subdirectory holds active PR previews.

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
   **while preserving the `draft/` subdirectory** (active PR previews).
4. Commits the update back to `gh-pages`.
5. Uploads the entire `gh-pages` tree as a GitHub Pages artifact and deploys it.

After a successful deploy, the [Accessibility Scanner](.github/workflows/a11y-scan.yml)
runs automatically against the live site.

### What to do if the deploy workflow fails

- If **tests** fail: fix the code, push to `main`, then re-tag (delete the old tag
  first with `git push --delete origin v1.2.3`, then create a new one).
- If the **Pages deploy** step fails: re-run the workflow from the Actions tab
  (`workflow_dispatch` is enabled).

---

## PR previews

Every pull request automatically gets a full preview of the site at
`https://a11yhood.org/draft/<PR#>/`.

The [PR Preview](.github/workflows/pr-preview.yml) workflow:
1. Runs lint and tests on the PR branch.
2. Builds the site with `VITE_BASE_URL=/draft/<PR#>/` so all asset and router
   paths are scoped to the preview URL.
3. Checks out `gh-pages`, places the build under `draft/<PR#>/`, and commits.
4. Uploads the full merged `gh-pages` tree as a Pages artifact and deploys —
   the same mechanism used by production.
5. Posts a comment on the PR with the preview URL.

When a PR is **closed** (merged or abandoned), the `cleanup` job automatically
removes `draft/<PR#>/` from `gh-pages` and redeploys to keep the site tidy.

### Forked PRs

Forked PRs cannot access repository secrets, so the accessibility scanner
step is skipped for them. All other jobs (lint, build, deploy) run normally.

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

