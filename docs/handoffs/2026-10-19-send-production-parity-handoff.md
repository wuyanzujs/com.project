## 2026-10-19 第七/八轮：脚手架文案清理 + 会话交接

- 订单详情操作区移除 7 处 `App`/`H5` 渠道角标（研发实现标记，非用户文案），保留 客服/预约/待确认/高风险/电话。
- 批量寄件「批量打印」状态文案由 `待接入` 改为 `暂不支持`，说明改为「当前版本暂不支持手机直连打印机，可到网点打印」，去掉工单语气。
- 门禁：`pnpm verify:app` 全绿（299 业务测试 + 71 样式治理 + 全部静态门禁）。
- **尚未对齐、需下一轮先做**：设置/个人设置页逐项对照；订单详情在「待揽收/运输中」等有操作列表的状态下与生产端对照（当前只有已取消态订单，无法取证）；地址簿编辑页「保存到地址簿 vs 设为默认地址」语义待产品确认。
- **HMR 现状**：后台跑 `pnpm dev:rn` 会因 `process.stdin.setRawMode` 失败（需要真终端）。直接 `react-native start` 能给设备供 JS（不装 APK），但该机器上文件监听收不到改动，改完需重启 Metro；无 HMR 时走 `pnpm bundle:android` + `gradlew assembleDebug` + `adb install -r`（约 5 分钟）。

# 工作交接：RN 寄件主功能对齐与真机验证

日期：2026-10-19。项目：`D:\codeSpace\com.project`。本文件是本轮后续工作的首要入口；优先于 [上一份交接](./2026-10-18-production-parity-handoff.md) 中“消息第一优先”“本轮未打包”和 ADB 点击失效等历史记录。

## 当前目标与结论

用户要求参考手机里的正式版“德邦快递” `com.deppon.dpapp` 4.0.7.0，将普通单件寄件主要功能对齐到当前 Taro RN 项目。目标是当前项目业务实现，不是修改生产安装包。用户随后明确要求“打包到真机上试一下”，本次已完成 Android 构建、覆盖安装和基础真机冒烟。

当前状态：寄件主链路补齐代码已落地，静态门禁全通过，最终开发包已安装；**真实报价与自送网点回填已在同日第二轮完成真机验收，第三轮补了货物信息页结构与文案对齐，下单与成功页完整联调仍未验证**，不能宣称生产行为全部对齐。下一步按授权重新打包复核产品卡、协议行与货物信息页改动，再推进下单/成功页联调；消息契约校准仍在后续待办。

### 同日第二轮续接进展

- 真机补完：填齐测试收寄地址后自动询价返回「小件标快次日 ¥10 起 / 明天18:00前」；收件地址改北京后自动重算为「特快隔日 ¥16」「小件标快隔日+ ¥14」；自送模式返回 4 个 20 公里内网点，默认最近网点并支持手动选择回填，回填后隐藏「提前电话联系」行。未提交订单、未拨打电话。
- 真机发现并修复：真实报价下产品卡文字裁切（产品名折行截断、时效显示为「运输时效：…」）。生产 APK 的 `libapp.so` 无「运输时效」字符串、同体系小程序卡片按前段/时刻/后段拆分，据此改为单行加宽标题带 + 三段时效 + 「惊喜优惠」角标，新增 `express/quote-card.test.cjs`。
- 真机发现并修复：协议行由「货物与双方地址齐全才显示」改为常显（生产端空态即显示），校验文案改为点过下单后才展示。
- 新增待核差异：生产端收件人卡片进入「收件人信息填写」页（识别/历史地址），RN 直接进入地址簿列表；生产端「寄件」频道首页入口集合与 RN 首页不同。
- 门禁：`pnpm verify:app` 全通过，292 条业务测试（第二轮新增 3 条）。
- 未验证：产品卡修复与协议行调整需重新打包安装后才能在本机复核；下单、成功页调度快递员、拨号仍未验证。

### 同日第三轮续接进展（货物信息页）

- 生产端取证：在正式版进入「货物信息」页截图（`prod-goods-page.png`、`prod-goods-check2.png` 等），校准热门寄件、输入占位、捎话区与底部按钮。
- 已对齐：热门寄件改为生产端 12 个标签并保持四列三行顺序；标题由「热门品名」改为「热门寄件」；输入占位改为「请输入物品名称」。违禁品查询页沿用同一列表，其生产页未单独截图，属推断。
- 已迁移：「给快递员捎话」由寄件页增值服务的折叠「备注」迁到货物信息页（与生产结构 `cargo/info/remark` 一致），100 字上限与 `0/100` 计数，经 `goodsBridge` 随货物一次性回传寄件页，增值服务不再重复提供备注入口。
- 新增登记差异：上传照片/相机识别（`shared/platform` 无图片选择能力、上传契约未核）、「纸箱缓冲物额外收费」「了解计费规则」跳转目标、页面右上「分享」入口。
- 门禁：`pnpm verify:app` 全通过，299 条业务测试（第三轮新增 2 条，含热词顺序与捎话回传）；未重新打包，RN 侧改动待真机复核。

阅读顺序：本文 → [寄件主链路](../parity/send/main-flow.md) → [真机冒烟](../parity/send/device-smoke.md) → [接口契约](../parity/send/api.md) 与 [缺口](../parity/send/gaps.md)。全量历史决策见上一份交接。

## 工作区状态

- 分支：`master`；交接时 HEAD：`569e9d1c2adf006ccd0ca03012d01bb700c3e16b`。
- 本轮寄件代码、业务测试和文档均为**未提交变更**，包含新增未跟踪文件。尚未 commit、push 或创建 PR。
- 不要把 HEAD 当成已含本轮功能；续接前先检查 `git status --short`，保留全部已有工作区变更。
- RN bundle、APK、截图及日志均在忽略目录，未加入版本控制。再次构建会覆盖同路径 APK，核对时以哈希为准。

## 已完成实现与代码入口

以下路径均相对 `apps/com.deppon.app/`。

