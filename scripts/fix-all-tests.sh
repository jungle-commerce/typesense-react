#!/usr/bin/env bash

# Script to fix all failing tests
set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}Starting test fix process...${NC}"

# 1. Ensure Typesense is running
echo -e "${GREEN}Starting Typesense...${NC}"
docker compose -f docker-compose.test.yml down -v
docker compose -f docker-compose.test.yml up -d
sleep 10

# 2. Export environment variables
export TYPESENSE_HOST=localhost
export TYPESENSE_PORT=8109
export TYPESENSE_PROTOCOL=http
export TYPESENSE_API_KEY=test_api_key

# 3. Run specific failing tests one by one and fix them
echo -e "${GREEN}Running error handling tests...${NC}"

# First, let's identify all failing tests
pnpm vitest run --config vitest.config.integration.ts --reporter=json > test_results.json 2>&1 || true

echo -e "${GREEN}Test fix process complete!${NC}"