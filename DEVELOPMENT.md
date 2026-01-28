# Development Guide for a11yhood Frontend

This guide explains how to set up and run the a11yhood frontend in different environments.

## Quick Start

### Development Environment (Recommended for Active Development)
```bash
# Terminal 1: Start the test backend (port 8000 with local test database)
# (Backend repository setup - outside scope of this guide)

# Terminal 2: Start the frontend
./scripts/start-dev.sh
# Frontend runs on: https://localhost:5173
# Hot reload: Enabled (changes reflect immediately)
```

### Production Environment (For Testing Production Build)
```bash
# Terminal 1: Start the production backend (port 8001 with Supabase)
# (Backend repository setup - outside scope of this guide)

# Terminal 2: Start the frontend
./scripts/start-prod.sh
# Frontend runs on: https://localhost:4173
# Tests actual production build with real database
```

## Environment Comparison

| Aspect | Development (Dev) | Production (Prod) |
|--------|-------------------|-------------------|
| **Script** | `./scripts/start-dev.sh` | `./scripts/start-prod.sh` |
| **Env File** | `.env.local` | `.env.production.local` |
| **Frontend Port** | 5173 | 4173 |
| **Frontend URL** | https://localhost:5173 | https://localhost:4173 |
| **Backend Port** | 8000 (HTTP) | 8001 (HTTPS) |
| **Backend URL** | http://localhost:8000 | https://localhost:8001 |
| **Database** | Local test database | Supabase (production) |
| **Build Type** | Dev server (no build step) | Production build (minified) |
| **Hot Reload** | ✅ Enabled | ❌ Disabled |
| **API Proxying** | ✅ Vite proxy (no CORS) | ❌ Direct requests (CORS required) |
| **Use Case** | Development & unit testing | Integration testing, production verification |

## Development Environment Details

### Setup

1. **Start Test Backend**: Run your backend on `http://localhost:8000` with local test database configured
2. **Environment File**: Uses `.env.local` with `VITE_API_URL=http://localhost:8000`
3. **Start Frontend**: Run `./scripts/start-dev.sh`

### Key Features

- **Vite Dev Server**: Uses Vite's built-in development server with hot module replacement (HMR)
- **Automatic Proxy**: Vite's dev server automatically proxies `/api` requests to `http://localhost:8000`
- **No CORS Issues**: Requests go through the proxy, avoiding cross-origin errors
- **Fast Feedback**: Changes to code hot reload instantly in the browser
- **Full Debugging**: Source maps available for easy browser debugging

### Workflow

```bash
# 1. Backend must be running on port 8000
curl http://localhost:8000/health  # Should return success

# 2. Start development environment
./scripts/start-dev.sh

# 3. Open frontend in browser
# Frontend auto-opens or navigate to: https://localhost:5173

# 4. Make code changes - they hot reload automatically
```

## Production Environment Details

### Setup

1. **Start Production Backend**: Run your backend on `https://localhost:8001` with Supabase configured
2. **Environment File**: Uses `.env.production.local` with `VITE_API_URL=https://localhost:8001`
3. **Start Frontend**: Run `./scripts/start-prod.sh`

### Important: CORS Configuration

In production preview mode, the frontend makes **direct requests** to the backend (no proxy). This means:

- Frontend origin: `https://localhost:4173`
- Backend origin: `https://localhost:8001`
- **Required**: Backend must be configured to accept CORS from `https://localhost:4173`

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
- **CORS Handling**: Tests cross-origin request handling

### Workflow

```bash
# 1. Backend must be running on port 8001 with CORS enabled
curl -k https://localhost:8001/health  # Should return success

# 2. Start production environment
./scripts/start-prod.sh
# This will:
# - Run tests
# - Build the frontend for production
# - Serve the built files on port 4173

# 3. Open frontend in browser
# Navigate to: https://localhost:4173

# 4. Make changes? You must rebuild:
# - Either restart ./scripts/start-prod.sh
# - Or manually run: npm run build && npm run preview
```

## Environment Variables

### Development (.env.local)

```dotenv
# Frontend URL
# http://localhost:8000 - Test backend with local database
VITE_API_URL=http://localhost:8000

# Supabase (used in production only, set to dummy values)
VITE_SUPABASE_URL=https://ztnxqktwvwlbepflxvzp.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...

VITE_ENV=development
VITE_LOG_LEVEL=debug
```

### Production (.env.production.local)

```dotenv
# Frontend URL
# https://localhost:8001 - Production backend with Supabase
VITE_API_URL=https://localhost:8001

# Real Supabase credentials
VITE_SUPABASE_URL=https://ztnxqktwvwlbepflxvzp.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...

VITE_ENV=production
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

**Problem**: Backend not responding on port 8000
```bash
# Check if backend is running
curl http://localhost:8000/health

# If not running, start it (outside this repository)
```

**Problem**: CORS errors in dev mode
```
This should NOT happen in dev mode due to Vite proxy.
Check that VITE_API_URL=http://localhost:8000 in .env.local
```

### Prod Environment

**Problem**: CORS error: "No 'Access-Control-Allow-Origin' header"
```
This is expected if backend CORS is not configured.
See "Backend CORS Configuration" section above.
Make sure backend allows: https://localhost:4173
```

**Problem**: Port 4173 already in use
```bash
# Kill existing preview server
pkill -f "vite preview"
# Or run the stop script
./scripts/stop-prod.sh
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
Backend (http://localhost:8000)
  ↓
Test Database

✅ No CORS issues - same origin
```

### Production (direct requests)
```
Browser (https://localhost:4173)
  ↓
Direct Request (CORS required)
  ↓
Backend (https://localhost:8001)
  ↓
Supabase Database

⚠️ CORS must be configured on backend
```

## Common Tasks

### Switch from Dev to Prod Environment
```bash
# Stop the current environment
pkill -f "npm.*dev"

# Start production environment
./scripts/start-prod.sh
```

### Rebuild Production Without Restarting
```bash
npm run build -- --mode production
npm run preview
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
- [`.env.local`](.env.local) - Development environment variables
- [`.env.production.local`](.env.production.local) - Production environment variables
- [`.github/workflows/`](.github/workflows/) - CI/CD configuration for reference
