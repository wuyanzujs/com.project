# CSS Full Governance Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use subagent-driven-development to execute this plan task-by-task.

**Goal:** Complete the Taro RN application's CSS migration so the strict style gate, engineering verification, Android bundle, and available iOS checks pass without changing business behavior or the established visual direction.

**Architecture:** Keep the existing SCSS stack and dual-gate design. Strengthen the scanner and per-file ratchet first, then centralize every stable visual value in Sass/native tokens, move stable cross-page UI into self-styled `App*` components, and migrate each page from simple to complex while tightening the baseline after every file or component. Promote strict mode into `verify` only after all historical debt and compatibility baseline entries are gone.

**Tech Stack:** Taro 4, React 18, React Native 0.73, Sass/SCSS, TypeScript, Node.js ESM, Node test runner, Stylelint, pnpm workspace, Android Gradle, CocoaPods/Xcode where available.

---

## 当前实施状态（2026-07-12）

### 总体结论

CSS 代码治理和双门禁已经达到严格零债务标准，但整个任务尚未完成。当前剩余工作集中在寄件计费页运行时视觉收尾、完整视觉验证矩阵，以及最终 Android/iOS 构建验证。

### 已完成

- 双门禁已经落地：
  - `check:styles` 按逐文件指标和行数执行只降不增的日常门禁。
  - `check:styles:strict` 执行全量零债务严格门禁。
  - `update:styles-baseline` 只能收紧基线，禁止提高任一文件的指标或行数上限。
- 门禁已覆盖 `app.scss`、无尾分号合法 SCSS、Sass 局部变量和别名隐藏的视觉值、所有父级样式导入形式以及 `_tokens.scss` 非 token 语句。
- Android 和 iOS 发布工作流已经接入基线不可放宽校验。
- 已补齐真实临时项目扫描、CLI 模式、退出码、Git 基准分支比较、基线更新和发布流程回归测试。
- 严格样式门禁已经接入正式 `verify`。
- 已建立颜色、字号、行高、字重、间距、圆角、控件高度、层级、遮罩、禁用和交互状态语义 token。
- SCSS 使用 Sass token；图标、SafeArea、状态栏和原生属性使用 `nativeTokens.ts`。
- 以下共享组件已经建立并导出：
  - `AppPage`
  - `AppPageHeader`
  - `AppCard`
  - `AppPressable`
  - `AppButton`
  - `AppEmptyState`
  - `AppLoadingState`
  - `AppStatusTag`
  - `AppDialog`
  - `AppFormField`
- 已全量治理账号、联系人、优惠券、快递员、客户、电子卡、登录、会员、我的、隐私、实名、签收、客服、发票、支付、查询、订单、寄件和电子存根等现有业务 SCSS，而非只治理新增文件。
- 页面 `index.scss` 已收敛为容器和区域编排；拆出的页面子组件拥有并导入自己的 SCSS。
- 已清除业务 SCSS 中的静态颜色、字号、行高、圆角和字重，清除 TS/TSX 静态颜色。
- 父页面样式导入、旧 `.dp-*` 全局类、无效 mixin、RN 不可靠选择器和样式债务均已清零。
- 点击控件由共享原生按压组件和门禁统一保证至少 44dp 点击区域。
- 页面 SCSS 和组件 SCSS 已满足 300/180 行限制。

当前严格治理指标：

| 指标              |    当前值 |
| ----------------- | --------: |
| 受治理业务 SCSS   |    170 个 |
| 受治理 SCSS 行数  | 12,540 行 |
| token 接入率      |      100% |
| SCSS 静态颜色     |         0 |
| 静态字号          |         0 |
| 静态行高          |         0 |
| 静态圆角          |         0 |
| 静态字重          |         0 |
| TS/TSX 静态颜色   |         0 |
| 父级样式导入      |         0 |
| legacy 全局类文件 |         0 |
| 原生点击绕过      |         0 |

### 最新验证证据

2026-07-12 状态盘点的最新结果：

| 验证项                            | 结果       |
| --------------------------------- | ---------- |
| 样式门禁回归测试                  | 62/62 通过 |
| `lint:styles`                     | 通过       |
| ESLint                            | 通过       |
| `typecheck`                       | 通过       |
| `check:styles`                    | 通过       |
| `check:styles:strict`             | 通过       |
| `check:rn-boundaries`             | 通过       |
| 发布基线相对 `HEAD^` 不可放宽检查 | 通过       |

当前工作树在状态盘点时为干净状态，HEAD 为 `d5aee1b`。`docs/.obsidian/workspace.json` 是工作开始前已经存在的用户修改；继续治理时不得改写或撤销该文件，当前记录哈希为 `b458503078bf15bc1fab92871da585d46685a29856a1a2577cc4d79195519f89`。

### 已完成但仍需视觉验收的寄件页工作

- 原生页面标题已调整为“寄快递”。
- 已加入实名认证提示和快捷入口。
- 寄件人/收件人区域已改为紧凑横向结构。
- 已加入上门取件/自送服务点、上门时间和提前联系选项。
- 货物信息、付款方式、送货方式、增值服务、优惠券、备注和价格区域已重新拆分和压缩。
- 底部报价/下单结构已移入 `AppPage.footer`。
- 已移除寄件组件中的复合 `.foo.app-pressable` 选择器，并为 `AppPressable` 增加 RN 可靠的布局语义。
- 联系人、取件、货物和服务区域的横向/左对齐运行时问题已修复。

### 未完成

- 寄件页顶部快捷入口仍挤在同一行，间距、胶囊背景和选中态尚未达到参考页面效果。
- 底部提交栏已进入固定页脚区域，但“立即下单”按钮的背景、宽度和外层容器尺寸尚未正确渲染。
- 当前剩余问题的根因是 `AppPressable` 的视觉 class 作用于内部 Taro `View`，而外层 RN `Pressable` 决定实际布局尺寸；外层容器能力仍需补齐或由领域组件显式包装。
- 最终样式上的长文本和 1.5 倍系统字体尚未全部复测。
- 键盘弹出、顶部/底部安全区、状态栏和固定提交栏组合尚未完成最终验收。
- 弹窗、加载态、空态、错误态和禁用态尚未完成最终运行时抽样验证。
- Android/iOS 差异尚未完成最终对照；状态盘点时 Android 模拟器已断开。
- 最新寄件页修改后的完整 `verify`、Android bundle 和 iOS JS bundle 尚未最终重跑。
- 本机缺少完整 Xcode 和 `simctl`，原生 iOS 模拟器验证当前不可执行；仍需执行不依赖 Xcode 的 iOS JS bundle，并明确记录原生环境限制。

### 接下来执行顺序

1. 修正 `AppPressable` 外层容器布局能力，或为寄件页快捷入口和提交按钮增加明确的领域容器，完成按钮间距、选中背景和底部蓝色提交按钮。
2. 每完成一个组件立即运行相关 TypeScript、ESLint、Stylelint、RN 边界和双样式门禁，并且只向下收紧逐文件基线。
3. 重新启动 Android 模拟器，对照正常计费页验证普通字号、1.5 倍字号、滚动位置和固定页脚。
4. 覆盖长文本、键盘、安全区、状态栏、弹窗、加载、空态、错误态和禁用态。
5. 完整运行门禁回归测试、`lint:styles`、`check:styles`、`check:styles:strict`、`check:rn-boundaries`、`typecheck` 和 `verify`。
6. 重新执行 Android bundle 和 iOS JS bundle；原生 iOS 检查在完整 Xcode 可用时执行。
7. 只有运行时视觉问题消失、最终验证全部通过并记录不可用平台限制后，才将本计划标记为完成。

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
