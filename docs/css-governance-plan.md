# Taro RN 样式治理方案

生成日期：2026-07-11

适用范围：`apps/com.deppon.app`

## 1. 结论

当前项目不需要更换样式技术栈，适合继续使用 SCSS，但要把它收敛为一套受限的 Taro RN 样式体系：

> 语义 token + 声明型 mixin + 自带 SCSS 的共享 React 组件 + 页面级扁平 BEM + Native token 通道 + 存量债务基线。

本项目现阶段不建议开启 CSS Modules，也不建议引入 Tailwind、styled-components 或新的 UI 主题库。现有页面前缀和 BEM 已经基本避免类名碰撞，真正的问题是硬编码值、重复 UI 模式、巨型页面 SCSS 和原生属性颜色没有统一入口。

治理采用增量策略：不批量替换现有约 1.2 万行样式，不因为变量统一而制造大面积视觉回归；先冻结存量，再要求所有新增代码进入受治理区，最后随业务修改逐页迁移。

## 2. 项目基线

以下是本次治理开始前的样式基线：

| 指标                     |        数值 |
| ------------------------ | ----------: |
| SCSS 文件                |          56 |
| 物理行数                 |      12,129 |
| 页面及共享组件 SCSS      |          51 |
| 已接入 token 的业务 SCSS | 6，约 11.8% |
| 十六进制颜色字面量       |       1,396 |
| `font-size` 字面量       |         662 |
| `line-height` 字面量     |         210 |
| `border-radius` 字面量   |         272 |
| TS/TSX 颜色字面量        |          37 |

业务样式主要集中在订单、寄件、发票和查询模块，四个目录合计约占全部样式的 57%。

### 2.1 最重的样式文件

| 文件                              | 行数 |
| --------------------------------- | ---: |
| `pages/order/detail/index.scss`   |  806 |
| `pages/express/index.scss`        |  752 |
| `pages/order/stub/index.scss`     |  681 |
| `pages/invoice/index/index.scss`  |  470 |
| `pages/order/list/index.scss`     |  388 |
| `pages/payment/list/index.scss`   |  380 |
| `pages/coupon/list/index.scss`    |  362 |
| `pages/invoice/detail/index.scss` |  326 |
| `pages/query/price/index.scss`    |  325 |
| `pages/mine/index.scss`           |  314 |

### 2.2 已经形成的视觉事实

项目不是没有设计规律，而是规律仍停留在复制粘贴中。

高频颜色：

| 颜色      | 主要语义       | 业务出现次数 |
| --------- | -------------- | -----------: |
| `#16181a` | 标题、主文字   |          208 |
| `#ffffff` | 卡片、反色文字 |          194 |
| `#667085` | 辅助文字       |          178 |
| `#1a5eff` | 品牌、主操作   |          170 |
| `#eef2f6` | 弱背景、弱边框 |           83 |
| `#f8fafc` | 次级表面       |           58 |
| `#475467` | 标签文字       |           48 |
| `#e8efff` | 品牌浅色背景   |           44 |
| `#344054` | 正文、图标     |           41 |
| `#f5f7fb` | 页面背景       |           36 |

高频字号为 `22px`、`23px`、`24px`、`25px`、`30px`、`42px`；`8px` 圆角占普通圆角声明约 90%。这意味着当前 `_tokens.scss` 的方向正确，但卡片 `16px`、按钮胶囊圆角等早期抽象与真实页面不一致，不能直接批量套用。

### 2.3 重复 UI 模式

| 模式         | 典型声明                            |  覆盖范围 |
| ------------ | ----------------------------------- | --------: |
| 品牌操作文字 | `#1a5eff / 24px / 700`              | 39 个文件 |
| 区块标题     | `#16181a / 30px / 700`              | 30 个文件 |
| 页头         | 白底，`32px 24px 24px`              | 32 个文件 |
| 页头标题     | `42px / #16181a / margin-top: 12px` | 30 个文件 |
| 页头描述     | `25px / 38px / #667085`             | 31 个文件 |
| 卡片壳       | `20px 24px 0 / 24px / #fff / 8px`   | 26 个文件 |
| 页面壳       | `min-height: 100% / #f5f7fb`        | 21 个文件 |

### 2.4 当前基础的优点

