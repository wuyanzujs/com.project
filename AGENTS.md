# 当前项目问题与优化方向

更新日期：2026-10-22（上一版 2026-07-07，其中大部分问题已落地，见第二节）

## Codex 验证边界

- Codex 默认不得主动执行 RN bundle、Android/iOS 打包、Gradle、Xcode 或发布包验证。
- 项目打包由用户自行执行；仅当用户明确要求时，Codex 才能运行对应打包命令。
- Codex 日常验证限于 TypeScript、ESLint、Stylelint、业务规则、路由、模块体积、RN 边界和其他不产出安装包的静态门禁。

## 图片处理边界

- 主线程上下文不承载图片内容，只承载图片路径与结论；需要看图时交给子代理解析。
- 子代理只回流结构化文本（结论、字段、`文件:行号`），不得回流图片数据。
- 一次涉及多图时，先按 request body 字节预算分批（base64 约为原始大小的 1.37 倍），超限再降级分片，不要一次性塞给单个子代理。
- 具体流程见全局 skill `delegate-image-analysis`。你可以优化这个skill在你实际使用的场景下,但是不要改变它的边界和原则。在优化它之前,向我确认你的优化方案,经过确认后再执行优化。

---

## 一、这份文档的定位

项目已经跨过“先让工程能跑”的阶段：底座、分层、门禁、测试、文档都不缺了。现在剩下的问题不是“结构乱”，而是
**性能路径、线上可观测性、以及治理手段本身的可维护性**。不要再按“拆巨石 / 建 token / 补 README”的思路重做一遍。

## 二、已经落地，不要重做（2026-07-07 版清单的现状）

| 原问题 | 现状 | 证据 |
| --- | --- | --- |
| 环境未锁（Node/pnpm） | 已锁，且 `verify:config` 第一道就查 | 根 `package.json` engines、`.node-version`、`.nvmrc`、`scripts/check-toolchain.mjs` |
| CI 模板残留 | 已清，`app-quality` / `android-release` / `ios-release` 三个 workflow 都是真实 App 身份 | `.github/workflows/*` |
| 路由分散 | 已单源化：`routeRegistry.ts` 派生 `APP_ROUTES`、`app.config.ts` pages、登录守卫 | `check-route-registry.mjs` |
| service 巨石 | 已拆，`order.service.ts` / `express.service.ts` 这类文件已不存在 | `src/services/{order,express,invoice}/**` 按 `api/rules/mapper/useCases` 分裂 |
| 页面巨石 | 已拆，express 页 346 行、order/detail 138 行 | 页面 UI 进各自 `components/` |
| 样式无 token | 已建，`_tokens.scss` 被全部 scss 文件 `@use`，另有 baseline 门禁 | `src/styles/`、`check-style-governance.mjs` |
| 运行时配置 | 已有 `check:runtime-config` + 产物内校验 | `apps/com.deppon.app/package.json` scripts |
| README 模板 | 已重写（351 行，含发布门禁） | `apps/com.deppon.app/readme.md` |
| 平台能力直调 | 已有 14 个 platform facade + 边界门禁 | `src/shared/platform/*`、`check-rn-boundaries.mjs` |
| 缺测试 | 已有 365 个业务测试（Node test runner） | `scripts/business-tests/**` |
| `expo` 是否误引入 | **是故意的**：Taro RN autolinking 硬性要求，且被门禁反向锁死 | `check-rn-boundaries.mjs` 的 `nativeIdentityChecks` |

## 三、当前真实待办

### P0 长列表虚拟化（已完成）

- 现状：业务代码被禁止 `import 'react-native'`，所以历史上所有列表都是 Taro `ScrollView` + `map` + 分页追加，
  没有任何窗口化。订单/支付/打印/消息/优惠券这类“一直往下翻”的页面会全量渲染。
- 已做：`src/shared/native/AppVirtualList.tsx`（RN `FlatList` 唯一出口），`print/list`、`order/list`、
  `payment/list`、`message/list`、`coupon/list` 五个列表页全部迁移。
- 迁移要点：`extraData` 必须带渲染相关的外部状态（如状态 tab、删除中/带入中 key），否则切状态后行内容不刷新。
- 验收：`pnpm verify:app` 全绿；真机仍需确认滚动与触底加载不掉帧。

### P0 启动与错误兜底（已完成）

- `AppBootScreen`：启动期有形骨架，不再是白屏；bootstrap 拒绝时展示失败原因 +「重试」。
  重试之所以有效，是因为 `app.bootstrap` 在失败后释放了缓存的 promise。
- 5s 超时仍放行进入 App，避免网络慢时长期卡在启动页。
- `AppErrorBoundary` + `analytics.reportAppError` 接管渲染期异常，上报通道通过 `setAppErrorReporter` 注入。
- 唯一待外部动作：接入 Sentry/Bugly 后在 `app.bootstrap` 里调用一次 `setAppErrorReporter(...)`，错误出口不用再改。

### P1 打包体积（已量化，lucide 已治理，预算门禁已落地）

- 实测（`bundle:android` + sourcemap 归因）：**5.18 MB → 3.66 MB（−1.59 MB，−29%）**，模块 3420 → 1925。
- 主因：`lucide-react-native` 从包根具名导入会把 1545 个图标全打进包（1549 模块 / 1.27 MB），实际只用 52 个。
  已改成 `dist/esm/icons/<name>.js` 深导入（`types/lucide-icons.d.ts` 补 ambient 声明），lucide 降到 54 模块 / 34 KB。
- `lodash` 归因已复核（2026-10-22，详见下方）：不是 `@tarojs/helper`，实际来自 `@tarojs/router-rn@4.2.0` 的
  4 个 `import { camelCase } from 'lodash'` 全量导入；bundle 里只有 1 个 lodash 模块（id 607），minified
  73,103 B / gzip 24,968 B，不是 90 模块 / 594 KB（594 KB 是未压缩 `lodash.js` 的源码体积）。
- `expo-camera` **不能删**：`android/build.gradle` 的 `allprojects.repositories` 会校验
  `node_modules/expo-camera/android/maven`，缺失即抛 `GradleException`。JS 侧零引用，但这是 Gradle 的硬依赖。
