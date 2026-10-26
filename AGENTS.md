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

### 2026-10-23 增值服务页 UI 对齐生产端

78. 结构返工：卡片从「图标 + 标题/说明同列 + ⓘ/单选」单行改为生产端两段式——标题行
    （图标 48 / 标题 / ⓘ / 单选圆）在上，说明文案整宽换行在下。卡内边距 20→24（上下）/32（左右），
    图标 64→48、图标与标题间距 16→8，标题 32→28，说明 22→24（行高 32→36，色 #667085→#9b9b9b），
    卡间距 16→24，卡片圆角 24→21；选中态由 1px 透明边框改绝对定位描边层，不再改变卡高。
    实测卡片 x 46–1393、高 359、间距 47、说明首行墨迹 y 542、行距 70，与生产差 ≤1 设计 px。
79. ⓘ 图标改为 lucide `info`（33 设计 px + strokeWidth 1.5，色 #bfbfbf），外径 54 物理 px 与生产一致；
    三个 `AppPressable` 全部 `compact`（否则 88 设计 px 最小尺寸撑高标题行），热区用 `hitSlop` 补。
80. 说明文案换成生产端原文（8 条），新增「口令签收」卡（`service_icon_pwd.png` 取自生产 `3.0x` 资源，
    与既有图标同源）；选中读写 `draft.service.passwordSigning`，经 `updateExpressService` 回写草稿并进入
    重新询价链路，寄件页摘要显示「签收密码」。生产端「通电验机」无 ⓘ，用 `info={false}` 关闭。
81. 服务费行只在 `selected && fee > 0` 时渲染，去掉「服务费 ¥--」占位；编辑器与费用行跟随 32 内边距。
82. 底栏：高 150→160（上下 32），上圆角 32→24，费用合计 26→24，金额 40→32，分隔线左右 12→16，
    确定按钮 300×96→240×96、文字 32→30。实测按钮 x 933–1393、高 185、底栏白底 307 物理 px 与生产一致。
83. 验证：`pnpm verify:app` exit 0（27 文件 328 vitest / 371 cjs / 样式门禁 / 体积门禁）；真机 Metro
    热更新后逐项量测卡片/文字/ⓘ/单选圆/底栏，并确认口令签收与双人派送选中后寄件页摘要为
    「签收密码、双人派送」、通电验机无说明入口、展开态卡片增高正常。未执行 RN bundle、Gradle 或 Xcode。
    未处理：价格占位「--」生产端短横更宽（左组整体右移 19 设计 px）、页头比生产短 4 物理 px。

### 2026-10-24 登录协议确认弹层对齐生产端

84. 行为同步：登录页协议未勾选时「获取验证码」不再直接发送（原先完全不校验）、「立即登录」不再弹 toast，
    两者都弹出底部「服务协议及隐私政策」确认弹层；「同意」自动勾选协议并继续被拦下的动作
    （继续发验证码 / 继续登录），「不同意」/×/蒙层仅关闭。弹层文案与生产 `libapp-4.0.7.0.so`
    字符串池逐句核对一致；链接走 `AUTH_LOGIN_SERVICE_PROTOCOL` / `AUTH_LOGIN_PRIVACY_PROTOCOL` 两个 H5。
85. 新增 `pages/login/components/LoginAgreementSheet`（AppNativeModalSheet + ScrollView 正文 +
    不同意/同意双按钮 flex 1:1.92，同意按钮复用 brand 渐变 + Svg LinearGradient 模式），
    登录页把登录执行拆出 `submitLogin`、`handleAgreementAgree` 里用 ref 记录 pending 动作后续跑；
    契约测试 `test/unit/auth/login-page.test.ts` 5 用例（拦截/同意续跑/拒绝不勾选）。
86. 新 token `$dp-color-text-link: #2458e2`（生产链接蓝比品牌色深）；弹层几何按生产量测
    （`docs/parity/login/ui-measure.md`）：面板顶圆角 48、标题 42 左置、正文 28/38 两段各 6 行、
    按钮 96 高 pill、底部留白 32。