| 领域 | 本轮结果 | 主要入口 |
|---|---|---|
| 货物编辑 | 修复输入一个字即收起；显式选择后才显示标签；500ms 联想防抖，输入/清空/卸载作废旧请求；非法体积和非整数件数校验 | `src/pages/express/goods/index.tsx`、`goods/hooks/useGoodsNameSuggestions.ts`、`src/services/express/goodsEditor.rules.ts` |
| 最近使用 | 最多 8 条去重历史、清空入口；独立缓存并纳入账号切换清理。8 条是本地实现选择，不是生产数值实证 | `src/services/express/goodsHistory.ts`、`src/cache/keys.ts` |
| 自送服务点 | 根据寄件地址按 LEAVE+EXPRESS 查询；20 公里内默认最近；手动选择、回填与地址/模式过期结果保护；修改货物保留已选网点 | `src/pages/express/hooks/useExpressServicePoint.ts`、`src/services/express/servicePoint.rules.ts`、`src/services/query/stationSelection.ts`、`src/pages/query/stations/` |
| 报价 | 失败清除旧产品，过期报价不能提交；协议勾选和备注不打断在途报价 | `src/pages/express/hooks/useExpressQuote.ts`、`src/services/express/requestKey.ts` |
| 货物信息页 | 热词与生产端 12 个标签一致、标题「热门寄件」、占位「请输入物品名称」；「给快递员捎话」迁到本页，100 字计数并随货物回传寄件页 | `src/pages/express/goods/index.tsx`、`src/services/goods/goods.service.ts`、`src/services/express/goodsBridge.ts` |
| 协议 | 通过共享 WebView 打开正文；阅读和同意分开，阅读不自动勾选 | `src/pages/express/components/ExpressOrderOptionsSection/index.tsx`、`src/shared/webview/appWeb.ts` |
| 提交与草稿 | ref 同步防重复点击；登录前草稿保存失败时停止跳转；异常保留草稿；已成功表单禁止再次提交 | `src/pages/express/hooks/useExpressSubmit.ts`、`useExpressEntryNavigation.ts`、`src/services/express/express.draft.ts`、`express.mutations.ts` |
| 成功页 | 按订单号查询已调度快递员，待分配/失败可重试；电话走平台 facade；继续寄件及系统返回使用全新草稿 | `src/pages/express/success/index.tsx`、`CourierCard.tsx`、`src/services/express/success.api.ts`、`success.service.ts`、`success.types.ts` |
| 真机样式 | 修复体积说明第二行被固定高度裁切；改为自适应高度并保留最小高度，已重新安装确认 | `src/pages/express/goods/content.scss` |

业务测试主要新增在 `scripts/business-tests/express/`：`goods-editor.test.cjs`、`service-point.test.cjs`、`submit-actions.test.cjs`、`success.test.cjs`；共用真实处理器模拟环境在 `scripts/business-tests/support/react-harness.cjs`。账号隔离登记同步修改 `scripts/business-tests/auth/session.test.cjs`。

## 契约与已定决策

- API 保持 `https://owstest.deppon.com` 测试环境，不切换生产域名。生产 APK 的域名替换调研已搁置，不重复尝试。
- 参考证据是生产 APK 的结构/端点实证与同体系小程序源码的真实调用交叉核实，没有生产 HAR；二进制文件名不能单独证明请求字段或完整业务语义。
- 生产分析资产：`D:\codeSpace\deppon-analysis\2026-10-19\com.deppon.dpapp.apk`、同目录 `rea-evidence.json`；此前存档入口 `D:\rea-targets\dpapp-4.0.7.0.apk` 见旧交接。小程序参考：`D:\10531845\Desktop\CZH-DEV\mp-taro3`。
- `preAllocationCourier` 是 POST `{orderNumber}` 的**下单后**调度信息查询，已接成功页；不能用作下单前指定快递员接口。
- `queryGoodsNameList` 是标准品名分类，入参 `standardLevelGoodsNames`；已有货物联想走 `queryCargoInfo`，不是新增热词接口。
- `queryFileUploadInfoBatch` 返回业务示例图片信息，不是 Excel 上传/导入接口；批量导入需另查真实契约。
- `queryMaterialSupply` 在参考小程序中用于火锅物料，不泛化成普通纸箱库存。
- `queryIsAgreement` 是特定地区家电家居协议查询，不能替代全局电子运单已读检查或实名门禁。
- 自送寄件网点用 `deptCode → startStation`；收件自提的 `deptNo` 保持独立，不能混用。
- 沿用已有产品、包装、保价、优惠券、夜间取件等规则；不按静态结构猜测新增强制校验。

## 验证结果与证据边界

1. 实现阶段 `pnpm verify:app` 全通过：289 条业务测试（本轮新增 26 条）、71 条样式治理测试，另含 TypeScript、ESLint、Stylelint、样式日常/严格治理、RN 边界、路由、模块体积、运行配置与平台配置门禁。第二轮修复产品卡与协议行后再次全量通过：292 条业务测试（第二轮新增 `express/quote-card.test.cjs` 3 条）。第三轮补货物信息页热词、占位与捎话后再次全量通过：299 条业务测试（第三轮新增热词顺序与捎话回传 2 条）。
2. 真机发现的两行 SCSS 修复通过定向 Stylelint 与日常/严格样式治理，无新增样式债务；后续未改业务逻辑，无需仅为交接重复整套检查。
3. 用户授权后，Android 原生环境预检、RN bundle、runtime bundle 检查、Gradle assembleDebug 和 `adb install -r` 均通过；修复样式后再次增量构建并安装。第二轮未重新打包（未获授权），代码改动只有静态门禁与业务测试证据。
4. 真机已验证：启动与寄件入口、`testcargo` 连续追加 `123`、确认返回与再编辑、最近使用持久化及清空、热门“文件”回填、自送模式切换、缺寄件地址时提示、体积说明完整显示。第二轮补齐：填齐地址后的真实询价、改收件地址后的重算、自送网点 20 公里内匹配/默认最近/手动选择回填。最终进程过滤日志未见崩溃标记。
5. **未验证**：重新打包后的产品卡、协议行与货物信息页改动真机复核、提交真实测试订单、成功页实际快递员信息与拨号；没有提交订单或拨打电话。生产展开态像素量测也未验收。第三轮只在生产端取货物信息页截图，RN 侧热词/捎话/占位仅具静态证据。