- `app.scss` 已经是统一入口。
- `src/styles` 已存在 token、mixin 和组件原型。
- 页面类名总体采用扁平 BEM，没有发现跨文件同名冲突。
- `check-rn-boundaries` 已禁止组合选择器、Grid、fixed/sticky、`box-shadow`、`background-image` 等 RN 不可靠写法。
- 页面没有使用 `!important`、CSS 变量、媒体查询或复杂 Sass 嵌套。

### 2.5 当前基础的缺口

- 51 个业务样式文件中只有 6 个引入 token。
- `.dp-*` 全局类没有业务 TSX 使用，不能构成真实复用层。
- 15 个页面子组件仍导入父级 `../index.scss`，组件与 300 至 800 行页面样式强耦合。
- CSS Modules 关闭，类名处于全局作用域；部分 `template-list-*`、`subscriptions-*` 前缀仍不完整。
- 图标、SafeArea、弹窗配置等 TSX 原生属性仍有颜色硬编码。
- Stylelint 虽已安装，但此前没有配置、命令或 CI 门禁。

## 3. 目标架构

当前阶段保持目录简单，不为 40 至 80 个 token 引入复杂生成系统。

```text
src/styles/
  _tokens.scss          # SCSS 语义 token，唯一允许集中声明 SCSS 视觉值的文件
  nativeTokens.ts       # 图标、SafeArea、原生组件属性使用的颜色 token
  _mixins.scss          # 只包含声明块，不输出选择器
  _components.scss      # 早期全局类原型，停止扩张，逐步由 App* 组件替代
  index.scss            # 只 @forward token/mixin，不输出全局工具类

src/shared/components/
  AppPageHeader/
    index.tsx
    index.scss
  AppButton/
  AppStatusTag/
  AppEmptyState/
  AppLoadingState/
  AppOverlay/
  AppFormField/
```

分层职责：

| 层               | 允许内容                                         | 禁止内容                   |
| ---------------- | ------------------------------------------------ | -------------------------- |
| Token            | 颜色、字号、行高、字重、间距、圆角、稳定控件尺寸 | 页面类名、业务布局         |
| Mixin            | 至少三处重复的声明组合                           | 输出全局选择器、业务状态   |
| Shared component | 稳定 UI 结构、交互状态、自有 SCSS                | 万能配置组件、领域业务流程 |
| Page component   | 页面区域布局、领域特有视觉                       | 重复定义全局视觉语义       |
| Native style     | 动态值、原生组件属性、平台差异                   | 静态颜色散落在 TSX         |

## 4. Token 规则

### 4.1 必须 token 化

- 所有静态颜色：文字、背景、边框、品牌色、状态色、遮罩色。
- 字号、行高、通用字重。
- 页面级间距、卡片间距、表单间距等稳定节奏。
- 通用圆角、卡片圆角、按钮圆角。
- 稳定控件高度，例如主按钮、紧凑按钮。

### 4.2 可以保留局部值

- 图标、二维码、头像等与组件几何严格绑定的宽高。
- 绝对定位偏移和装饰元素尺寸。
- 运行时百分比、进度条宽度。
- 只出现一次且没有设计语义的业务布局尺寸。

局部值不等于任意硬编码。颜色和文字规格无论出现次数多少，都必须进入 token；布局几何只有在跨模块复用时才升级为 token。

### 4.3 命名方式

使用语义名称，不使用颜色名称或页面名称：

```scss
// 推荐
$dp-color-text-heading: #16181a;
$dp-color-status-warning-bg: #fff7ed;
$dp-card-radius: $dp-radius-sm;

// 不推荐
$dp-color-gray-900: #16181a;
$invoice-warning-bg: #fff7ed;
$dp-radius-8: 8px;
```

旧的 `$dp-color-text-primary`、`secondary`、`muted` 暂时保留为兼容别名，新代码使用 `heading`、`body`、`supporting`、`placeholder` 等明确角色。

### 4.4 SCSS 与 Native 通道

页面 SCSS：

```scss
@use '../../../styles/tokens' as *;

.order-detail-page {
  background: $dp-color-bg-page;
}

.order-detail-header__title {
  color: $dp-color-text-heading;
  font-size: $dp-font-size-page-title;
  font-weight: $dp-font-weight-bold;
  line-height: $dp-line-height-page-title;
}
```

原生属性：

```tsx
import { APP_STYLE_COLORS } from '@/styles/nativeTokens'

;<AppIcon color={APP_STYLE_COLORS.text.heading} name='phone' size={24} />
```

