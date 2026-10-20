# 寄件生产实现取证后的代码落地

日期：2026-10-20。用户在解包报告后授权“你自己看，能动手就动手改，不能就继续收集信息”。本轮根据 [生产实现取证报告](./2026-10-20-production-implementation-analysis.md) 与已知同体系 MP 源码落实可确认部分；不将 MP 源码当作生产 App 反编译函数体。

## 已落地改动

| 范围 | 改动 | 主要位置（相对 App `src`） |
| --- | --- | --- |
| 客服浮窗 | 位移节点同时持有停靠布局、白色外壳、图标、文字和点击区域；接入生产客服原图；中断后提交位移，纵向阈值和边界有回归 | `shared/components/AppSupportFloat`、`shared/native/AppNativeDraggable.tsx` |
| 时效卡 | 生产长/短标题、选中/未选中四张背景图替换手绘书签带、折角与描边；保留量测布局和独立文字 | `pages/express/components/ExpressQuoteSection`、`assets/express` |
| 费用明细 | 基础费用取 FRT；增值列表排除 FRT；增值分区显示实际合计，金额按分汇总，避免把整票总价重复当基础费用 | `services/express/express.quoteView.ts`、`ExpressPriceDetailSheet` |
| 协议历史 | 从包内 JSON 提取去重后的 11 份历史协议，弹层内按日期列出，走既有 WebView 路由与运行时域名 | `services/express/agreementHistory.ts`、`ExpressAgreementSheet` |
| 三项新增服务 | 增加双人派送、通电验机、拍照服务草稿；报价与下单分别映射明确字段；旧草稿默认关闭；清除选择后不残留字段 | `services/express/valueAdded.rules.ts`、`types.ts`、`express.payload.ts` |
| 验机类别与校验 | 使用已在生产 AOT 命中、MP 源码确认的 `queryGoodsNameList`；类别失败/空值不允许开启验机，可重试；至少一个阶段、类别非空、件数 1–99 整数 | `services/express/valueAdded.api.ts`、`valueAdded.service.ts`、`services/ExtraServiceEditors.tsx` |
| 增值服务页 | 8 类生产图标卡、信息说明入口、选中蓝描边、选中服务费行；保留原有表单配置，补三项服务配置 | `pages/express/services/ServiceCard.tsx`、`ExtraServiceEditors.tsx`、`index.tsx` |
| 服务费用闭环 | 本页防抖询价，匹配原产品及线路/时间产品；迟到成功/失败响应不能覆盖新选择；服务费白名单计算合计与独立明细，失败显示未知并可重试 | `services/express/valueAdded.quoteView.ts`、`pages/express/services/useValueAddedQuote.ts`、`ValueAddedFeeSheet.tsx` |
| 返回与回填 | 编辑只保留本页临时草稿，点击确定才保存；可携带显式、未失效的新报价；普通返回不覆盖寄件草稿 | `pages/express/services/index.tsx`、`services/express/draftBridge.ts` |
| 草稿与模板 | 新域归一、深拷贝、旧缓存兼容；寄件入口摘要展示三项新增服务 | `draftStorage.ts`、`draftBridge.ts`、`services/template/template.bridge.ts`、`ExpressServiceSection` |

新增服务使用的契约：

| 服务 | 报价 | 下单扩展字段 | 费项 |
| --- | --- | --- | --- |
| 双人派送 | `doubleDelivery=Y` | `doubleDelivery=Y` | `SRPS` |
| 通电验机 | `powerMachineTypes`、`installationCategory`、`testMacHineQty` | 同名三个 key，件数转字符串 | `TDYJF` |
| 拍照签收 | **`isPhotoSigning=Y`** | **`photoSigning=Y`** | `PZQS` |
| 揽收拍照 | `pickupPhoto=LSPZ` | `pickupPhoto=LSPZ` | `LSPZ` |

字段与码在生产包存在，具体映射及取值由 MP 真实源码交叉确认；没有使用猜测字段、固定服务价格或自动启用 HotPot 分支。接口成功、能力返回与用户选中都需要按当前运行环境验证。

## 验证记录

