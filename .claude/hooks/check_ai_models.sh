#!/bin/bash
# RULE 1: AI Model Names - ABSOLUTE PROHIBITION

FILES=$(echo "$CLAUDE_TOOL_INPUT" | jq -r '.path // .file_path // empty' 2>/dev/null)

if [ -z "$FILES" ]; then
    exit 0
fi

PROTECTED_FILES=(
    "profile-analyzer.ts"
    "viral-scoring-rubric-v2.ts"
    "openrouter.ts"
)

for file in $FILES; do
    for protected in "${PROTECTED_FILES[@]}"; do
        if [[ "$file" == *"$protected"* ]]; then
            if echo "$CLAUDE_TOOL_INPUT" | grep -q "x-ai/grok"; then
                echo "BLOCKED: Attempting to modify AI model configuration in $protected" >&2
                echo "RULE 1 VIOLATION: AI Model Names - ABSOLUTE PROHIBITION" >&2
                echo "" >&2
                echo "You have NO authority to change model names." >&2
                echo "Report the error to user and wait for explicit instruction." >&2
                exit 2
            fi
        fi
    done
done

exit 0
