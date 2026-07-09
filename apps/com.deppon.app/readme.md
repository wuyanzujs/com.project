# 德邦快递 RN App

这是当前工作区的 Taro React Native App，目标运行端是 Android/iOS App，不再构建微信、支付宝或其他小程序端。旧项目 `D:\10531845\Desktop\CZH-DEV\mp-taro3` 只作为业务语义和接口契约参考，迁移时必须重构为 RN App 的分层实现。

## 环境要求

- Node.js: `24.13.0`
- pnpm: `11.9.0`
- Android: JDK、Android SDK、Gradle 环境按 `pnpm check:app-native-env` 输出补齐
- iOS: 需要 macOS、Xcode、CocoaPods

根目录已声明 `packageManager`、`engines` 和 `.node-version`。团队本地、CI、打包机应使用同一套 Node/pnpm 版本。

## 常用命令

在仓库根目录执行：

```bash
pnpm install
pnpm dev:app
pnpm build:app
pnpm verify:app
pnpm check:app-boundaries
pnpm check:app-routes
pnpm check:app-module-size
pnpm check:app-runtime-config
pnpm check:app-business-rules
pnpm check:app-native-env
```

在 App 包内执行：

```bash
pnpm --filter com.deppon.app run typecheck
pnpm --filter com.deppon.app run lint
pnpm --filter com.deppon.app run check:rn-boundaries
pnpm --filter com.deppon.app run check:routes
pnpm --filter com.deppon.app run check:module-size
pnpm --filter com.deppon.app run check:runtime-config
pnpm --filter com.deppon.app run check:business-rules
pnpm --filter com.deppon.app run build
```

`pnpm verify:app` 是本地和 CI 的统一质量入口，会串行执行类型检查、ESLint、RN 边界检查、路由注册表检查、页面/service 体量检查、运行时配置检查、业务规则检查和 RN bundle 构建。

根目录已新增 `.github/workflows/app-quality.yml`，push 和 pull request 会执行 `pnpm verify:app` 与 `pnpm check:app-native-env`。后续业务迁移不应绕过这条质量入口。

## 环境变量

App 包提供 [`.env.example`](/D:/codeSpace/com.project/apps/com.deppon.app/.env.example)。本地开发可使用默认测试环境配置；生产打包必须显式设置 `APP_ENV=production` 并提供 API、WebView 白名单和渠道码等变量。

`pnpm check:app-runtime-config` 会检查：

- `runtime.ts` 不硬编码 `token=` 参数。
- `APP_ENV=production` 时关键环境变量必须存在。
- 生产 URL 必须使用 `https`。
- 生产 WebView URL 的 host 必须进入 `APP_WEB_ALLOWED_HOSTS`。
- `APP_SERVICE_WEB_URL` 不能携带固定 `token` 查询参数。

可选配置：

- `APP_SURVEY_CONFIG_KEY`：客服中心“体验调研”配置中心 key，默认 `app_survey_config`。

## RN-only 边界

当前 App 包已删除小程序 IDE 配置文件，`TARO_ENV` 类型也收窄为 `rn`。Android/iOS 原生身份必须保持一致：

- Taro RN `appName`: `DepponApp`
- Android `namespace` / `applicationId` / fastlane `package_name`: `com.deppon.app`
- iOS Bundle ID: `com.deppon.app`
- Android/iOS 展示名：`德邦快递`

Taro RN 依赖的 Expo autolinking 需要 `expo` 作为 App 显式依赖。Android `settings.gradle` 和 iOS `Podfile` 已通过 `@tarojs/taro-rn` 定位 Expo 脚本，避免 pnpm workspace 下解析到错误路径。

业务代码不能直接使用小程序或 H5 平台能力，包括：

- `wx.*`
- `my.*`
- `process.env.TARO_ENV` / `Taro.getEnv` 多端分支
- `Taro.scanCode`
- `Taro.getLocation`
- `Taro.openLocation`
- `Taro.makePhoneCall`
- `Taro.uploadFile`
- `Taro.downloadFile`
- `Taro.requestSubscribeMessage`
- `useShareAppMessage/useShareTimeline/onShareAppMessage`
- 小程序组件 `openType`
- `Taro.navigateToMiniProgram`
- `Taro.chooseImage/chooseMedia/chooseVideo`
- `Taro.getUserProfile/authorize/getSetting/openSetting`
- `Taro.saveImageToPhotosAlbum`
- `Taro.setClipboardData/getClipboardData`
- `Taro.previewImage`
- `Taro.openDocument`
- 蓝牙打印、云打印码和外部设备直连逻辑
- 旧项目 `EVENT_TRACK` / `sensors` 小程序埋点入口
- RN `NativeModules`、`PermissionsAndroid`、`Linking`、`Share.share`、`Alert.alert`

