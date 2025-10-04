#!/bin/bash
# Load environment variables and run full system test

set -a  # automatically export all variables
source ../../.env
set +a

# LiteLLM requires OPENROUTER_API_KEY as an environment variable
export OPENROUTER_API_KEY="${OPENROUTER_API_KEY}"

# Verify keys are loaded
echo "=== Environment Check ==="
echo "MISTRAL_API_KEY: ${MISTRAL_API_KEY:0:10}... (${#MISTRAL_API_KEY} chars)"
echo "OPENROUTER_API_KEY: ${OPENROUTER_API_KEY:0:10}... (${#OPENROUTER_API_KEY} chars)"
echo ""

# Run the full system test
echo "=== Starting Full System Test ==="
python3 test_full_system.py
