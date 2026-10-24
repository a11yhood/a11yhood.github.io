# Development Guide for a11yhood Frontend

This guide explains how to set up and run the a11yhood frontend in different environments.

## Identity Field Best Practice

- Use `username` as the canonical user identifier in frontend code, API payloads, and route params.
- Do not introduce new `login` fields for user identity.
- If touching legacy code that still uses `login`, migrate it to `username` in the same change when practical.
- Prefer route patterns like `/profile/:username` and `/account/:username`.

## Collections Lockstep Contract

Backend and frontend should stay in sync on the collection schema. The current frontend expects collections to be typed reference containers, not product slug lists.

- `entries` is the canonical ordered list for a collection.
- `CollectionEntry.kind` must be `product`, `collection`, `blogPost`, or `query`.
- `product_ids` is a derived ordered projection of product entries.
- `product_slugs` is index-aligned with `product_ids`.
- Collection references are live by reference, so recursive lookup must guard against cycles.
- Collection list and detail responses should preserve entry ordering from create/update requests.
- On `/api/collections`, ownership markers must remain stable: owner rows return `access_role=owner` and `is_owner=true`; editor rows return `access_role=editor` and `is_owner=false`.

## Quick Start

This project uses [pixi](https://pixi.prefix.dev) as its toolchain. It provides the pinned Node version and the project tasks (see `pixi.toml`), so you don't need a system Node install. Run everything through pixi:

```bash
pixi task list        # see all tasks
pixi run <task>       # run one task (installs npm dependencies first when needed)
pixi shell            # or open a shell with Node on PATH and use npm directly
```

| Task | What it does |
|------|--------------|
| `pixi run dev` | Vite dev server with hot reload (`npm run dev`) |
| `pixi run preview` | Production build + `vite preview` on port 4173 |
| `pixi run test` | Reduced Vitest suite (what CI's PR preview runs) |
| `pixi run test-full` | Full Vitest suite (needs a backend for integration tests) |
| `pixi run lint` | ESLint across all source files |
| `pixi run build-vite` | Production bundle only (`dist/`) |
| `pixi run build-ghpages` | Full gh-pages build: reduced tests, type-check, bundle |

Inside `pixi shell`, the equivalent npm scripts (`npm run dev`, `npm run build`, `npm run preview`) work the same way.

### Development Environment (Recommended for Active Development)

Hot-reload development against a local dev backend:

```bash
# Terminal 1: Start the dev backend (port 8002 with the test database).
# From the backend repository: pixi run dev
# Backend runs on: http://localhost:8002

# Terminal 2: Start the frontend dev server (from this repository)
pixi run dev
# Frontend runs on: https://localhost:5173
# Hot reload: Enabled (changes reflect immediately)
```

### Production Environment (For Testing Production Build)

Test the actual production build against a local production backend:

```bash
# Terminal 1: Start the production backend (port 8001 with Supabase).
# From the backend repository: pixi run prod
# Backend runs on: https://localhost:8001

# Terminal 2: Build and preview the production bundle
pixi run preview
# Frontend runs on: https://localhost:4173
# Tests actual production build with real database
```

## Backend Ports

- **Dev backend**: `:8002` (HTTP by default; HTTPS on `:8443` when `certs/localhost.pem` exists in the backend repo) - active development with the test database
- **Prod backend**: `:8001` (HTTPS, Supabase) - testing production builds locally
- **Real servers**: use their domain URLs via `VITE_API_URL` (see below) 

## Environment Comparison

| Aspect | Development (Dev) | Production (Prod) |
|--------|-------------------|-------------------|
| **Command** | `pixi run dev` | `pixi run preview` |
| **Env File** | `.env.local` | `.env.production.local` |
| **Frontend Port** | 5173 | 4173 |
| **Frontend URL** | https://localhost:5173 | https://localhost:4173 |
| **Backend Port** | 8002 (HTTP) | 8001 (HTTPS) |
| **Backend URL** | http://localhost:8002 | https://localhost:8001 |
| **Database** | Local test database | Supabase (production) |
| **Build Type** | Dev server (no build step) | Production build (minified) |
| **Hot Reload** | ✅ Enabled | ❌ Disabled |
| **API Proxying** | ✅ Vite proxy (no CORS) | ✅ Vite preview proxy for a localhost backend; ❌ direct requests (CORS required) for a real server |
| **Use Case** | Development & unit testing | Integration testing, production verification |

## Development Environment Details

### Setup

1. **Start Dev Backend**: Run your backend on `http://localhost:8002` with the local test database configured
2. **Environment File**: `.env.local` with `VITE_API_URL=http://localhost:8002` (optional: Vite proxies to this by default)
3. **Start Frontend**: Run `pixi run dev`

To use a backend on a real server instead:

```bash
echo "VITE_API_URL=https://your-api-domain.com" >> .env.local
pixi run dev
```

### Key Features

- **Vite Dev Server**: Uses Vite's built-in development server with hot module replacement (HMR)
- **Automatic Proxy**: Vite's dev server automatically proxies `/api` requests to `http://localhost:8002`
- **No CORS Issues**: Requests go through the proxy, avoiding cross-origin errors
- **Fast Feedback**: Changes to code hot reload instantly in the browser
- **Full Debugging**: Source maps available for easy browser debugging

### Workflow

```bash
# 1. Backend must be running on port 8002 (or reachable via VITE_API_URL)
curl http://localhost:8002/health  # Should return success

# 2. Start development environment
pixi run dev

# 3. Open frontend in browser
Frontend auto-opens or navigate to: https://localhost:5173

# 4. Make code changes - they hot reload automatically
```

## Production Environment Details

### Setup

1. **Start Production Backend**: Run your backend on `https://localhost:8001` with Supabase configured
2. **Environment File**: Uses `.env.production.local` with `VITE_API_URL=https://localhost:8001`
3. **Build and Preview Frontend**: Run `pixi run preview`

To use a backend on a real server instead, set `VITE_API_URL` in `.env.production.local` to its URL before building (it is read at build time).

### Important: CORS Configuration

`vite preview` proxies `/api` the same way the dev server does (see `preview.proxy` in `vite.config.ts`), and when both the frontend and `VITE_API_URL` are on `localhost` the app uses relative `/api` paths. So against a **local** production backend (`https://localhost:8001`) you normally do not hit CORS.

CORS **is** required when `VITE_API_URL` points at a real (non-localhost) server, because the browser then makes direct cross-origin requests:

- Frontend origin: `https://localhost:4173` (or your deployed frontend domain)
- Backend origin: your server, e.g. `https://api.example.com`
- **Required**: that backend must accept CORS from the frontend origin

#### Backend CORS Configuration

Your backend needs to allow requests from the preview frontend. Example for FastAPI:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://localhost:4173",  # Production preview frontend
        "https://localhost:5173",  # Development frontend (if needed)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Key Features

- **Production Build**: Builds the same code you'd deploy (minified, optimized)
- **No Hot Reload**: Changes require rebuilding (not suitable for active development)
- **Real Database**: Uses Supabase with real data
- **Tests Build Output**: Ensures production build works correctly
- **CORS Handling**: With a real-server `VITE_API_URL`, exercises real cross-origin request handling

### Workflow

```bash
# 1. Backend must be running on port 8001 (with CORS enabled if you point VITE_API_URL at a real server)
curl -k https://localhost:8001/health  # Should return success

# 2. Build the production bundle and serve it locally
pixi run preview
# Frontend serves on: https://localhost:4173
# (Want the reduced tests and type-check gate first? Run `pixi run build-ghpages`.)

# 4. Open frontend in browser
# Navigate to: https://localhost:4173

# 5. Make changes? You must rebuild:
# - Stop the preview and re-run: pixi run preview
```

## Environment Variables

### Development (.env.local)

```dotenv
# Frontend URL
# http://localhost:8002 - Test backend with local database
VITE_API_URL=http://localhost:8002

# Dev auth mode (no Supabase required)
VITE_DEV_MODE=true
VITE_DEV_USER=admin

VITE_LOG_LEVEL=debug
```

Supabase variables are optional in dev mode and only required for production auth flows.

For test-focused setup, see `env.example.test`.

### Production (.env.production.local)

```dotenv
# Frontend URL
# https://localhost:8001 - Production backend with Supabase
VITE_API_URL=https://localhost:8001

# Real Supabase credentials
VITE_SUPABASE_URL=https://ztnxqktwvwlbepflxvzp.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...

VITE_LOG_LEVEL=debug
```

## Troubleshooting

### Dev Environment

**Problem**: Port 5173 already in use
```bash
# Find and kill existing process
lsof -i :5173
kill -9 <PID>
```

**Problem**: Backend not responding on port 8002 (or at `VITE_API_URL`)
```bash
# Check if backend is running
curl http://localhost:8002/health

# If not running, start it (outside this repository)
```

**Problem**: CORS errors in dev mode
```
This should NOT happen in dev mode due to Vite proxy.
Check that VITE_API_URL=http://localhost:8002 in .env.local
```

### Prod Environment

**Problem**: CORS error: "No 'Access-Control-Allow-Origin' header"
```
This only happens when VITE_API_URL points at a real (non-localhost) server and
that backend does not allow your frontend origin. A local backend is reached through
the Vite preview proxy and should not produce CORS errors.
See "Backend CORS Configuration" section above.
Make sure backend allows: https://localhost:4173
```

**Problem**: Port 4173 already in use
```bash
# Kill existing preview server
pkill -f "vite preview"
```

**Problem**: Frontend builds but shows blank page
1. Open browser DevTools
2. Check Console tab for errors
3. Check Network tab - API requests should succeed (no 404s)
4. Verify backend is running and has CORS enabled

## API Request Flow Diagram

### Development (with Vite proxy)
```
Browser (https://localhost:5173)
  ↓
Vite Dev Server Proxy (localhost:5173)
  ↓
Backend (http://localhost:8002)
  ↓
Test Database

✅ No CORS issues - same origin
```

### Production preview with a local backend (via Vite preview proxy)
```
Browser (https://localhost:4173)
  ↓
Vite Preview Proxy (localhost:4173)
  ↓
Backend (https://localhost:8001)
  ↓
Supabase Database

✅ No CORS issues - same origin
```

### Production preview with a real server (direct requests)
```
Browser (https://localhost:4173)
  ↓
Direct Request (VITE_API_URL, CORS required)
  ↓
Backend (https://api.example.com)

⚠️ CORS must be configured on that backend
```

## Common Tasks

### Switch from Dev to Prod Environment
```bash
# Stop the current environment
pkill -f "npm.*dev"

# Start production build and preview
pixi run preview
```

### View Build Output
```bash
# See what files are generated
ls -la dist/

# Check bundle size
du -sh dist/
```

### Debug API Requests
1. Open Browser DevTools (F12)
2. Go to Network tab
3. Filter by "fetch" to see API requests
4. Check response status and headers
5. Use Console tab to test API calls

### Access Browser DevTools
- **Dev**: https://localhost:5173 → F12
- **Prod**: https://localhost:4173 → F12

## Need Help?

Check these resources:
- [`vite.config.ts`](vite.config.ts) - Vite configuration with proxy settings
- [`env.example`](env.example) and [`env.example.test`](env.example.test) - Example environment variables (copy to `.env.local` / `.env.production.local`)
- [`.github/workflows/`](.github/workflows/) - CI/CD configuration for reference

## Full Backend Validation in CI

This repository uses a manual, maintainers-in-control flow for the full backend-capable test suite.

When opening or reviewing PRs, use the checklist in
[.github/PULL_REQUEST_TEMPLATE.md](.github/PULL_REQUEST_TEMPLATE.md), including the accessibility checks for UI changes.

### Why this flow exists

- Full backend tests require repository secrets and a trusted backend-test environment.
- Fork pull requests do not receive repository secrets by default.
- Running secret-backed tests automatically on untrusted fork code is unsafe.

### Internal PRs (same-repo branches)

The full backend workflow is defined in [`.github/workflows/backend-tests.yml`](.github/workflows/backend-tests.yml).

1. Add label `run-full-backend` to trigger the full suite.
2. On new commits (`synchronize`), the trigger label is cleared automatically.
3. Re-add the label after each new commit if you want another full backend run.

### Fork PRs

- Fork PR events are intentionally treated as not applicable by the full backend workflow.
- Maintainers can explicitly dispatch the full suite by commenting `/run-full-backend` on the PR.
- The comment-trigger dispatcher lives in [`.github/workflows/full-backend-from-comment.yml`](.github/workflows/full-backend-from-comment.yml).
- It dispatches [`.github/workflows/backend-tests.yml`](.github/workflows/backend-tests.yml) against `refs/pull/<pr-number>/merge`.

### Required repository configuration

GitHub repository settings:

1. Actions workflow permissions: **Read and write** (required for workflow dispatch and PR comments).
2. Branch protection should require the check emitted by [`.github/workflows/backend-tests.yml`](.github/workflows/backend-tests.yml).

GitHub repository secrets (used by full backend suite):

1. `VITE_API_URL_PREVIEW` (must point to backend-test, not production backend).
  Workflows map this to `TEST_BACKEND_URL` internally for Vitest.
2. `TEST_RUN_TOKEN` (sent as `X-Test-Run-Token` in test reset/setup requests).

Backend-test environment requirements:

1. `DEV_TEST_AUTH_SECRET` configured server-side.
2. `ALLOW_TEST_DATA_MUTATION=true` configured server-side.
3. These values must not be exposed to frontend `VITE_*` variables.

### Full backend workflow preflight troubleshooting

The full backend workflow now runs a preflight check before `npm run test:run:full`.
This check calls `POST /api/scrapers/load-url` on `TEST_BACKEND_URL` with a
`github.com` URL to confirm backend domain configuration.

If the preflight fails, use these targeted fixes:

1. Error includes `No supported sources are configured yet.`
  Configure backend-test `supported_sources` so it is not empty, then redeploy backend-test.
2. Error includes `URL domain is not supported` for `github.com`.
  Add `github.com` to backend-test allowed/supported domains, then redeploy backend-test.
3. Error includes `Missing repository secret VITE_API_URL_PREVIEW`.
  Add the repository secret and point it to backend-test.
4. Error includes `Missing repository secret TEST_RUN_TOKEN`.
  Add the repository secret and ensure it matches backend-test `DEV_TEST_AUTH_SECRET`.

After applying a fix, retrigger [`.github/workflows/backend-tests.yml`](.github/workflows/backend-tests.yml)
using the PR label flow or workflow dispatch.