87. 两个 Taro RN 陷阱（真机踩实，写入记忆）：① 弹层内 `useAppSafeAreaBottomInset` 恒为 0
    （窗口已全屏但 safe-area-context 上报 0），底部留白改用固定 token；② Taro RN 样式按模块作用域——
    `AppPressable` 内部 Text 用 AppPressable 模块的样式表解析 className，调用方传入的
    字号/颜色全部失效（`contentElement='text'` 的文字样式不生效），文字样式必须放在
    children 的内层 Text 上；`AppNativePressable` 的 44dp 最小尺寸需要外层容器（96 宽右对齐）补位。
88. 验证：真机三轮截图量测（面板顶边 −4、标题/正文/按钮全部 ≤6 物理 px、渐变端色差 2、
    链接蓝色 #2458e2 生效）；真机确认未勾选点「获取验证码」弹层且不发短信、同意后自动勾选并
    续跑（触发频控点选验证码）、不同意仅关闭。`pnpm verify:app` exit 0（28 文件 333 vitest / 371 cjs /
    样式基线 614 / 体积门禁）。未执行 RN bundle、Gradle 或 Xcode。
    未处理：链接行换行点与生产差 2 字（生产在《德后断行、RN 整词换行），两行结构一致不追。

### 2026-10-24 预计送达时间产品卡按小程序参考实现还原

89. 归因：寄件页产品卡此前「200×152 拉伸底图 + ribbon View 叠字」与生产端不符。参照
    `D:\10531845\Desktop\CZH-DEV\mp-taro3`（`send/express/basic/product/item`）重写
    `ExpressQuoteSection`：底图 1–4.png 与 RN 现有 `express_product_bg_*.png` 是同素材两次导出
    （深色掩膜 IoU 0.97+），卡片恢复原始 184×152（slot 200×192：上 24 留给「惊喜优惠」角标外挂、
    槽尾 16 即卡间距），标题 22dp 左对齐（短名 pl-16/长名 pl-8，选中白/未选 #111）、
    时效行 mt-8 h-40 蓝 `#1957ff`（分段 20/26semibold/20，整段 22）、价格行 mt-4 h-36 全 24 常规
    （数字不再放大加粗）、高端勋章改常显（top-14 right-8）、「惊喜优惠」角标移出 overflow 卡片
    （slot 级 right:0 top:2，白描边 2px + 282° 红渐变 `#fa7073→#f83a3c`，radius 20/20/20/0）。
90. 新 token：`$dp-color-quote-time`、`$dp-color-quote-limit-start/end`、`$dp-radius-20`，
    `APP_STYLE_COLORS.quote` 同步登记；cjs 测试断言同步新价格结构并补 `@/styles/nativeTokens`
    依赖映射。真机 Metro 量测：卡 353×292px/间距 31px/圆角、选中描边 #363b4d（蓝环消失）、
    渐变带 91px 齐平卡顶（采样与底图逐点吻合）、标题/时效/价格行位与生产 p17 的 mp-taro3 流式
    布局推算值一致；未选卡顶部 `#edefff` 实心带经 APK 底图与小程序 4.png 双重比对确认为生产
    原生设计（与选中带同构，掩膜差 0.072%），非实现偏差。`pnpm verify:app` exit 0。
    报价失败已按参考端改为静默处理（见 130）、区块标题行下间距比生产约多
    12dp（ExpressSection 行高 82 为整页共用，未单独调）。

### 2026-10-24 静态门禁提速（5min → 约 100s）

91. 实测账单（全绿一轮 ≈300s）：eslint 122s / stylelint 52s / cjs 371 用例 34s / tsc 29s /
    style-governance 契约测试 28s（其中单个用例 17.6s——每条断言都 spawn 一个 `node stylelint.mjs`
    冷启动整个引擎）/ vitest 10s / 其余 9 个秒级 check 合计约 20s。
92. P0 缓存三件套：`lint` 加 `--cache`（mtime 策略，cache-strategy content 命中时仍要逐文件哈希
    读取反而更慢）、`lint:styles` 加 `--cache`、`typecheck` 加 `--incremental`；三份缓存文件
    （.eslintcache / .stylelintcache / tsconfig.tsbuildinfo）已进 .gitignore。单跑热缓存：
    eslint 17s、stylelint 16s、tsc 9s。
