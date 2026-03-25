---
name: qprobe-ux
description: "UX testing and evaluation using QUESTPIE Probe. Run heuristic evaluations, task completion tests, navigation audits, accessibility checks, and A/B comparisons on running web apps. Use when: evaluating usability, checking UX quality, auditing user flows, comparing two versions, finding UX issues, testing if users can complete tasks. Triggers: 'review the UX', 'is this usable', 'can a user find X', 'compare these two versions', 'UX audit', 'heuristic evaluation', 'test the onboarding flow', 'is the checkout intuitive', 'find usability problems', 'accessibility check'. Use even for 'does this make sense' or 'is this confusing' in context of a web UI."
---

# qprobe-ux — UX Testing Skill

Run UX evaluations on running web apps using Probe's browser control. No external services, no subscriptions.

**Requires:** `@questpie/probe` installed, app running via `qprobe compose up` or `qprobe start`.

---

## Methods

### 1. Heuristic Evaluation

Walk through the app and score against Nielsen's 10 usability heuristics.

**How to run:**
1. Open the target page: `qprobe browser open <url>`
2. Take interactive snapshot: `qprobe browser snapshot -i`
3. Navigate each major section, take snapshots
4. Check console for errors: `qprobe browser console --level error`
5. Check network for failures: `qprobe browser network --failed`
6. Evaluate each heuristic and write findings

**Heuristics to evaluate:**

| # | Heuristic | What to check |
|---|-----------|---------------|
| H1 | Visibility of system status | Loading states, progress indicators, feedback after actions. Click a button — does something visibly happen? |
| H2 | Match between system and real world | Labels use user language, not dev jargon. Icons are recognizable. Metaphors make sense. |
| H3 | User control and freedom | Can you go back? Undo? Cancel? Is there always a way out of a flow? |
| H4 | Consistency and standards | Same action, same pattern everywhere. Buttons look like buttons. Links look like links. |
| H5 | Error prevention | Required fields marked before submit. Destructive actions need confirmation. Inputs have constraints. |
| H6 | Recognition over recall | Options visible, not hidden. Current state obvious. No need to remember info between steps. |
| H7 | Flexibility and efficiency | Keyboard shortcuts? Bulk actions? Experienced users have fast paths? |
| H8 | Aesthetic and minimalist design | No clutter. Every element serves a purpose. Important things are prominent. |
| H9 | Help users recognize and recover from errors | Error messages are specific, plain language, suggest a fix. Not "Error 500" or "Something went wrong." |
| H10 | Help and documentation | Help is findable. Tooltips on complex fields. Empty states guide the user. |

**Output format:**
```
## Heuristic Evaluation: [page/flow name]

### H1: Visibility of system status — PASS / ISSUE / CRITICAL
Finding: [what you observed]
Evidence: [snapshot ref, console output, or screenshot]
Recommendation: [specific fix]

### H2: Match between system and real world — PASS / ISSUE / CRITICAL
...
```

Score each: PASS (no issues), ISSUE (minor, should fix), CRITICAL (blocks or confuses users).

---

### 2. Task Completion Test

Simulate a first-time user trying to complete a task. The agent has NO prior knowledge of the UI layout — it must discover the path using only what's visible.

**How to run:**
1. Define the task in plain language (e.g., "Create a new account and set up a profile")
2. Open the starting page: `qprobe browser open /`
3. Use ONLY `snapshot -i` to see what's available — do NOT look at source code
4. Navigate by choosing what seems most logical from visible elements
5. Record every step: what you saw, what you chose, why
6. Note dead-ends, confusion points, moments of hesitation

**Output format:**
```
## Task Completion: [task description]
Starting URL: /
Target: [expected end state]

### Step 1
Saw: [interactive elements from snapshot]
Chose: [@e3 "Sign Up"] — seemed like the right entry point
Result: navigated to /register

### Step 2
Saw: [elements]
Confusion: Two buttons both say "Next" — unclear which one to use
Chose: [@e5 "Next" — top one] — guessed based on position
Result: form validation error, no field highlighted

...

### Summary
- Completed: YES / NO
- Steps taken: 7 (expected: 4)
- Dead-ends: 1 (tried Settings instead of Profile)
- Confusion points: 2 (duplicate "Next" buttons, unclear error)
- Blockers: 0
- Recommendation: [top 3 fixes]
```

---

### 3. Navigation Audit

Test whether information architecture makes sense. Can the user find things where they expect them?