- `qrcode` 27 模块 / 71 KB、`crypto-js` 87 KB 仍可评估替换（两者都是纯 JS 小包，优先级低）。
- bundle 体积预算门禁已落地（2026-10-22）：`scripts/check-bundle-size.mjs` + `scripts/bundle-size-baseline.json`。
  基线 raw **3,838,060 B（3.66 MiB）** / gzip **867,051 B（846.7 KiB）**；超预算 exit 1，无产物自动 skip。
  - 容差：raw 与 gzip 都取 `max(基线 × 3%, 150 KiB)`，当前两个指标都是 150 KiB。
  - 入口：`check:bundle-size` 挂在 `verify:static` 末尾（无 bundle 的机器跳过）；发布 workflow 在
    「Build production Android RN bundle」之后、「Decode release keystore」之前强制跑，出包必过门禁。
  - 更新基线：`node scripts/check-bundle-size.mjs --update --reason="..."`（CI 禁止更新），PR 必须解释增长。

#### lodash 归因复核结论（2026-10-22）

- 证据链：`@tarojs/router-rn@4.2.0` 的 `package.json` 声明 `lodash ^4.17.21`；dist 里 4 个文件具名导入：
  `dist/provider.js:1`、`dist/rootNavigation.js:3`、`dist/router.js:5`、`dist/utils/index.js:1`。
  Metro 产物中 lodash 是模块 607（`VERSION="4.18.1"` 仅 1 处），依赖它的模块 600 / 601 / 703 / 704 正好对应
  上述 4 个文件；8 个调用点全部只用了 `camelCase`。
- 体积事实：lodash 模块在 bundle 内 73,103 B（gzip 24,968 B），占 raw 1.9% / gzip 2.9%；
  `lodash.js` 源码 545,945 B 是未压缩口径，不能直接当安装增量。
- 方案：patch-package 改 4 行 import 为 `import camelCase from 'lodash/camelCase'`；需要
  `pnpm.patchedDependencies` + postinstall，补丁文件名绑定 `@tarojs/router-rn@4.2.0`；Taro 一升级就要重新生成
  并验证，4 个文件任一改动都会让补丁失效（安装期显式报错，不会静默）。
- 预估收益：raw 约 −60~70 KB（1.6%~1.8%），gzip 约 −20~25 KB（2.3%~2.9%），相对 lucide 的 −1.59 MB 很小。
- **结论：本轮不值得做，不动依赖。** 维护 4 处补丁 + 每次 Taro 升级复验的成本高于收益；若要做，优先给
  Taro 上游提 PR（改动只有 4 行），本地补丁必须绑定 Taro 版本并写进升级 checklist。下一步减体积的优先级
  应低于业务/页面包体积与重复依赖治理。

### P1 测试基建（双层已搭好，覆盖率待迁移）

- vitest 已接入：`test/unit/**` 直接 import TS，`pnpm --filter com.deppon.app run test:unit` 带 v8 coverage，
  已挂进 `verify:static`。当前 22 个文件 258 个用例，含两个原本最薄弱的模块：`goodsCheck.rules.ts`（cjs 覆盖仅 41%）、
  `monthlyPay.ts`（15%），现在都在 100%；另有 `request/*`、`auth/login.rules.ts` 与本次迁移的 10 个行为契约文件。
- cjs 一侧终于有真实覆盖率入口：`pnpm --filter com.deppon.app run test:business-rules:coverage`。
  实测 **lines 70.66% / branches 80.31%**，缺口集中在 `.service.ts` 编排层与 `.api.ts` 薄封装。
- 阈值按文件设（`coverage.thresholds`：线 95 / 分支 90），不设全局阈值——大量 rules 仍由
  `scripts/business-tests`（node:test）覆盖，两个 runner 的覆盖率暂不合并，全局数字（随 include 范围变化，当前 2.63%）是口径问题不是质量问题。
- 一个关键结论：`src/services/**` 的 23 个 `*.rules.ts` 里，cjs 套件**只漏了 1 个**（`gis/weather.rules.ts`，已用 vitest 补上）。
  规则层覆盖已接近饱和，真正的大缺口在 `.service.ts` 编排层与 `.api.ts` 薄封装——再往 vitest 迁 rules 的边际收益已经很低。
- 覆盖率继续往上走的正确姿势已验证：`test/unit/template/template-service.test.ts` 用 `vi.mock` 同时替换 `template.api`
  与 `template.mapper`，直接摆数据驱动 8 个编排分支（列表排序/条数上限/status=false/result=false/默认位翻转…），
  16 个用例把 `template.service.ts` 从 37% 拉到 **lines 100% / branches 98.14% / funcs 100%**，且不需要起 HTTP。
  这套「api + mapper mock」是后续补 `.service.ts` 的标准模板。
- 同一模板已在 invoice 落地：`invoice.taxpayer.service.ts` 21% → **lines/branches/funcs 全 100%**（12 用例，
  覆盖新增/修改走不同接口、企业抬头查询的 ≤3 字短路与 3s 超时、删除 payload 包装）。
- `invoice.apply.service.ts`（13.56% → lines 97.82% / branches 91.48% / funcs 100%，18 用例）：覆盖两条提交链路
  （电子发票 / 储值卡）的不同接口与默认文案、预览可用性、邮箱校验顺序、三个 action 透传、开票运单归一。
- `orderSearch.service.ts`（20% → lines 98.14% / branches 94.23% / funcs 100%，19 用例）：覆盖运单号查询/付款人校验/
  发码/验码四条链路，以及三种验证挑战（02 手机后四位、03 收/发货人电话、其余走 6 位验证码）的文案与长度契约；
  有挑战时**结果列表被清空**只回挑战。
- `query.dispatch.ts`（24% → lines 100% / branches 91.42% / funcs 100%，18 用例）：覆盖地址识别→收派范围的两段式流程，
  快递/物流两条取数分支，以及提示语与下单资格的判定矩阵（空范围 / 网点自提 / 不服务 / 可寄收 / 特殊规则）。
  其中「命中街道属于自提或不服务」的优先级、街道查询失败降级为空串，都是只看代码才能确认的契约。
- `payment.service.ts`（59% → lines 100% / branches 95.5% / funcs 100%，24 用例）：覆盖金额取值优先级
  （未付先 `unWriteoffAmount`、已付先 `writeoffAmount`、非法值归 0）、京东支付项在未付列表被过滤而已付保留、
  分页字段后端缺省时的推导、两种状态的不同失败文案、运单号单/多值查询参数、以及「全部为京东支付 → 不可在线支付」。
