#!/bin/bash
# Stop local production servers for a11yhood
# Cleanly shuts down both backend and frontend servers

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🛑 Stopping a11yhood production frontend...${NC}"
echo ""

# Kill frontend (vite preview/npm)
echo -e "${YELLOW}🎨 Stopping frontend server...${NC}"
pkill -f "vite preview"
pkill -f "npm.*preview"
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Frontend stopped${NC}"
else
  echo -e "${YELLOW}⚠️  No frontend process found${NC}"
fi

# Give processes time to clean up
sleep 1

echo ""
echo -e "${GREEN}✅ Production frontend stopped${NC}"
echo -e "${BLUE}💡 Note: Backend server on port 8001 is managed separately${NC}"
echo ""
echo -e "${BLUE}💡 To restart production frontend:${NC}"
echo "   ./start-prod.sh"
echo ""
echo -e "${BLUE}💡 To start development environment instead:${NC}"
echo "   ./start-dev.sh"
echo ""