此前静态业务测试覆盖不等于真机端到端通过，RN 画面正常也不等于与生产逐像素一致。

## 真机与安装包

| 项目 | 交接时状态 |
|---|---|
| 设备 | USB `dcf44968`，OPPO Find X2 / PDEM10，Android API 33，1440×3168 |
| 开发应用 | `com.deppon.app/.MainActivity`，debug，覆盖安装保留数据 |
| 生产应用 | `com.deppon.dpapp` 4.0.7.0，未修改 |
| 最终画面 | 上门取件的寄件页，货物“文件、1kg”，双方地址未填；本轮 `testcargo123` 历史已清理 |
| 冷启动 | `am start -W` Status ok，TotalTime 603ms |
| APK | `D:\codeSpace\com.project\apps\com.deppon.app\android\app\build\outputs\apk\debug\app-debug.apk`，70,852,370 字节 |
| APK SHA-256 | `35318f4b7f4e3ebb6e9a30e59f2486a874c943b6edff06acc6724183175c5a70` |
| Bundle SHA-256 | `1d897378db0dc5ad4515782e29f16c3a8f5977c79ae490126ecddda89ecbfe69`，已确认 APK 内资源与生成 bundle 一致 |
| 证据目录 | `D:\codeSpace\com.project\.dpshots\rn-send-20261019\`，Git 忽略 |

取证文件、截图名称和构建详情见 [device-smoke.md](../parity/send/device-smoke.md)。交接画面是最后一次操作时的记录，续接时先确认手机现状。

本轮 ADB 点击在 RN 应用有效，不要沿用旧文档“当前一定无法点击”的判断。屏幕坐标按 1440×3168 使用，工具展示缩略图可能为 931×2048。优先用 UI XML 的 `content-desc` 与 bounds 定位。手机息屏有安全锁时可能需要用户解锁；不要复用旧设备的防息屏自动化坐标。

Windows 截图用 Python `subprocess.run(..., stdout=二进制文件)` 保存 `adb exec-out screencap -p`，避免 PowerShell 重定向损坏 PNG；含中文脚本可用 `python -X utf8 -`。日志按应用 PID/时间与标签过滤，不清全机日志，不输出凭据。

## 2026-10-19 第四/五轮真机对照（已打包安装并复核）

本轮按用户"很多页面 UI 没对齐、也有功能逻辑问题"的反馈，继续以生产端 `com.deppon.dpapp` 4.0.7.0 为基准逐页对照。**已获用户授权重新打包安装**（debug APK，`adb install -r`），打包-安装-复核闭环已完成。

- 货物信息页：上传照片虚线占位、输入框放大镜+相机图标、右上分享、语音填写图标、热门寄件标题层级、热词配色、捎话计数位置、体积提示单行，均已改并在真机确认（证据 `rn-goods2.png`、`rn-goods3.xml`）。
- 寄件页：去掉生产端不存在的「预计送达时间」空态占位区块；复核后区块顺序与生产端一致（货物信息 → 付款方式 → 优惠券 → 增值服务 → 加密）。
- 客服中心：生产端为 WebView H5，RN 保持原生页但已清掉全部研发角标与工程说明文案，分区改为 常用服务/售后服务/帮助中心，入口改用图标（证据 `rn-support2.png`）。
- 发票：确认生产端点「发票申请」直接弹微信小程序确认框，发票主流程不在 App 内，RN 原生发票页属平台性差异，不按生产端 UI 反推。
- 门禁：`pnpm verify:app` 全绿（299 业务测试 + 71 样式治理 + 全部静态门禁）。改动尚未提交。

**坐标教训（重要）**：ADB 点击必须用 `uiautomator dump` 的 `bounds`（物理 px，屏幕 1440×3168）；从工具预览图目测坐标会偏约 1.8 倍，本轮因此误开了地址簿两次。

**下一步**：仍待逐页对照——网点列表/更多网点、地址簿（列表与编辑页）、设置/个人设置、寄件成功页（生产端需真实下单才能取证，当前不作为验收项）；首页「雪具达 vs 学生专区」差异已记录但不在本轮范围。
## 后续优先顺序

1. 先阅读本文和寄件主链路，核对未提交变更及手机现状；无需重做生产 APK 盘点或重复域名切换调研。
2. 报价与自送网点已在真机验证（第二轮）。剩余真机待复核项：产品卡修复、协议行常显与第三轮货物信息页改动（热词/标题/占位/捎话）需用户授权重新打包安装后，在同一设备上确认；同时可补货物信息展开态、增值服务弹层与库存/超区提示的触发场景。
3. 在用户明确需要测试下单并提供适用测试数据时，再验证提交防重、异常保留草稿、订单结果核实、成功页调度信息和继续寄件全新草稿。不要为验收擅自使用生产应用下单。
4. 生产端可以进入对应场景后，按 `design750 × 1.92 = 1440` 口径补自送态、货物展开与增值服务弹层量测；当前静态和 RN 冒烟证据不能替代这一步。
5. 其余场景按证据推进：下单前指定快递员、月结账号、实名强制条件、地区家电家居协议、超区/库存/升级提示、批量 Excel 导入、收件人「信息填写」流程差异。缺真实触发条件或契约时保留待核状态。
6. 寄件验收后再恢复消息 intMsg 契约校准及旧交接其他 M2 待办。是否整理提交由用户后续安排；不要自动提交或覆盖现有变更。

## 继续遵守的项目规则

- 中文回答；遵守根 `AGENTS.md`。Node `24.13.0`、pnpm `11.9.0`；旧文档 Node 22 的环境故障描述已过时。
- 默认只运行静态门禁。用户“打包到真机上试一下”授权支撑了本次构建安装；交接请求本身不触发新一轮打包，后续按任务授权判断。
- 平台能力进入 `shared/platform`，页面不要直接调用小程序 API 或 NativeModules；继续按 API、规则、映射、hook、组件分层，避免扩张核心巨石。
- 样式使用现有 token；页面 `index.scss` 顶级选择器和 BEM 限制、存量样式债务只降不增等规则继续有效。不要用更新 baseline 掩盖新增债务。
- 原始 APK、日志、截图和构建生成物不入库；不要清应用数据或卸载来解决普通联调问题。

## 可直接用于续接的说明

> 请先读取 `docs/handoffs/2026-10-19-send-production-parity-handoff.md`。当前优先继续 RN 寄件主功能验收：实现和静态门禁已完成，Android 开发包已装到 USB 设备 dcf44968，基础真机冒烟、真实报价、地址变化重算与自送网点选择回填均已通过，代码尚未提交。第二轮真机发现的产品卡裁切与协议行常显、第三轮按生产端校准的货物信息页（12 个热门寄件、标题与占位、给快递员捎话 100 字）都已改代码并通过静态门禁，但需用户授权重新打包后才能复核。保留工作区改动与 owstest 测试环境，先核对设备及测试数据，再按授权打包复核并推进订单主链路。真实下单、生产展开态像素量测和特殊账号场景尚未验收，不要把测试覆盖视为生产全对齐，不要重做域名切换调研。

## 2026-10-19 第九轮：设置 / 个人设置页对齐（本文件最新状态）

按上一轮遗留的「设置/个人设置页逐项对照」继续，生产端仍为同一台设备 dcf44968 上的 4.0.7.0。本轮**未重新打包 RN**（未获授权），真机复核要等下一次打包。

- 生产端取证：齿轮 → 设置页（清除缓存/协议说明/个性化推荐功能/版本信息 + 退出登录）、手机号 → 个人设置页（头像 + 掩码手机号 + 退出登录 + 注销账号）、协议说明到达的「法律条款与隐私政策」页、个人设置进入的「账号注销」页，均截图 + `uiautomator dump`；量测表见 [ui-measure.md](../parity/send/ui-measure.md)，差异清单见 [gaps.md](../parity/send/gaps.md)「第九轮」。
- 已改：
  - `pages/account/settings` 重写为生产端设置页结构；删除账号资料、偏好/隐私/实名/签收码/地址簿入口列表、注销分区与全部工程说明文案。
  - 新增 `pages/account/profile`（个人设置）+ 路由 `accountProfile`；两页导航标题都改为「设置」。
  - 「我的」齿轮 → 设置、手机号区域 → 个人设置（此前两者都跳同一页）；地址簿/签收码本就在「我的」宫格，无入口丢失。
  - 退出登录跟随生产端取消二次确认弹窗（此前 RN 会先弹 modal）。
  - 新增 `src/cache/maintenance.ts`（业务缓存体积/清理，保留登录态、cookie、账号隔离标记与个性化推荐偏好）、`src/cache/preferences.ts`（个性化推荐开关，本地偏好默认开启）、`src/services/account/settings.rules.ts` + `settings.service.ts`；运行时配置新增 `appVersion`（默认取 package.json，可用 `APP_VERSION` 覆盖）。
- 门禁：`pnpm verify:app` 全绿——310 条业务测试（本轮新增 `scripts/business-tests/account/settings.test.cjs` 11 条）、71 条样式治理测试，TypeScript/ESLint/Stylelint/样式日常与严格门禁/RN 边界/路由/模块体积/运行配置/平台配置全部通过。样式基线已按逐文件收紧（新增两页零间距债务）。
- 生产端误触事故：设置页的「退出登录」没有二次确认，点一次即登出。该设备无 SIM（telephony OUT_OF_SERVICE），收不到验证码，已由用户重新登录恢复。**后续在生产端取证时不要点退出登录。**
- 仍未对齐（下一轮优先）：
  - 协议说明页（`pages/privacy/settings`）：生产端是「法律条款与隐私政策」6 行列表 + 底部「撤销同意条款」，RN 仍是状态卡/版本卡/摘要/同步与同意按钮。
  - 账号注销页（`pages/account/cancel`）已做文案与卡片样式对齐：「绑定手机号：掩码」、4 条温馨提示改用生产端原文、去掉红描边、标题放大；仍不同：生产端首屏只有「获取验证码」，验证码输入在下一步（未取证），RN 仍在一页内完成。
  - 生产端清除缓存统计的是 App 缓存目录体积，RN 按 UTF-16 估算业务缓存体积，口径不同；若要一致需要原生缓存目录能力。

## 2026-10-19 第十轮：页面承载方式判定 + 地址簿编辑页对齐

本轮先解决「值不值得对齐」：生产端 `com.deppon.dpapp` 4.0.7.0 是 **Flutter + GetX** 应用（`libapp.so` + `flutter_assets` + 708 个自有 Dart 文件；本机基线 `D:\rea-targets\dpapp-4.0.7.0.apk`，本轮另从设备拉了一份 `base.apk` 到 `.dpshots/artifacts/` 用于核对）。页面分两类：

- **Flutter 原生页**：做像素对齐。
- **H5 页**（Flutter 壳 + `webview_flutter`）：只对齐入口、标题、URL，不做像素对齐。

判定方法（运行时权威口径）：`uiautomator dump` 正文出现 `android.webkit.WebView`，或 `dumpsys activity top` 出现 `io.flutter.plugins.webviewflutter.WebViewProxyApi$WebViewPlatformView` → H5。结论表见新增的 [production-surface.md](../parity/production-surface.md)。

- 确认 **H5，不再对齐**：协议说明/法律条款与隐私政策、隐私设置（我的快捷行）、偏好设置、客服中心、积分乐园、发票申请（跳微信小程序）。
- 确认 **Flutter 原生，继续对齐**：我的、设置、个人设置、账号注销（第二步页 `pages/account/account_cancel_confirm` 存在，未取证）、地址簿列表、创建/编辑地址。

据此把上一轮遗留的「协议说明页对齐」结案为 H5 不做，把剩余精力放到原生页：

- **地址簿创建/编辑页对齐**（`pages/contact/edit`）：导航标题按状态切换（新建=创建新地址、编辑=编辑联系人）、占位文案改为真实姓名 / 固话通用号 / 详细地址（如街道、门牌号、小区等）、新建时补「分机号」列、「通讯录」移到姓名行最右、粘贴并识别与底部确定改为纯品牌蓝、删除行内校验块（生产端只在提交时 toast）。
- **结案**：上一轮交接里待产品确认的「保存到地址簿 vs 设为默认地址」在生产端不存在二选一，编辑页只有「设为默认地址」。
- **已知差异**：生产端「地区/城市」是单行城市选择器（点击选择），RN 仍是省/市/区三个输入框——缺少城市选择器组件，列为后续独立任务；其余字段已按量测对齐。
- 门禁：`pnpm verify:app` 全绿（310 条业务测试 + 71 条样式治理测试），Stylelint/样式日常与严格门禁通过。
- 仍未做：真机复核需重新打包（未获授权）；账号注销两步流程、我的页整页对照、订单详情操作态对照。

## 2026-10-19 第十一轮：账号注销拆成两步并完成对齐

生产端 4.0.7.0 的注销是**两步原生页**（`pages/account/account_cancel` + `pages/account/account_cancel_confirm`，`uiautomator dump` 均无 WebView）：第一步只有「获取验证码」，点击即发短信并进入第二步；第二步是 6 格验证码 + 「Ns后重试」倒计时 + 红色「确认注销」，没有勾选协议。

- 第一步 [pages/account/cancel](apps/com.deppon.app/src/pages/account/cancel/index.tsx) 重写：绑定手机号（34 加粗）+ 温馨提示 4 条带编号 + 蓝色「获取验证码」胶囊；成功后 `navigateToAppRoute(accountCancelConfirm)`。
- 第二步新增 [pages/account/cancel/confirm](apps/com.deppon.app/src/pages/account/cancel/confirm/index.tsx) + 路由 `accountCancelConfirm`（标题「注销账号」）：6 个验证码格子（81×119，间距 24，填充 #f5f7fa）用透明输入框承接输入、`60s后重试` 倒计时（到 0 可重发）、红色 `#f95557` 确认注销胶囊；注销成功 toast 后回「我的」。
- 量测写入 [send/ui-measure.md](../parity/send/ui-measure.md)，差异收口写入 [send/gaps.md](../parity/send/gaps.md)。
- 新增 `scripts/business-tests/account/cancel.test.cjs` 7 条：第一步渲染与编号、发送成功跳转/失败留在原页、第二步 6 格与倒计时、短验证码拦截、成功提交回首页、失败保留。
- 门禁：`pnpm verify:app` 全绿（**317** 条业务测试 + 71 条样式治理测试），路由/样式/边界/模块体积门禁通过，样式基线已按逐文件收紧。
- 仍未做：真机复核需重新打包（未获授权）；「我的」页整页对照、订单详情操作态、地址簿城市选择器。

