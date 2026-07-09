# 怎么看懂这个项目

生成日期：2026-07-09

这份文档给第一次接触这个仓库的人看。它不讲每个业务细节，而是告诉你按什么顺序读代码、每一层负责什么、遇到一个功能时应该从哪里追到哪里。

## 先知道这个项目在做什么

这是一个德邦快递 Android/iOS App 的 Taro React Native 重构工程。旧 Taro 小程序项目只作为业务语义和接口契约参考，当前项目不再面向微信、支付宝或 H5 多端构建。

你可以先记住一句话：

> 这是一个 RN-only 的 Taro App，业务从页面进入，经 service 编排，再走 request 请求层；扫码、定位、支付、电话、文件、分享、埋点等平台能力都必须经过 `shared/platform`。

当前主要应用在：

```text
apps/com.deppon.app
```

仓库根目录主要负责 workspace、脚本、CI 和工程文档：

```text
package.json
pnpm-workspace.yaml
README.md
docs/
```

## 先读这几个文件

按这个顺序读，能最快建立项目地图。

1. 读根目录 `README.md`

   它告诉你这个仓库是什么、需要什么 Node/pnpm 版本、常用命令是什么、CI 跑什么。

2. 读 `apps/com.deppon.app/readme.md`

   它是 App 级开发规范，里面说明了 RN-only 边界、目录分层、路由规则、样式规则、体量门禁、迁移旧项目的规则。

3. 读 `apps/com.deppon.app/src/app.ts`

   这是 App 入口。它挂载页面，并在 `componentDidMount` 里调用 `bootstrapAppRuntime()`。

4. 读 `apps/com.deppon.app/src/app.bootstrap.ts`

   这里配置请求 baseURL、timeout，并监听登录失效事件。理解这个文件，你就知道 App 启动后全局运行时做了什么。

5. 读 `apps/com.deppon.app/src/shared/navigation/routeRegistry.ts`

   这是路由单源。所有页面路径、标题、主入口、登录要求都从这里开始。

6. 读 `apps/com.deppon.app/src/request/deppon.ts`

   这是德邦 OWS 接口的请求封装。业务 service 大多会通过 `depponHttp` 调接口。

7. 读一个简单页面，例如 `apps/com.deppon.app/src/pages/home/index.tsx`

   首页能展示页面、组件、静态入口数据、路由跳转、扫码入口和隐私弹窗的基本写法。

8. 再读一个复杂业务，例如订单列表：

   ```text
   src/pages/order/list/index.tsx
   src/services/order/order.service.ts
   src/services/order/order.api.ts
   src/services/order/order.mapper.ts
   src/services/order/types.ts
   ```

   这样你能看到页面如何调用 service，service 如何调 api，api 如何走请求层。

## 看懂启动链路

启动链路很短：

```text
src/app.ts
  -> bootstrapAppRuntime()
    -> configureRequest()
    -> onRequestEvent('authExpired')
```

关键文件：

```text
src/app.ts
src/app.bootstrap.ts
src/shared/config/runtime.ts
src/request/index.ts
src/request/events.ts
src/services/auth/session.ts
```

你需要理解三件事：

- `app.ts` 只做 App 生命周期入口，不写业务。
- `app.bootstrap.ts` 配置请求层和登录失效处理。
- `runtime.ts` 管理 API 域名、WebView 白名单、渠道码、系统码等运行时配置。

如果你想改接口域名、WebView host、渠道码，不要去页面里搜字符串，先看：

```text
src/shared/config/runtime.ts
apps/com.deppon.app/.env.example
scripts/check-runtime-config.mjs
```

## 看懂路由体系

路由从一个文件开始：

```text
src/shared/navigation/routeRegistry.ts
```

它声明每个页面：

```ts
{
  name: 'orderList',
  title: '查快递',
  path: 'pages/order/list/index',
  main: true,
  loginRequired: true
}
```

然后派生出：

```text
src/app.config.ts                    Taro 页面列表
src/shared/navigation/routes.ts      APP_ROUTES 和主导航
src/shared/navigation/appNavigation.ts 登录守卫和跳转
```

