#!/bin/bash
# RULE 2: Work Critic
# RULE 6: Ask Before Acting

PROMPT="$CLAUDE_PROMPT"

# Only output if user is reporting a bug/problem
if echo "$PROMPT" | grep -qiE "(broken|bug|error|not working|failing|issue|problem|fix)"; then
    echo "RULE 6: User reports something broken - ASK for logs/evidence FIRST before acting" >&2
fi

# Silent otherwise
exit 0
