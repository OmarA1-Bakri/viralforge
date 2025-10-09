# Claude Code Protocol for ViralForge

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## RULE 1: AI MODEL NAMES - ABSOLUTE PROHIBITION

NEVER change AI model names in any code without explicit user instruction.

Current Models in Use:
* Profile Analysis & Viral Scoring: x-ai/grok-4-fast (profile-analyzer.ts, viral-scoring-rubric-v2.ts)
* Trend Discovery: x-ai/grok-4-fast (openrouter.ts)
* Content Analysis: x-ai/grok-4-fast (openrouter.ts)

YOU HAVE NO AUTHORITY TO:
* Change model names
* "Fix" models based on 404 errors without permission
* Assume a model is wrong
* Optimize model selection

If you see model errors:
1. Report the error to the user
2. Wait for explicit instruction
3. NEVER make assumptions about what model should be used

---

## RULE 2: WORK CRITIC (MANDATORY)

RUN work critic on EVERY plan before implementation
RUN work critic AFTER every implementation
LOOP until all errors are resolved

No exceptions - this is mandatory QA.

---

## RULE 3: BUILD PREREQUISITES

Before running ANY build, verify:

```bash
# Check backend is running
ps aux | grep [b]ackend

# Verify backend version
curl http://localhost:PORT/version
```

---

## RULE 4: GIT WORKFLOW (MANDATORY - EVERY CHANGE)

On EVERY change:

1. Make change
2. Test it works
3. RUN WORK CRITIC
4. Then and only then:
```bash
git add .
git commit -m "descriptive message"
git push origin <branch-name>
```

EVERY TIME. NO EXCEPTIONS. NO SHORTCUTS.

---

## RULE 5: BRANCH AWARENESS

Before ANY work:

```bash
# Always check current branch FIRST
git branch --show-current

# Verify what's actually in the branch
git log --oneline -10

# Know what features are where
git log --all --oneline --graph
```

DON'T ASSUME - VERIFY

---

## RULE 6: ASK BEFORE ACTING

When user reports something is broken:

1. ASK for logs/error messages FIRST
2. ASK for steps to reproduce
3. CONFIRM understanding before making ANY changes
4. DON'T immediately start "fixing" things

---

## RULE 7: STOP ASSUMING

Your memory is a WEAKNESS. Deal in FACTS.

* "This branch should have X" -> git log | grep "X"
* "This is YouTube-only" -> grep -r "youtube" src/
* "I remember this code" -> cat file.js
* Trust memory -> Trust git and grep

If a branch is YouTube-only, CHECK the actual code first.
If a branch should have commits, VERIFY with git log first.
Don't trust memory - trust git and grep.

---

## RULE 8: WHEN STUCK/CONFUSED

1. STOP immediately
2. DON'T keep making changes hoping something works
3. ASK user for direction
4. State clearly: "I'm uncertain about X. Can you clarify?"

---

## QUICK REFERENCE CHECKLIST

Before starting ANY task:
- Check current branch: git branch --show-current
- Verify branch contents: git log --oneline
- Review this document for AI model rules

Before making changes:
- Ask for logs/evidence if fixing a bug
- Confirm understanding with user
- Verify assumptions with git/grep

After making changes:
- Test it works
- Run work critic (MANDATORY)
- Git add, commit, push (MANDATORY)

If confused:
- STOP
- Ask user
- Don't guess

---

*End of protocol.*