**How to run:**
1. Take snapshot of main navigation: `qprobe browser snapshot -i -s "nav"` or `qprobe browser snapshot -i -d 2`
2. For each target item, ask: "Where would a user look for [X]?"
3. Follow the most logical path based ONLY on labels
4. Record if the item was found, how many clicks, any wrong turns

**Tasks to test (adapt to the app):**
- Where are account settings?
- Where do I see my orders/history?
- How do I contact support?
- Where do I change my password?
- How do I delete my account?

**Output format:**
```
## Navigation Audit

| Task | Expected path | Actual path | Clicks | Found? | Issue |
|------|--------------|-------------|--------|--------|-------|
| Find settings | Profile → Settings | Profile → Settings | 2 | YES | — |
| Change password | Settings → Security | Settings → ??? | 3 | NO | No "Security" section visible |
| Delete account | Settings → Account → Delete | Settings → Account | 2 | NO | No delete option found |
```

---

### 4. Accessibility Quick Audit

Check common accessibility issues using Probe's browser tools.

**How to run:**
```bash
# Check for console errors/warnings related to a11y
qprobe browser console --grep "aria\|accessibility\|role\|alt"

# Check if all interactive elements have labels
qprobe browser snapshot -i
# → Look for elements with empty text or missing labels

# Check keyboard navigation
qprobe browser press Tab
qprobe browser press Tab
qprobe browser press Tab
# → Take snapshot after each Tab: is focus visible? Logical order?

# Check contrast (via JS)
qprobe browser eval "getComputedStyle(document.body).color"
qprobe browser eval "getComputedStyle(document.body).backgroundColor"

# Check images for alt text
qprobe browser eval "document.querySelectorAll('img:not([alt])').length"

# Check form labels
qprobe browser eval "document.querySelectorAll('input:not([aria-label]):not([id])').length"
```

**Checklist:**
- [ ] All images have alt text
- [ ] All form inputs have labels
- [ ] Focus is visible on Tab navigation
- [ ] Tab order is logical (follows visual layout)
- [ ] No empty buttons/links (text or aria-label)
- [ ] Color is not the only way to convey information
- [ ] Interactive elements are reachable by keyboard
- [ ] No console accessibility warnings

---

### 5. A/B Flow Comparison

Compare two versions of the same flow side by side.

**How to run:**
1. Run the same task on version A, record steps and observations
2. Run the same task on version B
3. Compare structured output

```bash
# Version A
qprobe browser open /checkout-v1
qprobe browser snapshot -i
# ... complete the flow, note steps, errors, confusion ...

# Version B
qprobe browser open /checkout-v2
qprobe browser snapshot -i
# ... same task, same criteria ...
```

**Output format:**
```
## A/B Comparison: [flow name]

| Metric | Version A | Version B |
|--------|-----------|-----------|
| Steps to complete | 5 | 3 |
| Console errors | 1 | 0 |
| Network errors | 0 | 0 |
| Confusion points | 2 | 1 |
| Dead-ends | 1 | 0 |

### Version A issues
- Step 3: unclear which "Continue" button to click
- Step 4: form resets on validation error

### Version B improvements
- Combined steps 2-3 into single form
- Inline validation prevents submit errors

### Recommendation: Version B — fewer steps, fewer confusion points
```

---

### 6. Error State Audit

Systematically test how the app handles bad input and edge cases.

**How to run:**
1. Find all forms: `qprobe browser snapshot -i` → look for textbox/select elements
2. For each form, test:
   - Submit empty
   - Submit with invalid data (wrong email format, too short, special characters)
   - Submit with extremely long input
   - Double-click submit button
3. Check: Are errors visible? Specific? Helpful? Does the form preserve valid input?

```bash
qprobe browser fill @e1 ""
qprobe browser click @e3
qprobe browser snapshot --diff
qprobe browser console --level error
```

---

## Tips

- **Always check logs first** — `qprobe browser console --level error` and `qprobe browser network --failed` reveal issues before you start evaluating visuals
- **Use snapshot -i** for every evaluation step — it's your primary "what does the user see" tool
- **Use snapshot --diff** after actions to see exactly what changed
- **Screenshot --annotate** when you need visual evidence for the report
- **Record important flows** while evaluating — `qprobe record start "ux-checkout"` gives you a free regression test as a bonus
- **Combine methods** — do a heuristic eval first (broad sweep), then task completion on the worst areas (deep dive)
- **Output as markdown** — all formats above are structured for easy sharing with team