## 2026-10-19 第十二轮：「我的」页整页对照结论（结构已齐，差在数据源）

用生产端 `prod-mine3.{png,xml}` 与 RN `rn-mine3.png`（16:43 装机版）逐区块对照：

| 区块 | 结构 | 结论 |
|---|---|---|
| 头部（头像 + 掩码手机号 + 个人设置 › + 消息/分享/设置） | 一致 | ✅；未读数角标 RN 已支持数字（`mine-hero__message-badge`），截图里是红点因为接口未返回未读数 |
| 会员卡（普通会员 + N 项权益 + 成长值 + 券/储值卡/积分 + 徽章） | 一致 | ✅ 结构一致 |
| SVIP 条 | 一致 | 🔶 文案不同：生产端「首次开通3.6元，立享价值819.2元权益」，RN 写死「SVIP 专属权益」；生产端文案大概率服务端下发，待取会员权益接口字段后替换 |
| 订单统计（全部订单/待揽收/待支付/运输中/已签收） | 一致 | ✅；截图显示 `--` 是加载中占位 |
| 快捷行（地址簿/偏好设置/专属快递员/隐私设置/发票申请） | 一致 | ✅ |
| 服务宫格（17 项 + 福利/HOT/上新角标） | 一致 | ✅ 与生产端条目、顺序、角标一致 |
| 底部 tab（寄件/查快递/福利/我的，福利带领券角标） | 一致 | ✅ |