SCSS 的 `px` 会按 `designWidth: 750` 转换，TSX 中图标尺寸等数字是 RN dp。颜色可以共用语义，尺寸不能直接共用同一份数值 token。

## 5. 选择器和命名规则

Taro RN 继续使用扁平、单类选择器：

```scss
.order-detail-card {
}
.order-detail-card__title {
}
.order-detail-card__status--warning {
}
```

禁止：

```scss
.order-detail-card .title {
}
.order-detail-card.active {
}
View.order-detail-card {
}
#order-detail {
}
.order-detail-card:hover {
}
```

命名空间固定为：

- 页面：完整路由域前缀，例如 `express-template-list-*`、`order-subscriptions-*`。
- 共享组件：`app-{component}__element--modifier`。
- Sass token 和 mixin：`$dp-*`、`dp-*`。
- `.dp-*` 全局类：视为 legacy，不再新增。

文字样式必须直接挂到 `Text` 对应类上，不依赖 Web 式继承。安全区继续由 `AppSafeAreaView` 管理，不使用 `env(safe-area-inset-*)`。阴影、浮层层级和平台差异进入共享 native/component 层，不散落在页面 SCSS。

## 6. 共享组件策略

共享视觉必须同时满足以下条件才升级为 `shared/components`：

- 至少三个页面重复。
- 结构和状态稳定。
- 抽取后能减少业务页面判断，而不只是移动 CSS。

优先组件：

| 组件                   | 首批迁移域 | 说明                                   |
| ---------------------- | ---------- | -------------------------------------- |
| `AppPageHeader`        | 发票       | `label/title/description/action`       |
| `AppStatusTag`         | 发票、订单 | `brand/success/warning/danger/neutral` |
| `AppEmptyState`        | 发票、订单 | 图片、标题、描述、操作、紧凑模式       |
| `AppLoadingState`      | 订单、发票 | 页级和列表尾部两种尺寸                 |
| `AppButton`            | 订单、发票 | variant、tone、size、loading、disabled |
| `AppOverlay/AppDialog` | 订单、发票 | center/bottom，统一遮罩和 actions      |
| `AppFormField`         | 发票、寄件 | 只统一 surface/inline 两种稳定外观     |

寄件页带价格的提交条、订单详情动作区等领域组件不要硬塞进通用组件。

## 7. 文件归属规则

- 页面 `index.scss` 只保留页面容器、区域排列和页面级浮层位置。
- 独立 block 拆成同目录 `Component.tsx + Component.scss`，组件只导入自己的样式。
- 同页多个组件共享少量基础声明时，可增加 `_shared.scss`；不要让多个子组件继续导入 400 至 800 行的父级 `index.scss`。
- 新页面 SCSS 建议不超过 300 行，共享组件 SCSS 建议不超过 180 行。
- 旧巨型文件先冻结体量，随业务切片拆分，不为行数机械拆文件。

## 8. 自动治理闭环

本次已经建立两层检查。

### 8.1 Stylelint

命令：

```bash
pnpm lint:app:styles
```

检查内容：

- 扁平 BEM 类名。
- 禁止 ID、标签、属性、伪类、通配符和组合选择器。
- 禁止 `!important` 和重复属性。
- 禁止 `float`、`inset`、`background-image`、`box-shadow`。
- 禁止 `rem`、`em`、`vw`、`vh` 等 Web 响应式单位。
- 校验颜色和单位语法。

`check-rn-boundaries` 继续负责项目已有的 RN 平台边界，两者职责互补。

### 8.2 存量债务基线

命令：

```bash
pnpm check:app-styles
```

基线文件：`apps/com.deppon.app/scripts/style-governance-baseline.json`。

策略：

- 现有 51 个业务 SCSS 允许继续存在，但颜色、字号、行高、圆角字面量总数不能增加。
- 已进入 managed 清单的 6 个文件不能移除 token 引入。
- 新增 SCSS 必须引入 token，且颜色、字号、行高、圆角字面量必须为零。
- 新增 TS/TSX 文件不得增加静态颜色字面量，必须使用 `nativeTokens.ts`。
- `src/styles` 中只有 `_tokens.scss` 可以直接声明 SCSS 颜色。
- 禁止重新引入 Sass `@import`。

这是一种 ratchet 机制：允许存量逐步减少，不要求一次性清零，也不允许债务反弹。基线只能在明确完成迁移并经过代码审查后下调，不能为了让 CI 通过而上调。