93. P1 编排：新增零依赖 `scripts/verify-static.mjs`——11 个秒级 check 串行快速失败在前，
    6 个重型门禁（typecheck/lint/lint:styles/test:unit/test:style-governance/test:business-rules）
    并行在后，完成即打印各自耗时、失败汇总输出。`check:business-rules` 拆成两半：预算检查留在
    原脚本（快相），371 个用例挪进新 `scripts/test-business-rules.cjs`（TZ=Asia/Shanghai、
    concurrency=4 不变）挂 `test:business-rules`。契约测试 `formal verify includes the strict
    style gate` 同步改为断言编排器文件里的门禁清单。
94. P2：契约测试里 stylelint 子进程断言改为进程内 `stylelint.lint({ code, codeFilename })`，
    套件 28s → 16s（剩余大头是 CLI 固件用例的固有 spawn，已并行化不占关键路径）。
95. 效果与坑：热缓存全绿墙钟 ≈97–107s（原 ≈300s）；并行下各门禁仍比单跑慢 2–4 倍（16 核实测
    仍互相拖慢，疑似 I/O 串行化/功耗墙，墙钟收益约 30% 但为正）。另注意：后台常驻的 Taro watch
    会显著拖慢全量验证（实测有 watch 时单门禁膨胀 2–8 倍），跑 verify 前先停 dev:rn。
96. 审查修复：旧 `check:business-rules` / 根 `check:app-business-rules` 保留执行用例的语义，快速阶段改用
    `check:business-test-structure`（`--structure-only`），重型阶段的 `test:business-rules` 复用旧入口，领域校验
    与失败退出码保持一致。新增 `prepare-lint-cache.mjs`，ESLint / Stylelint 运行前按本地规则目录源码哈希
    判断是否清除旧缓存，未变更规则时继续复用；对应源码哈希文件也加入 `.gitignore`。

### 2026-10-24 寄件主链路业务逻辑对齐 mp-taro3

97. 询价口径：`ExpressFreightRequest` 增加 `paidMethod`（MP/FC/CT）与 `totalQuantity`（件数），
    `buildFreightRequest` 按草稿付款方式与件数输出；`sortExpressQuotes` 下沉到 `expressService.quote` /
    `quotePriceTime`，把 `YTY` 挪到列表末尾（`mp-taro3/src/api/send.ts:36-44`）。
98. 默认产品：`selectDefaultExpressQuote` 改为参考端 `GetProductDefault` 的优先级
    （PACKAGE / RCP / NFLF / JZKH / DJBK / XJBK，兜底列表末位）；已选产品同码同线路仍存在时保留
    （`findExpressQuoteSelection`），手动重新询价不再重置用户选择。
99. 提交校验：港澳台互寄规则 `isExpressSpecialRegionBlocked`（澳门↔澳门、香港/澳门出发放行，台湾出发拦截）
    与月结资格拦截都**只在提交时**生效（`requireOrderableRegion`），询价阶段照常取价；
    `useExpressMonthlyPay` 并行查询 `customerLabel`，`monthlyEnabled` 为 null 不拦截；`shipperNumber`
    扫码按参考端 `CheckFixedMonthly` 视为固定月结（排除码 1013495806）。
100. 下单载荷：`isRecieveGoods` 由常量 0 改为参考端口径（`weight > 60kg` 或 `volume > 0.36m³` 判零担，
    营业部二维码固定零担；自送为 0，其余为 1）；扫码单 `isContact='N'`；`contactAddress` / `AddressDetail`
    按参考端改正为「详细地址」/「省-市-区,详细地址」（寄件与批量两个入口），此前两者写反；
    筛单请求补 `totalVolume`、地址格式对齐，`limitCust` 改回仅扫码客户码为 1。
101. 扫码初始态：营业部/司机二维码固定 61kg 且送货不上楼，服务点二维码置自送并清空取件时段
    （`applyExpressScanContext`）；扫码网点同时作为 `startStation`，服务点二维码强制 `dispatchFlag='N'`。
