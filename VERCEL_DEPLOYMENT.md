# Deployment Guide (Vercel)

## Overview

The frontend is hosted on Vercel in the `a11yhood` team, project
`a11yhood-github-io`, connected to this repository. The backend is a separate
Vercel project (`backend`, plus `backend-test` for testing).

| What | How |
|------|-----|
| Production | Every merge to `main` deploys to production automatically |
| Branch / PR previews | Every push to a branch or PR builds a preview deployment |
| Social link previews | `middleware.ts` (Vercel Routing Middleware), see below |
| Release verification | [Production Release](.github/workflows/production-release.yml) runs on `v*` tags |
| Accessibility scan | [a11y-scan.yml](.github/workflows/a11y-scan.yml) scans `https://a11yhood.org` after a successful Production Release |

> Merging to `main` goes live. Production Release does **not** deploy: it is a
> verification step that checks the tagged commit is on `main`, runs the reduced
> test suite, validates the Supabase config, and builds.

---

## Domains and DNS

DNS is managed at GoDaddy.

| Name | Record | Value |
|------|--------|-------|
| `a11yhood.org` | `A` | `216.150.1.1`, `216.150.16.1` |
| `www.a11yhood.org` | `CNAME` | `09c513578a4f5c0a.vercel-dns-016.com` |

`www.a11yhood.org` redirects (308) to `a11yhood.org`, configured in Vercel under
*Settings → Domains*. If Vercel recommends different records, use what its
Domains page shows.

`allyhood.org` is not served by Vercel. GoDaddy domain forwarding sends it
(301) to `https://a11yhood.org`. Change the destination under the domain's
*Forwarding* settings in GoDaddy.

When using `curl` or `dig` while changing records, query an authoritative or
public resolver (`dig +short <host> @1.1.1.1`); a local resolver cache can keep
returning old addresses for the TTL.

---

## Environment variables

Set in Vercel under *Settings → Environment Variables*. These are baked into the
bundle at build time, so changing one needs a new deployment.

| Variable | Production | Preview |
|----------|------------|---------|
| `VITE_API_URL` | `https://backend-a11yhood.vercel.app` | `https://backend-test-a11yhood.vercel.app` |
| `VITE_SUPABASE_URL` | production Supabase project URL | same |
| `VITE_SUPABASE_ANON_KEY` | production anon key | same |

Notes:

- Use the **Config** type for these (the Supabase anon key is public by design).
  Never put a service-role or other server key behind a `VITE_` name.
- Include the `https://` scheme and no trailing slash or whitespace in URLs.
- The middleware reads `VITE_API_URL` at runtime too and falls back to the
  production backend if it is unset.
- **Preview sign-in caveat:** previews use `backend-test`, which verifies tokens
  against a different Supabase project than the one in `VITE_SUPABASE_URL`, so
  signing in on a preview returns `401`. Public pages work; test authenticated
  flows locally or on production.
- `VITE_APP_VERSION` is set from the tag in the Production Release workflow but
  is not currently set on Vercel.

### Backend allowlists

The backend only accepts browser requests from origins in its `CORS_ORIGINS`
setting, and Supabase only redirects to URLs in its *Redirect URLs* list.
Production needs `https://a11yhood.org` (and `https://www.a11yhood.org`).
Do not add `*.vercel.app` origins to the production backend.

---

## Social link previews

`middleware.ts` serves the SPA shell with per-route title, description,
canonical URL, Open Graph and Twitter tags for:

- `/product/:slug`, `/blog/:slug`, `/collections/:slug`
- `/blog`, `/collections`, `/products` (including `?q=`, `tag`, `source`, `minRating`)

It fetches the item from the backend API (4s timeout, one retry on timeout or
5xx) and falls through to the plain SPA with the static tags in `index.html` if
anything fails. Results are cached at the edge for 5 minutes.

To check it, request a page as a crawler:

```bash
curl -s -A "facebookexternalhit/1.1" https://a11yhood.org/product/<slug> \
  | grep -E "<title>|og:title|og:image|canonical"
```

The first request to a cold route can fall through to the generic tags;
retry before concluding something is broken. The default share image is
`/favicon.ico`; a 1200×630 PNG would give better unfurls.

---

## Previews and protection

Preview deployment URLs (`*.vercel.app`) are behind Vercel Authentication.
Open them while signed in to Vercel, or create a shareable link from the
deployment toolbar. The production domain is public.

---

## Rolling back

- **Bad deploy:** in Vercel, *Deployments*, promote the previous production
  deployment (or revert the merge on `main`).
- **Hosting problem:** DNS can be pointed elsewhere at GoDaddy; the TTL is
  600 seconds.

---

## Release verification

Create a version tag (`vMAJOR.MINOR.PATCH`) on a commit that is on `main`:

```bash
git checkout main && git pull
git tag v1.2.3
git push origin v1.2.3
```

The workflow then verifies the tag is reachable from `main`, runs the reduced
test suite, validates the Supabase URL/key pair, builds, and triggers the
accessibility scan.

If it fails, fix the cause on `main` and tag again, or re-run it from the
Actions tab (*Run workflow*).

---

## Pull request validation

[pr-preview.yml](.github/workflows/pr-preview.yml) runs lint, tests, a build
and the accessibility checks on every PR. Vercel adds its own preview
deployment per push.

Forked PRs do not have access to repository secrets, so the full backend suite
(`test-with-backend`) does not run for them; a maintainer can run it manually
with the `run-full-backend` label or the *Run workflow* button.
