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
pnpm check:app-native-env
```

在 App 包内执行：

```bash
pnpm --filter com.deppon.app run typecheck
pnpm --filter com.deppon.app run lint
pnpm --filter com.deppon.app run check:rn-boundaries
pnpm --filter com.deppon.app run check:routes
pnpm --filter com.deppon.app run check:module-size
pnpm --filter com.deppon.app run build
```

`pnpm verify:app` 是本地和 CI 的统一质量入口，会串行执行类型检查、ESLint、RN 边界检查、路由注册表检查、页面/service 体量检查和 RN bundle 构建。

## RN-only 边界

业务代码不能直接使用小程序或 H5 平台能力，包括：

- `wx.*`
- `my.*`
- `Taro.scanCode`
- `Taro.getLocation`
- `Taro.openLocation`
- `Taro.makePhoneCall`
- `Taro.uploadFile`
- `Taro.downloadFile`
- `Taro.requestSubscribeMessage`
- `Taro.navigateToMiniProgram`
- `Taro.chooseImage/chooseMedia/chooseVideo`
- `Taro.getUserProfile/authorize/getSetting/openSetting`
- `Taro.saveImageToPhotosAlbum`

这些能力必须先进入 `src/shared/platform/*` facade，再由页面或 service 消费。`pnpm check:app-boundaries` 会阻止常见小程序 API 回流。

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
- WebView 承接统一走 `shared/webview/appWeb.ts`，不要在页面散落 H5 URL 拼接。

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

`pnpm check:app-routes` 会检查注册表 name/path 唯一性、页面文件存在性、主导航顺序、登录路由和派生消费关系，防止新增页面时漏改或绕过单源路由。

## 体量门禁

`pnpm check:app-module-size` 会检查 `src/pages` 和 `src/services` 下的 TypeScript 文件体量。新页面默认不超过 420 行，新 service 默认不超过 450 行；已存在的超大文件按当前预算冻结，后续只能拆小，不能继续膨胀。

## 迁移旧项目业务的规则

- 不能复制旧小程序页面和 Redux 状态机。
- 先识别旧项目里的业务语义、接口 path、字段含义和边界条件。
- 按 `api -> service/useCase -> 页面 VM -> 页面组件` 重构。
- 遇到扫码、定位、电话、文件、支付、实名、推送等平台能力，先接 `shared/platform` facade。
- 遇到支付、纸票、下载、上传、地图等原生能力未 ready 的功能，要明确降级或 H5 承接，不伪造成功。
- 每个业务切片完成后至少执行 `typecheck`、`lint`、`check:rn-boundaries`、`check:routes` 和 `check:module-size`；较大改动执行 `pnpm verify:app`。

## 当前重点

项目已经从空架子进入业务迁移阶段。后续优先级：

1. 稳定 Node/pnpm/CI/原生构建环境。
2. 保持路由、登录守卫、平台能力和 WebView 承接单源化。
3. 持续拆分订单、寄件、发票等核心模块，控制 service 和页面体量。
4. 补充请求、缓存、路由、登录守卫、订单状态、发票转换等业务规则测试。
5. 建立 `src/styles` token 和通用样式/组件，减少页面 SCSS 重复。
