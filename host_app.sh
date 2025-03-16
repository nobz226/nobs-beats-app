#!/bin/bash

# Colors for terminal output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if cloudflared is installed
if ! command -v cloudflared &> /dev/null; then
    echo -e "${RED}Error: cloudflared is not installed.${NC}"
    echo -e "Please install it with: brew install cloudflared (Mac) or follow instructions at https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/"
    exit 1
fi

echo -e "${YELLOW}Starting Flask app in the background...${NC}"
# Start Flask app in background
python app.py > flask_app.log 2>&1 &
FLASK_PID=$!

# Function to clean up when script is terminated
cleanup() {
    echo -e "${YELLOW}Stopping Flask app...${NC}"
    kill $FLASK_PID
    exit 0
}

# Set up trap to catch termination signals
trap cleanup SIGINT SIGTERM

# Wait for Flask to start up
echo -e "${YELLOW}Waiting for Flask app to start...${NC}"
sleep 3

# Check if Flask app is running by making a request to it
if curl -s http://localhost:5002 > /dev/null; then
    echo -e "${GREEN}Flask app is running on http://localhost:5002${NC}"
else
    echo -e "${RED}Flask app didn't start properly. Check flask_app.log for details.${NC}"
    kill $FLASK_PID
    exit 1
fi

# Start cloudflared tunnel
echo -e "${YELLOW}Creating Cloudflare tunnel...${NC}"
echo -e "${GREEN}Your app will be available at the URL shown below:${NC}"
cloudflared tunnel --url http://localhost:5002

# This line won't be reached unless cloudflared exits
echo -e "${RED}Cloudflare tunnel has stopped.${NC}"
cleanup 