- 编排层这一档到此收口（template / invoice×2 / orderSearch / query.dispatch / payment 六个文件已全部纳管）。
- 行为契约迁移（2026-10-21）：`check-rn-boundaries` 的 `rnBehaviorContractChecks` 13 条已全部清空——
  11 条纯行为契约改写成 vitest，2 条结构性契约改由 ESLint 强制（见「P1 门禁实现方式」）。
  新纳管：`request/index.ts`、`request/cookieJar.ts`、`productAvailability.service.ts`、`print.service.ts`、
  `pages/web/index.tsx`、`contact/hooks/useContactAddressIntegrity.ts`、`shared/native/AppFormScrollView.tsx`，
  均设线 95 / 分支 90 的按文件阈值。
- 页面级契约用「直接调用函数组件 + 遍历返回 element」验证：`test/unit/support/react-runtime.ts` 用受控 hooks
  替代 React 运行时，页面 handler 从返回树里取 `onPress` 直接驱动，不引入 `react-test-renderer` 或
  `@testing-library/react-native`。联系人 list/edit、打印列表、WebView 页都用这套方式断言「先决策/先鉴权，再继续」。
  这些页面文件**不进 per-file 覆盖率**：页面渲染分支量大，UI 分支覆盖不代表契约强度，契约由 handler 用例锁定。
- `@types/jest` 已移除（2026-10-22）：测试只用 vitest + node:test，`tsconfig` 的 `types` 从继承的
  `["react-native", "jest"]` 覆盖为 `["react-native"]`，`pnpm install` 已同步 lockfile（移除 18 个包）。

### P1 门禁实现方式（AST 层已起步）

- 新增本地插件 `packages/eslint-plugin-app`，已把禁止类规则从正则下沉为 AST 规则：
  `no-direct-react-native`（含 `require`/动态 import）、`no-taro-platform-api`（Taro 平台 API + `wx.*`/`my.*`）、
  `no-service-api-import`（页面/shared 层绕 service 直调 `.api`）。规则带 `allow` 片段参数，与脚本白名单一致。
  收益是**编辑器里即时报错**，且别名/字符串拼接绕不过去；已用探针文件验证 4 类违规全部被拦。
- 强制类结构契约也走 AST：`required-import-source`（指定文件必须从给定模块 import，当前锁
  `AppSessionCookie.ts` → `@react-native-cookies/cookies`）与 `required-component-source`
  （指定文件必须渲染来自给定模块的组件，当前锁登录页 → `@/shared/native` 的 `AppFormScrollView`）。
  两条规则都用 ESLint `Linter` 构造正反例验证：错误来源/缺失渲染会报错，正确写法放行。
- 脚本层（`check-rn-boundaries` / `check-styles`）保留为提交前兜底，两者重叠的部分以 ESLint 为准。
- **scss 结构规则也已下沉**：`position: fixed/sticky`、`display: grid`、`border-*-style`、`grid-*` 用内置
  `declaration-property-value-disallowed-list` / `property-disallowed-list` 表达（`elevation` 走 `overrides` 只压 pages）；
  伪元素与「Sass 导入必须写全 `.scss`」两条写成自定义插件 `scripts/stylelint-rules/index.mjs`（ESM，避免 CJS 弃用告警）。
  `check-rn-boundaries.mjs` 里 12 条 scss 正则已删除（69 → 57 条规则），scss 现在只有 stylelint 一个出口。
  对应断言从 boundary 契约测试搬到 `style-governance-lib.test.mjs` 的 stylelint 契约测试，逐个构造片段验证会拦。
- 行为字符串契约已清零：`rnBehaviorContractChecks` 数组与其检查函数都已删除，脚本里不再有「某文件必须包含某字符串」。
  仍保留的 `nativeIdentityChecks` 不是行为契约，而是 `gradle`/`plist`/`pbxproj`/`package.json` 的原生身份事实，
  JS 单测无法替代，继续由脚本校验。后续新增行为契约一律进 `test/unit/**`，结构契约进 ESLint，不要再回写字符串断言。

### P2 结构残留

- barrel 收敛：`check:barrels` 门禁（`scripts/check-service-barrels.mjs`）统计**运行时** `export *`（`./types` 纯类型转发不计入），
  只降不增；`update:barrels-baseline` 收紧基线。新增 `scripts/expand-service-barrels.mjs` 自动展开工具
  （`--domains=a,b --dry-run`），把运行时 `export *` 拆成 `export { ... }` / `export type { ... }`。
- 进度：**136 → 0**。24 个领域的运行时 `export *` 已全部展开为显式导出，纯类型转发（`./types`、`*.types`）仍保留 `export *`。
  最大的两个 barrel 现在是 `express/index.ts`（293 行）与 `order/index.ts`（183 行），仍在模块体积门禁内（service 基准 450）。
- 生成器要点：解析目标模块的 `export const/function/class/enum`、`export interface/type`、`export { ... }`、
  **`export type { ... } from`**（漏了它会把 `OrderResendMode` 这类类型丢掉，`tsc` 会当场报错）；
  单行超过 120 字符时自动换行，避免 `max-len` 告警。
- 坑：生成器里别把局部变量命名为 `exports`——`import/no-commonjs` 会把 `exports.xxx` 误判为 CommonJS 写法。
- 安全网：展开后如果漏了符号，`tsc` 会在消费者处直接报错，所以这一步可以放心批量做。
- 列表空/错/载状态组件仍是每页一套（`OrderListStates`、`PaymentListStates`、`PrintListStates`、`CouponListStates`、
  `InvoiceCenterStates`），可借 `AppVirtualList` 的 `empty` / `footer` 收敛成一套。
- 页面业务判断回流已收敛（2026-10-22 完成）：订单动作判定集中到 `services/order/core/order.actionRules.ts`
  （列表 `canCancelOrder` / `canModifyOrder`、详情 `canCancelOrderDetail` / `canDeleteOrderDetail` /
  `isCancelledOrderDetail`、`canDeleteOrder`、再寄模式与文案；列表与详情语义保持各自独立，只共享
  `isWaitAllotOrderClass` / `isCancelledOrderClass` 等底层谓词），列表页、详情 viewModel、卡片只做调用。
  坐标范围校验统一到 `shared/geo/coordinates.ts`，服务站详情、服务点卡片、`shared/platform/map.ts` 三处共用。
  新增 ESLint 规则 `app/no-page-business-decisions`：页面目录新声明 `can*/should*/is*` 决策函数时告警，
  只识别多输入/本地决策转发，单字段 UI 派生（`canUse = status === 'USABLE'`、`isDoorPickup = dispatch === 'Y'`）
  自动放行；存量纯 UI 决策在 `.eslintrc` 的 allow 列表登记并写原因。