数据源层面的差异（非结构问题，等接口字段确认后补齐）：成长值上限（生产端 `0/85`，RN `0/--`）、优惠券数、我的积分、快过期券角标「2张快过期啦」、SVIP 条文案。

因此「我的」页不再作为结构对齐任务，剩余是会员/优惠券接口字段取值。

## 2026-10-19 第十三轮：地址页城市选择器（新组件）+ 订单详情操作态取证

### 城市选择器（已完成）

生产端地区行是整行可点的选择器，点击弹「选择城市」底部弹层（`prod-citypicker1`）。RN 原来是三个输入框（省/市/区），本轮替换：

- 新增 `services/contact/region.api.ts`（读 `https://ca.deppon.com/ows/static/common/cityData/city-receiver.json`，进程内缓存）→ `region.rules.ts`（归一化中国 34 省、`省 市 区` 拼接、三级搜索、热门城市定位）→ `region.service.ts`（`regionService.loadProvinces()`，页面唯一入口，满足 `check-rn-boundaries`）。
- 新增 `pages/contact/edit/components/RegionPicker`：标题「选择城市」+ 圆形关闭 + 搜索药丸 + 6 个热门城市药丸 + 「请选择省份/城市/区县」逐级 tab（已选层级可回退）+ 列表行。
- 地址页地区行改成单行选择器（右侧箭头 + 定位按钮不变），选中后回填 `province/city/county`。
- 新增测试 13 条：`region.test.cjs`（归一化、拼接、搜索、热门城市、limit）与 `region-picker.test.cjs`（隐藏、加载、三级下钻回填、热门城市直达区县、搜索命中区县、加载失败提示）。
- 门禁：`pnpm verify:app` 全绿（**330** 条业务测试 + 71 条样式治理），样式基线已收紧。

