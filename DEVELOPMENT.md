# Development Guide for a11yhood Frontend

This guide explains how to set up and run the a11yhood frontend with different backends.

## Need Help?

Check these resources:
- [`vite.config.ts`](vite.config.ts) - Vite configuration with proxy settings
- [`env.example`](env.example) - Development environment variables
- [`.github/workflows/`](.github/workflows/) - CI/CD configuration for reference

## Quick Start

### Development Environment (Recommended for Active Development)

Start by running 
```bash
pixi shell
```
and do everything in there.

Use this setup for hot-reload development with a local dev backend:

```bash
# Terminal 1: Start the development backend (port 8002 with local test database)
# (Backend repository setup - outside scope of this guide)
# Backend should be running on: http://localhost:8002

# Terminal 2: Start the frontend dev server

npm run dev

# Frontend runs on: https://localhost:5173
# Hot reload: Enabled (changes reflect immediately)
```

### Production Environment (For Testing Production Build)

Use this setup to test the actual production build with a local production backend:

```bash
# Terminal 1: Start the production backend (port 8001 with Supabase)
# (Backend repository setup - outside scope of this guide)
# Backend should be running on: https://localhost:8001

# Terminal 2: Build and preview the production build

npm run build && npm run preview
# Frontend runs on: https://localhost:4173
# Tests actual production build with real database
```

## Backend Ports
- **localprod backend**: `:8001` (HTTPS, with Supabase) - For testing production builds locally
- **localdev backend**: `:8002` (HTTP, with local test database) - For active development
- **Real servers**: Use their respective domain URLs (e.g., `https://api.example.com`)

## Environment Comparison

| Aspect | Development (Dev) | Production (Prod) |
|--------|-------------------|-------------------|
| **Command** | `npm run dev` | `npm run build && npm run preview` |
| **Env File** | `.env.local` | `.env.production.local` |
| **Frontend Port** | 5173 | 4173 |
| **Frontend URL** | https://localhost:5173 | https://localhost:4173 |
| **Backend Port (Local)** | 8002 (HTTP) | 8001 (HTTPS) |
| **Backend URL (Local)** | http://localhost:8002 | https://localhost:8001 |
| **Database** | Local test database | Supabase (production) |
| **Build Type** | Dev server (no build step) | Production build (minified) |
| **Hot Reload** | ✅ Enabled | ❌ Disabled |
| **API Proxying** | ✅ Vite proxy (no CORS) | ❌ Direct requests (CORS required) |
| **Use Case** | Development & unit testing | Integration testing, production verification |

## Development Environment Details

### Setup for Local Dev Backend

1. **Start Dev Backend**: Run your backend on `http://localhost:8002` with local test database configured
2. **Environment File**: Creates `.env.local` with `VITE_API_URL=http://localhost:8002` (optional—Vite proxies by default)
3. **Start Frontend**: Run `npm run dev`

### Setup for Real Server Backend

If your backend is running on a real server:

```bash
# Create or update .env.local
echo "VITE_API_URL=https://your-api-domain.com" >> .env.local

# Start frontend (it will connect to the real server)
npm run dev
```

### Key Features

- **Vite Dev Server**: Uses Vite's built-in development server with hot module replacement (HMR)
- **Automatic Proxy**: Vite's dev server automatically proxies `/api` requests to the backend (or `http://localhost:8002` by default)
- **No CORS Issues**: Requests go through the proxy, avoiding cross-origin errors
- **Fast Feedback**: Changes to code hot reload instantly in the browser
- **Full Debugging**: Source maps available for easy browser debugging

### Workflow

```bash
# 1. Backend must be running on port 8002 (local) or accessible via VITE_API_URL
curl http://localhost:8002/health  # Should return success

# 2. Start development environment
npm run dev

# 3. Open frontend in browser
# Frontend auto-opens or navigate to: https://localhost:5173

# 4. Make code changes - they hot reload automatically
```

## Production Environment Details

### Setup for Local Prod Backend

1. **Start Production Backend**: Run your backend on `https://localhost:8001` with Supabase configured
2. **Environment File**: Create `.env.production.local` with `VITE_API_URL=https://localhost:8001`
3. **Build and Preview Frontend**: Run `npm run build && npm run preview`

### Setup for Real Server Backend

If your backend is running on a real server:

```bash
# Create .env.production.local
echo "VITE_API_URL=https://your-api-domain.com" >> .env.production.local

# Build and preview (it will connect to the real server)
npm run build && npm run preview
```

### Important: CORS Configuration

In production preview mode, the frontend makes **direct requests** to the backend (no proxy). This means:

**For local preview** (`https://localhost:4173` → `https://localhost:8001`):
- **Required**: Backend must be configured to accept CORS from `https://localhost:4173`

**For real servers**:
- **Required**: Backend must be configured to accept CORS from your actual frontend domain

#### Backend CORS Configuration Example (FastAPI)

Update your backend to allow requests from the frontend:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://localhost:4173",        # Local production preview
        "https://localhost:5173",        # Local development (if needed)
        "https://your-frontend-domain",  # Real server
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
# 1. Backend must be running on port 8001 (local) with CORS enabled
curl -k https://localhost:8001/health  # Should return success

# 2. Build for production
npm run build

# 3. Preview the production build locally
npm run preview
# Frontend serves on: https://localhost:4173

# 4. Open frontend in browser
# Navigate to: https://localhost:4173

# 5. Make code changes?
# - Re-run: npm run build && npm run preview
```

## Troubleshooting

### Dev Environment

**Problem**: Port 5173 already in use
```bash
# Find and kill existing process
lsof -i :5173
kill -9 <PID>
```

**Problem**: Backend not responding on port 8002 (local) or VITE_API_URL (real server)
```bash
# Check if local backend is running
curl http://localhost:8002/health

# Or verify your VITE_API_URL in .env.local
cat .env.local | grep VITE_API_URL

# If not running, start it (outside this repository)
```

**Problem**: CORS errors in dev mode
```
This should NOT happen in dev mode due to Vite proxy.
Check that Vite is proxying correctly:
  - Port 5173 is running (npm run dev)
  - Backend is accessible at its configured URL
For real servers, ensure your backend allows CORS from https://localhost:5173
```

### Production Environment

**Problem**: CORS errors at https://localhost:4173
```
Production preview mode does NOT use Vite proxy.
Backend must explicitly allow CORS from https://localhost:4173
Update your backend's CORS configuration accordingly.
```

## Common Tasks

### Switch from Dev to Prod Environment
```bash
# Stop the current environment
pkill -f "npm.*dev"

# Start production build and preview
npm run build && npm run preview
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

## Identity Field Best Practice

- Use `username` as the canonical user identifier in frontend code, API payloads, and route params.
- Do not introduce new `login` fields for user identity.
- If touching legacy code that still uses `login`, migrate it to `username` in the same change when practical.
- Prefer route patterns like `/profile/:username` and `/account/:username`.