102. 失败与成功：下单返回 `1|货类|协议号` 时先 `setStaging` 暂存再打开 `EXPRESS_STATEMENT` WebView（草稿保留，
    返回后重新提交）；`登录超时` 走「保草稿 + 跳登录」；普通失败改 `Taro.showModal` 且保留行内文案。
    下单成功后异步调用 `orderPriceLog/save` 回写价格（无订单号或无报价金额时跳过），失败不影响跳转。
103. 测试与验证：`main-flow-parity.test.cjs`（11 用例）覆盖询价参数、默认产品、港澳台、扫码、地址与筛单；
    `submit-actions` 补签署函、登录超时、弹窗、价格日志、月结 5 用例；auto-quote / monthly-pay 各补 1 用例。
    cjs express 域 140 用例、vitest 343 用例、`pnpm verify:app` 全绿。剩余缺口（3C 原厂包装、显示器尺寸、
    报关、实价双字段、合同客户 `limitCust`、公司名）记录在 `docs/parity/send/gaps.md`。
    未执行 RN bundle、Gradle 或 Xcode。

### 2026-10-24 普通寄件主流程分支对齐

104. 取件时间：`useExpressPickupTime` 在表单齐备且上门取件时自动查询并选中首个普通时段；重量/体积/件数/产品变化后
    按新参数重查，仍有效的已选时段保留，查不到才退回首个；自送模式不查。`updateExpressGoods` 不再清空取件时间
    （参考端 `handleGoodsChange` / `handlePickupList` 都保留 `pickupTime`，只在失效时重选）。
105. 快递/零担切换：新增 `services/express/core/express.goodsType.ts`（60kg / 0.36m³ 同口径）。货物修改回到快递、
    或快递↔零担切换时清空自送网点（`updateExpressGoods`）；零担内部修改保留网点，与参考端
    `handleGoodsChange` 的 `!isLd` 分支一致。
106. 产品联动：`selectExpressProduct` 在新报价没有券优惠（YHJ/YHQ）时清空已选券；`DCZP` 产品把到付回落为现付
    （参考端 `handleProductChange`）。保价类型仍按新产品策略归一，金额保留。
107. 测试：新增 `pickup-auto.test.cjs` 3 例（自动查询/重量变化保留时段/自送不查）、`main-flow-parity` 补
    产品变化券与到付 1 例、`service-point` 改为按快递/零担切换网点；cjs express 144、vitest 343 全绿。

### 2026-10-25 寄件优惠券链路对齐

108. 请求门槛：`createExpressCouponQueryRequest` 增加「产品价格可见」与「客户编码扫码不请求」两条，和参考端
    `handleQueryCoupon` 一致；请求参数继续用券前原价（FRT/BF/AD/NMBZ + 线路优惠 + 当前券抵扣还原）。
109. 自动选券：`useExpressCoupons` 在普通现付、非扫码、寄件人手机号 11 位时自动选 `available[0]` 并重算；
    用输入指纹（重量/体积/产品/线路）防重复，用 `autoCouponCode` 记录自动选中的券，手动选择或券列表带入的券不会被覆盖。
110. 月结与清除：选券时若付款方式为月结，切回现付并提示「已取消月结支付」；最新券列表为空时清空已选券并重算；
    查询失败（含网络失败）按参考端清空已选券并重算，避免把失效券带进下单。
111. 弹层：无已选券时打开券弹层默认预选第一张可用券，与参考端 Picker 一致。
112. 测试：新增 `coupon-actions.test.cjs` 5 例（自动选券/取消后不复选/月结切换/列表为空清券/手动券保留/扫码不自动选），
    `coupon/contracts` 补价格可见性与扫码门槛 1 例；完整链路与特殊场景整理在 `docs/parity/send/coupon-flow.md`。
    未做：券弹窗广告、不可用原因弹层、`couponSource` 埋点、合同客户不自动选券（客户能力未进草稿）。

### 2026-10-25 寄件主流程逐项审计（进行中）