### 订单详情操作态（只拿到已取消态）

生产端账号下只有 1 张已取消运单，取证确认底栏 = 客服 / 再来一单 / 重新寄件，与 RN 现状一致；待揽收、待支付、运输中、已签收四态的底栏按钮（allot/sign/transit）仍缺真实数据，`order/gaps.md` 已记录挂起原因（不在测试环境真实下单）。

## 2026-10-19 第十四轮：下单成功页（用 libapp.so 字符串实证替代截图）

成功页必须真实下单才能进入，本轮**没有真机截图**，改为对 `lib/arm64-v8a/libapp.so` 做 UTF-16LE 中文字符串检索（Dart AOT 快照里中文不是 UTF-8，直接 `grep 成功` 是 0 命中，必须按 UTF-16LE 读）。实证结论：

- 页面标题是「下单成功」（2 次），`预约成功` 0 次 → RN 旧标题错误。
- 信息区是「寄件信息」；`结果信息`、`当前状态`、`进入订单列表`、`待生成` 都是 0 次 → RN 自造文案，全部删除。
- 底部按钮是「继续寄件」+「查看订单」，`查看详情`/`订单列表` 0 次 → RN 的「查看详情」「进入订单列表」删除。
- 存在「秒后自动返回首页」模板串 → 成功页有自动返回首页倒计时，RN 补了 `60秒后自动返回首页` 并自动回寄件首页（秒数生产端未知，暂定 60，已在 gaps 标注）。
- 快递员卡状态文案生产端是「自动分配快递员」「已通知」，RN 仍是自造措辞，待有截图后再收敛。

改动：[pages/express/success](apps/com.deppon.app/src/pages/express/success/index.tsx) 重写 + `express-success-countdown` 样式（纯 token）。测试：`scripts/business-tests/express/success.test.cjs` 增 3 条（生产文案断言、查看订单跳转、继续寄件全新草稿），连同原有 6 条共 9 条。门禁：`pnpm verify:app` 全绿（**333** 条业务测试 + 71 条样式治理）。

方法沉淀（后续可复用）：判断生产端某个文案是否存在，不要靠猜，直接在 `libapp.so` 里检索 UTF-16LE 编码的字符串并统计出现次数；次数为 0 就能确定 RN 的文案是自造的。

## 2026-10-19 第十五轮：H5 入口与 URL 对齐（WebView devtools 抓真实地址）

发现一条比翻 `libapp.so` 更硬的路子：生产端 WebView 带调试，`/proc/net/unix` 有 `@webview_devtools_remote_<pid>`，`adb forward` 到 9222 后 `curl /json/list` 就能读到**运行时真实 URL**（含 ecoToken、pageSource、sonSource 等参数）。四个入口实测结果写进了 [production-surface.md](../parity/production-surface.md)。

据此修掉三处 RN 偏差：

1. 偏好设置 URL 缺参数：生产端是 `/depponmobile/mow/center/accountSet?pageSource=APP&sonSource=CENTER_USER_SETTING`（订单详情进入是 `ORDER_DETAIL_USER_SETTING`），RN 原来是裸路径。已补参数并新增 `ORDER_DETAIL_ACCOUNT_PREFERENCES`。
2. 「设置 → 协议说明」在 RN 原来跳原生隐私设置页，生产端其实是 H5 `/depponmobile/protocol/record`（标题「法律条款与隐私政策」）。已新增 `PROTOCOL_RECORD` 目标并改用 H5。
3. 「我的 → 隐私设置」在 RN 是原生隐私页，生产端是 H5 `/depponmobile/mow/customer/privateSetting`（隐私面单设置）。已改为 H5 入口（`CUSTOMER_PRIVATE_BILL`，导航标题按生产端入口名显示「隐私设置」；生产端 H5 未设 document.title，导航栏显示「德邦快递」，属 H5 侧差异）。

未做、需要决策的一项：**我的 → 客服中心**，生产端是 H5 `#/partsPackagePages/customer/index`，RN 现在是原生「客服中心」聚合页，且首页浮动客服、订单详情、我的宫格都指向它。改成 H5 会动到多处入口，先记录证据与结论，等确认是「保留原生聚合页」还是「统一走 H5」再动。

测试：`webview/contracts.test.cjs` 增加 `PROTOCOL_RECORD`/`CUSTOMER_PRIVATE_BILL`/偏好设置参数断言，`account/settings.test.cjs` 的协议说明断言从原生路由改为 H5 source。`pnpm verify:app` 全绿（**334** 条业务测试 + 71 条样式治理）。

## 2026-10-19 第十六轮：会员/福利入口批量对齐（11 个 H5 入口实测）

继续用 WebView devtools 抓地址，把「我的」宫格与会员卡上还没对齐的入口一次性做掉：

| 入口 | 生产端 | RN 原先 | 处理 |
|---|---|---|---|
| 入群有礼 | `/depponmobile/h5/index#/pages/groupBenefit/index` | 原生会员中心 | ✅ 新增 `GROUP_BENEFIT` |
| 体验调研 | `/depponmobile/survey/center` | 原生客服中心 | ✅ 新增 `EXPERIENCE_SURVEY` |
| 企业福利 | `mas.../crm-api/.../24-QYJ?code=...` | 原生会员中心 | ✅ 新增 `ENTERPRISE_WELFARE` |
| 优待证优惠 | `mas.../crm-api/.../24-JRYD?code=...` | 原生会员中心 | ✅ 新增 `PREFERENTIAL_CERT` |
| 学生专区 | `mas.../cms-h5/h5.html#/student-member/center` | 原生会员中心 | ✅ `MEMBER_STUDENT_CENTER` 补 URL，标题「学生会员」 |
| 我的积分 | `mas.../cms-h5/h5.html#/points-center/home` | URL 为空 | ✅ `MEMBER_POINTS_CENTER` 补 URL，标题「积分乐园」 |
| 会员卡 | `mas.../cms-h5/h5.html#/member/home` | URL 为空 | ✅ `MEMBER_CENTER_HOME` 补 URL |
| SVIP 立即开通 | `mas.../cms/h5.html#/svip-member/home` | URL 为空 | ✅ `MEMBER_SVIP_CENTER` 补 URL（走老 `cms` 路径） |
| 协议说明（宫格） | `/depponmobile/protocol/record` | 原生隐私页 | ✅ 改 `PROTOCOL_RECORD` |
| 隐私政策（协议记录页内） | `/depponmobile/h5/index#/homePackagePages/privacy/index` | `/depponmobile/protocol/policy/index`（错） | ✅ 改正 |
| 储值卡 | `pcs.deppon.com.cn/#/OpenhomePage` | 原生储值卡 | ⏸ 另一个域名且不在白名单，保留原生 |

