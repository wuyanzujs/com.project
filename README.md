# com.project

这是德邦快递 RN App 重构工作区。当前主要应用是 `apps/com.deppon.app`，目标是参考旧 Taro 小程序项目 `D:\10531845\Desktop\CZH-DEV\mp-taro3` 的业务语义，重构为只面向 Android/iOS 的 Taro React Native App。

## 环境

- Node.js: `24.13.0`
- pnpm: `11.9.0`

版本约束写在 `.node-version` 和根 `package.json` 的 `engines` 中。本地、CI、打包机应保持一致。

## 常用命令

```bash
pnpm install
pnpm dev:app
pnpm build:app
pnpm verify:app
pnpm check:app-boundaries
pnpm check:app-routes
pnpm check:app-module-size
pnpm check:app-runtime-config
pnpm check:app-native-env
```

`pnpm verify:app` 只执行静态质量门禁，不生成 RN bundle 或原生安装包；Android/iOS bundle 与原生打包由发布者显式执行。

## CI

`.github/workflows/app-quality.yml` 会在 push 和 pull request 时执行：

- `pnpm install --frozen-lockfile`
- `pnpm verify:app`
- `pnpm check:app-native-env`

后续业务迁移必须保持这条质量入口通过，再继续接入 Android/iOS 打包发布。

RN-only 边界由 `pnpm check:app-boundaries` 守住：业务代码不能直接回引小程序 API、H5 平台插件、`APP_ROUTES.web` 或 RN `NativeModules/Linking/PermissionsAndroid` 等原生能力，相关能力先进入 `apps/com.deppon.app/src/shared/platform` 或后续 `shared/native`。

## 目录

```text
apps/com.deppon.app/   Taro RN App
docs/                  重构计划和工程记录
packages/              工作区共享包预留
```

更多 App 开发规范见 `apps/com.deppon.app/readme.md`。
