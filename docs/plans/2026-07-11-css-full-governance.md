# CSS Full Governance Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use subagent-driven-development to execute this plan task-by-task.

**Goal:** Complete the Taro RN application's CSS migration so the strict style gate, engineering verification, Android bundle, and available iOS checks pass without changing business behavior or the established visual direction.

**Architecture:** Keep the existing SCSS stack and dual-gate design. Strengthen the scanner and per-file ratchet first, then centralize every stable visual value in Sass/native tokens, move stable cross-page UI into self-styled `App*` components, and migrate each page from simple to complex while tightening the baseline after every file or component. Promote strict mode into `verify` only after all historical debt and compatibility baseline entries are gone.

**Tech Stack:** Taro 4, React 18, React Native 0.73, Sass/SCSS, TypeScript, Node.js ESM, Node test runner, Stylelint, pnpm workspace, Android Gradle, CocoaPods/Xcode where available.

---

### Task 1: Close dual-gate loopholes with regression tests

**Files:**

- Modify: `apps/com.deppon.app/scripts/style-governance-lib.test.mjs`
- Modify: `apps/com.deppon.app/scripts/style-governance-lib.mjs`
- Modify: `apps/com.deppon.app/scripts/check-style-governance.mjs`
- Modify: `apps/com.deppon.app/scripts/style-governance-baseline.json`
- Modify: `.github/workflows/android-release.yml`
- Create: `.github/workflows/ios-release.yml`

**Steps:**

1. Add failing unit tests for semicolonless declarations, all Sass-local literal categories, token-file selectors, `app.scss`, all parent-style import syntaxes, and unconditional per-file line ratcheting.
2. Add real temporary-project CLI tests for scanning, exit codes, strict mode, baseline updates, and Git reference comparisons.
3. Run the focused tests and confirm each new case fails for the intended reason.
4. Implement the minimum scanner, comparison, and CLI changes needed to make them pass.
5. Regenerate only a tighter/equivalent baseline and run the daily gate.
6. Make Android and iOS release jobs compare the checked-in baseline with a Git reference before build work.

### Task 2: Rebuild semantic tokens and shared primitives

**Files:**

- Modify: `apps/com.deppon.app/src/styles/_tokens.scss`
- Modify: `apps/com.deppon.app/src/styles/nativeTokens.ts`
- Modify/Delete: `apps/com.deppon.app/src/styles/_mixins.scss`
- Delete: `apps/com.deppon.app/src/styles/_components.scss`
- Modify: `apps/com.deppon.app/src/styles/index.scss`
- Modify: `apps/com.deppon.app/src/app.scss`
- Create/Modify: `apps/com.deppon.app/src/shared/components/App*/**`

**Steps:**

1. Define semantic colors, typography, spacing, radius, control-height, z-index, overlay, interaction, disabled, safe-area, and native visual tokens.
2. Add `AppPage`, `AppPageHeader`, `AppCard`, `AppPressable`, `AppButton`, `AppEmptyState`, `AppLoadingState`, `AppStatusTag`, `AppDialog`, and `AppFormField`, each with owned SCSS where applicable and 44dp minimum interaction geometry.
3. Keep only mixins with three or more real consumers and remove unconsumed `.dp-*` compatibility selectors.
4. Run component lint, typecheck, boundary checks, and tighten the baseline after each primitive.

### Task 3: Migrate simple pages

**Files:**

- Modify: `apps/com.deppon.app/src/pages/{account,contact,coupon,courier,customer,ecard,login,member,mine,privacy,realname,sign,support,web}/**/*.{scss,ts,tsx}`
- Modify: `apps/com.deppon.app/scripts/style-governance-baseline.json`

**Steps:**

1. Replace static visual literals with semantic tokens without changing rendered values.
2. Adopt stable shared primitives only where at least three pages use the same pattern.
3. Keep page `index.scss` focused on container and region orchestration; give extracted children their own SCSS.
4. Remove TS/TSX static colors through `nativeTokens.ts`.
5. Tighten the baseline and run focused validation after each page.

### Task 4: Migrate medium modules

**Files:**

- Modify: `apps/com.deppon.app/src/pages/{batch,invoice,payment,print,query}/**/*.{scss,ts,tsx}`
- Modify: `apps/com.deppon.app/src/pages/order/list/**/*.{scss,ts,tsx}`
- Modify: `apps/com.deppon.app/scripts/style-governance-baseline.json`

**Steps:**

1. Split component-owned blocks out of oversized page styles.
2. Convert loading, empty, error, disabled, dialog, tag, form, card, and button states to the stable primitives.
3. Preserve page behavior and data flow while replacing only structural wrappers needed for style ownership.
4. Keep page SCSS at or below 300 lines and component SCSS at or below 180 lines.
5. Tighten the baseline and validate each module.

### Task 5: Migrate order detail and express

**Files:**

- Modify: `apps/com.deppon.app/src/pages/order/{detail,edit,cancel,subscriptions}/**/*.{scss,ts,tsx}`
- Modify: `apps/com.deppon.app/src/pages/express/**/*.{scss,ts,tsx}`
- Modify: `apps/com.deppon.app/scripts/style-governance-baseline.json`

**Steps:**

1. Move each existing child component from parent `index.scss` to an owned stylesheet.
2. Split remaining domain blocks by visual ownership while leaving service calls, state transitions, and business decisions unchanged.
3. Tokenize all states and enforce component/page line budgets.
4. Verify keyboard avoidance, safe areas, status bar, modal layers, long text, font scaling, and platform-specific behavior.
5. Tighten the baseline after each component and page.

### Task 6: Migrate the electronic stub and remove compatibility debt

**Files:**

- Modify: `apps/com.deppon.app/src/pages/order/stub/**/*.{scss,ts,tsx}`
- Modify/Delete: remaining legacy style files and imports under `apps/com.deppon.app/src`
- Modify: `apps/com.deppon.app/scripts/style-governance-baseline.json`

**Steps:**

1. Preserve printable/stub geometry while moving every visual literal to tokens.
2. Split oversized visual blocks into owned component styles.
3. Remove all parent page stylesheet imports, legacy global classes, unused mixins, and TS/TSX static colors.
4. Remove historical debt entries once the strict snapshot is clean.

### Task 7: Promote strict verification and prove the release path

**Files:**

- Modify: `apps/com.deppon.app/package.json`
- Modify: `.github/workflows/app-quality.yml`
- Modify: release workflows as needed

**Steps:**

1. Run style-gate regression tests, Stylelint, daily gate, strict gate, RN boundaries, typecheck, and the complete `verify` chain.
2. Replace the compatibility daily gate in formal `verify` with strict enforcement while retaining the daily command for local ratcheting semantics.
3. Build and validate the Android RN production bundle.
4. Run iOS bundle/native checks when the local Xcode/CocoaPods environment is available and report any external signing limitation precisely.
5. Perform representative Android/iOS visual checks for long text, font scaling, keyboard, safe areas, status bar, dialogs, loading, empty, error, and disabled states.
