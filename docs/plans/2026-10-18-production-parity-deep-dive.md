# 生产端功能深挖与对齐计划(dpapp → com.deppon.app)

生成日期:2026-10-18
适用对象:生产 App `com.deppon.dpapp` 4.0.7.0(Flutter/GetX)→ 重建 App `apps/com.deppon.app`(Taro RN)

## 背景与总判断

- 生产 App 已实锤为 Flutter(GetX 架构,controller/view 分层),APK 内 Dart AOT 快照可解析,**708 个自有源文件路径全量可见**(见 [dpapp-file-inventory.txt](./dpapp-file-inventory.txt)),明文 URL 可直接提取。
- RN 侧 49 条路由已把主要模块骨架铺完(routeRegistry 单源管理),地址簿模块刚完成首轮视觉对齐。
- 因此本计划的重心**不是补页面,而是逐模块"深挖生产端实现 → 做 gap 分析 → 按生产端对齐已有页面"**;仅消息、扫一扫两个模块存在真实缺口。
- 工具链已就绪:REA 6.5.0(MCP + CLI)、jadx 反编译引擎(healthy)、Flutter 指纹/字符串池命令、.dpshots 截图量测流程、verify:app 静态门禁。
- 生产 APK 固定存放于 `D:\rea-targets\dpapp-4.0.7.0.apk`(勿入库);snapshot hash `78da37fed6bf1489361a312568249f3f`,后续可用 blutter 按 Dart SDK 版本深挖函数级逻辑。

## 一、生产端模块清单与优先级

文件数为生产端 Dart 文件量级,佐证模块复杂度;RN 现状来自 routeRegistry 实测。

| 优先级 | 模块 | 生产端 | RN 现状 | 对齐要点 |
|---|---|---|---|---|
| P0 | 寄件 send | 102(下单 express 42、批量 batch 25、货物 cargo 14、上门取件 collection 7、公益/物流等) | express/batch/template/insurance 骨架已有 | 第一大模块,下单主链路:物品信息、包装、取件时间、保价、加密附言 |
| P0 | 订单 order | 61 | list/detail/evaluation/edit/subscriptions/cancel/stub 已有 | 列表筛选、详情状态机、轨迹、电子存根 |
| P0 | 支付 pay | 19 | payment 3 页已有 | 寄件闭环必经:待支付/确认/结果 + 原生支付通道(jadx 层) |
| P1 | 地址簿 contact | 32 | list/edit 已有,**视觉已对齐** | 剩余:字段校验规则、地址识别联动、小镇选择器、复制/粘贴降级 |
| P1 | 首页 home + main | 8 + 3 | home tab 已有 | 营销位布局、常用功能入口矩阵、tab 容器行为 |
| P1 | 查询 query + 快递员 courier | 9 + 9 | query 5 页、courier 2 页已有 | 价格时效、收派范围、网点详情、快递员评价 |
| P1 | 我的 mine + 账号 account + 工具 system | 8 + 11 + 44 | mine/account 已有 | system 含图片裁剪等工具页,账号注销/实名链路 |
| P2 | 优惠券 coupon | 13 | list/detail 已有 | 券规则、适用品类、核销状态 |
| P2 | 登录 login | 14 | login 已有 | 验证码加密(captcha/encrypt_util)、协议弹层 |
| P2 | 消息 message | 4 | **缺失,需新增** center + list 两页 | 唯一整模块缺口 |
| P2 | 寄件服务选项 service | 19 | 部分并入 express 流程 | 装箱、拍照取证、送货时间窗、保价表格 |
| P2 | 打印 printer + 扫一扫 scan | 12 + 3 | print 2 页已有;**scan 缺失** | 面单打印、扫码能力走 shared/platform facade |
| P3 | 会员 member + E卡 ecard | 2(+) | member/ecard 已有 | 生产端 E 卡仅为下单页弹层与配置模型,入口形态与 RN 不同 |
| P3 | 客服 support | 在 common/customer_service | support/customer 已有 | 在线客服悬浮窗、拨号降级 |
| P3 | 发票 invoice | **生产端 Flutter 无独立页面** | invoice 6 页已有 | 确认生产端发票入口(推测 H5),决定 RN 侧保留独立页还是收编为 WebView 入口 |

优先级依据:业务主链路(下单 → 支付 → 跟踪 → 售后)优先,其次高频辅助功能,长尾最后;文件规模作为复杂度佐证。