实现细节：会员域 URL 不写死域名，改为跟随运行时 `memberWebURL` 推导（`cms-h5` / `cms` 两套路径 + `crm-api` 活动页同源），避免测试包跳到生产 mas。测试补在 `member/contracts.test.cjs` 与 `webview/contracts.test.cjs`，`pnpm verify:app` 全绿（**334** 条业务测试 + 71 条样式治理）。

仍挂起：客服中心统一方案（原生聚合页 vs H5）需产品决策；储值卡 H5 需要先决定是否把 `pcs.deppon.com.cn` 加入白名单。

## 2026-10-19 第十七轮：会员卡快过期券角标（像素级取证）

生产端「我的」会员卡卡面（uiautomator content-desc 全文）：`普通会员` / `2项权益` / `当前成长值 0/85`，优惠券上方还有一枚 `2张快过期啦` 角标。截图像素采样得到：

- 角标底色 `#f0484e`（= 现有 token `$dp-color-danger-accent`，和「原德邦E卡」角标同色）
- 角标实测高 63px → 设计 33px，与现有 32px 角标一致
- 角标左边缘实测 x=157 → 设计 82，即会员卡内边距 24 + 宫格内 32

RN 原先完全没有这枚角标。改动：

1. `mine.model.ts` 新增 `getExpireCouponBadgeText(count)`（0 或负数返回空串）。
2. `MineMemberCard` 接收 `expireCouponCount`，>0 时在「优惠券」上方渲染 `.mine-member-card__benefit-badge--expire`。
3. `mine/index.tsx` 在原有并发请求里加 `couponService.queryExpireCount()`（失败兜底 0），并传给会员卡。
4. SCSS 只加一条左偏移覆盖，复用既有角标尺寸/字号/颜色 token（零债务）。

测试：新增 `scripts/business-tests/mine/member-card.test.cjs` 4 条（角标文案规则、卡面生产文案回归 `当前成长值 0/85` / `2项权益` / `我的积分60`、角标仅正数显示、成长值上限缺失时回落 `0/--`）。`pnpm verify:app` 全绿（**338** 条业务测试 + 71 条样式治理）。

仍未对齐：会员卡数据依赖真实接口返回（成长值上限 85、优惠券 5、积分 60 都是账号数据）；SVIP 条文案 `首次开通3.6元，立享价值819.2元权益` 来自接口 `svipMessage`，RN 在无数据时回落到自造文案「SVIP 专属权益」，需真机联调后确认接口字段是否一致。

## 2026-10-19 第十八轮：「我的」宫格几何核对（只改了一处）

用生产端截图做像素测量（设备 1440 宽，设计稿 750 宽，换算系数 1.92），逐项核对 RN 的尺寸：

| 元素 | 生产端实测（real px） | 换算设计稿 | RN 原值 | 结论 |
|---|---|---|---|---|
| 快捷行格子高 | 261 | 136 | 136 | ✅ 一致 |
| 服务宫格格子高 | 238 | 124 | 124 | ✅ 一致 |
| 服务宫格图标内容 | 85 | 44 | 48（含边距） | ✅ 一致（图标源图 144×144、内容 132×132，48×0.9167≈44） |
| 快捷行图标内容 | 96 | 50 | 56（含边距） | ✅ 一致（56×0.9167≈51） |
| 宫格标「福利」宽×高 | 92×54 | 48×28 | 高 32、圆角 12 | ❌ 高度偏大 4px |
| 宫格角标右外边距 | 47 | 24 | 24 | ✅ 一致 |
| 会员卡角标高 | 63 | 33 | 32 | ✅ 一致 |
| 快捷行/宫格标签字高 | 43 / 42 | 22 / 22 | 23 / 24 | ≈ 一致（差值在抗锯齿噪声内，不动） |

唯一修改：`.mine-service-grid__badge` 高度 32→28、`line-height` 同步 28、圆角改 `$dp-radius-pill`（生产端顶部一行红色跨度只有 609..646，等于半高 27px，是标准胶囊而不是 12px 圆角）。宽度不用改：字体 18px + 左右 6px 内边距算出来正好 48 设计 px，与实测 92/1.92=48 吻合。

方法沉淀：核对图标尺寸不能只看像素 bbox，必须先把源图下下来算内容占比（`https://ca.deppon.com.cn/ows/center/N.png` 都是 144×144、内容 132×132），再用 bbox ÷ 占比 反推显示尺寸，否则会把 48px 误判成 44px 然后越改越错。

`pnpm verify:app` 全绿（338 条业务测试 + 71 条样式治理）。

## 2026-10-19 第十九轮：底部 TabBar 测量 + 客服中心入口改 H5

### TabBar 测量（1440 宽截图，÷1.92 得设计稿）

| 元素 | 生产端实测 | 设计稿 | RN 实测 | 差异 |
|---|---|---|---|---|
| 底栏高（含安全区） | 215 | 112 | 202 | RN 矮 13px（≈7 设计 px） |
| 图标墨迹高 | 72 | 37.5 | 78 | RN 大 6px |
| 标签字高 | 48 | 25 | 48 | ✅ 一致 |
| 图标底→文字顶 | 15 | 7.8 | 25 | RN 大 10px |
| 图标墨迹顶距底栏顶 | 39 | 20 | 26 | RN 少 13px |
| 选中色 | `#1957ff` | — | `#1a5eff` | ≈ 一致 |
| 未选中文字色 | `#111111` | — | token | ≈ 一致 |

