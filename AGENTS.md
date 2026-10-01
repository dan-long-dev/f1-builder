# AGENTS.md

How to work in this repo. Project-specific detail lives in three other files:

- `BRIEF.md` — what we're building and what "done" looks like.
- `RECIPE.md` — how: stack, commands, layout, conventions, and the technique vocabulary.
- `PLAN.md` — build order and progress, as checkboxes.

Read all three before starting work.

## Working rules
- Work on the first unchecked phase in `PLAN.md` only. When its boxes are done, tick them, summarise what changed, and stop for review.
- Before starting a phase, say which techniques from `RECIPE.md` you'll use and any trade-offs (performance, complexity, new dependencies).
- Use the names in the vocabulary table; they define the intended result. If the brief needs something the table doesn't cover, propose a technique and a reference before building it.
- Run and check the result after each change: the page in a browser, the build, or the tests `RECIPE.md` names.
- Values someone will want to tune (colours, sizes, timings, thresholds) go where they're easy to find and change: a debug GUI, a config module or CSS custom properties, as `RECIPE.md` says.
- Keep changes scoped to the phase. No drive-by refactors or rewrites.
- Don't add dependencies beyond those `RECIPE.md` lists without asking.
- If the brief is ambiguous, ask instead of guessing.

## Keeping these files current
- When a convention is settled or a technique proves out, propose a line for `RECIPE.md`.
- When scope changes, update `PLAN.md` (add, split or delete phases) and say so in the summary.
- Don't edit `BRIEF.md` without asking; it's the owner's statement of intent.
