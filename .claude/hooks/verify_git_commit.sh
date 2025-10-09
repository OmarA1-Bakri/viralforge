#!/bin/bash
# RULE 4: Git Workflow Verification

cd "$CLAUDE_PROJECT_DIR" || exit 0

# Only output if there are uncommitted changes
if ! git diff --quiet || ! git diff --cached --quiet; then
    echo "WARNING: Uncommitted changes detected" >&2
    echo "RULE 4 VIOLATION: Git workflow not completed" >&2
    echo "Required: test, work critic, git add, commit, push" >&2
    exit 1
fi

exit 0