所以新增页面时，不要先去 `app.config.ts` 手写页面路径。正确顺序是：

1. 在 `routeRegistry.ts` 注册页面。
2. 创建 `src/pages/.../index.tsx`。
3. 页面跳转使用 `APP_ROUTES` 和 `navigateToAppRoute`。
4. 需要 query 时使用 `createAppRouteUrl`。
5. 跑 `pnpm check:app-routes`。

动态 query 不要自己拼：

```ts
// 推荐
createAppRouteUrl(APP_ROUTES.orderDetail, {
  waybillNumber,
  source: 'HOME_SEARCH'
})
```

不要这样写：

```ts
;`${APP_ROUTES.orderDetail}?waybillNumber=${waybillNumber}`
```

相关文件：

```text
src/shared/navigation/routeRegistry.ts
src/shared/navigation/routes.ts
src/shared/navigation/appNavigation.ts
src/shared/navigation/authGuard.ts
src/shared/navigation/routeUrl.ts
scripts/check-route-registry.mjs
```

## 看懂请求链路

请求分两层。

第一层是通用 HTTP：

```text
src/request/index.ts
```

它负责：

- 拼 baseURL。
- 设置 header。
- 调 `Taro.request`。
- 处理 HTTP 错误。
- 支持 `transformResponse`。

第二层是德邦 OWS 请求：

```text
src/request/deppon.ts
```

它负责：

- 带上 `ECO_TOKEN` cookie。
- 保存响应里的 cookie。
- 归一 OWS 的 `status`。
- 允许 `401` 和 `429` 进入业务归一逻辑。
- 登录失效时发出 `authExpired` 事件。
- 限流时发出 `rateLimited` 事件。

一次典型请求是这样走的：

```text
页面
  -> services/<domain>/<domain>.service.ts
    -> services/<domain>/<domain>.api.ts
      -> request/deppon.ts 的 depponHttp
        -> request/index.ts 的 http
          -> Taro.request
```

例如登录：

```text
pages/login/index.tsx
  -> services/auth/auth.service.ts
    -> services/auth/auth.api.ts
      -> depponHttp.post('/gwapi/userService/eco/user/login')
```

读请求层时顺带看这些文件：

```text
src/request/cookieJar.ts
src/request/cookie.rules.ts
src/request/deppon.rules.ts
src/request/events.ts
src/services/serviceResponse.ts
```

## 看懂登录态和权限

登录态的核心证据是 `ECO_TOKEN` cookie。

关键文件：

```text
src/services/auth/session.ts
src/services/auth/auth.service.ts
src/services/auth/auth.api.ts
src/shared/navigation/authGuard.ts
src/shared/navigation/appNavigation.ts
```

你可以按这条线看：

```text
登录页提交手机号验证码
  -> authService.loginWithSms()
    -> authApi.login()
      -> depponHttp 保存 ECO_TOKEN
      -> saveCurrentUser()
```

受保护页面跳转时：

```text
navigateToAppRoute()
  -> 判断 routeRegistry 中的 loginRequired
  -> ensureAuthenticated()
  -> 没有 ECO_TOKEN 就 navigateToLogin()
```

请求返回登录失效时：

```text
deppon.ts
  -> emitRequestEvent('authExpired')
  -> app.bootstrap.ts 监听事件
  -> clearAppSession()
  -> navigateToLogin()
```

所以不要在页面里自己判断各种登录状态。优先使用：

```text
ensureAuthenticated()
navigateToAppRoute()
hasValidSession()
authService
```

## 看懂页面和业务 service 的关系

页面在：

```text
src/pages
```

业务能力在：

```text
src/services
```

这个项目的基本约定是：

- 页面负责页面状态、用户交互和渲染。
- service 负责业务编排、校验、数据转换和跨接口流程。
- api 文件只放接口调用。
- types 文件放接口类型和页面 VM 类型。
- mapper/rules/useCases/viewModel 文件用于拆复杂领域。

一个业务模块通常长这样：

