#!/bin/bash
# Start local production servers for a11yhood
# This script starts both backend (port 8001) and frontend (port 4173+) in production mode
# Uses production Supabase database with real OAuth
# 
# Usage:
#   ./start-prod.sh        # Normal start
#   ./start-prod.sh --help # Show help

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Timing helper
SECONDS=0
ts() {
  # Prints elapsed seconds since script start
  echo "${SECONDS}s"
}

# Parse arguments
HELP=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --help)
      HELP=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      HELP=true
      shift
      ;;
  esac
done

if [ "$HELP" = true ]; then
  echo "Usage: ./start-prod.sh [OPTIONS]"
  echo ""
  echo "Starts local production frontend (backend must be running separately on port 8001)"
  echo ""
  echo "Prerequisites:"
  echo "  - Backend server running on port 8001"
  echo "  - .env.production.local configured with production settings"
  echo "  - Production Supabase credentials configured"
  echo ""
  echo "Options:"
  echo "  --help       Show this help message"
  echo ""
  echo "The frontend will be built and served in preview mode on port 4173"
  exit 0
fi

# Don't exit on error, handle errors gracefully
set +e

echo -e "${BLUE}🚀 Starting a11yhood local PRODUCTION environment...${NC} (t=0s)"
echo -e "${YELLOW}⚠️  Using PRODUCTION Supabase database${NC}"
echo ""

# Kill any existing frontend processes
echo -e "${YELLOW}🔄 Stopping existing frontend...${NC} (t=$(ts))"
pkill -f "npm.*dev" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 2

# Load environment variables from .env.production.local
set -a
[ -f .env.production.local ] && source .env.production.local
set +a

# Get backend URL from VITE_API_URL or default to localhost:8001
BACKEND_URL="${VITE_API_URL:-http://localhost:8001}"

# Verify backend is running
echo -e "${BLUE}🔍 Checking backend server at ${BACKEND_URL}...${NC} (t=$(ts))"
if ! curl -s ${BACKEND_URL}/health > /dev/null 2>&1; then
  echo -e "${RED}✗ Error: Backend server not running at ${BACKEND_URL}${NC}"
  echo "   Please ensure the backend is running at ${BACKEND_URL}"
  echo "   The backend should be started separately and always be available"
  exit 1
fi
echo -e "${GREEN}✓ Backend is ready at ${BACKEND_URL}${NC} (t=$(ts))"

# Verify Supabase connection
echo -e "${BLUE}🔍 Verifying Supabase connection...${NC}"
SOURCES_CHECK=$(curl -s ${BACKEND_URL}/api/sources/supported 2>&1)
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Supabase connection verified${NC}"
else
  echo -e "${YELLOW}⚠️  Warning: Could not verify Supabase connection${NC}"
  echo "   This may be normal if no supported sources are seeded yet"
fi

# Start frontend
echo -e "${BLUE}🎨 Starting frontend server (port 4173)...${NC} (t=$(ts))"

# Check if .env.production.local exists (production config)
if [ ! -f .env.production.local ]; then
  echo -e "${YELLOW}⚠️  Warning: .env.production.local not found${NC}"
  echo "   Please create .env.production.local with production settings"
  echo "   See .env.example for reference"
  exit 1
fi

echo -e "${GREEN}✓ Using .env.production.local for configuration${NC}"

# Verify frontend dependencies are installed
if [ ! -d node_modules ]; then
  echo -e "${BLUE}📦 Installing frontend dependencies...${NC}"
  npm install
  if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Failed to install frontend dependencies${NC}"
    exit 1
  fi
  echo -e "${GREEN}✓ Frontend dependencies installed${NC} (t=$(ts))"
fi

# Build frontend for production
echo -e "${BLUE}🏗️  Building frontend for production...${NC}"
npm run build -- --mode production
if [ $? -ne 0 ]; then
  echo -e "${RED}✗ Failed to build frontend${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Frontend built${NC} (t=$(ts))"

# Start frontend in preview mode (serves the production build)
npm run preview > frontend.log 2>&1 &
FRONTEND_PID=$!
echo -e "${GREEN}✓ Frontend started (PID: $FRONTEND_PID)${NC} (t=$(ts))"

# Get frontend URL and port from environment or default
FRONTEND_PORT="${VITE_FRONTEND_PORT:-4173}"
FRONTEND_HOST="${VITE_FRONTEND_HOST:-localhost}"
FRONTEND_URL="http://${FRONTEND_HOST}:${FRONTEND_PORT}"

# Wait for frontend to be ready
echo -e "${BLUE}⏳ Waiting for frontend to be ready...${NC}"
RETRIES=0
MAX_RETRIES=30
until curl -s ${FRONTEND_URL} > /dev/null 2>&1; do
  RETRIES=$((RETRIES+1))
  if [ $RETRIES -ge $MAX_RETRIES ]; then
    echo -e "${RED}✗ Frontend failed to start after ${MAX_RETRIES} seconds${NC}"
    echo "   Check frontend.log for errors:"
    tail -n 20 frontend.log
    exit 1
  fi
  sleep 1
done
echo -e "${GREEN}✓ Frontend is ready${NC} (t=$(ts))"

# Success summary
echo ""
echo -e "${GREEN}✅ Production environment started successfully!${NC} (t=$(ts))"
echo ""
echo -e "${BLUE}🌐 Services:${NC}"
echo "   Frontend:  ${FRONTEND_URL} (production build)"
echo "   Backend:   ${BACKEND_URL} (separate server)"
echo "   API Docs:  http://localhost:8001/docs"
echo ""
echo -e "${BLUE}📊 Database:${NC}"
echo "   Mode:      PRODUCTION (real data, real OAuth)"
echo ""
echo -e "${BLUE}📝 Logs:${NC}"
echo "   Frontend:  tail -f frontend.log"
echo ""
echo -e "${BLUE}🛑 Stop frontend:${NC}"
echo "   ./stop-prod.sh"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: You are using PRODUCTION database${NC}"
echo "   - All data changes are PERMANENT"
echo "   - Use real GitHub OAuth (not test users)"
echo "   - Backend runs separately on port 8001"
echo ""