审计计划：01 询价请求逐字段、02 报价响应与状态、03 取件时间、04 货物/产品/送货方式、05 付款方式、
06 保价、07 提交校验与下单载荷、08 草稿与恢复、09 优惠券复核、10 异常与边界。

113. 01 询价请求：补齐 `nightAcceptServiceTime`（夜间取件报价必须带时段，参考端 `CreateProductParams`），
    寄件与批量共用。其余逐字段结论：`sendDateTime`（参考端空值透传、RN 兜底当前时间）、
    `pickUpToDoor`（参考端 `isExpress || dispatch`、RN 仅看 dispatch）、`passwordSigning` / `isWarehousingService` /
    `reciveLoanType`（参考端按需省略、RN 显式默认值）属于等价或显式默认差异，暂不改；
    `packagingGoodsNum` / `proxySignedReceipt` / `sendNewRetrieveOld` / `isHasElevator` / `skiingPackage` / 报关 /
    `carPickup` 属于 RN 未建模能力，继续记录在 `docs/parity/send/gaps.md`。
114. 02 报价响应：复核 YTY 排序、默认产品优先级、已选产品保留、失败清空与旧响应竞态，无新增改动；
    排序与默认产品逻辑已在前一轮落地，`quote` / `quotePriceTime` 共用。

115. 03 取件时间：请求 `source` 按扫码角色映射（参考端 `GetPickupTimeType`：快递员 1 / 客户码 2 / 营业部 3 / 司机 5），
    普通预约仍为 0；「现在发货」这类非时刻文案不再拼日期，报价 `sendDateTime` 与下单 `beginAcceptTime` 回到参考端口径；
    夜间费用提示常量改为参考端「按时间段差异化计价」表述。默认时段、日期切换、夜间提示、自送清空复核无新增问题。
    模板取件时间已按参考端「首日同小时」匹配（见 127）。
116. 04 货物/产品/送货方式：复核 60kg / 0.36m³ 切换、自送网点清空、产品清空、进仓与派送偏好重置；
    已按参考端对齐：快递内改货物清空自送/自提网点、`dispatch='Y'`、送货上楼；切入零担送货不上楼；
    电梯上楼（`isHasElevator`）仍未建模，留在 gaps。
117. 05 付款方式：现付/到付/月结的 `paidMethod` 映射与改付款重算已对齐；参考端 ECARD/支付分未建模；
    月结资格提交拦截、选券取消月结已在前几轮落地。
118. 06 保价：必保/免费/省心保/全额保策略、上限、货物标签、报价与下单字段复核；已按参考端收窄为 JZZH/NJZZH/YTY/YTYDS/NZBRH（DJBK/DJTH 不再必保，见 125）；
    免费产品按 RN 生产口径发 2000 + `insuranceSource=DEFAULT`。
119. 07 提交校验与下单载荷：校验顺序与文案、防重复提交锁、登录保草稿、签署函暂存、筛单+货物校验、成功清理复核；
    下单扩展字段补 `totalFee` / `basicFee` / `discountFee`（仅在报价返回 `ppcTotalFee` 时）。
120. 08 草稿与恢复：2 小时过期、账号隔离、登录保留、成功清理、券/货物/扫码/再寄带入复核；
    模板带入的取件时间已按参考端「首日同小时」匹配（同 115 / 127）。
121. 09/10 优惠券回归与异常边界：券套件全绿；旧响应竞态（报价/取件/券按 key 丢弃）、并发提交锁、网络失败文案复核；
    cjs express 151 用例、`pnpm verify:app` 全绿。

### 2026-10-24 保价面板对齐生产端两档结构

122. 差异归因：寄件页保价此前是「保价折叠行 + 通用展开选项」，生产端（4.0.7.0 量测
    `docs/parity/send/ui-measure.md`）是常驻两档面板——「保价」标题行（tip 25px #9D9D9D + ⓘ 28），
    「全额保」奶油渐变横幅（垂直 #FFF1D2→#FFFBE7、琥珀盾牌 + 36px #D78B24 标题 + 22px #A28367
    标语），内嵌白色价值行 606×108 悬浮在奶油头（134 高）与灰托盘（91 高 #F7F7F7）的边界上
    （行顶距横幅 94、托盘四周露 24）；「基础保」标题行（蓝勾盾牌 + 31px #111）+ 灰底价值行
    654×97；增值服务行并入同一张白卡（间距 48，卡圆角 32、内边距 32/24）。