### P3 CI（已完成 2026-10-22）

- `app-quality.yml` 已拆成两个并行 job：
  - `static`：checkout → setup pnpm → setup Node → install → `pnpm verify:app`；不装 Java / Android SDK，
    timeout 15 min。静态门禁不再等 NDK/cmake。
  - `native-env`：checkout → Java 17 → pnpm → Node → install → `sdkmanager --install ...` →
    `pnpm check:app-native-env:android`；timeout 30 min。
  - 两个 job 没有 `needs`，并行执行；静态反馈预计从原来的 20+ 分钟降到 4–6 分钟（安装 1–2 分钟 +
    门禁 2–3 分钟），SDK 安装只在 native-env 后台进行。
- `check-repo-config.mjs` 增加 job 级断言（`readWorkflowJob` 按缩进切出每个 job）：
  `static` 必须含 `pnpm verify:app` 且不得出现 `sdkmanager`；`native-env` 必须含 SDK 安装与
  `check:app-native-env:android`。另断言 bundle 门禁位于发布 workflow 的「出包之后、解 keystore 之前」。
- 已用探针验证：把 `static` job 改名后 `check:repo-config` 立即失败，不会静默放过。

---

## 四、本次改动（2026-10-21）

1. 新增 `src/shared/native/AppVirtualList.tsx`，并在 `shared/native/index.ts` 导出。
2. `print/list`、`order/list`、`payment/list`、`message/list`、`coupon/list` 从 `ScrollView + map` 迁到 `AppVirtualList`。
   - `order/list`：`OrderListContent` 收敛为 `OrderListFooter`（只管空/错/载），卡片改由 `renderItem` 渲染。
   - `payment/list`、`message/list`：筛选/标题区改为固定区（原先随列表滚动）。
   - `coupon/list`：兑换条、状态 tab、汇总仍作为列表 header 随滚动，卡片单独左右留白。
3. 新增 `src/shared/components/AppErrorBoundary`（组件 + scss + barrel 导出）。
4. `src/shared/platform/analytics.ts` 新增 `reportAppError`：native 日志 + 埋点通道（未接入时返回 false）。
5. `src/app.ts`：接入 `AppErrorBoundary`，bootstrap 增加 5s 超时与错误上报。
6. `src/app.scss` 改为引用 `styles/index.scss`；`index.scss` 成为全局入口（forward tokens + page-patterns）。
7. `scripts/business-tests/message/page-actions.test.cjs` 增加 `AppVirtualList` 展开逻辑（页面依赖白名单同步放行 `@/shared/native`）。
8. 样式基线经 `update:styles-baseline` 收紧（新增 `AppErrorBoundary` / `AppBootScreen` 条目、清理迁移后消失的间距债务）。
9. 新增 `AppBootScreen`（`shared/components`）：`app.ts` 启动期展示骨架，bootstrap 失败时给出重试入口。
10. `app.bootstrap.ts` 失败后释放缓存 promise；`analytics` 新增 `setAppErrorReporter`，并补 3 个单测
    （`scripts/business-tests/analytics/report-error.test.cjs`）。
11. 接入 vitest 5 + `@vitest/coverage-v8`：`vitest.config.mts`、`test/setup.ts`（注入 `__APP_RUNTIME_CONFIG__`）、
    `test/unit/{request,auth}/*.test.ts`；`test:unit` 带覆盖率并挂进 `verify:static`。
12. `tsconfig` 纳入 `test/`，ESLint 同步覆盖 `test/**/*.ts`，单测也过类型与风格门禁。
13. 依赖变更：`vitest`、`@vitest/coverage-v8`、`vite`（vitest 的 peer），lockfile 已同步。
14. bundle 体积量化并治理 lucide：`AppIcon` 改 52 个深导入 + `types/lucide-icons.d.ts`，bundle −1.59 MB（−29%）。
15. 新增 scss 导入门禁：`check-rn-boundaries` 要求 `@use/@forward` 写全 `.scss`。Taro RN 的 Sass importer
    不做无扩展名解析，这类错误只在打包阶段暴露（本次真实踩到）。已用探针文件验证门禁会拦截。
16. `app.scss` 改用 `@use '../src/styles/index.scss'`，`index.scss` 显式 forward `./_tokens.scss` / `./_page-patterns.scss`
    ——相对路径 + 全文件名是 Taro RN importer 唯一稳定的写法。
17. 新增 vitest 用例 16 个：`goodsCheck.rules`（41% → 100%）、`monthlyPay`（15% → 100%）。
18. 新增 `test:business-rules:coverage` 脚本，用于查看 cjs 套件的真实覆盖率。
19. 补 `gis/weather.rules.ts` 的 vitest 用例（cjs 套件唯一完全没加载过的 rules 文件）。
20. 新增 service 编排层测试模板：`test/unit/template/template-service.test.ts`（16 用例，api + mapper 双 mock），
    `template.service.ts` 覆盖率 37% → lines 100%。单测总数 63（7 个文件）。
21. 归因结论写入文档：`lodash` 是 Taro 运行时传递依赖（需 patch-package 才可能减）；
    `expo-camera` 被 `android/build.gradle` 硬性校验，不能按“零引用”删除。
22. 新增本地 ESLint 插件 `packages/eslint-plugin-app`（3 条 AST 规则），接入 `.eslintrc`；已用探针验证会拦，
    现有代码零违规。
23. 新增 barrel 门禁 `check:barrels` + `scripts/service-barrels-baseline.json`（136 条运行时 `export *`），
    挂进 `verify:static`；`services/goods` 作为显式导出的样板完成迁移。
24. 根 `package.json` 增加 `check:app-barrels` 透传脚本，README 命令清单同步。
25. 编排层测试第二批：`test/unit/invoice/taxpayer-service.test.ts`（12 用例），`invoice.taxpayer.service.ts`
    覆盖率 21% → 100%。
26. 编排层测试第三批：`test/unit/invoice/apply-service.test.ts`（18 用例），`invoice.apply.service.ts`
    覆盖率 13.56% → 97.82%。
