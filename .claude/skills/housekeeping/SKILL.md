---
name: housekeeping
description: Repo housekeeping for built-daily. Prune merged branches and stale worktrees, find PRs that say MERGED but never reached main, and check that production matches main. Use when asked to clean up, tidy branches, do housekeeping, or "why isn't X on production".
---

# Housekeeping

Goal: `main` is the only long-lived branch, everything merged is actually on
`main`, and production is running `main`.

Report what you found and what you removed. Never delete anything that isn't
already contained in `origin/main` without asking.

## 0. Don't switch the shared checkout

Other Claude sessions often work in the main checkout at the same time. A
`git checkout` there moves the branch out from under them, and your next
commit lands on their branch. For anything that commits, use a worktree:

```sh
git worktree add -b <branch> .claude/worktrees/<name> origin/main
```

Before committing, check that `git branch --show-current` is the branch you
expect.

## 1. Survey

```sh
git fetch --prune origin
git worktree list
git for-each-ref --format='%(refname:short) | %(upstream:track) | %(committerdate:short)' refs/heads
git branch --merged origin/main           # local, safe to delete
git branch -r --merged origin/main        # remote, safe to delete
git branch -r --no-merged origin/main     # remote, needs a look
gh pr list --state open --json number,title,headRefName,baseRefName,isDraft
```

## 2. Worktrees

A worktree is safe to remove only when it has no uncommitted changes and no
commits that aren't in `origin/main`:

```sh
git -C <path> status --short
git -C <path> log --oneline origin/main..HEAD
```

If it's clean, run `git worktree remove <path>` and delete its branch.
Otherwise leave it and report it.

## 3. Branches

- **Merged into `origin/main`:** delete locally (`git branch -d`) and on the
  remote (`git push origin --delete ...`). Keep `main` and any branch with an
  open PR.
- **Not merged:** don't delete. For each one, find its PR
  (`gh pr list --head <branch> --state all`) and classify it:
  - Open PR: report it, along with whether it's mergeable.
  - No PR: report its age and what it touches (`git diff --stat origin/main...<branch>`).
  - A **MERGED** PR whose work isn't on `main`: this is a stranded PR. See step 4.

## 4. Stranded PRs (MERGED but not shipped)

This has happened in two ways:

1. **Stacked PR merged into its base branch** after that base had already
   merged to `main` (#71, #82). Check with `gh pr view <n> --json baseRefName`.
2. **Merge commit dropped from `main`** even though the base was `main`. PR #3
   lost its CI, test and format tooling this way and stayed lost for two
   months.

The reliable test is ancestry, not the badge:

```sh
sha=$(gh pr view <n> --json mergeCommit --jq .mergeCommit.oid)
git merge-base --is-ancestor "$sha" origin/main && echo shipped || echo STRANDED
```

To re-land, prefer a fresh branch off `origin/main` that re-applies the change
over rebasing old commits, especially when the old work includes a
repo-wide reformat.

## 5. Production matches main

```sh
git log -1 --format='%h %cd' origin/main
vercel ls built-daily --environment production | head -5
vercel inspect <latest production url>   # created time and aliases
```

The newest production deployment should be created right after `main`'s head
commit and aliased to `built-daily-git-main`. If someone says a shipped feature
is missing but the deploy matches, suspect the installed PWA's cache first.

## 6. Repo health

- `npm run check` passes on `main` (format, lint, typecheck, unit tests).
- CI is green on `main`: `gh run list --branch main --limit 3`.
- Untracked files that keep showing up should be committed or added to
  `.gitignore`.
- Open Dependabot PRs: merge the grouped minor/patch ones once CI passes.
