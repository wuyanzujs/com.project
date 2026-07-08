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
pnpm check:app-native-env
```

## 目录

```text
apps/com.deppon.app/   Taro RN App
docs/                  重构计划和工程记录
packages/              工作区共享包预留
```

更多 App 开发规范见 `apps/com.deppon.app/readme.md`。
