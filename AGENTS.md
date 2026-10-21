# 当前项目问题与优化方向

更新日期：2026-10-21（上一版 2026-07-07，其中大部分问题已落地，见第二节）

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

### P1 打包体积（已量化，lucide 已治理）

- 实测（`bundle:android` + sourcemap 归因）：**5.18 MB → 3.66 MB（−1.59 MB，−29%）**，模块 3420 → 1925。
- 主因：`lucide-react-native` 从包根具名导入会把 1545 个图标全打进包（1549 模块 / 1.27 MB），实际只用 52 个。
  已改成 `dist/esm/icons/<name>.js` 深导入（`types/lucide-icons.d.ts` 补 ambient 声明），lucide 降到 54 模块 / 34 KB。
- `lodash` 90 模块 / 594 KB 已归因：来自 `@tarojs/helper` 与 Taro 运行时（`@tarojs/taro` → `components-rn` → `taro-rn`），
  不是业务直接依赖。低成本手段只有 `patch-package` 把 Taro 内部的全量 `lodash` 导入改成按需，收益/风险需单独评估。
- `expo-camera` **不能删**：`android/build.gradle` 的 `allprojects.repositories` 会校验
  `node_modules/expo-camera/android/maven`，缺失即抛 `GradleException`。JS 侧零引用，但这是 Gradle 的硬依赖。
- `qrcode` 27 模块 / 71 KB、`crypto-js` 87 KB 仍可评估替换（两者都是纯 JS 小包，优先级低）。
- 仍缺 bundle 体积预算门禁：现在只校验产物配置和 sourcemap，不校验体积增速。

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
- `@types/jest` 仍是无主残留（删它要同步 `pnpm install`，别只改 `package.json`）。

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
- 页面里仍有业务判断回流（如 `pages/order/list/index.tsx` 的 `canCancelOrder` / `canModifyOrder`），
  体积门禁管不到“规则是否在正确层”，可给 `check-business-rules` 加一条软告警。

### P3 CI

- `app-quality.yml` 每个 PR 都装 Android SDK（platform-tools/NDK/cmake），但 job 只跑静态门禁，
  建议拆成“静态”和“native env”两个 job，省掉重复的 20+ 分钟。

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

## 五、执行顺序

1. 新领域禁止再用运行时 `export *`（门禁已是 0 基线）；新增服务时照 `expand-service-barrels.mjs` 生成的显式风格写。
2. 行为字符串契约已迁完；后续新增契约按类型落位：纯行为进 `test/unit/**`，结构/来源约束进 `packages/eslint-plugin-app`，
   不要再往 `check-rn-boundaries` 写「某文件必须包含某字符串」。
3. 若要继续减体积：`lodash` 走 patch-package 方案评估，或给 bundle 加体积预算门禁（P2）。