123. 逻辑照 mp-taro3 `send/express/service` 与 RealPrice：横幅档位按 易碎保(NORMAL+YSB)→省心保(SXB)→
    全额保(QEB) 优先、物流产品无全额保；基础保在非易碎时展示；价值行选中态显示「保价金额 ¥N +
    保费（报价明细 BF 口径）+ 单选圆」，空态「自定义物品价值 / 填写实际价值」，免费产品（NFLF/NLRF）
    ≤2000 元带「免费赠送」角标。点击价值行打开 `ExpressInsuranceValueSheet`（AppNativeModalSheet：
    物品价值 42px + 必填角标、暂行条例提示、最近使用 4 条历史、未保价风险提醒 + 「知悉风险，
    不保价」出口），确认经 `useExpressInsurance.onCommit` 走 `updateExpressInsurance` 一次性提交
    （type+amount）并触发自动重算；超上限弹「保价金额超限」可转拨 95353。
124. 新增 `createExpressInsurancePanelView`（两档视图）与 `getExpressQuoteInsurancePremium`（BF 保费）；
    历史金额 `expressRealPriceHistory` 走 cache 门面（`DEPPON_EXPRESS_REAL_PRICE_HISTORY` 账号隔离，
    Taro 同步存储会被 RN 边界门禁拦截）。价值行抽成 `renderInsuranceRow` 直接函数调用而非子组件
    ——cjs 契约测试的 jsx-runtime 只建元素不调函数组件，子组件永远渲染不出来。
    验证：`pnpm verify:app` exit 0（新增 insurance-panel.test.cjs 9 用例，380 cjs 全绿）。
    未执行 RN bundle、Gradle 或 Xcode。

### 2026-10-26 寄件口径按参考端收口

125. 保价必保：`insurance.product.ts` 移除 `DJBK` / `DJTH`，必保集合回到参考端 `JZZH / NJZZH / YTY / YTYDS / NZBRH`；
    DJBK 上限回到客户保价上限（测试 750000），不再强制填写保价金额。
126. 送货方式：`createExpressDraft` 默认 `PICKUPSTAIRS`；`updateExpressGoods` 按参考端联动——快递货物清空自送/自提网点、
    `dispatch='Y'`、送货上楼；切入零担清空自送网点、送货不上楼；零担内部改重量保留用户选择。
127. 模板取件时间：新增 `findExpressPickupTimeByHour`，`applyExpressPickupTime` 按「精确匹配 → 首日同小时 → 首个普通时段」
    顺序选时段，模板带入的 `08:00-10:00` 可落到首日 08:00 档；模板保存改为存「每天时段」`08:00-10:00`
    或「现在发货」，不再存完整日期时间。
128. 优惠券：查询失败按参考端清空已选券并重算；自动选券增加合同客户与月结客户排除（`useExpressQuote` 回传
    `customerContractEnabled`，页面把 `monthlyEnabled` / 合同标记一起传给 `useExpressCoupons`）。
129. 验证：`pnpm verify:app` exit 0（typecheck / eslint / stylelint / vitest / cjs / 桶 / 路由 / 体积门禁；
    墙钟 206.1s）；本轮新增/调整用例覆盖模板时段、货物联动、必保收窄、券失败清空与合同/月结不自动选券。
    未执行 RN bundle、Gradle 或 Xcode。
130. 报价失败（含超时）：按参考端删掉 RN 的失败 toast、行内「获取失败」和「重新获取」入口，`ExpressQuoteSection`
    在无报价时直接不渲染；`useExpressQuote` 失败时清空 `selectedProduct`、`couponNumber`、送货进仓（`createExpressWarehouseDraft`）
    与定时派送（`createExpressDeliveryPreferenceDraft`，仅 SCHEDULED），保留地址/货物/付款/取件时间。
    失败后 `status='error'` 阻止同参数自动重试，任一计价条件变化后重新报价；提交仍由 `requireProduct` 拦截，避免参考端
    「空产品带到下单接口」的问题。测试改为失败不展示重试、失败清理券/进仓/定时派送；`pnpm verify:app` exit 0（墙钟 93.5s）。
