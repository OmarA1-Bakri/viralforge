#!/bin/bash

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:8001"

echo -e "${YELLOW}Testing Crew Social Tools Endpoints${NC}\n"

# Test health endpoint
echo -e "${YELLOW}1. Testing health endpoint...${NC}"
HEALTH=$(curl -s ${BASE_URL}/health)
if echo "$HEALTH" | grep -q "ok"; then
  echo -e "${GREEN}✓ Health check passed${NC}"
else
  echo -e "${RED}✗ Health check failed${NC}"
  exit 1
fi
echo ""

# Test YouTube search
echo -e "${YELLOW}2. Testing YouTube search...${NC}"
YOUTUBE=$(curl -s -X POST ${BASE_URL}/v1/youtube/lookup \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "search",
    "id_or_query": "viral videos",
    "limit": 5
  }')

if echo "$YOUTUBE" | grep -q "items"; then
  COUNT=$(echo "$YOUTUBE" | jq '.items | length')
  echo -e "${GREEN}✓ YouTube search returned ${COUNT} results${NC}"
  echo "$YOUTUBE" | jq '.items[0] | {title, author, url}' 2>/dev/null || echo "No results"
else
  echo -e "${RED}✗ YouTube search failed${NC}"
fi
echo ""

# Test Reddit scan
echo -e "${YELLOW}3. Testing Reddit scan...${NC}"
REDDIT=$(curl -s -X POST ${BASE_URL}/v1/reddit/scan \
  -H "Content-Type: application/json" \
  -d '{
    "subreddit": "videos",
    "sort": "hot",
    "limit": 5
  }')

if echo "$REDDIT" | grep -q "items"; then
  COUNT=$(echo "$REDDIT" | jq '.items | length')
  echo -e "${GREEN}✓ Reddit scan returned ${COUNT} results${NC}"
  echo "$REDDIT" | jq '.items[0] | {title, author, url}' 2>/dev/null || echo "No results or Reddit API not configured"
else
  echo -e "${YELLOW}⚠ Reddit scan failed (may need API credentials)${NC}"
fi
echo ""

# Test TikTok (expected to be empty for now)
echo -e "${YELLOW}4. Testing TikTok search...${NC}"
TIKTOK=$(curl -s -X POST ${BASE_URL}/v1/tiktok/search \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "trending",
    "region": "US",
    "limit": 5
  }')

if echo "$TIKTOK" | grep -q "items"; then
  COUNT=$(echo "$TIKTOK" | jq '.items | length')
  if [ "$COUNT" -eq 0 ]; then
    echo -e "${YELLOW}⚠ TikTok returned 0 results (implementation needed)${NC}"
  else
    echo -e "${GREEN}✓ TikTok search returned ${COUNT} results${NC}"
  fi
else
  echo -e "${RED}✗ TikTok search failed${NC}"
fi
echo ""

echo -e "${GREEN}Testing complete!${NC}"
echo -e "${YELLOW}Note: Some endpoints may need API credentials configured${NC}"
