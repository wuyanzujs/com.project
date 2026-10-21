# 交接文档：寄快递页 7 项视频反馈修复（视频 → 生产端证据 → 代码）

- 日期：2026-10-20
- 交接原因：本轮完成 7 项差异的取证、实现与静态门禁，剩余「真机重打包 + 逐条截图像素复核 + 3 项后端契约确认」，需要交接给下一轮。
- 阅读顺序：本文 → [需求单](../parity/send/2026-10-20-video-parity-request.md) → [对照报告](../parity/send/2026-10-20-video-parity-report.md) → [寄件主流程记录](../parity/send/main-flow.md)
- 上一轮交接：[RN 寄件主功能对齐与真机验证交接](./2026-10-19-send-production-parity-handoff.md)

## 一句话现状

用户视频反馈的 7 项差异已全部按生产端（`com.deppon.dpapp` 4.0.7.0）真机量测 + 包内 AOT 字符串取证落到代码：弹层基件拆成「静态蒙层 + 面板上滑」、时效卡改成深色书签带、空地址改成卡内缩进灰块、增值服务独立成页、客服浮窗改 104×100 半圆胶囊且可拖动、协议勾选图标 + 首勾弹层、明细改分区弹层。**最新静态门禁全绿（业务规则 362 pass / 0 fail，寄件相关测试 118 pass / 0 fail）**；**尚未重打包安装到真机做逐条截图复核**（按 AGENTS.md 需用户明确授权）。

## 本轮改动清单（按缺陷）

| # | 改动 | 关键文件 |
| --- | --- | --- |
| 底座 | 弹层拆成「蒙层首帧铺满 + 面板 260ms 上滑」；新增纵向拖动基件 | `src/shared/native/AppNativeSheet.tsx`(新)、`AppNativeDraggable.tsx`(新)、`src/shared/native/index.ts`、`src/styles/nativeTokens.ts`(`overlay.sheet`) |
| R1 | 未填地址改为卡内左右缩进 16 的圆角灰块（高 124、圆角 24），空态文案「从哪里发件 / 寄到哪里去」 | `src/pages/express/components/ExpressContactPanel/index.{tsx,scss}` |
| R2 | 时效卡 200×152 + 深色书签带 `#434a5e` 47 高 + 右上折角 `#363b4d` + 蓝色时效三段 + 近黑价格 | `src/pages/express/components/ExpressQuoteSection/index.{tsx,scss}`、`src/styles/_tokens.scss`(`$dp-color-quote-band`) |
| R3 | `ExpressSheet` 改用 `AppNativeModalSheet`，蒙层不再跟随动画 | `src/pages/express/components/ExpressSheet/index.{tsx,scss}` |
| R4 | 增值服务独立页 + 入口行 + 草稿回填；保价卡移到寄件页独立卡片 | `src/pages/express/services/index.{tsx,scss}`(新)、`services/content.scss`(新)、`src/pages/express/components/ExpressServiceSection/index.{tsx,scss}`、`src/services/express/draft/draftBridge.ts`(`VALUE_ADDED`)、`src/shared/navigation/routeRegistry.ts`、`src/pages/express/index.tsx` |
| R5 | 客服浮窗 104×100 半圆胶囊（`--compact`）+ 深色耳机 + 蓝色声波 + 上下拖动 | `src/shared/components/AppSupportFloat/index.{tsx,scss}` |
| R6 | 勾选图标「灰描边圆 / 蓝实心圆 + 白勾」；首勾协议弹层 + 本地「下次不用提醒」 | `src/pages/express/components/ExpressOrderOptionsSection/index.{tsx,scss}`、`ExpressAgreementSheet/index.{tsx,scss}`(新)、`hooks/useExpressAgreement.ts`(新)、`src/services/express/draft/agreementStorage.ts`(新)、`src/cache/keys.ts` |
| R7 | 明细改底部弹层（标题/副标题/圆形关闭 + 基础费用/增值费用/优惠信息分区），状态上提到页面，底栏只保留切换 | `src/pages/express/components/ExpressPriceDetailSheet/index.{tsx,scss}`(新)、`ExpressSubmitBar/index.tsx`、`src/pages/express/index.tsx`；旧 `ExpressPriceDetailPanel/*` 删除 |
| 测试 | 协议入口改回调、时效卡书签带/折角断言；样式基线重生成 | `scripts/business-tests/express/{submit-actions,quote-card}.test.cjs`、`scripts/style-governance-baseline.json` |