131. 手动切换时效导致反复计价：根因有两处——① `useExpressQuote.handleSelectProduct` 在 `setDraft` updater 里写
    `quoteRequestKey`/`latestDraft` ref，选择产品引起 `transportMode` 等条件变化时可能先触发请求失效；改为用
    `latestDraft.current` 同步算出 `nextDraft`、先写 ref 再 `setDraft`，选产品不再清空报价或重新询价。
    ② `useExpressPickupTime` 的查询 key 带 `selectedProduct/transportMode`，切产品会重查取件时间，`applyExpressPickupTime`
    选中时段时又会清空 `selectedProduct`，形成「选 A → 重查时段 → 清产品 → 回默认 B」的循环；按参考端去掉产品维度，
    仅在寄件地址/件数/重量/体积变化时重查。新增「切产品不重查取件时段」用例；`pnpm verify:app` exit 0（墙钟 72.0s）。
132. 时效切换的二次问题：① 报价请求 key 在选中产品后仍带 `service.transportMode`，切产品会改变 key；已在
    `createExpressQuoteRequestKey` 里把「已选产品时的 transportMode」归一为空，选中产品不再算计价输入。
    ② 自动报价改为按 `quotedKey` 判断（`useExpressQuote` 回传最近一次报价的条件 key），而不是「quotes 为空 + 无失效文案」，
    这样旧价格可以保留、产品切换不会误触发、报价回填草稿也不会自激。③ 报价请求 key 变化时不再清空 `quotes`，
    页面只按 `quotes.length > 0` 渲染产品区，重新计价期间旧时效卡与优惠券区保持可见；优惠券查询的输入 key
    去掉当前选中产品（`createExpressCouponInputKey`），切时效不再重查券/清空券列表。
    验证：auto-quote 27、quote-section 4、coupon-actions 8 用例全过；`pnpm verify:app` exit 0（墙钟 71.2s）。
133. 清理参考端没有的「带入」提示：删除寄件页 `EXPRESS_DRAFT_CARRIED_MESSAGES` 及桥接回填后的 toast；
    删除 `ExpressScanContextCard`（扫码来源卡）与 `createExpressScanContextView` / `clearExpressScanContext`，
    扫码上下文仍保留在草稿与下单载荷里，只是不再展示来源卡片和「移除」入口。桥接测试去掉对应三条视图/清除用例，
    样式基线随组件删除收紧到 610。`pnpm verify:app` exit 0（墙钟 92.6s）。
## 五、执行顺序

1. 新领域禁止再用运行时 `export *`（门禁已是 0 基线）；新增服务时照 `expand-service-barrels.mjs` 生成的显式风格写。
2. 行为字符串契约已迁完；后续新增契约按类型落位：纯行为进 `test/unit/**`，结构/来源约束进 `packages/eslint-plugin-app`，
   不要再往 `check-rn-boundaries` 写「某文件必须包含某字符串」。
3. 打包体积门禁已落地；下一轮减体积先做归因（sourcemap / Metro module id），不要再用“模块数 / 源码 KB”
   估算安装增量。`lodash` 的结论是本轮不值得本地 patch；若要动，优先给 Taro 上游提 PR，并把补丁绑定到 Taro 版本。
4. 新增 / 改名 / 拆分出业务 scss（含共享组件自带的 index.scss）后，**先**跑
   `pnpm --filter com.deppon.app run update:styles-baseline` 登记基线，**再**跑 verify:app——
   零债务的新文件也必须登记。2026-10-24 起 11 个秒级 check 已前置并行编排器首段，忘登记会在
   20s 内报「尚未登记」，不再白烧两分钟；`verify:static` 重活由 `scripts/verify-static.mjs`
   并行编排，异常时看「[门禁名] ✗」汇总段定位。改动门禁组成要同步改
   `style-governance-lib.test.mjs` 的 formal verify 契约。
