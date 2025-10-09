#!/bin/bash
# RULE 3: Build Prerequisites

COMMAND=$(echo "$CLAUDE_TOOL_INPUT" | jq -r '.command // empty' 2>/dev/null)

if [ -z "$COMMAND" ]; then
    exit 0
fi

BUILD_PATTERNS=(
    "npm run build"
    "npm run deploy"
    "yarn build"
    "pnpm build"
)

IS_BUILD=false
for pattern in "${BUILD_PATTERNS[@]}"; do
    if [[ "$COMMAND" == *"$pattern"* ]]; then
        IS_BUILD=true
        break
    fi
done

if [ "$IS_BUILD" = false ]; then
    exit 0
fi

# Only warn if backend not running
if ! ps aux | grep -v grep | grep -q backend; then
    echo "WARNING: Backend not running before build" >&2
    echo "RULE 3: Verify backend is running and correct version" >&2
    exit 1
fi

exit 0
