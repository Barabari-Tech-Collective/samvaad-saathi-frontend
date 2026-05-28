# Contributing to Samvaad Saathi

This document summarizes the Barabari Tech Collective Developer & Team Guideline (v1.0, May 2026) as it applies to this repository.

---

## Branch Hierarchy

```
main  (production — no direct commits ever)
└── feature_YY.MM_X  (sprint branch — created by Lead Developer)
    └── developer-feature_YY.MM_X-<name>  (your personal branch)
```

### Sprint Feature Branch Naming

```
feature_26.05A   # first sprint, May 2026
feature_26.05B   # second sprint, May 2026
feature_26.06A   # first sprint, June 2026
```

### Your Developer Branch Naming

```
developer-feature_26.05A-john
developer-feature_26.05A-priya
```

---

## Setting Up Your Branch

```bash
# 1. Switch to the current sprint feature branch
git checkout feature_26.05A

# 2. Pull latest
git pull origin feature_26.05A

# 3. Create your personal branch
git checkout -b developer-feature_26.05A-<your-name>

# 4. Push to remote
git push -u origin developer-feature_26.05A-<your-name>
```

**Sync daily** to avoid large conflicts:

```bash
git fetch origin
git merge origin/feature_26.05A
```

---

## Commit Message Format

```
<type>[(scope)]: <description>
```

Scope is optional. Description must follow on the same line.

| Type       | When to use                                                     | Example                                           |
| ---------- | --------------------------------------------------------------- | ------------------------------------------------- |
| `feat`     | Add, adjust, or remove a feature (API or UI)                    | `feat(auth): add JWT refresh token support`       |
| `fix`      | Fix a bug introduced by a preceding `feat` commit               | `fix: resolve null pointer in payment module`     |
| `refactor` | Rewrite/restructure code without altering behavior              | `refactor(api): simplify user validation logic`   |
| `perf`     | Performance-focused refactor                                    | `perf(query): cache user lookups in Redis`        |
| `style`    | Whitespace, formatting, missing semicolons — no behavior change | `style: apply Prettier formatting to auth module` |
| `test`     | Add missing tests or correct existing ones                      | `test: add unit tests for payment service`        |
| `docs`     | Documentation only                                              | `docs: update API endpoint documentation`         |
| `build`    | Build tools, dependencies, project version                      | `build: upgrade axios to v1.6.0`                  |
| `ops`      | CI/CD, infra, deployment, monitoring, recovery                  | `ops: add GitHub Actions CI workflow`             |
| `chore`    | Initial commit, .gitignore changes, misc tasks                  | `chore: update .gitignore to exclude .env.local`  |

**Rules:**

- Subject line under 72 characters
- Be specific — `fix: fix bug` is not acceptable
- Every commit must build successfully
- Reference tickets where applicable: `fix: correct login redirect — Ref: BTC-204`
- Merge commits and `WIP:` prefixes are exempt from validation

The commit-msg hook enforces this format and will block non-conforming commits.

---

## Merge Request Checklist (before raising MR)

- [ ] All sprint tasks committed and pushed
- [ ] Branch rebased/merged with latest sprint feature branch
- [ ] Code builds and runs locally without errors
- [ ] All relevant tests pass
- [ ] Lint and format checks pass (`npm run lint`, `npm run format:check`)
- [ ] MR description filled out completely (template auto-loads on GitHub)

**Approval required from:** Peer Developer + Lead Developer + Engineering Manager.

---

## Available npm Scripts

```bash
npm run dev           # dev server at localhost:3000
npm run build         # production build
npm run lint          # ESLint
npm run type-check    # TypeScript check (no emit)
npm run format        # Prettier (write)
npm run format:check  # Prettier (check only, used in CI)
```

---

## Branch Protection (Engineering Manager — GitHub UI setup required)

Configure in **GitHub → Settings → Branches**:

| Branch pattern | Rules                                                                                             |
| -------------- | ------------------------------------------------------------------------------------------------- |
| `main`         | Require PR, require 2+ approvals, require CI status checks to pass, no direct push, no force push |
| `feature_*`    | Require PR, require 1 approval, require CI status checks to pass, no direct push                  |

Status check to require: **`Lint, Type-Check & Build`** (the CI job name).

---

For the full guideline, contact your Lead Developer or Engineering Manager.
