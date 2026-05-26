# GitHub Pages Deployment Guide

## Overview

The site is hosted on GitHub Pages and currently uses two active workflows:

| Workflow | Trigger | Role |
|----------|---------|------|
| [Production Release](.github/workflows/production-release.yml) | Push a `v*` tag | Build production, update `gh-pages`, deploy Pages directly, and trigger the production accessibility scan |
| [PR Preview](.github/workflows/pr-preview.yml) | PR open / update / reopen / close | Run lint, tests, preview-scoped builds, and PR accessibility checks without publishing public previews |

Production release is the only automatic Pages deployment path. The `gh-pages`
branch remains the assembled site snapshot used for deployed content and for
preserving any legacy preview directories, but pushes to `gh-pages` no longer
trigger a separate publish workflow.

---

## Releasing to Production

Production deploys are gated behind a version tag. Merging to `main` alone does
**not** deploy.

### Versioning

We use semantic versioning with a `v` prefix for tags:

`vMAJOR.MINOR.PATCH`

- Patch: bug fixes and small internal improvements
- Minor: backward-compatible features or substantial enhancements
- Major: breaking changes or compatibility resets

```bash
# 1. Make sure main is green and up to date.
git checkout main
git pull

# 2. Create the release tag.
git tag v1.2.3

# 3. Push the tag.
git push origin v1.2.3
```

The [Production Release](.github/workflows/production-release.yml) workflow then:

1. Verifies the pushed tag points to a commit reachable from `main`.
2. Runs the full test suite against the tagged commit.
3. Builds the site for GitHub Pages deployment.
4. Updates the root of `gh-pages` while preserving any existing preview
   subdirectories.
5. Commits the assembled site snapshot back to `gh-pages`.
6. Uploads the assembled checkout as the Pages artifact.
7. Calls `actions/deploy-pages` directly in the same workflow.

After a successful production deploy, the
[Accessibility Scanner](.github/workflows/a11y-scan.yml) workflow runs
automatically against the live site.

### If Production Release Fails

- If tests fail: fix the code, push to `main`, then create and push a new tag.
- If the release fails before the final Pages publish step: fix the issue and
  re-run [production-release.yml](.github/workflows/production-release.yml), or
  push a new tag.
- If the production accessibility scan fails after deployment: inspect and
  re-run [a11y-scan.yml](.github/workflows/a11y-scan.yml) from the Actions tab.

---

## Pull Request Validation

Public PR preview publishing is currently disabled for security hardening. The
[PR Preview](.github/workflows/pr-preview.yml) workflow still runs validation on
pull requests, but it does not publish `pr-preview/<PR#>/` content to
`gh-pages` or post preview URLs.

The [PR Preview](.github/workflows/pr-preview.yml) workflow:

1. Runs lint on every non-closed pull request.
2. Uses the preview backend and preview Supabase credentials for trusted
   same-repository pull requests.
3. Falls back to a secret-free reduced test/build path for forked pull
   requests so external contributors still get basic validation.
4. Runs the PR accessibility scan only when the PR is from the main repository
   and `GH_TOKEN` is available.

### Forked PRs

Forked PRs cannot access repository secrets, and their workflow token is
typically read-only. In practice, that means:

- forked PRs should only rely on checks that do not need secrets or repository
  writes
- preview-secret-backed build steps only run for same-repository PRs
- the PR accessibility scan is skipped for forked PRs

Trusted preview builds must not embed production Supabase settings. They use:

- `VITE_API_URL_PREVIEW`
- `VITE_SUPABASE_URL_PREVIEW`
- `VITE_SUPABASE_ANON_KEY_PREVIEW`

---

## Repository Settings Required

The following must be configured in the repository's GitHub settings for
deployments to work:

These are one-time repository setup steps performed by a maintainer or admin.
Individual developers do not need local copies of these secrets to contribute.

| Setting | Value |
|---------|-------|
| **Pages → Source** | GitHub Actions |
| **Environment → `github-pages`** | Must exist; `id-token: write` depends on it |
| **Actions → General → Workflow permissions** | Read and write permissions |
| **Secrets** | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SUPABASE_URL_PREVIEW`, `VITE_SUPABASE_ANON_KEY_PREVIEW`, `VITE_API_URL`, `VITE_API_URL_PREVIEW`, `VITE_DEV_MODE`, `VITE_LOG_LEVEL`, `GH_TOKEN` |

Preview builds require the preview backend secret plus preview-specific
Supabase client secrets. Production and preview secrets must point at
different projects.

The `GH_TOKEN` secret is used for accessibility testing. It must be a personal
access token with repo scope because the default `GITHUB_TOKEN` is not
supported by the `github/accessibility-scanner` action.
