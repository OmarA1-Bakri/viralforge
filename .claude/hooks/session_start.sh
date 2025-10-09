#!/bin/bash
# RULE 5: Branch Awareness
# RULE 7: Stop Assuming
# RULE 8: When Stuck/Confused

# Silent - only outputs current branch for reference
cd "$CLAUDE_PROJECT_DIR" || exit 0

CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")

echo "CURRENT BRANCH: $CURRENT_BRANCH"
echo ""
echo "RULE 7: Don't trust memory - verify with git and grep"
echo "RULE 8: When stuck, STOP and ask for direction"
echo ""

exit 0
