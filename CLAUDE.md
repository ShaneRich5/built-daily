# CLAUDE.md

## About This Project

Built Daily is a beginner-friendly workout tracking app designed around consistency and simplicity.

The app focuses on helping users:

- Build workout habits
- Log workouts quickly
- Track visible progress
- Stay motivated without complexity

This is intentionally not a hardcore bodybuilding or fitness analytics platform.

---

# Product Philosophy

Key principle:

> Consistency matters more than optimization.

Every feature should reduce friction and encourage users to continue showing up.

---

# Tech Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Firebase Auth
- Firestore
- Shadcn

---

# Coding Principles

## Prioritize Readability

Prefer code that is easy to understand over clever abstractions.

Good:

- Explicit naming
- Small focused functions
- Clear component boundaries

Avoid:

- Over-abstraction
- Premature optimization
- Excessive indirection
- Unnecessary generic utilities

---

# UX Priorities

This app is mobile-first.

Optimize for:

- Fast interactions
- Large touch targets
- Minimal typing
- Clear visual hierarchy
- Smooth workout logging

The active workout experience is the highest priority flow in the application.

---

# Design Guidelines

The UI should feel:

- Clean
- Calm
- Focused
- Encouraging
- Lightweight

Avoid:

- Visual clutter
- Overly complex dashboards
- Excessive gamification
- Aggressive fitness branding

---

# Feature Priorities

## MVP Features

- Authentication
- Workout logging
- Exercise tracking
- Workout templates
- Body weight tracking
- Progress history
- Offline support

---

# Data Modeling

Prefer straightforward Firestore document structures.

Optimize for:

- Developer velocity
- Query simplicity
- Predictable data access

Denormalization is acceptable when it improves UX or reduces complexity.

---

# Component Guidelines

Prefer:

- Small reusable UI components
- Feature-oriented structure
- Colocated logic when appropriate

Current structure (top level, no `src/`):

```
app/          routes (Next.js App Router)
components/   shared UI, including components/ui (shadcn)
features/     feature-owned screens and logic
lib/          data access, mappers, pure helpers
mcp/          the MCP server
tests/e2e/    Playwright specs
```

---

# State Management

Default to simple React patterns first.

Use:

- React state
- Context when necessary

Avoid adding heavy state management libraries unless complexity requires it.

---

# Performance

Prioritize:

1. Fast mobile interactions
2. Smooth workout logging
3. Offline reliability
4. Fast perceived loading times

---

# Accessibility

Maintain baseline accessibility support:

- Semantic HTML
- Form labels
- Keyboard accessibility where appropriate
- Reasonable contrast ratios

---

# Non-Goals

Do not prioritize during MVP:

- Nutrition tracking
- Social feeds
- AI coaching
- Smartwatch integrations
- Advanced analytics
- Complex gamification

---

# Contribution Expectations

When making changes:

- Keep components focused
- Prefer maintainable solutions
- Minimize unnecessary dependencies
- Keep files reasonably small
- Document important architectural decisions

## Branching

For any non-trivial change (a new feature, a bug fix touching more than a
one-line tweak, anything worth its own commit message), create a branch and
open a PR rather than committing directly to `main`. Small, purely
cosmetic tweaks (copy, a class name) can go straight to a branch too, but
use judgment — the point is `main` stays merge-only, not that every keystroke
needs its own branch.

Skip this only when the user explicitly says to work on `main` directly for
that change.

Open PRs against `main`. If a PR has to be stacked on another branch, change
its base to `main` before merging: the "PR targets main" check stays red until
you do. Stacked PRs merged into an already-merged branch never shipped (#71,
#82).

After a PR merges, confirm it actually reached `main` before calling it done:
`git merge-base --is-ancestor <merge sha> origin/main`. A MERGED badge alone
has been wrong before: PR #3's tooling was merged and later disappeared from
`main`'s history.

## Quality Checks

Run `npm run check` before pushing. It runs, in order:

- `format:check`: Prettier (`npm run format` fixes it)
- `lint`: ESLint (`npm run lint:fix` fixes what it can)
- `typecheck`: `tsc --noEmit`
- `test`: Vitest unit tests

Git hooks (Husky) run these for you: `pre-commit` formats and lints staged
files, `pre-push` runs typecheck and unit tests. Don't bypass them with
`--no-verify`; fix the failure instead.

CI (`.github/workflows/ci.yml`) runs the same checks plus Playwright smoke
tests on every PR. Vercel builds the preview separately.

Tests:

- Unit tests sit next to the code as `*.test.ts(x)` under `app/`,
  `components/`, `features/`, `lib/` or `mcp/`. Add one when you change logic
  in `lib/` or fix a bug, so it stays fixed.
- E2E specs live in `tests/e2e/`. Specs that need a signed-in user skip
  themselves unless `PLAYWRIGHT_TEST_EMAIL` and `PLAYWRIGHT_TEST_PASSWORD` are
  set.
- On Windows, `npm test` goes through `scripts/vitest.mjs`, which works around
  a drive-letter casing bug. Call `npm test`, not `npx vitest`.

`react-hooks/set-state-in-effect` is set to warn while issue #2 is open. Don't
add new violations.

---

# Product Identity

Built Daily should feel like:

- A workout journal
- A consistency tool
- A supportive companion

Not:

- A competitive social network
- A bodybuilding platform
- A complex fitness ERP

---

# Decision Framework

When uncertain between two approaches, prefer the option that:

- Reduces user friction
- Simplifies the experience
- Improves maintainability
- Speeds up iteration
- Keeps the product approachable for beginners