## 门禁结果（全部本机实测）

| 门禁 | 结果 |
| --- | --- |
| `pnpm --filter com.deppon.app typecheck` | 通过 |
| `lint`（`--max-warnings 0`） | 通过 |
| `lint:styles` | 通过 |
| `check:styles` / `check:styles:strict` | 通过（SCSS 240 个、token 接入 100%） |
| `check:rn-boundaries` | 通过 |
| `check:routes` | 通过（新增 `expressServices` 已登记） |
| `check:module-size` | 通过（既有文件预警，未新增越限） |
| `check:business-rules` | 通过（362 pass / 0 fail） |
| `check:runtime-config`、`check:platform-build` | 通过 |

## 尚未执行的验证（下一轮第一件事）

1. **真机重打包安装**（需用户授权）：
   ```powershell
   $env:JAVA_HOME='D:\Android\jdk-17'; $env:ANDROID_HOME='D:\Android\Sdk'; $env:GRADLE_USER_HOME='D:\Caches\gradle'
   cd apps\com.deppon.app
   pnpm bundle:android
   cd android; .\gradlew.bat assembleDebug -PtargetAbis=arm64-v8a -PreactNativeArchitectures=arm64-v8a
   D:\Android\Sdk\platform-tools\adb.exe -s dcf44968 install -r app\build\outputs\apk\debug\app-debug.apk
   ```
   debug APK 内嵌 bundle，可独立运行；Metro 快循环见 [android-fast-loop.md](../../dev/android-fast-loop.md)。
2. **7 条逐项截图复核**（RN vs 生产端同位置）：空地址态需要在 RN 侧造「全新草稿」（当前清空收件人会触发姓名校验，无法人为造空），建议用清除缓存后首次进入的方式截。
3. 弹层开场 300ms 动画：本机 `screenrecord` 不可用，需要可录屏机型复核「蒙层是否零动画」。

本轮已补齐 `mp-taro3` 可交叉确认的费用契约：基础费用恢复 `FRT + discount.reduceFee`，优惠信息逐条显示，计费重量根据 `expBillCalculateResponse.billType` 显示重量/体积计费，并接入受控 WebView `/depponmobile/billingRules`。对应代码与测试已通过静态门禁。

## 证据资产（本地，未入库）

- 生产端截图：`.dpshots/prod-ref/p1…p30.png`（p17 时效卡、p18 明细弹层、p21 优惠券、p24 协议首勾、p25 客服拖动后、p30 空地址态）
- 生产端 UI 树：`.dpshots/prod-ref/ui1…ui10.txt`（含控件 bounds）
- 生产端像素量测脚本产物：`c_cs.png`（客服 3×）、`c_agree*.png`（勾选）、`c_sx*.png`（时效卡）、`map_empty.png`（空地址灰块几何）
- RN 侧对照截图：`.dpshots/rn-ref/r1…r4.png` + `ui_r2.txt`
- 视频抽帧与拼图：`.dpshots/video-send/f001…f080.png`、`sheet1…sheet4.png`
- 生产包：`D:\rea-targets\dpapp-4.0.7.0.apk`、`D:\rea-targets\lib\arm64-v8a\libapp.so`

## 关键量测速查（设备像素，1440×3168；设计稿 px = 设备/1.92）

| 对象 | 数值 |
| --- | --- |
| 页面底色 / 卡片 | `#f5f7fa` / `#ffffff`，页边距 24 设计稿 px（46 设备） |
| 未填地址灰块 | y 373…611（124 设计稿 px 高），左右各缩进 16，圆角 24 |
| 时效卡 | `[92,2384][476,2676]` = 200×152；书签带高 47；描边 `#363b4d` |
| 协议勾选圆 | 直径 54 设备（28 设计稿 px）；选中蓝 `#3c70ff` 系 + 白勾 |
| 客服浮窗 | `[1240,2537][1440,2730]` = 104×100；左侧半径 = 高度/2 |
| 弹层蒙层 | 白底压到 189 → α≈0.26（`$dp-color-overlay-sheet`）；优惠券蒙层盖导航栏，明细蒙层不盖导航栏 |
| 明细弹层 | 顶边 y≈1707、顶部圆角 24、底栏保持可见 |
| 增值服务页条目 | 代收货款、签收单、派送时间、送货进仓、双人派送、打包服务、通电验机、拍照服务 |

## 未决项（需要产品或后端输入）