```text
services/order/
  order.api.ts             接口调用
  order.service.ts         对页面暴露的订单服务
  order.mapper.ts          后端数据转前端结构
  order.detailActions.ts   订单详情动作 VM
  order.detailRules.ts     订单详情规则
  order.detailUseCases.ts  催单、通知派送、作废等用例
  order.stub*.ts           电子存根相关拆分
  types.ts                 类型
  index.ts                 对外导出
```

如果你看一个功能，建议从页面入口追：

```text
pages/order/list/index.tsx
  -> orderService.queryList()
    -> orderApi.querySenderList() / queryConsigneeList()
    -> normalizeSenderOrder() / normalizeConsigneeOrder()
```

如果你要改接口字段，通常先看：

```text
services/<domain>/types.ts
services/<domain>/<domain>.api.ts
services/<domain>/*.mapper.ts
```

如果你要改页面展示文案或按钮显隐，通常先看：

```text
services/<domain>/*.rules.ts
services/<domain>/*Actions.ts
services/<domain>/*View.ts
pages/<domain>/...
```

## 看懂当前业务模块

可以把业务按领域分成几组。

### 入口和基础账户

```text
pages/home
pages/login
pages/mine
pages/account
pages/privacy

services/auth
services/account
services/privacy
```

这组负责首页、登录、我的、账号设置、隐私设置。

### 寄件和地址

```text
pages/express
pages/contact
pages/batch

services/express
services/contact
services/batch
services/goods
```

这组负责单票寄件、地址簿、批量寄、货物查询、价格和保价等寄件相关能力。

寄件页比较复杂。先看：

```text
pages/express/index.tsx
pages/express/components/
services/express/express.draft.ts
services/express/express.service.ts
services/express/express.payload.ts
services/express/valueAdded.ts
services/express/monthlyPay.ts
```

### 订单和支付

```text
pages/order
pages/payment

services/order
services/payment
```

这组负责订单列表、订单详情、取消订单、电子存根、待支付。

订单是最适合学习项目分层的模块，因为它已经拆出 mapper、rules、useCases、actions。

### 发票

```text
pages/invoice
services/invoice
```

发票模块已经拆出：

```text
invoice.apply.ts
invoice.history.ts
invoice.taxpayer.ts
invoice.shared.ts
order.mapper.ts
orderSearch.service.ts
```

读发票时不要只看 `invoice.service.ts`，很多逻辑已经分到这些文件里。

### 查询、客服和会员

```text
pages/query
pages/support
pages/customer
pages/member
pages/coupon
pages/ecard
pages/sign

services/query
services/support
services/customer
services/member
services/coupon
services/ecard
services/sign
```

这组多是工具型入口和中心页。它们适合学习“页面如何展示 service 返回的 VM”。

### 打印和平台能力待接入

```text
pages/print
services/print
shared/platform
```

打印、扫码、支付、定位、文件、分享、埋点等很多能力还处在 App 原生能力待接入阶段。页面会展示明确降级或待接入提示，不会伪造成功。

## 看懂平台能力

平台能力统一在：

```text
src/shared/platform
```

这里的文件代表 App 可能需要的原生能力：

```text
analytics.ts
capabilities.ts
clipboard.ts
externalApp.ts
files.ts
location.ts
map.ts
notifications.ts
payment.ts
phone.ts
realName.ts
scan.ts
share.ts
```

`capabilities.ts` 是能力矩阵。当前只有部分能力 ready，例如电话能力；扫码、支付、定位、打印、文件、分享等多数能力还是 pending。

业务页面不应该直接使用：

```text
Taro.scanCode
Taro.makePhoneCall
Taro.getLocation
Taro.uploadFile
NativeModules
Linking
PermissionsAndroid
Share.share
Alert.alert
```

如果你要接入一个原生能力，先看对应 facade。例如扫码：

```text
src/shared/platform/scan.ts
```

首页扫码不会直接打开相机逻辑，而是调用：

```text
scanAppCode('HOME_SEARCH')
```

然后按扫码结果分流：