27. 编排层测试第四批：`test/unit/invoice/order-search-service.test.ts`（19 用例），`orderSearch.service.ts`
    覆盖率 20% → 98.14%。
28. 编排层测试第五批：`test/unit/query/dispatch-service.test.ts`（18 用例），`query.dispatch.ts`
    覆盖率 24% → 100%。
29. 编排层测试第六批收口：`test/unit/payment/payment-service.test.ts`（24 用例），`payment.service.ts`
    覆盖率 59% → 100%，单测总数 154（12 个文件，12 个文件设阈值；本次行为契约迁移前的基线）。
30. barrel 收敛：新增 `scripts/expand-service-barrels.mjs`，先批量展开 18 个小领域（136 → 82），
    修掉两个工具缺陷（漏解析 `export type { ... } from`、超长单行触发 `max-len`）后，
    把剩余 order/express 一并展开，最终 **82 → 0**；`tsc` + 两套测试全绿。
31. scss 规则下沉：新增 `scripts/stylelint-rules/index.mjs`（2 条自定义规则）+ 扩充 `.stylelintrc.cjs`
    （内置规则 + pages override）；删除 `check-rn-boundaries` 的 12 条 scss 正则与 `checkScssImportSpecifiers`，
    断言迁到 stylelint 契约测试（71 个 style-governance 用例全绿）。
32. 行为契约迁移：新增 10 个 vitest 文件 / 104 个用例（`native/app-form-scroll-view`、`request/request-client`、
    `request/cookie-jar`、`express/product-availability-service`、`print/print-service`、`contact/contact-address-integrity`、
    `contact/contact-list-page`、`contact/contact-edit-page`、`web/web-page`、`print/print-list-page`），
    加 `test/unit/support/react-runtime.ts`（受控 hooks + element 遍历），单测总数 154 → **258（22 个文件）**。
33. `check-rn-boundaries.mjs` 删除 `rnBehaviorContractChecks` 全部 13 条与 `checkRnBehaviorContracts` 函数：
    AppFormScrollView 透传、请求 credentials、cookie 恢复、WebView 登录分支、联系人地址决策顺序、
    产品可用性/打印计数独立降级、打印列表 service 查询等 11 条由单测接管；登录页组件与 AppSessionCookie 来源
    2 条改由 ESLint 强制。
34. ESLint 插件新增 `required-import-source` / `required-component-source` 两条规则并接入 `.eslintrc`；
    用 ESLint `Linter` 构造 5 个正反例探针，4 类违规全部被拦、2 个正确写法放行。
35. `vitest.config.mts` 打开 `esbuild.jsx = automatic`（让 TSX 组件可被直接 import），coverage include 增加
    `shared/native/AppFormScrollView.tsx`、`pages/web/index.tsx`、`contact/hooks/useContactAddressIntegrity.ts`，
    并给 request/index、cookieJar、productAvailability.service、print.service、useContactAddressIntegrity、
    pages/web、AppFormScrollView 加线 95 / 分支 90 阈值；全量 coverage 通过。
36. 验证：`pnpm verify:app` exit 0（tsc / eslint / stylelint / 22 文件 258 单测 / 365 个 cjs 用例 / barrel /
    模块体积 / 路由 / 平台契约），cjs 用例数不变；未执行 RN bundle、Gradle 或 Xcode。

### 2026-10-22 防回归与 CI 收尾

37. 新增 bundle 体积预算门禁：`apps/com.deppon.app/scripts/check-bundle-size.mjs` +
    `scripts/bundle-size-baseline.json`。基线 raw **3,838,060 B（3.66 MiB）** / gzip **867,051 B（846.7 KiB）**，
    容差 raw/gzip 均为 `max(3%, 150 KiB)`；超预算 exit 1，无产物打印 skip 并 exit 0。
    新增 `check:bundle-size` / `update:bundle-size-baseline` 与根透传 `check:app-bundle-size` /
    `update:app-bundle-size-baseline`；`check:bundle-size` 挂在 `verify:static` 末尾。
38. 发布 workflow 接入体积门禁：`.github/workflows/android-release.yml` 在「Build production Android RN bundle」
    之后、「Decode release keystore」之前跑 `check:bundle-size`；`check-repo-config.mjs` 断言该顺序，
    并校验脚本/基线文件与 npm scripts 存在。
39. `app-quality.yml` 拆为 `static`（无 Java/SDK，跑 `pnpm verify:app`）与 `native-env`（Java 17 + SDK 安装 +
    `check:app-native-env:android`）两个并行 job；`check-repo-config.mjs` 新增 `readWorkflowJob` 做 job 级断言
    （static 不得出现 sdkmanager，native-env 必须装 SDK 并跑原生环境检查），探针验证改名 static 会失败。
40. 移除未使用的 `@types/jest`：`apps/com.deppon.app/package.json` 删除依赖，`tsconfig` 把继承的
    `types: ["react-native", "jest"]` 覆盖为 `["react-native"]`，`pnpm install` 同步 lockfile（−170 行 / −18 包）；
    `tsc`、22 文件 258 vitest 用例、365 个 cjs 用例全部通过。
41. lodash 归因复核（不改依赖）：定位到 `@tarojs/router-rn@4.2.0` 的 4 个文件具名导入 `camelCase`，
    Metro 产物只含 1 个 lodash 模块（73,103 B / gzip 24,968 B，占 raw 1.9% / gzip 2.9%）；patch-package
    需改 4 行并绑定 Taro 版本，预估净收益 raw −60~70 KB、gzip −20~25 KB。**结论：不值得做**，
    优先走 Taro 上游 PR。同时修正旧文档「90 模块 / 594 KB」的未压缩口径。
42. 验证：无 bundle 的干净工作区 `pnpm verify:app` exit 0（130.5 s，本地 Windows），日志明确打印体积门禁 skip；
    复制并追加 200 KiB 的假 bundle 时 `check:bundle-size` exit 1，删除产物后恢复 exit 0；`pnpm verify:config`
    在拆 job 后通过。未执行 RN bundle、Gradle 或 Xcode。

### 2026-10-22 页面规则收敛与决策函数门禁