1. **增值服务 3 项仍需生产请求确认**：代码已依据生产 AOT 标识与同体系 MP 契约接入 `doubleDelivery`、`powerMachineTypes`、`installationCategory`、`testMacHineQty`、`isPhotoSigning/photoSigning`、`pickupPhoto`；仍需要生产端下单请求样本或接口文档确认最终序列化层级，**不要再从 UI 猜字段**。
2. **明细优惠展示**：已按 `mp-taro3` 返参接入 `discount` 汇总与逐条明细；仍需真机确认不同优惠组合的最终排版。
3. **协议「历史记录」远程更新规则**：RN 已接入包内提取的 11 组历史版本并保留 `PROTOCOL_RECORD` H5 路由；生产端远程配置覆盖与版本失效规则仍需运行时确认。
4. **增值服务页视觉收口**：接口、字段和费用闭环已完成；生产端的「图标 + ⓘ + 单选圆 + 服务费行」仍需真机逐项截图确认。
5. **客服拖动上下限**：生产端只验证「可上移且贴边」，上下限未量测；当前实现钳制在向上 520 / 向下 40 设计稿 px。

## 工作区与提交

- 已提交两步：
  - `bdea092` fix: 寄快递页 7 项生产端一致性修复（弹层蒙层/时效卡/空地址/增值服务页/客服浮窗/协议勾选/费用明细）
  - `7bce648` docs: 寄快递 7 项视频反馈需求单、生产端对照报告与本轮交接
- 提交后复跑门禁：`typecheck`、`lint`、`check:business-rules`（362 pass）、`check:styles`、`check:rn-boundaries` 均通过（pre-commit 的 prettier/eslint/stylelint 只做格式化，未改语义）。随后补齐账户设置页业务测试 harness 的共享图片资源映射，完整 `verify:static` 再次通过。
- `tools/compress-images.ps1`、`tools/probe-ai-gateway.ps1` 是工作区里既有的未跟踪脚本（与寄件无关），本轮未纳入提交。
- 默认禁止代理主动打包/发布；本轮未执行 bundle/Gradle，等用户授权。

## 后续取证补充（2026-10-20）

用户要求使用 reverse-engineer-anything 解包生产 App 后，新增 [生产实现取证报告](../parity/send/2026-10-20-production-implementation-analysis.md)，附原图联系图及带摘要/文件偏移的小型证据 JSON。完整包、提取文件与 REA Evidence 存在 `D:\codeSpace\deppon-analysis\2026-10-20-send-reverse`。

- 三项服务已不再是“完全无字段线索”：生产 AOT 找到 `doubleDelivery`、`powerMachineTypes`、`installationCategory`、`testMacHineQty`、`isPhotoSigning/photoSigning`、`pickupPhoto` 及对应候选费项码；同体系 MP 源码给出了真实报价/下单映射。生产 App 函数体、取值和请求层级尚未恢复，不能把 MP 参照当作 App 实证，详情见报告。
- 时效卡背景、8 类服务图标、客服耳机原图已提取。协议 `assets/jsons/protocol.json` 包含正文与历史版本数组（12 行，去重 11 组），内嵌版本列表的静态数据已找到。
- RN 源码对照发现：增值页费用合计读取整票 `totalfee`；客服白底胶囊在拖动组件外。均只记录，尚未修复/真机验证。
- 蒙层开场动画、客服边界、无券费用行等仍未解决；本次未打包、安装、下单或修改业务代码。

后续用户已授权代理自主判断并落地可确认改动，三项服务、费用闭环、原图、浮窗与协议历史的最新实现以 [代码落地记录](../parity/send/2026-10-20-production-implementation-followup.md) 为准；以上“未修复/仅 5 类/未改代码”保留为此前交接时点，不代表后续工作区状态。

### 2026-10-20 REA 与门禁复核

- REA 复核确认生产包仍为 Flutter AOT；AOT 证据见 `ev_8abc50d3c5292cf2dd194843e2a2699c30aa79797669094f32269e5353a8ed8a`、`ev_0f0e011c0028e22e38ad3829e5aff8b197204cf0adafa5862ecd34e3901de81c`。
- 本轮目标回归 118 pass / 0 fail，业务规则 362 pass / 0 fail，`verify:static` 全部通过。
- 仍需真机安装截图复核；按项目 AGENTS.md，未获明确授权前不执行 bundle、Gradle、Xcode 或 APK 安装。