- 运单号进入订单详情。
- `printId` 云打印码进入面单打印中心。
- 其他业务二维码给出暂不支持提示。

## 看懂 WebView 承接

WebView 入口统一在：

```text
src/shared/webview/appWeb.ts
```

它负责：

- 登记所有 H5 来源 `APP_WEB_TARGETS`。
- 根据 source 生成 WebView 路由。
- 把相对路径拼成绝对 H5 URL。
- 检查 URL 是否在白名单内。
- 控制是否需要登录态。

页面不要直接跳：

```text
APP_ROUTES.web
```

而是使用：

```ts
createAppWebUrl({
  source: 'SUPPORT_ONLINE_SERVICE'
})
```

真正渲染 WebView 的页面在：

```text
src/pages/web/index.tsx
```

## 看懂样式体系

全局样式入口：

```text
src/app.scss
```

它引入：

```text
src/styles/index.scss
```

样式基础层在：

```text
src/styles/_tokens.scss      颜色、字号、间距、圆角
src/styles/_mixins.scss      页面、卡片、标题、正文、按钮 mixin
src/styles/_components.scss  dp-page、dp-card、dp-button、dp-empty 等通用类
```

页面样式仍然放在对应页面目录：

```text
pages/order/list/index.scss
pages/express/index.scss
```

看样式时先判断：

- 是全局通用视觉规则吗？看 `src/styles`。
- 是某个页面独有布局吗？看页面自己的 `index.scss`。
- 是跨页面复用组件吗？看 `shared/components`。

新增页面时，优先使用 token 和通用类，不要继续在页面里散落主色、文本色、圆角、字号。

## 看懂工程门禁

项目不是只靠人约定，很多规则由脚本守住。

根目录常用命令：

```bash
pnpm verify:app
pnpm check:app-boundaries
pnpm check:app-routes
pnpm check:app-module-size
pnpm check:app-runtime-config
pnpm check:app-business-rules
pnpm check:app-native-env
```

脚本在：

```text
apps/com.deppon.app/scripts
```

重点理解这些：

```text
check-rn-boundaries.mjs      阻止小程序 API、H5 插件、RN 原生直调回流
check-route-registry.mjs     检查路由注册表和页面文件
check-module-size.mjs        检查页面和 service 文件体量
check-runtime-config.mjs     检查生产配置和 token 硬编码
check-business-rules.cjs     跑一批纯业务规则断言
check-native-env.mjs         检查 Android/iOS 本地构建环境
```

如果你改的是业务规则，尤其是订单、寄件、发票、扫码、打印、批量寄，记得看 `check-business-rules.cjs` 有没有对应断言。这个文件相当于轻量测试入口。

## 调试一个功能时怎么追代码

用“运单查询”举例。

1. 入口在首页搜索组件：

   ```text
   src/pages/home/components/search/index.tsx
   ```

2. 输入运单号后构造订单详情路由：

   ```text
   createAppRouteUrl(APP_ROUTES.orderDetail, {
     waybillNumber,
     source: 'HOME_SEARCH'
   })
   ```

3. 跳到订单详情：

   ```text
   src/pages/order/detail/index.tsx
   ```

4. 订单详情调用订单 service：

   ```text
   services/order/order.service.ts
   ```

5. service 调接口：

   ```text
   services/order/order.api.ts
   ```

6. api 走请求层：

   ```text
   request/deppon.ts
   request/index.ts
   ```

7. 后端返回后，mapper 转换成页面需要的结构：

   ```text
   services/order/order.mapper.ts
   ```

8. 页面根据返回结果渲染。

大多数功能都可以按这个套路追：

```text
页面入口
  -> 页面事件
  -> service
  -> api
  -> request
  -> mapper/rules/useCases
  -> 页面渲染
```

## 改代码前先判断你在改哪一层

这是读懂项目后最重要的习惯。

如果你在改接口地址或入参：

```text
services/<domain>/<domain>.api.ts
services/<domain>/types.ts
```

如果你在改后端字段到页面字段的转换：

