# Plan: PR Preview via Jekyll Build Workflow

Two files need changes: add `linux-64` to `pixi.toml` and create a new workflow at `.github/workflows/pr-preview.yml`.

---

## Steps

### 1. Update `pixi.toml`

Add `linux-64` to the `platforms` array alongside `osx-arm64` so `pixi run build` works on GitHub's `ubuntu-latest` runners.

### 2. Create `.github/workflows/pr-preview.yml`

**Trigger**: `pull_request` with types `[opened, synchronize, reopened]`.

**Permissions block** on the workflow: `contents: write` (to push to gh-pages), `pull-requests: read`.

#### Job `build` (runs on `ubuntu-latest`)

- `actions/checkout@v4` — check out the PR branch
- `prefix-dev/setup-pixi@v0.8.8` — install pixi and resolve the environment
- Run `pixi run build` — executes `install-gems` then `bundle exec jekyll build`, producing `_site/`
- `actions/upload-artifact@v4` — upload `_site/` as artifact named `jekyll-site-${{ github.event.number }}`

#### Job `deploy-preview` (needs `build`, runs on `ubuntu-latest`)

- `actions/checkout@v4` with `ref: gh-pages` and `fetch-depth: 1` — shallow checkout of gh-pages
- `actions/download-artifact@v4` — download the artifact into `draft/${{ github.event.number }}/`
- Configure git identity (`github-actions[bot]`)
- `git add`, `git commit -m "Deploy PR #N preview"`, `git push`

---

## Verification

- Respond to the current PR with a comment linking to the workflow run and preview URL (if deploy succeeds).
- If the deploy fails, comment with the error message and a link to the workflow run for debugging.

---

## Decisions

- `linux-64` added to pixi.toml over using `macos-latest` to stay on the cheaper/faster standard runner.
- Shallow checkout (`fetch-depth: 1`) over `peaceiris/actions-gh-pages` to keep dependencies minimal and control the exact path written.
- The deploy job does a simple non-force push on top of the existing shallow gh-pages checkout; `draft/<PR_NUMBER>/` is the only path touched.