43. 订单动作判定收敛：新增 `src/services/order/core/order.actionRules.ts`，把 `canDeleteOrder` 从
    `order.service.ts` 搬入，并迁入列表页的 `canCancelOrder` / `canModifyOrder` / `getResendMode` /
    `getResendActionText` 与详情 viewModel 的 `canCancelOrderDetail` / `canDeleteOrderDetail` /
    `isCancelledOrderDetail`；列表与详情条件保持原样（详情仍看 `publicTrackMode` / 取消态，列表仍看
    `isAllowCancel` / role），只把 `isWaitAllotOrderClass` / `isCancelledOrderClass` 等谓词共享。
    页面里的 `canResendOrder` 只是 `canDeleteOrder` 转发，直接删除；`OrderCard` 的再寄文案入参从订单改为角色。
44. 坐标校验去重：新增 `src/shared/geo/coordinates.ts` 的 `isValidCoordinate(lat, lng)`，服务站详情、
    自送服务点卡片、`shared/platform/map.ts` 三处调用；保留旧实现对空串/null 的 `Number(...)` 语义。
45. 等价性测试：迁移前用临时差分用例把旧函数与新规则在 112 个列表组合（role × orderClass ×
    isAllowCancel × 订单号 × 运单号）和 168 个详情组合（publicTrackMode × 分类 × modifyFlag × 单号）
    上逐条对比，全部一致后删除旧实现；随后把同一批组合固化成
    `test/unit/order/order-action-rules.test.ts`（27 用例，含旧实现快照基准），新增
    `test/unit/shared/coordinates.test.ts`（5 用例，含 ±90/±180 边界与非法值），两个文件设线 95 / 分支 90 阈值。