```text
services/<domain>/*.mapper.ts
```

如果你在改按钮是否展示、状态文案、金额格式、校验：

```text
services/<domain>/*.rules.ts
services/<domain>/*Actions.ts
services/<domain>/*View.ts
```

如果你在改页面布局：

```text
pages/<domain>/.../index.tsx
pages/<domain>/.../components/
pages/<domain>/.../index.scss
```

如果你在改扫码、定位、电话、支付、文件、分享、埋点：

```text
shared/platform
```

如果你在改 H5 承接：

```text
shared/webview/appWeb.ts
pages/web/index.tsx
```

如果你在改路由：

```text
shared/navigation/routeRegistry.ts
shared/navigation/routeUrl.ts
```

## 新增一个页面时怎么做

按这个顺序：

1. 在 `routeRegistry.ts` 注册页面。
2. 新建 `pages/<module>/<page>/index.tsx`。
3. 如果需要页面配置，新建 `index.config.ts`。
4. 如果需要样式，新建 `index.scss`，优先使用 `src/styles` token。
5. 页面跳转用 `APP_ROUTES` 和 `navigateToAppRoute`。
6. query 用 `createAppRouteUrl`。
7. 需要登录就给路由加 `loginRequired: true`。
8. 跑：

   ```bash
   pnpm check:app-routes
   pnpm check:app-boundaries
   pnpm check:app-module-size
   ```

## 新增一个业务接口时怎么做

按这个顺序：

1. 在 `services/<domain>/types.ts` 定义请求和响应类型。
2. 在 `services/<domain>/<domain>.api.ts` 增加接口函数。
3. 在 service、mapper、rules 或 useCase 中编排业务。
4. 页面只调用 service，不直接调用 api。
5. 如果是稳定业务规则，补到 `check-business-rules.cjs`。
6. 跑：

   ```bash
   pnpm typecheck:app
   pnpm lint:app
   pnpm check:app-business-rules
   ```

## 不要从这些地方开始读

刚接手时，不建议先读：

- `android/` 和 `ios/`：除非你正在处理原生构建或能力接入。
- `pnpm-lock.yaml`：只有处理依赖时再看。
- 超大的页面文件细节：先读 service 和 mapper，建立业务概念后再回到页面。
- 旧项目迁移计划全文：`docs/rn-refactor-plan.md` 信息很多，适合查背景，不适合作为第一阅读入口。

## 推荐阅读路线

如果你只有 30 分钟：

1. `README.md`
2. `apps/com.deppon.app/readme.md`
3. `src/app.ts`
4. `src/app.bootstrap.ts`
5. `src/shared/navigation/routeRegistry.ts`
6. `src/pages/home/index.tsx`

如果你有半天：

1. 读上面 30 分钟路线。
2. 读 `request/index.ts` 和 `request/deppon.ts`。
3. 读 `services/auth` 和 `shared/navigation/authGuard.ts`。
4. 读 `pages/order/list/index.tsx` 和 `services/order`。
5. 读 `shared/platform/scan.ts` 和首页搜索组件。

如果你要开始做需求：

1. 先找到对应页面。
2. 找页面调用的 service。
3. 找 service 对应的 api、mapper、rules、useCases。
4. 判断是否涉及平台能力或 WebView。
5. 修改后跑对应检查脚本。

## 最后记住这几条

- 路由看 `routeRegistry.ts`。
- 接口看 `services/<domain>/*.api.ts`。
- 业务编排看 `services/<domain>/*.service.ts` 和 `useCases.ts`。
- 数据转换看 `mapper.ts`。
- 业务规则看 `rules.ts`、`Actions.ts`、`View.ts`。
- 平台能力看 `shared/platform`。
- H5 承接看 `shared/webview/appWeb.ts`。
- 样式基础看 `src/styles`。
- 工程约束看 `scripts/check-*.mjs` 和 `check-business-rules.cjs`。

顺着这些入口读，这个项目会从“一堆页面和服务”变成几条清晰的线：启动线、路由线、请求线、业务线、平台能力线和工程门禁线。
