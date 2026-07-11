# CSS Dual Gate Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the global CSS debt ceiling with a per-file ratchet and add a separate strict gate for the upcoming full CSS rewrite.

**Architecture:** Extract style analysis and baseline comparison into a testable Node module. Keep `check:styles` green for the current snapshot while rejecting every per-file regression, and expose `check:styles:strict` as the final zero-debt target without adding it to `verify` yet.

**Tech Stack:** Node.js ESM, Node built-in test runner, SCSS/TypeScript source scanning, Stylelint, pnpm workspace scripts.

---

### Task 1: Add regression tests for the gate

**Files:**

- Create: `apps/com.deppon.app/scripts/style-governance-lib.test.mjs`
- Create: `apps/com.deppon.app/scripts/style-governance-lib.mjs`

**Steps:**

1. Add failing tests for hex, functional and named colors, comment removal and token usage.
2. Add failing tests proving one file cannot consume another file's debt reduction.
3. Add failing tests for stale baselines, clean new files and strict zero-debt checks.
4. Run `node --test scripts/style-governance-lib.test.mjs` and confirm the tests fail before implementation.
5. Implement only the exported analysis and comparison functions required by the tests.
6. Run the test command and confirm all tests pass.

### Task 2: Replace the CLI gate

**Files:**

- Modify: `apps/com.deppon.app/scripts/check-style-governance.mjs`
- Modify: `apps/com.deppon.app/scripts/style-governance-baseline.json`

**Steps:**

1. Make the CLI consume the tested library.
2. Add default, `--strict`, `--update-baseline` and `--report` modes.
3. Reject baseline updates that increase any existing debt metric.
4. Generate the version 2 baseline from the current tree.
5. Run the default gate and confirm it passes.
6. Run strict mode and confirm it fails with an actionable migration summary.

### Task 3: Wire scripts and documentation

**Files:**

- Modify: `apps/com.deppon.app/package.json`
- Modify: `package.json`
- Modify: `apps/com.deppon.app/readme.md`
- Modify: `docs/css-governance-plan.md`

**Steps:**

1. Add `test:style-governance`, `check:styles:strict`, `check:styles:report` and `update:styles-baseline` commands.
2. Keep only the test and daily gate in `verify`; leave strict mode opt-in until migration is complete.
3. Document the full-rewrite decision, commands and promotion rule.
4. Run Stylelint, the daily gate, RN boundaries and the App verification chain.
