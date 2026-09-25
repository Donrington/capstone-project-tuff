# Working on TUFF — the git workflow

One rule: **nobody pushes to `main` directly.** All work happens on a branch
and lands in `main` through a pull request (PR) that the repo owner reviews
and merges.

```
main ──●───────────────●───────────────●──   (owner-only, always deployable)
        \               \
         ● you/task-a    ● you/task-b        (everyone else works here)
              → PR →          → PR →
```

## The cycle, every time you start something new

1. **Get on `main` and make sure it's current.**
   ```bash
   git checkout main
   git pull origin main
   ```
2. **Branch off it, named for what you're building.**
   ```bash
   git checkout -b your-name/leaderboard-api
   ```
3. **Work, commit as you go.**
   ```bash
   git add .
   git status                 # check what's about to be committed
   git commit -m "Add leaderboard ranking query"
   ```
4. **Push the branch and open a PR.**
   ```bash
   git push -u origin your-name/leaderboard-api   # first push only
   git push                                        # every push after that
   ```
   Then open the PR — either on github.com (a banner appears after you push
   a new branch) or from the terminal:
   ```bash
   gh pr create --base main --title "Leaderboard API" --body "What this does and how you tested it."
   ```
5. **Wait for review.** The owner reviews the PR and merges it into `main`
   on GitHub, then lets everyone know it's in.
6. **Starting the next task:** clean up the old branch and repeat from step 1.
   ```bash
   git checkout main
   git pull origin main
   git branch -d your-name/leaderboard-api          # delete the local branch
   git push origin --delete your-name/leaderboard-api   # delete it on GitHub too, if it's still there
   git checkout -b your-name/next-task
   ```
   (If "delete branch on merge" is turned on in the repo settings, GitHub
   deletes the remote branch for you when the PR merges — you'd only need
   the local `git branch -d`.)

## Branch names

`yourname/short-task-description`, all lowercase, words separated by
hyphens — e.g. `ada/leaderboard-api`, `femi/invite-accept`,
`chidi/activity-logging`. Easy to tell at a glance whose branch it is and
what it's for.

## Commit messages

Short, present tense, says what changed: `Add leaderboard ranking query`,
not `fixed stuff` or `wip`. Several small commits while you work are fine —
GitHub shows the whole PR as one diff when it's reviewed.

## A few things that save everyone time

- **Pull `main` before you branch, every time** — step 1 above. Branching
  off a stale `main` is the #1 cause of merge conflicts later.
- **One branch, one PR, one piece of work.** Don't pile unrelated changes
  into the same branch — smaller PRs review faster.
- **If your PR sits for more than a day**, ping the owner directly rather
  than waiting silently.
- **Never commit `.env`, `node_modules`, or anything with a real password,
  API key, or secret in it.** Both `frontend/.gitignore` and
  `backend/.gitignore` already exclude the usual suspects — if `git status`
  ever shows one of those as ready to commit, stop and ask before pushing.
- **Merge conflict?** Usually it means `main` moved on since you branched.
  From your branch:
  ```bash
  git checkout main
  git pull origin main
  git checkout your-name/your-branch
  git merge main
  ```
  Fix the conflicting lines (git marks them with `<<<<<<<` / `=======` /
  `>>>>>>>`), then `git add .` the fixed files and `git commit` to finish
  the merge, and push as usual.

## Quick reference

| Doing this | Run this |
|---|---|
| Switch to `main` | `git checkout main` |
| Get the latest `main` | `git pull origin main` |
| Create + switch to a new branch | `git checkout -b your-name/task` |
| Switch to a branch that exists | `git checkout your-name/task` |
| See what's changed / staged | `git status` |
| Stage everything changed | `git add .` |
| Commit what's staged | `git commit -m "message"` |
| Push a brand-new branch | `git push -u origin your-name/task` |
| Push again after that | `git push` |
| Open a PR from the terminal | `gh pr create --base main` |
| List your branches | `git branch` |
| Delete a local branch (after merge) | `git branch -d your-name/task` |
| Delete that branch on GitHub too | `git push origin --delete your-name/task` |