这些能力必须先进入 `src/shared/platform/*` facade，必要时再由 `src/shared/native/*` 包装 Android/iOS 差异，最后由页面或 service 消费。`pnpm check:app-boundaries` 会阻止常见小程序 API、RN 原生能力直调、模板原生身份和小程序项目配置回流。

## 目录分层

```text
src/
  app.config.ts
  cache/
  request/
  services/
  shared/
    navigation/
    platform/
    webview/
  styles/
  pages/
```

分层规则：

- `request` 只处理 HTTP、cookie、响应归一和请求事件，不直接跳页面。
- `cache` 统一封装本地缓存 key、过期策略和 storage adapter。
- `services/<domain>/*.api.ts` 只描述接口调用。
- `services/<domain>/*.service.ts` 做业务编排，不直接写页面 UI。
- 复杂领域继续拆 `mapper.ts`、`rules.ts`、`useCases.ts`、`viewModel.ts`，避免主 service 巨石化。
- 页面只负责页面级状态、事件编排和渲染；复杂弹层、列表项、表单段落放入当前页面 `components/`。
- 平台能力只通过 `shared/platform` facade 使用。
- WebView 承接统一走 `shared/webview/appWeb.ts` 的 `createAppWebUrl`，业务代码不要直接拼 `APP_ROUTES.web` 或散落 H5 URL。
- 新增 H5 承接入口必须先登记到 `shared/webview/appWeb.ts` 的 `APP_WEB_TARGETS`，页面和 service 使用 `AppWebSource` 类型引用来源，不在静态入口数据里写任意字符串。
- 运行时域名、H5 入口、渠道码和系统码统一从 `shared/config/runtime.ts` 读取；生产值走环境变量，不在代码里写固定 token。

## 样式规则

全局样式入口是 `src/app.scss`，基础 token 和通用样式放在 `src/styles`：

- `_tokens.scss`：颜色、字号、行高、间距、圆角等设计 token。
- `_mixins.scss`：页面、卡片、标题、正文、按钮等可复用 mixin。
- `_components.scss`：`dp-page`、`dp-card`、`dp-button`、`dp-empty` 等跨页面通用类。

新增页面优先使用 token 和通用类。既有页面不做一次性大面积替换，后续在业务切片或视觉调整时逐步迁移，避免单纯为了统一变量制造大量样式噪音。

## 路由规则

路由单源在 `src/shared/navigation/routeRegistry.ts`。

新增页面时先在注册表声明：

- `name`
- `path`
- `title`
- `main`
- `loginRequired`

然后由注册表自动派生：

- `app.config.ts` 的 Taro 页面列表
- `APP_ROUTES`
- `APP_MAIN_NAVIGATION`
- `navigateToAppRoute` 的登录守卫判断

页面跳转统一使用 `navigateToAppRoute` 和 `APP_ROUTES`，不要直接维护另一份路径白名单。

首页、我的页、账号设置、客服中心这类静态入口数据中的 App 内路由应使用 `AppRoutePath` 类型，优先直接引用 `APP_ROUTES`。详情页、搜索页、WebView 等需要携带 query 的动态 URL，统一使用 `shared/navigation/routeUrl.ts` 中的 `createAppRouteUrl`、`appendRouteQuery` 或 `createRouteQuery`，不要在页面里重复复制 `createQuery`。

`pnpm check:app-boundaries` 会阻止业务代码直接写 `` `${APP_ROUTES.xxx}?` `` 或 `APP_ROUTES.xxx + '?'` 这类动态路由 query 拼接。

`pnpm check:app-routes` 会检查注册表 name/path 唯一性、页面文件存在性、主导航顺序、登录路由和派生消费关系，防止新增页面时漏改或绕过单源路由。

## 体量门禁

`pnpm check:app-module-size` 会检查 `src/pages` 和 `src/services` 下的 TypeScript 文件体量。新页面默认不超过 420 行，新 service 默认不超过 450 行。