两项检查已经进入 App 的 `verify` 链路。

## 9. 迁移计划

### 阶段 0：门禁和语义校正

状态：已完成。

- 补充真实业务需要的文字、表面、边框、品牌浅色和状态色 token。
- 将卡片、按钮圆角修正为项目事实标准 `8px`。
- 增加 `nativeTokens.ts`。
- 配置 Stylelint。
- 增加样式治理基线并接入 `verify`。
- 停止从全局入口输出未使用的 `.dp-*` 类。

### 阶段 1：清理 managed 文件

先处理当前已接入 token 的 6 个文件，消除其中剩余的状态色、字号和圆角字面量：

- `courier/detail`
- `courier/list`
- `express/template/create`
- `express/template/list`
- `order/edit`
- `order/subscriptions`

完成后下调 baseline，使这些文件成为零视觉字面量样板。

### 阶段 2：发票域试点

发票页面结构重复高、业务边界清楚，适合作为第一批组件化试点：

- 落地 `AppPageHeader`、`AppStatusTag`、`AppEmptyState`、`AppLoadingState`。
- 迁移 `invoice/index`、`invoice/detail`、`invoice/apply`。
- 将 `InvoiceCenterSections.tsx` 按 Header、Search、Summary、Card、State 拆分。
- 目标：发票主页面 SCSS 控制在 250 至 300 行。

### 阶段 3：订单域高频交互

- 落地 `AppButton`、`AppOverlay/AppDialog`。
- 优先迁移 `order/list` 和 `order/detail` 的按钮、状态、空态、弹层。
- 将订单卡片、详情区块、动作区样式归属到对应组件。
- 不在同一次修改中重做视觉和业务逻辑。

### 阶段 4：寄件和表单

- 先迁移 `express/template/*` 已有 managed 页面。
- 再落地 `AppFormField` 的 `surface` 和 `inline` 两种模式。
- `express/index.scss` 按 Contact、Goods、Service、Quote、SubmitBar 拆分。
- 寄件业务 section 保持领域组件，不抽成万能配置组件。

### 阶段 5：体量门禁

当主要模块完成拆分后，再启用严格文件预算：

- 新页面 SCSS：300 行。
- 新共享组件 SCSS：180 行。
- 旧文件使用冻结预算，修改只能持平或下降。

## 10. 验收指标

| 指标                        | 当前基线 | 第一里程碑 | 中期目标 |
| --------------------------- | -------: | ---------: | -------: |
| 业务 SCSS token 接入率      |    11.8% |        30% |      60% |
| 新 SCSS 视觉字面量          |   未限制 |          0 |        0 |
| TS/TSX 新增静态颜色         |   未限制 |          0 |        0 |
| 颜色字面量                  |    1,396 |   只降不增 | 下降 50% |
| 500 行以上 SCSS             |        3 |          2 |        0 |
| 子组件导入父级 `index.scss` |       15 |          8 |        0 |
| `.dp-*` 全局类业务依赖      |        0 |          0 |        0 |

## 11. PR 检查清单

- 新增颜色是否来自 `_tokens.scss` 或 `nativeTokens.ts`。
- 新增字号、行高、圆角是否使用 token。
- 类名是否使用完整页面或 `app-*` 前缀。
- 是否只使用单类、扁平选择器。
- 静态样式是否误写进 TSX 内联对象。
- 子组件是否拥有自己的 SCSS，而不是继续扩大父页面文件。
- 新抽象是否至少有三个稳定消费者。
- 是否同时修改了视觉和业务逻辑；若是，应拆分提交或补充截图验证。
- `pnpm lint:app:styles`、`pnpm check:app-styles`、`pnpm check:app-boundaries` 是否通过。

## 12. 明确不做的事情

- 不一次性替换 1.2 万行旧 SCSS。
- 不把所有 `14px`、`18px` 等值机械转换成全局 token。
- 不继续扩张未被组件承载的全局 `.dp-*` 工具类。
- 不在当前阶段全量开启 CSS Modules。
- 不引入 Tailwind、styled-components 或另一套主题运行时。
- 不用 CSS 处理安全区、跨端阴影或原生平台差异。

最终目标不是让所有页面共享同一份 CSS，而是让同一种视觉语义只有一个来源、同一种稳定 UI 模式只有一个组件实现，并且任何新增样式债务都能在 CI 中被发现。