46. 新增 ESLint 规则 `app/no-page-business-decisions`（`packages/eslint-plugin-app`）：页面目录下声明
    `can*/should*/is*` 决策函数或布尔常量时，若读取 ≥2 个输入或转发到本文件内其它决策函数则告警，
    提示「业务规则放 services/<domain>/*.rules.ts」；单字段派生自动放行，存量 6 处纯 UI/路由派生
    （`canSend`、`canSubmit`、`canSwap`、`isCouponHighlighted`、`canClear`、`isPublicOrderTrackMode`）
    在 `.eslintrc` allow 列表登记并写明原因。探针验证：页面内 `canProbeCancel`、转发函数、多输入布尔常量
    均被报出，`canUse` / `isDoorPickup` 放行；删除探针后 lint 仍为 0 告警。
47. 验证：`pnpm verify:app` exit 0（tsc / eslint / stylelint / 24 文件 290 vitest 用例 / 365 个 cjs 用例 /
    barrel / 模块体积 / 路由 / 平台契约），四处页面仅替换调用表达式与删除页面内函数，JSX 结构与文案无改动；
    未执行 RN bundle、Gradle 或 Xcode。
48. 订单列表对齐生产 UI（真机对比后返工）：移除「最近90天/共 N 单」汇总条，改为 4 个 tab（激活项带数量）+
    分享入口；卡片改为「运单号+复制 / 快递-零担标签 / 城市-状态-城市 / 操作胶囊 / 底部时间条」，
    时间条改为按钮下方的内嵌圆角淡黄块，卡片恢复左右留白与更大圆角。
    业务规则继续下沉：`order.actionRules` 新增 `canEvaluateOrder` / `canNotifyRecipient` /
    `getOrderListTimeText`，`OrderListItem` 补充 `viewTextFlag`，`orderClass=0` 文案由「待揽件」改为「待揽收」；
    「通知收件人」复用 `modifyNotifyDeliver`（新增 `orderService.notifyWaybill`），
    「去评价」按小程序 survey 场景（待揽收/已退回 S0206，其它 S0601）跳 H5。
    样式拆出 `OrderCardActions.scss`（新文件零间距债务），样式基线从 630 收紧到 616；
    真机 PDEM10 上已确认列表、tab 计数、复制、四个操作与底部时间条渲染正常。
49. 验证：`pnpm verify:app` exit 0（tsc / eslint / stylelint / 24 文件 295 vitest 用例 / 365 个 cjs 用例 /
    barrel / 模块体积 / 路由 / 平台契约），未执行 RN bundle、Gradle 或 Xcode。

### 2026-10-22 订单列表像素级对齐生产 App

50. 基准确认：设备上同时装有生产包 `com.deppon.dpapp`，直接抓生产端 PNG 与当前 debug 包逐像素对比。
    量测口径统一为 1440 宽截图（1 设计 px = 1.92 物理 px），对比卡片起止行、文本 bbox、胶囊矩形、
    时间条渐变与阴影灰阶；最终 tab / 单号 / 城市 / 状态 / 胶囊 / 时间条 / 卡片间距均在 1–3px 内。
51. 头部渐变：订单列表改为 `safeArea='none'`，由页面头部自己补 `insets.top`，并用 `react-native-svg`
    铺全宽渐变（`#cdeaff → #f4f7fb`，覆盖状态栏到搜索区底部），替代原来的纯色 `#eef6ff`。
    搜索框、tab、分享入口改为透明背景，渐变从屏幕 y=0 连续过渡；生产端 y=20/300/480 的采样值为
    (205,234,255)/(231,243,253)/(242,247,252)，当前实现误差 ≤2 个灰阶。
52. tab 与搜索区：tab 改为固定 142 设计 px 宽、计数单独 `Text`（30px regular）、指示条 64×8、
    分享图标 52；标题色统一 `text-ink(#111)`；筛选图标从 `list-filter` 换成漏斗，`AppIcon` 新增
    `funnel` 映射；搜索框左内边距改为 24、图标与文字间距 20、占位字号 28。
    tab 文字、计数、指示条、分享图标、搜索占位与生产端 bbox 偏差 ≤4px。
53. `AppPressable` 新增 `compact` + `hitSlop`：compact 去掉视觉盒子的 88 设计 px 最小宽高，
    原生 overlay 同步取消最小尺寸，热区由 hitSlop 补（胶囊 8dp、单号/复制 10dp）。此前 44dp 最小高度
    把操作胶囊撑到 170px，是卡片比生产高 35px 的主因；现在胶囊 115px，与生产一致且不换行。
54. 卡片重排：去掉描边，改用 `AppElevatedView` 的三层低透明度圆角层模拟软阴影（spread 18/10/4，
    `overlay.cardShadow*` token；RN 0.73 的 `elevation` 在 FlatList 里只渲染硬边，已实测淘汰）。
    内边距 28/32、城市 48px、姓名 28px 深色、单号 24px `text-subdued`、复制 20px、标签 21px；
    操作区 `padding-bottom 16`、胶囊高 60 / 左右 26 / min-width 142 / 间距 8；
    时间条改为整宽 72 设计 px 的 `#ffffff → #ffffe5` 竖向渐变（SVG），文字 24px `#a39465`。
    新增 token：`$dp-font-size-display-large(48)`、`$dp-space-60`、`$dp-color-order-wait-text-soft`、
    `$dp-color-order-header-gradient-start`，并在 `nativeTokens.ts` 同步登记。
55. 验证：`pnpm verify:app` exit 0（tsc / eslint / stylelint / style-governance 间距债务 616→614 /
    24 文件 295 vitest 用例 / 365 个 cjs 用例 / barrel / 模块体积 / 路由 / 平台契约 / 体积门禁）；
    JS 由 Metro 热更新验证，未执行 RN bundle、Gradle 或 Xcode。

### 2026-10-22 寄件页初始态区块门控对齐生产端

56. 差异归因：同机对比截图确认左侧长截图是 RN 包，右侧是生产 `com.deppon.dpapp 4.0.6.8`。左侧「寄件地址变化，请重新获取价格」只存在于
    `services/express/core/express.mutations.ts`，生产 4.0.6.8/4.0.7.0 的 `libapp.so` 均无此文案；真机 `RKStorage` 的 2 小时草稿
    （sender 已填、consignee 空、goods 空、quoteStaleReason 已置）恢复后把失效态画成了整块「预计送达时间」。
57. 生产条件取证：真机拉包解包得 133 MB base.apk / 19 MB `libapp.so` / 709 个 Dart 文件，AOT 保留
    `contactPickupTimeVisible`、`productVisible`、`couponEntity`、`RealAuthControllerEx|isAlreadyAuth`。运行态三档对比：p30 空表单
    无实名条/取件切换/取件时间行；当前仅寄件人时无取件时间行；p17 双方地址+货物+报价才出现「今天 一小时内」。
    `queryRealNameAuth` 探针显示账号已实名，`queryNewCouponList` 可用/不可用券均为空。
58. 新增服务层谓词：`isExpressOrderFormReady(draft)`（收寄详细地址 + 货物名称 + 重量）与
    `shouldShowExpressCouponRow(state)`（已选券/有券/报价查询开始后）；页面只消费谓词，不在页面新增决策函数。
59. 页面门控：实名条改由 `useExpressRealName` 查 `realNameService.query()`，仅已登录且未实名时渲染；取件切换按寄件地址、
    期望上门时间按表单齐备分别门控；预计送达去掉 `quoteStaleReason` 渲染条件（失效原因仅保留给自动重算），
    并在草稿恢复时清理无产品时的失效原因；优惠券行按谓词显隐；保价卡按表单齐备 + 新鲜保价能力显隐，
    文案改为生产端「保价 / 未保价物品最高赔付3倍运费」，去掉「选填」角标。
60. 测试与验证：新增 `realname-banner.test.cjs`、`panel-gates.test.cjs` 与 `draft.test.cjs` 门控用例（cjs 371）；
    `pnpm verify:app` exit 0（tsc / eslint / stylelint / 24 文件 295 vitest / 371 cjs / barrel / 模块体积 / 路由 /
    平台契约 / 体积门禁）。未执行 RN bundle、Gradle 或 Xcode。
61. 收寄件人空态灰底修复：`ExpressContactPanel` 的灰底由卡片 `margin` 改为绝对定位 `__bg` 视觉层，灰底不再参与行布局；
    寄件人/收件人图标、文字、地址簿恢复同列（真机 x=92/276，灰底仍为 77..1363 × 238）；
    同时补生产端 8dp 两行间距（`express-contact-card--spaced`）与地址簿内容 4dp 左移（`padding-right: 8`）。
62. 真机验证（用户明确要求出包）：Taro bundle + `assembleDebug -PtargetAbis=arm64-v8a -PreactNativeArchitectures=arm64-v8a --offline`
    + `adb push` / `pm install -r`；空表单与仅寄件人两档均确认实名条、取件切换、期望上门时间、优惠券、保价按门控显隐，
    收寄件人两行图标 x 完全对齐。`pnpm verify:app` exit 0；bundle raw +75.9 KiB / gzip +11.2 KiB，仍在 150 KiB 容差内。

### 2026-10-23 导航栏与状态栏连续

63. 差异定位：寄快递页真机截图顶部 y=0–123 为 `#f5f7fb`（页面底色），y=124 起才是白色导航栏，形成 124px 灰带；
    生产端同一区域 y=0–193 为纯白，状态栏与导航栏连续。根因是 `AppPage` 用 `surface` 颜色给整个
    `AppSafeAreaView` 上色，白色头部只能从状态栏下方开始。
64. 修复：`AppPage` 改用 `useSafeAreaInsets` 接管安全区——有 `header` 时把顶部 inset 转为 `.app-page__header`
    的 `paddingTop`（白底直铺屏幕顶部），有 `footer` 时把底部 inset 转为 `.app-page__footer` 的 `paddingBottom`，
    并从 `SafeAreaView` 的 edges 中移除对应边；无头部/底栏的页面（member、print 等）行为不变。
65. 验证：修复后 y=0–307 全白，状态栏深色图标不受影响；与生产端 p30 相比标题中心同为 x≈719，
    返回箭头偏差 ≤3px，首个卡片顶边 y=331 vs 生产端 343。新增 `test/unit/shared/app-page.test.ts` 3 条安全区契约；
    `pnpm verify:app` exit 0（27 文件 328 vitest / 371 cjs / 体积门禁通过）。
    未处理的既有差异：分享入口图标/文字间距与字号、导航栏比生产端短 4px，本轮不动。

### 2026-10-23 货物信息页 UI 对齐生产端

66. 实测差异（同机 1440×3168 截图逐块取色）：页面顶部/卡片间距 24→16、卡片圆角 8→18、搜索框由 64 高/8 圆角
    改为 78 高/32 圆角/24 内边距、必填角标字号 20→18、热门寄件由内容宽度换行改为四列等宽栅格
    （高 60、列/行间距 16，行节距 146 与生产一致）、填充灰由 `#f8fafc` 改为中性 `#f5f5f5`/`#f7f7f7`。
67. 其余对齐项：占位文字改浅灰 `#bfbfbf`；搜索放大镜 34→48 且相机入口 `compact` 贴右；语音图标改
    `circle-pause`（生产是圆环内双竖条）62；步进器按钮 `compact` 后白框恢复 402×123、圆角 6，加减号改用
    `AppIcon` 的 `plus`/`minus`（33、stroke 1.5），文字字形改图标后水平/垂直都在按钮中心（生产 39×39）；
    红条 `margin-top: -24` 溢出卡片 8px；蓝块 padding 24/圆角 21/行高 36；底栏上内边距 16→32、按钮文字 25→30；
    右侧「›」改 `chevronRight`。
68. 给快递员捎话补齐：此前对比用的生产截图被底栏截断，漏掉了留言卡片下半部分。滚到底的生产图显示：
    留言框高 168 设计 px、上传框 172×172 白底带「上传照片」、右下 0/100 计数、下方 10 个快捷留言标签
    （高 60、横向间距 22、纵向 16，一行 5 个）。标签间距用 `column-gap`/`row-gap`，不要用 margin-right：
    行尾 margin 会参与换行计算，第 5 个标签会因差 2px 被挤到下一行。
69. 结构：标签样式拆到新文件 `pages/express/goods/chips.scss`（`content.scss` 曾达 305 行超过 300 行上限）；
    新增 token `$dp-color-bg-neutral` / `$dp-color-bg-neutral-soft` 并同步 `nativeTokens.ts`。
70. 底部留白：`ScrollView` 不会把最后一张卡片的 `margin-bottom` 计入可滚动内容，滚到底时卡片与底栏之间
    只剩 1px。最后一张卡片后补真实占位 `express-goods-bottom-space`（16 设计 px），滚到底可见 31px 页面底色留白。
71. 验证：`pnpm verify:app` exit 0（27 文件 328 vitest / 371 cjs / 样式基线与严格门禁 / 体积门禁）；
    真机由 Metro 热更新逐轮量测：搜索框 150px、热门标签 290×115/列距 42、留言框 322（生产 323）、
    上传框 330×330、快捷标签 218/176×115 与 5 个一行、步进器白框 402、底栏顶边 2861 均与生产一致。
    未执行 RN bundle、Gradle 或 Xcode。未处理：分享图标字形、语音按钮投影、确定按钮渐变、红条左侧箭头。

### 2026-10-23 地址簿（选择收件人）UI 对齐生产端

72. 卡片尺寸：生产端 1 行地址与 2 行地址的卡片同高（510/511 物理 px），说明地址区固定预留两行——
    `.contact-card__address` 加 `min-height: $dp-line-height-38 * 2`，1 行地址的卡片不再矮一截。
    配套把圆角 16→24、卡片间距 12→24、分隔线 `margin-top` 24→28 且颜色改 `#ededed`，
    动作行 `padding-top` 28、卡片 `padding-bottom` 24，实测卡片边界 546..1055 / 1103..1613 /
    1660..2170 / 2218..2727 与生产逐像素一致。
73. 三个 AppPressable 陷阱：
    - 卡片动作行的按压区必须 `compact`，否则 88 设计 px 的 min-height 把整行撑到 169 物理 px，卡片底部
      多出 40px；热区用 `hitSlop`（10）补回。
    - 底栏按钮也必须 `compact`：Yoga 会先用 min-width（88 设计 px）兜住 flex 基准，`flex: 1` / `flex: 2`
      只剩 1:1.65（实测 475:781）；compact 后灰框 413、蓝框 832，与生产 417/836 对齐，比例恢复 1:2。
    - 底栏按钮高度 88→92 设计 px、上内边距 16→36、下内边距 →32，按钮矩形 2930..3106 与生产 2930..3105 对齐。
74. 搜索区：字段底色 `bg-muted(#eef2f6)`→`bg-neutral(#f5f5f5)`、高度 76→78、放大镜 24→32、
    图标与占位之间 12→16、占位字号 25→28，占位文案 ink bbox 与生产差 ≤2px。
75. 灰度与字号按生产取色重设：新增 `$dp-color-text-neutral-strong(#525252)` / `-soft(#747474)` /
    `-hint(#868686)`、`$dp-color-border-divider(#ededed)`，同步 `nativeTokens.ts`。
    地址 #525252、动作行文字与图标 #747474、占位与放大镜 #868686、未选中单选框描边 #747474
    （原 `border` 色 #d0d5dd 太浅，生产是明显的中灰）、导航标题/返回/分享改 `text-ink(#111)`，
    底栏「管理」改 `text-supporting(#667085)`（生产 #666a7b）。同名文案的像素直方图现在与生产一致
    （标题 17/7831 vs 17/7830，单选框 115/647 vs 115/647，管理 111/3348 vs 111/3347）。
76. 主按钮渐变：生产「创建新地址」是横向渐变（左 ≈#1a5aff → 右 ≈#4d7cff），不是纯品牌色。
    复用已有 `$dp-color-brand-gradient-start/end`（#1b58ff/#4b7cff），按钮内用 `react-native-svg`
    的 `LinearGradient + Rect` 绝对定位铺底；实测 x=620/900/1200 采样与生产差 ≤2 个色阶。
77. 验证：`pnpm verify:app` exit 0（27 文件 328 vitest / 371 cjs / 样式基线与严格门禁 / 体积门禁）；
    真机 Metro 热更新后逐项量测：卡片边界、动作行 8 段墨迹（单选框/默认地址/复制/编辑/删除）、
    底栏按钮矩形与渐变采样均与生产一致或差 ≤4px。未执行 RN bundle、Gradle 或 Xcode。
    未处理：分享图标字形（生产箭头更粗）、底栏蓝框比生产窄 7px。

## 五、执行顺序

1. 新领域禁止再用运行时 `export *`（门禁已是 0 基线）；新增服务时照 `expand-service-barrels.mjs` 生成的显式风格写。
2. 行为字符串契约已迁完；后续新增契约按类型落位：纯行为进 `test/unit/**`，结构/来源约束进 `packages/eslint-plugin-app`，
   不要再往 `check-rn-boundaries` 写「某文件必须包含某字符串」。
3. 打包体积门禁已落地；下一轮减体积先做归因（sourcemap / Metro module id），不要再用“模块数 / 源码 KB”
   估算安装增量。`lodash` 的结论是本轮不值得本地 patch；若要动，优先给 Taro 上游提 PR，并把补丁绑定到 Taro 版本。