这个门禁用于防止业务无意识膨胀，不要求为了行数强行拆分页面。若页面确实承担自然复杂的页面级编排，可以在 `scripts/check-module-size.mjs` 中记录冻结预算和原因；后续修改优先抽离有明确职责边界的 `components`、`mapper`、`rules`、`useCases` 或独立 service，避免在没有收益的情况下机械切文件。

## 业务规则检查

`pnpm check:app-business-rules` 会运行 `scripts/check-business-rules.cjs`，当前覆盖 service 失败响应形态、OWS 状态归一、`ECO_TOKEN` cookie 提取、路由 query、扫码分类、寄件草稿校验、批量寄入口/校验规则、打印中心入口/打印前置规则、发票申请校验/抬头校验/提交 payload、订单金额/重量/手机号展示和订单详情动作 VM 等纯函数规则。后续拆核心 service 时，优先把稳定的 mapper、rules、view model 用例补到这里。

## 扫码规则

首页和发票中心扫码入口统一走 `shared/platform/scan`。`scanAppCode` 会先把扫码值分类为运单、云打印码或暂不支持的业务二维码；普通运单进入订单详情或发票运单搜索，`printId` 云打印码进入面单打印中心，寄件业务二维码、短链和非德邦二维码不会被误当成普通运单。

当前不复制旧小程序里的短链网络解析、云打印小程序外跳和寄件二维码状态机。后续接入原生扫码模块时，只替换 `scanCode` 的 native bridge，页面分流规则保持在 facade 内。

## 迁移旧项目业务的规则

- 不能复制旧小程序页面和 Redux 状态机。
- 先识别旧项目里的业务语义、接口 path、字段含义和边界条件。
- 按 `api -> service/useCase -> 页面 VM -> 页面组件` 重构。
- 遇到扫码、定位、电话、文件、支付、实名、推送等平台能力，先接 `shared/platform` facade。
- 遇到支付、纸票、下载、上传、地图等原生能力未 ready 的功能，要明确降级或 H5 承接，不伪造成功。
- 每个业务切片完成后至少执行 `typecheck`、`lint`、`check:rn-boundaries`、`check:routes`、`check:module-size` 和相关业务规则检查；较大改动执行 `pnpm verify:app`。

## 批量寄边界

`pages/batch/index` 首期承接批量寄入口、规则提示、单票寄件跳转、官网 Excel 批量寄网址复制，以及多行地址文本的本地识别预览。识别出的首条可用收货人可带入当前单票寄件页继续下单；完整批量下单、Excel 文件导入和批量打印依赖地址解析、文件选择/上传和打印 native facade，后续按独立 service/API 切片接入。

批量寄校验规则沉淀在 `services/batch`，包括发货人、收货人数量、手机号、收寄地址一致、货物名、港澳台互寄限制和批量文本格式识别。页面不复制旧小程序 Redux 状态机。

## 面单打印边界

`pages/print/index` 首期只承接面单打印中心入口、打印前置规则和能力边界。待打印列表、打印模板、打印配置和状态回写端点已在 `services/print` 记录，但蓝牙设备扫描、连接、GBK 指令、模板下发和真实打印必须等 App 原生打印 facade 接入后再实现。

从首页扫码识别到的 `printId` 云打印码会带入打印中心展示为“待接入”提示，避免被误当成普通运单或伪装成可下单能力。

打印前置规则沉淀在 `services/print`：必须先连接打印机、有待打印订单且选择至少一个运单，才允许进入真实打印链路。页面不直接使用小程序蓝牙 API。

## 签收码边界

`pages/sign/code` 首期承接实名签收姓名登记、签收码查询、二维码展示、文本码复制和刷新。二维码使用 App 显式依赖 `qrcode` 生成矩阵，并由 `shared/components/QRCodeMatrix` 使用 Taro `View` 渲染，不复用旧小程序 `taro3-code` canvas/image 工具。

亮屏、防截屏、扫码签收结果回调和签收异常申诉后续按 App 原生能力或独立业务切片接入。

## 当前重点

项目已经从空架子进入业务迁移阶段。后续优先级：

1. 稳定 Node/pnpm/CI/原生构建环境。
2. 保持路由、登录守卫、平台能力和 WebView 承接单源化。
3. 持续拆分订单、寄件、发票等核心模块，控制 service 和页面体量。
4. 补充请求、缓存、路由、登录守卫、订单状态、发票转换等业务规则测试。
5. 建立 `src/styles` token 和通用样式/组件，减少页面 SCSS 重复。
