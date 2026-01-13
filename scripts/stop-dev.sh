!/bin/bash
# Stop local development frontend for a11yhood
#
# Usage:
#   ./stop-dev.sh              # Stop frontend
#   ./stop-dev.sh --help       # Show help

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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
  echo "Usage: ./stop-dev.sh [OPTIONS]"
  echo ""
  echo "Options:"
  echo "  --help       Show this help message"
  exit 0
fi

echo -e "${BLUE}🛑 Stopping a11yhood development frontend...${NC}"
echo ""

# Kill frontend only
echo -e "${YELLOW}Stopping frontend...${NC}"
if pkill -f "npm.*dev" 2>/dev/null || pkill -f "vite" 2>/dev/null; then
  echo -e "${GREEN}✓ Frontend stopped${NC}"
else
  echo "  (Frontend was not running)"
fi

echo ""
echo -e "${GREEN}✅ Development frontend stopped${NC}"
echo -e "${BLUE}💡 Note: Backend server on port 8001 is managed separately${NC}"
echo ""