- 新增规则测试：字段差异、取消清除、验机边界、旧缓存、深拷贝、新鲜报价回填。
- 新增页面/异步测试：增值费白名单、同码不同线路、连续选择防抖、旧成功/失败、保价响应归一和重试不循环、API 无效类别、仅确认保存回传。
- 新增费用/拖动回归：基础运费不重复，未知金额不冒充免费，外壳与命中节点一起移动，连续拖动/上下限/中断。
- 原图来自生产包 `3.0x` 资源，接入文件与提取源摘要逐项核对；图片来源清单在取证报告。
- 最终统一静态门禁结果在本轮交接末节补充；未执行 RN bundle、Gradle、Xcode、安装或下单验证。

## 仍有证据边界

1. 完整生产 Dart 函数体、实际使用的能力开关与线上最终序列化链没有恢复；当前实现依据为生产字节实证加同端点 MP 源码，不宣称生产源码等价。
2. 卡片选图、字体、布局虽依据原图与历史量测，新增 RN 代码仍需真机截图验收，静态测试不代表像素一致。
3. 生产弹层开场逐帧动画、客服实际拖动边界、无券 0 元行未由本轮静态取证确定；默认时长与边界不能写成生产常量。
4. 协议列表有可靠静态来源，现行正文仍走既有 H5；生产端远程配置覆盖与确认版本失效规则未知，本轮不伪造协议更新机制。

录屏替代路径正在单独取证，成功结果或具体诊断与最终门禁一并补入交接。

## REA 复核补充（2026-10-20）

对生产包 `D:\\rea-targets\\dpapp-4.0.7.0.apk` 重新执行了 REA 静态分析，包 SHA-256 为
`6c263175e4b6e985ca400f3c429e57f1196eff0698cdad2403edd436389cc12e`。

- Flutter 构建识别 Evidence：`ev_8abc50d3c5292cf2dd194843e2a2699c30aa79797669094f32269e5353a8ed8a`。arm64-v8a 与 armeabi-v7a 的 AOT snapshot hash 均为 `78da37fed6bf1489361a312568249f3f`；生产包为 Flutter AOT，未执行 APK。
- Android/JADX 包摘要 Evidence：`ev_3072b7e0f5fab5cbc8309edc87d158dab342b57ca7ae435d42f4abe6242ea8e`。包名 `com.deppon.dpapp`，版本 `4.0.7.0`，`class_count=15596`；该结果只证明静态包身份和类资源规模。
- arm64-v8a Dart AOT 结构 Evidence：`ev_0f0e011c0028e22e38ad3829e5aff8b197204cf0adafa5862ecd34e3901de81c`。AOT 中出现 `package:dpapp/pages/send/express/...`、`package:dpapp/pages/service/express/...`、`doubleDelivery`、`ExpressServiceSection`、`PowerMachineSheet` 等业务 URI/标识；字符串池是字节模式观察，未恢复完整 Dart 函数体。
- APK 图谱摘要 Evidence：`ev_21003de810a01c0bc3cebc90aedfbc3a66c2f47818e1324c7822177901b4affe`，归档目录 6610 项、完整性矛盾 0。

本轮门禁复跑：寄件相关测试 118 pass / 0 fail；业务规则 362 pass / 0 fail；`verify:static`（类型、ESLint、Stylelint、样式治理、RN 边界、路由、模块体积、运行时配置、业务规则、平台门禁）通过。另修复了账户设置页业务测试 harness 缺少共享图片资源映射的问题。仍未执行 bundle、Gradle、Xcode、安装包或真机截图验证。

## mp-taro3 契约补充（2026-10-20）

参照 `D:\\10531845\\Desktop\\CZH-DEV\\mp-taro3` 同功能模块，补齐了费用明细的可确认契约：

- 基础费用恢复为 `FRT + discount.reduceFee`，与生产 `GetProductDiscount` / `priceBasic` 口径一致。
- 优惠区逐条使用 `marketName` 与 `reduceFee`；没有伪造无券 0 元行。
- `expBillCalculateResponse.billType` 映射重量计费/体积计费文案。
- 新增受控 WebView 目标 `/depponmobile/billingRules`，明细中的「计费规则 ›」可点击打开。

新增费用明细回归后，业务规则总数为 362 条，全部通过。剩余真机截图、弹层开场逐帧、增值页视觉细节和资源拉伸风险仍需运行时验证。