结论：RN 底栏比生产端矮约 7 设计 px，图标略大、图标与文字间距略大。图标墨迹差 6px 主要是**图标素材本身不同**（RN 是本地 144×144、内容占比 0.833~0.917 的图，生产端是另一套图），按墨迹反推显示尺寸会得到自相矛盾的 40/45，因此**不动图标尺寸**；底栏高度与内边距的差异只有 7px 量级，没有设计稿不敢盲调，先记录。

### 福利 Tab 的「领券」角标：证据冲突，保留不动

RN 在「福利」tab 上常驻一枚「领券」红标。逐张扫描生产端截图：

- `prod-home.png` / `prod-start.png`：福利 tab 位置有红标 ✅
- `prod-mine*.png`（5 张「我的」）：红标像素数为 0 ❌

说明生产端这枚角标是**有条件出现**的（首页有、我的页没有），RN 写死成常驻不完全对，但缺少「什么条件才显示」的信号来源，先保留并在 gaps 记录，等拿到触发条件再改成条件渲染。

### 客服中心：改走 H5（本轮唯一代码改动）

生产端「我的 → 客服中心」实测是 H5 `https://www.deppon.com/depponmobile/h5/index#/partsPackagePages/customer/index`，RN 原来跳原生聚合页。新增 `CUSTOMER_SERVICE_CENTER` 目标并把「我的」宫格该项改成 `webSource`，契约测试补断言。

**没有动**首页浮动客服、首页在线客服条、订单详情客服：这三个入口在生产端的 URL 还没有单独抓（首页浮层可能走另一套），等有实测再改，避免「一半 H5 一半原生」的混乱。原生 `pages/support/center` 页面暂时保留（不再从「我的」进入）。

`pnpm verify:app` 全绿（338 条业务测试 + 71 条样式治理）。

## 2026-10-19 第二十轮：在线客服取证（确认不能照抄 URL）

首页「在线客服」实测地址：`https://im.deppon.com.cn/dzfront/web/vChat?token=...&showChat=true&layout=false&code=...`。两次打开 token/code 都不同，说明是**动态换取**的会话地址；RN 现在指向 `serviceWebURL`（`dzfront/web/home`），是客服主页而不是会话页。

在 `libapp.so` 里没找到明确的「换取客服 token」接口（`onlineService/.../chat/secure` 下只有未读数接口），需要抓包确认。因此本轮**没有改代码**：把「URL 里带动态 token」这件事写进 [production-surface.md](../parity/production-surface.md)，并记下 RN 与生产端的差距，等拿到换取方式再统一改首页浮动客服、首页在线客服条、订单详情客服三处。

本轮无代码改动，门禁维持上一轮全绿状态（338 条业务测试 + 71 条样式治理）。


## 2026-10-20 第二十一轮：真机打包/安装链路提速

用户问「为什么打包装到真机这么慢」。本轮不碰业务代码，只把链路拆开量化并加两个开关，明细写进 [android-fast-loop.md](../dev/android-fast-loop.md)。

实测拆解（本机 USB 真机）：JS bundle（Taro，去掉 `--reset-cache`）**141s**；Gradle 配置 `help` 就要 **95~120s**（空工程 15s，差额全部来自本工程配置期的 RN autolinking node 调用，`:app` 与根工程各约 50s）；四 ABI 打包 APK **67.6MB**（`lib/` 未压缩 141.7MB，arm64 只占 37.8MB）；安装从 3s 到 678s 都出现过，取决于 USB 链路状态。合计 4~6 分钟。

改动：

- `android/app/build.gradle`：新增 `-PtargetAbis` 开关，走 `defaultConfig.ndk.abiFilters`；不传时行为不变，发布流程不受影响。实测单 ABI APK **24.9MB**，安装 3s 级。
- `android/gradle.properties`：打开 `org.gradle.daemon/parallel/caching`（`parallel` 原来是注释状态）。
- 打包时必须同时给 `-PreactNativeArchitectures=arm64-v8a`，否则 `expo-modules-core` 仍会为 4 个 ABI 跑 CMake。
- `pnpm check:platform-build` 通过。

推荐循环：改 JS 走 Metro（`adb reverse tcp:8081 tcp:8081` + `pnpm dev:rn`，保存即热更，秒级）；需要新 APK 时才 bundle + 单 ABI Gradle + install（约 3.5 分钟）。注意 `pnpm dev:rn` 必须在真终端里跑，`@tarojs/rn-supporter` 会调用 `process.stdin.setRawMode`，非交互 shell 直接崩。

真机上已重装单 ABI debug 包（`lastUpdateTime=2026-10-20 09:29:24`），本轮无业务代码改动，门禁状态不变（上一轮 338 业务测试 + 71 样式治理全绿）。

### 重装验证（同日 10:13）

按用户要求重新打包并装到真机：`pnpm bundle:android`（全量，约 6 分钟）→ 单 ABI `assembleDebug`（114s，APK 24.8MB）→ `adb install -r`（2s）→ `lastUpdateTime=2026-10-20 10:13:28`，冷启动进首页正常。APK 内 `assets/index.android.bundle` 与 `android/app/src/main/assets/index.android.bundle` 的 SHA256 一致，确认装的是新包。

期间 bundle 日志暴露出一个真 bug：`src/pages/account/cancel/confirm/content.scss` 里 `color: \-color-transparent;`（早前批量替换 `$dp` token 时的残留），sass 原样输出，RN 运行时报 `Invalid prop color ...: \-color-transparent`。已改为 `color: $dp-color-transparent;`，全仓再扫 `\-[a-z]` 无其它残留；`stylelint` + `pnpm check:styles` 通过。

顺带确认：`adb kill-server` 后链路从每次 shell 22s 恢复到 0.2s，之前那次 678s 的安装就是 adb server 老化导致的。