## 二、单模块深挖 SOP(每个模块走同一条流水线)

每模块产出一份"功能档案",落盘 `docs/parity/<模块>/`,作为对齐实现的唯一参照。

1. **结构深挖**(纯静态,半天内可完成,无任何阻塞)
   - 从 [dpapp-file-inventory.txt](./dpapp-file-inventory.txt) 切出该模块文件树,理解 GetX 分层(controller/view/widgets/models)。
   - `rea inspect-dart-aot D:\rea-targets\dpapp-4.0.7.0.apk --abi arm64-v8a` 拿类名 token;对 `libapp.so` `grep -aoE` 提取明文 URL、路由名、关键文案。
   - 涉及原生能力的(支付/推送/剪贴板/定位/打印)用 REA jadx 命令(`inspect-android-class`/`decompile`)反编译对应 Java 层。
   - 产出:`docs/parity/<模块>/structure.md`(文件树 + 分层说明 + 关键类名/URL 清单)。
2. **接口清单**(依赖 HAR,见阻塞项)
   - 拿到抓包后:HAR 交给 REA 分析,产出 `docs/parity/<模块>/api.md`(请求/响应/字段语义)。
   - HAR 缺位期间先用:明文 URL 推断 + 现有 service 层接口对照,标注"待抓包确认"。
3. **UI 量测**:同设备装生产 App,按 `.dpshots` 流程截图切块量像素(1440 宽 = design750 × 1.92 口径),产出 `ui-measure.md`。
4. **Gap 清单**:对照 RN 现页面逐项列差异(结构/交互/文案/视觉/接口),每项标 P0–P3,产出 `gaps.md`。
5. **对齐实现**(遵守 AGENTS.md 全部分层与边界规则)
   - service 按 api / mapper / rules / useCases / viewModel 拆分,禁止继续膨胀单文件。
   - 页面主文件只留状态与流程编排,可复用 UI 下沉 `components/`。
   - 样式优先用 `src/styles/_tokens.scss` 与 nativeTokens,不新增硬编码色值字号。
   - 路由改动一律走 routeRegistry;平台能力一律走 shared/platform,新平台调用先进 facade。
   - 遵守体积门禁(SCSS 500 行封顶、TS/TSX 预算),超限即拆。
6. **验证**:`pnpm verify:app` 全门禁通过;Metro 热更新 + force-stop 重启截图,与 dpshots 量测比对;不执行任何打包命令(打包由用户执行)。

## 三、里程碑

| 里程碑 | 内容 | 验收 |
|---|---|---|
| M0(本周,无阻塞) | ① message(center/list)与 scan 缺口页立项;② send、order 两个 P0 模块的 structure.md 深挖完成;③ HAR 方案决策落地 | 两份 structure.md 评审通过;消息/扫一扫立项说明入 docs |
| M1 | P0 三模块(寄件/订单/支付)档案齐:structure + gaps + ui-measure | gap 清单评审,确认对齐范围 |
| M2 | P0 对齐实现完成 | verify:app 全绿 + 量测比对通过 |
| M3 | P1 批:contact 深对齐收尾、home、query+courier、mine+account+system | 同上 |
| M4 | P2 批:coupon、login、message、客服、printer+scan | 同上 |
| M5 | P3 收尾:member/ecard 入口形态、发票入口确认与调整 | 模块清单全量对齐或显式豁免 |

## 四、阻塞项与决策点

1. **HAR 抓包方案**(阻塞接口级深挖,不阻塞结构与 UI):优先找 Flutter 团队要一个不做证书校验的测试包;拿不到则用 reFlutter 对现包重打包(reFlutter 还能顺带确认 snapshot hash 对应的 Dart SDK 版本)。
2. **发票/E卡入口形态**:生产端 Flutter 无独立发票页,需抓包或问团队确认 H5 入口清单,再决定 RN 侧 6 个发票页是保留独立实现还是收编 WebView。
3. **消息模块数据源**:生产端 message 只有 2 组页面,推送通道在原生层(jadx 可挖),新增页面前先确认消息列表的接口与推送落地方式。

## 五、执行约定

- 深挖产物一律进 `docs/parity/`,随代码走 git,方便多人接力。
- 每个模块对齐实现单独成提交,深挖(只读)与实现(改动)分开提交。
- `D:\rea-targets\` 下的大文件(APK、HAR、解包产物)不入库。
