This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

#### 1. **Test-First Mandate**

* For new features and implementations in the backend particularly **Always** output the **unit / integration tests first**.
* Do **not** generate implementation code until tests are clearly defined and approved by the human operator.
* All delivered code must leave the test suite ✔️ green.

#### 2. **Immaculate Code Standard**

* Generated code **must** compile, lint cleanly (ruff / eslint / golangci-lint etc.), and pass type-checking (mypy / tsc / go vet etc.) **with zero warnings**.
* If tooling reports an issue, **fix it** before returning the response.

#### 3. **Design Compliance Only**

* Implement **exactly** the interfaces, schemas, and contracts supplied in the spec.
* **No self-invented APIs, no hidden globals, no spontaneous design changes.**
* Raise a clarification question if the spec is ambiguous; never guess.

#### 4. **Strict Scope Guard**

* The PRD (or the current ticket) is the single source of truth.
* Ignore tangential ideas, "nice-to-haves," or any feature not explicitly in scope unless the human operator amends the spec.

#### 5. **Modular, Microservice-Friendly Output**

* Each component must be:
  * **Independently testable** (mock external calls).
  * **Stateless** where feasible.
  * **Interface-driven** (clear inputs/outputs, no side effects outside declared boundaries).

#### 6. **Readable & Maintainable Style**

* Follow the project's style guide: naming, docstrings, comments, formatting.
* Prefer clarity over cleverness; avoid "magic."
* Provide concise inline comments for non-obvious logic.

#### 7. **Self-Review Before Responding**

Before presenting ANY implementation, perform a comprehensive self-critique:

**A. Automated Severity Check:**
* **CRITICAL**: Security vulnerabilities, data loss risks, authentication bypasses, SQL injection, XSS, broken auth
* **MAJOR**: Performance bottlenecks (O(n²) where O(n) exists), race conditions, memory leaks, architectural violations
* **MODERATE**: Missing error handling, untested edge cases, best practice violations, missing type hints
* **MINOR**: Style inconsistencies, missing docstrings, non-optimal patterns

**B. Mandatory Inspection Checklist:**
- [ ] Security: Input validation, authentication, authorization, data exposure
- [ ] Edge Cases: Null/empty inputs, boundary values, concurrent access, large datasets
- [ ] Error Handling: All failure modes caught, logged with context, user-facing messages appropriate
- [ ] Performance: No unnecessary loops, queries optimized, caching where appropriate
- [ ] Testing: Unit tests cover critical paths, mocks for external services
- [ ] Best Practices: Follows project patterns, type-safe, properly documented

**C. Confidence Rating (REQUIRED):**
Every implementation must include:
CONFIDENCE: [HIGH | MEDIUM | LOW]
CONCERNS: [List any remaining doubts, potential issues, or areas needing review]
TESTED: [Which test groups will validate this: unit/ai/api/etc.]

**D. Self-Critique Format:**
If ANY of these conditions are true, include a "⚠️ SELF-CRITIQUE" section:
- Implementation has MODERATE+ severity issues
- Confidence is MEDIUM or LOW
- Non-obvious algorithmic choices were made
- Security-sensitive code is involved
- Performance could be a concern

**E. Fix Before Presenting:**
- All CRITICAL issues MUST be resolved before responding
- MAJOR issues should be fixed unless they require architectural decisions
- Document MODERATE/MINOR issues that remain

**F. No False Confidence:**
- Never present code as "production-ready" without thorough validation
- If unsure about security/performance, state it explicitly
- Better to admit uncertainty than ship vulnerable code

#### 8. **Error Handling Discipline**

* Surface-level errors: return structured error objects / HTTP codes as per spec.
* Internal errors: log with actionable context, no silent failures, no `print` debugging left behind.

#### 9. **Prompt Efficiency**

* Respond with **complete, final** code blocks—no incremental partials.
* Minimize chatter; deliver code + concise explanations.
* If unsure, ask **one targeted question** rather than proceeding with assumptions.

#### 10. **Escalation Protocol**

* On any conflict between these rules and a user instruction, **pause** and ask for clarification.
* If a required external dependency is undefined, request explicit version or mock strategy before coding.

#### 11. **Running Commands is Your Duty**

* In all situations you are never to expect the user to run a command on your behalf
* If the user wants to run a command or perform an action themselves, he/she will tell you explicity that they want to run the command
* In the vast majoity of cases you are expected to run the code.

#### 12. **Proactive Issue Detection**

When reviewing existing code or implementing changes:
* **Challenge your own assumptions**: "Is this actually secure? What breaks this?"
* **Red-team your implementation**: Think like an attacker or malicious user
* **Stress-test mentally**: What happens under load? With bad data? In edge cases?
* **Compare alternatives**: Is there a better pattern/library/approach?
* **Check against project standards**: Does this match existing patterns in the codebase?

If you find issues in YOUR OWN implementation during self-review:
1. Fix them immediately
2. Document what you caught in the CONCERNS section
3. Explain why the fix is better

#### 13. **Build Version Verification**
ALWAYS CHECK THAT THE BUILD VERSION IS IN FACT THE LATEST VERSION:**

#### RULE 14. **AI MODEL CONFIGURATION**
- **NEVER** change AI model names in any code
- Before touching any AI model configuration: CHECK WITHT THE USER

#### RULE 15. **WORK CRITIC (MANDATORY)**
- **RUN** work critic on EVERY plan before implementation
- **RUN** work critic AFTER every implementation
- **LOOP** until all errors are resolved
- No exceptions - this is mandatory QA




