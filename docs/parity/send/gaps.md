# 寄件模块差异清单(send/gaps.md)

生成:2026-10-18(M1)。合并 [structure.md](./structure.md) 结构差异与 [api.md](./api.md) 接口差异,供 M1 评审后进 M2 实现。
来源标注:【结构】= 生产端文件树推断;【接口】= 小程序源码 + libapp.so 实证。UI 量测差异待 dpshots(每项实现前先量测)。

## 2026-10-19 第二轮：真实报价与自送网点验收

使用测试账号已有收寄地址在同一设备补完询价与网点环节，未提交订单。

- 已验证：填齐地址后自动询价返回「小件标快次日 ¥10 起 / 明天18:00前」；收件地址改北京后自动重算为「特快隔日 ¥16」「小件标快隔日+ ¥14」；自送模式按寄件地址返回 20 公里内 4 个网点、默认最近网点「当前选择」、手动选择后回填寄件页并隐藏「提前电话联系」行。
- 已修：产品卡在真实报价下裁切（产品名折行截断、时效被省略为「运输时效：…」）。修复为产品名单行 + 长名加宽标题带，时效按参考端拆成前段/时刻/后段居中展示并去掉「运输时效：」前缀（生产端字符串无此前缀），同时按 `XLYHF` 补「惊喜优惠¥X」角标。新增 `quote-card.test.cjs` 覆盖。
- 已修：协议行改为常显（生产端空态即显示），校验文案改为点过下单后才展示。
- 新登记差异（待核流程）：生产端点击收件人卡片进入「收件人信息填写」页（粘贴并识别/语音识别/图片识别 + 地址簿 + 历史地址 + 保存到地址簿），RN 直接进入地址簿列表；生产端「寄件」频道首页入口集合也与 RN 首页不同（属首页范围）。

## 2026-10-19 第三轮：货物信息页生产端对照

生产端 4.0.7.0 从寄件页「货物信息」行进入货物信息页截图对照（`prod-goods-page.png`、`prod-goods-check2.png`）。本轮只做静态结构/文案对照，未重新打包 RN，也未做像素量测。

- 已对齐：热门寄件 12 个标签及四列三行顺序（五金配件、服装鞋帽、文件、化妆品、行李、日用品、礼品、家电设备、家具建材、食品、特产、工艺品）；区块标题由「热门品名」改为「热门寄件」；输入占位改为「请输入物品名称」。改动在 `src/services/goods/goods.service.ts`、`src/pages/express/goods/index.tsx`，`goods-editor.test.cjs` 增加顺序断言。违禁品查询页沿用同一份热词列表，生产端该页未单独截图，顺序一致属推断，待核。
- 已迁移：「给快递员捎话」由寄件页增值服务里的折叠「备注」迁到货物信息页，与生产结构 `cargo/info/remark` 及截图一致；100 字上限、`0/100` 计数，确认时随货物经 `goodsBridge` 一次性回传寄件页，增值服务不再重复提供备注入口。
- 新登记差异（未实现）：
  - 上传照片与拍照识别：生产端输入框右侧有相机图标、捎话区有「上传照片」占位；`shared/platform` 尚无图片选择能力，上传契约未核。
  - 「纸箱、缓冲物等需额外收费 ›」「了解计费规则 ›」：生产端为可点链接，目标页与参数未取证，RN 目前为纯文本。
  - 页面右上「分享」入口：生产端货物信息页有，RN 导航栏未提供。
  - 「语音填写」：生产端带图标，RN 为纯文本按钮并走统一降级提示。
- 证据边界：以上对照来自生产端截图与已有结构树；自送态、货物展开、增值服务弹层与货物信息页像素量测仍待生产端有测试数据后补。

## 2026-10-19 寄件主链路续接

用户本轮明确优先对齐 RN 寄件主功能。初始态 UI 已验收结果继续沿用，本轮按已有生产结构和已核实的调用契约补功能，不宣称展开态像素对齐。实现和验收入口见 [main-flow.md](./main-flow.md)。

- 已补：货物名称连续输入、品名搜索过期响应隔离、独立的最近使用记录及清空；体积/件数校验。
- 已补：自送网点按寄件地址匹配最近服务点、手动选择与回填、地址/模式过期保护，继续保留收件自提流程。
- 已补：订单提交同步防重、登录前草稿保存失败保护、询价失败清除旧产品；协议勾选和备注不再打断询价，协议正文可阅读且不自动勾选。
- 已补：成功页快递员查询、待分配/失败重试与电话入口；继续寄件携带全新草稿。
- 契约纠正：`preAllocationCourier({orderNumber})` 是成功页调度信息，不能作为下单前选人接口；`queryGoodsNameList` 是标准品名分类查询，不能当作搜索热词；`queryFileUploadInfoBatch` 用于业务图片，不能据此认定是 Excel 导入契约；`queryIsAgreement` 在小程序用于特定地区家电家居协议，不能替代通用电子运单协议。

## 2026-10-19 第四轮：货物信息页缺口收口 + 客服中心去脚手架

生产端 4.0.7.0 货物信息页用 `uiautomator dump` 取真实 `bounds` 后逐项对齐(量测表见 [ui-measure.md](./ui-measure.md))。`pnpm verify:app` 全绿(299 业务测试 + 71 样式治理)。

- 已修(上一轮登记的 4 条差异全部收口)：
  - 上传照片占位:`GoodsMediaUploader` 组件(虚线 184×184 + 相机图标),点击走 `shared/platform.chooseAppFile`,能力未接入时给统一降级提示。
  - 输入框放大镜 + 相机图标:`express-goods-input-row`(相机为「图片识别」占位,同样统一降级)。
  - 页面右上分享:货物信息页复用 `ExpressNavBar onShare` → `shareWithApp({source:'EXPRESS_GOODS'})`。
  - 语音填写图标:`AppIcon microphone`(新增 `camera`/`microphone` 两个图标名)。
- 新修(本轮量测发现)：
  - 热门寄件标题由灰色小字改为与「物品名称」同级的加粗标题。
  - 热门寄件热词由品牌蓝底蓝字改为生产端的中性底 + 深色字。
  - 捎话计数 `0/100` 由输入框下方独立一行改为框内右下角绝对定位。
  - 步进器样式抽到 `goods/components/GoodsStepper`,页面 `content.scss` 保持 300 行政策上限以内(`pageScssLines=300`)。
- 仍未实现：`了解计费规则 ›`/`纸箱、缓冲物等需额外收费 ›` 生产端为可点链接,目标页与参数未取证;生产端 H5 客服中心的宫格分页、帮助中心搜索与分类 tab 未实现(见 ui-measure.md 末节)。
- 补充：总体积提示由两行折行改为单行(收窄左右间距 + `body-small` 字号),与生产端单行一致。

## 2026-10-19 第五轮：寄件页「预计送达时间」空态收敛

- 事实：生产端 4.0.7.0 寄件页在**收寄地址/货物未齐、未发起试算**时不渲染「预计送达时间」区块(自送态 `prod-now.png`、上门态 `prod-goods2.png` 区块顺序均为 货物信息 → 付款方式 → 天气条 → 优惠券 → 增值服务 → 加密)。RN 之前无条件渲染该区块并显示「收寄地址与货物齐全后自动试算」+「重新获取」占位。
- 已改：`ExpressQuoteSection` 在无报价时只在存在失效原因(如「取件方式变化，请重新获取价格」)或试算失败时渲染提示与「重新获取」,`idle`/`loading` 一律不渲染,与生产端一致。
- 已核：RN 寄件页其余行距与生产端一致(货物信息行 1866 → 付款方式 2023,行距 157px,与生产端同值)。

## 2026-10-19 未纳入本轮范围但已记录的差异(首页)

- 首页快捷入口：生产端第二行第二项为「雪具达 / 直达雪场，专业包装」,RN 为「学生专区 / 学生注册，月月福利」。首页不在用户本轮选定范围内,未改,留作后续立项依据(`rn-home2.xml` vs `p1.xml`)。

## 2026-10-19 第六轮：更多网点页(德邦快递服务点)重构

生产端从寄件页「更多网点」进入的是 **德邦快递服务点** 纯列表页：导航标题「德邦快递服务点」+ 分享；卡片为 网点名(粗)/地址/⏱营业时间/📞电话，右侧两个方按钮「电话」「距离」；点击卡片即选中，选中的卡片带蓝色描边。该页**没有**地址表单、查询按钮、区域标题与「地址匹配」标签。

RN 之前进入的是通用「网点查询」页：标题「网点查询」、自送服务点说明条 + 使用最近服务点、寄件地址四段表单、查询自送网点按钮、区域头(上海-上海市-青浦区/共 4 个网点/地址匹配)，列表行为 距离/电话/业务/营业时间 文本 + 详情/选择按钮。

已改（`pages/query/stations`，仅影响 `source=EXPRESS_SERVICE_POINT`）：

- 动态标题：进入自送选择态调用 `Taro.setNavigationBarTitle({ title: '德邦快递服务点' })`（真机已验证标题生效）。
- 隐藏地址表单、查询按钮、说明条与区域头——地址由寄件页带入并自动查询，与生产端一致。
- `StationQueryResults` 新增服务点卡片分支：白底圆角、选中态蓝色描边、左侧营业时间/电话带图标、右侧 88×88 方按钮(电话 / 距离)，整卡可点选中。
- 收件自提(`EXPRESS_DELIVERY_POINT`)与普通网点查询态保持原样，行为未变。

验证：`pnpm verify:app` 全绿(299 业务测试 + 71 样式治理)；真机已复核：标题「德邦快递服务点」、无地址表单、卡片左对齐、营业时间单行、右侧 88×88「电话/距离」按钮、选中蓝描边（`rn-stations5.png`）。门禁 299 业务测试 + 71 样式治理全绿。
## P0(下单主链路)

| # | 差异项 | 来源 | RN 现状 | 对齐动作 |
|---|---|---|---|---|
| 1 | 取件时间窗接口(dispatchTime 系/queryOrderTime) | 接口 | ✅ 已核对(2026-10-18):dispatchTimeByDeptCode 与 dispatchTimeNew 均已接(express.api.ts + order.api.ts + order.edit.schedule.api.ts);仍缺 pilotCityDispatchTime / queryOrderTime(试点城市场景,待产品确认是否需要) | 缺口降级 P2;P0 关闭 |
| 2 | ~~下单页券推荐(queryCouponRecommend)~~ | 接口 | ✅ 已核对(2026-10-18 M2):**MP-ONLY 误标**——生产端 libapp.so 无此端点,小程序内仅 PDA 线下开单场景定义且无页面调用;生产端下单页券 tile 实际走 `couponService/queryCouponOrder`,RN 已接全链路(useExpressCoupons + ExpressCouponCard/Sheet 已挂 express/index.tsx) | **缺口关闭**;剩余仅券 tile 视觉对齐,归并到 #3 tiles 对照 |
| 3 | 图形验证码链路(captcha 2 端点 + encrypt_util 加密) | 接口+结构 | ✅ 已实现(2026-10-18 M2):契约钉死于 [login/api.md](../login/api.md)(anji-plus 开源同源实证 + 测试网关探针);`services/captcha` 域 + 登录页点选组件 + 频控触发接线 + 黄金向量单测已落,verify:app 全绿 | 剩余:精确触发 code 待抓包/真机收敛;点选图显示尺寸待 dpshots 量测修正 |
| 4 | 下单表单"行折叠 tiles"粒度(cargo/delivery/payment/pickup_time/postman/product 等独立行) | 结构+UI | ✅ 已对照(2026-10-18,[ui-measure.md](./ui-measure.md)):初始态 13 个区块全部同构,唯一缺口客服浮窗已补(AppSupportFloat 上收 shared,列表页同步复用) | **P0 关闭**;自送态/货物展开/增值服务 sheet 待生产端有测试数据后补量测 |
| 5 | tips 体系:extra_charge 超区加价、sieve_stock 网点库存提醒、upscale 升级引导 | 结构 | 未见 | 真机确认触发场景后实现;库存提醒接 sieveOrder/tips 类端点 |

## P1(高频增强)

| # | 差异项 | 来源 | 对齐动作 |
|---|---|---|---|
| 6 | 加密附言(encrypt widget + bottom_sheet) | 结构 | 隐私号能力,接 shared/platform 或后端开关 |
| 7 | 批量寄 Excel 导入(batch/express/excel) | 结构；接口待核 | RN batch 页导入入口与解析需另核真实契约；queryFileUploadInfoBatch 已证实为业务图片查询，不作为导入接口 |
| 8 | 货物名搜索与 hot/lately | 结构+接口 | **2026-10-19 已接主流程**：联想使用已有 queryCargoInfo，修复输入即收起和旧响应覆盖；补最近使用。queryGoodsNameList 为标准品名分类，非热词接口 |
| 9 | 物料供应 queryMaterialSupply | 接口 | 小程序用于火锅专属物料（picCode/materialName/unitPrice/materialSpec），不能泛化为普通纸箱库存；普通包装已有目录、询价与下单映射，特殊物料按场景另核 |
| 10 | 成功页调度快递员 preAllocationCourier | 接口 | **2026-10-19 已接成功页**：按 orderNumber 查询。生产下单前 postman tile 的具体候选来源和条件仍待核，不混用此端点 |
| 11 | 跑马灯公告 marquee | 结构 | 首页/下单页公告位 |
| 12 | 实名与协议确认 | 结构+接口 | 实名 RN 已有 realname 域，强制条件待生产行为验证；通用电子运单协议已补正文入口。queryIsAgreement 是特定地区家电家居协议查询，按场景另核，不新增全局强制校验 |

## P2-P3(长尾)

- 公益寄 charitable、大件物流 logistics 独立入口【结构】
- queryAlonePrice / queryFreightPrice / routeDeliModel / orderPriceLog 等价格长尾端点【接口】
- E 卡弹层(ecard_introl/ecard_protocol,与 pay 模块 E 卡通道联动)【结构+接口】

## 已确认无差异(抽样)

价格时效主接口 queryPriceTime(含 YTY 置底、雪具包装费加价的业务规则,小程序与 RN 同源);createOrder 下单主接口;地址簿全套接口。

## 2026-10-19 第九轮：设置 / 个人设置页对齐

生产端 4.0.7.0 的「我的」页有两个入口：右上齿轮 → **设置**，手机号区域 → **个人设置**，两页导航标题都写「设置」。RN 之前只有一页「账号设置」，把偏好设置/隐私设置/实名认证/签收码/地址簿入口、账号资料和退出/注销混在一起，其中「收件偏好、账号偏好和中心设置由 H5 承接」等属于工程说明文案。

- 已改（设置页 pages/account/settings）：按生产端只保留 清除缓存（行内显示体积，点击直接清理，无确认无提示）/ 协议说明 / 个性化推荐功能（开关）/ 版本信息（「当前版本vX」）+ 退出登录胶囊。删掉账号资料、安全与隐私入口列表、注销账号分区和全部工程说明文案。
- 已改（个人设置页 pages/account/profile，新增）：居中的圆形头像 + 掩码手机号，底部退出登录胶囊（浅灰底）与「注销账号，注销后无法恢复，请谨慎操作！」。新增路由 ccountProfile，导航标题与设置页同为「设置」。
- 已改（入口接线）：pages/mine 齿轮 → 设置，手机号区域 → 个人设置；地址簿/签收码等入口原本已在「我的」快捷宫格与服务宫格里，不存在入口丢失。
- 已改（退出登录）：跟随生产端取消二次确认弹窗，退出后回落「我的」。此前 RN 会先弹 showModal，与生产端行为不一致。
- 已改（缓存清理）：新增 src/cache/maintenance.ts，只清理业务缓存（草稿、最近使用、货物查询历史、发票授权/邮箱等），保留登录态、cookie、账号隔离标记和个性化推荐偏好。体积按 UTF-16 字符数估算，与生产端统计 App 缓存目录的口径不同，数值不可与「128.39K」直接比较。
- 本地实现选择（非生产实证）：个性化推荐开关生产端只有本地样式，未取到服务端契约，故按本地偏好持久化（默认开启）；版本信息取自构建期 APP_RUNTIME_CONFIG.appVersion（默认 package.json 的 1.0.0），不是原生 versionName，与生产端「v4.0.7.0」不同源。
- 仍未对齐（下一步）：
  - ~~**协议说明页**~~：2026-10-19 复核确认生产端该页是 **H5**（`prod-agreement1.xml` 正文即 `android.webkit.WebView`，`dumpsys activity top` 见 `WebViewProxyApi$WebViewPlatformView`），按项目口径**不做像素对齐**，只保留入口与 URL 受控。RN `pages/privacy/settings` 的原生结构不再按生产端反推；详见 [production-surface.md](../production-surface.md)。
  - **账号注销页：已拆成两步并对齐**。第一步 `pages/account/cancel`（账号注销）= 绑定手机号 + 温馨提示 4 条（带 `1.`~`4.` 编号）+「获取验证码」蓝色胶囊；点击后发送短信并跳转第二步。第二步新增 `pages/account/cancel/confirm`（注销账号）= 绑定手机号 + 6 格验证码（81×119、间距 24）+「56s后重试」倒计时 + 红色「确认注销」。生产端两步都是 Flutter 原生页（无 WebView），已按 `prod-cancel2.xml`、`prod-cancel-step2.xml` 量测对齐；RN 原来一页内做输入 + 勾选 + 提交的做法已废弃。
  - 生产端「清除缓存」统计的是 App 缓存目录体积，RN 若要同口径需要原生缓存目录能力（shared/platform 目前没有）。
- 安全提示：生产端「退出登录」无二次确认，本轮对照时误触导致登出；该设备无 SIM 卡收不到验证码，最后由用户重新登录恢复。后续在生产端取证时不要点退出登录。

## 2026-10-19 下单成功页文案与结构对齐（字符串实证）

生产端 4.0.7.0 的下单成功页（`lib/.../express/success`）**拿不到真机截图**：进入该页必须真实下单，不在本轮授权范围。改用包内字符串实证（`libapp.so` 的中文串以 UTF-16LE 存储，可直接检索）：

| 生产端字符串 | 出现次数 | 结论 |
|---|---|---|
| `下单成功` | 2 | 页面标题是「下单成功」；`预约成功` 为 0 次 |
| `寄件信息` | 1 | 信息区标题 |
| `继续寄件` | 2 | 底部按钮 |
| `查看订单` | 2 | 底部按钮；`查看详情`、`订单列表` 均为 0 次 |
| `秒后自动返回首页` | 1 | 页面有「N秒后自动返回首页」倒计时 |
| `自动分配快递员` / `已通知` | 1 / 1 | 快递员卡的状态文案 |
| `结果信息` / `当前状态` / `进入订单列表` / `待生成` | 0 | RN 旧实现自造的文案，已删除 |

RN 已按上表改写 [pages/express/success](apps/com.deppon.app/src/pages/express/success/index.tsx)：标题「下单成功」、信息区「寄件信息」（订单号/运单号两行，去掉「当前状态」）、底部「继续寄件」+「查看订单」、新增「60秒后自动返回首页」倒计时（回到寄件首页）。

未决：**倒计时秒数**生产端无法从字符串确定（只拿到「秒后自动返回首页」模板），RN 暂定 60 秒；真机截图需等有授权的测试下单后再核对。快递员卡的状态文案也还有自造痕迹（「待分配快递员，可稍后刷新查看」等），生产端用的是「自动分配快递员 / 已通知」，待有截图后一并收敛。

## 2026-10-24 寄件主链路业务逻辑对齐 mp-taro3

本轮按用户要求，以 `D:\10531845\Desktop\CZH-DEV\mp-taro3` 为参考补齐 RN 的寄件逻辑，范围是询价 → 提交校验 → 下单载荷 → 失败/成功处理，不动 UI。

证据：参考端 `src/utils/send.ts`（`CreateProductParams` / `CreateOrderParams` / `CheckOrderParams`）、`src/api/send.ts`（`FetchFreight` / `CreateOrderMySql`）、`src/pages/send/express/index.tsx`（`handleCheckOrder` / `handleSubmitOrder` / `handleSubmitSuccess`）。

| 环节 | 参考端行为 | RN 本轮改动 |
|---|---|---|
| 询价 | `paidMethod`（MP/FC/CT）与 `totalQuantity`（件数）参与计价（`send.ts:485`、`469`） | `ExpressFreightRequest` 增加两字段，`buildFreightRequest` 输出付款方式与件数 |
| 询价排序 | `FetchFreight` 把 `YTY` 挪到列表末尾（`api/send.ts:36-44`） | `sortExpressQuotes` 下沉到 `expressService.quote` / `quotePriceTime`，寄件页与查价页共用 |
| 默认产品 | `GetProductDefault` 按 `PACKAGE / RCP / NFLF / JZKH / DJBK / XJBK` 优先，兜底取列表末位（`utils/prodcuts.ts:94-128`） | `selectDefaultExpressQuote` 改为同一优先级；已选产品在同码同线路仍存在时保留（`findExpressQuoteSelection`） |
| 提交校验 | 港澳台互寄、月结资格、3C 原厂包装、显示器尺寸、报关等拦截（`CheckOrderParams`） | 港澳台互寄与月结资格只在提交时拦截，询价阶段不挡价格；3C/显示器/报关暂未建模，列入下方剩余缺口 |
| 月结资格 | 非月结客户选月结直接拦截；客户编码扫码固定月结（`send.ts:2051`、`store/reducers/send.ts:60-71`） | `useExpressMonthlyPay` 并行查 `customerLabel`，确认不是月结才拦截；`shipperNumber` 扫码除排除码外视为固定月结 |
| 下单载荷 | `contactAddress` 放详细地址、`AddressDetail` 放「省-市-区,详细地址」（`send.ts:1762`、`1786`） | RN 之前把省市区和详细地址写反；本轮修正（批量下单同源修正），与 RN 订单修改接口口径一致 |
| 下单载荷 | `isRecieveGoods = isLd && !dispatch ? 0 : 1`（`send.ts:1052`） | 按 `weight > 60kg 或 volume > 0.36m³` 判零担，营业部二维码固定零担；自送为 0，其余 1 |
| 下单载荷 | 扫码单 `isContact='N'`（`send.ts:1122-1124` 的 `!role` 分支） | 任意扫码来源都不主动联系；自送同样为 `N` |
| 下单载荷 | 营业部/司机二维码固定 61kg、送货不上楼；服务点二维码置 `dispatch=false`（`store/reducers/send.ts:1475-1500`） | `applyExpressScanContext` 同步这三条初始态；服务点二维码再强制 `dispatchFlag='N'`、`startStation` 用扫码值 |
| 筛单 | `contactAddress / receiverAddress` 为「省-市-区,详细地址」，并带 `totalVolume`；`limitCust` 表示合同客户（`send.ts:5340-5420`） | 地址格式与 `totalVolume` 对齐；`limitCust` 改回仅扫码客户码为 1（合同客户标记待接） |
| 取件时间 | `handleQueryPickupTime` 在地址/货物/产品变化后重查；`handlePickupList` 保留仍有效的 `pickupTime`，失效才选首个普通时段（`index.tsx:4953`、`store/reducers/send.ts:810-965`） | `useExpressPickupTime` 表单齐备且上门时自动查询并选首个普通时段；重量/体积/件数/产品变化后重查并保留有效时段，自送不查；`updateExpressGoods` 不再清空取件时间 |
| 快递/零担切换 | `handleGoodsChange`：`!isLd` 时清空自送网点/收件自提点并把送货方式置上楼；快递→零担切换时清空网点与产品（`store/reducers/send.ts:1004-1090`） | 新增 `express.goodsType.ts`（60kg / 0.36m³）；回到快递或跨越快递/零担边界时清空自送网点，零担内部修改保留网点 |
| 产品联动 | `handleProductChange`：新产品无券优惠时清空券；`DCZP` 到付回落现付、电子云签回落无（`store/reducers/send.ts:697-795`） | `selectExpressProduct` 同步清券与到付回落；保价类型按新产品策略归一 |
| 下单载荷 | 扩展字段 `productPrice` / `days` / `timeProductsCode` / `timeProductsName`（`send.ts:1366-1381`、`1497-1711`） | 从选中报价回填这四项 |
| 失败处理 | `1\|货类\|协议号` 先暂存发货信息再打开签署函；`登录超时` 跳登录；其余弹单按钮弹窗（`index.tsx:8383-8422`） | `stageExpressSign` + `EXPRESS_STATEMENT` WebView；`preserveForLogin` 后跳登录；普通失败改 `showModal` 且保留行内文案 |
| 成功处理 | 下单成功后 `orderPriceLog/save` 回写价格（`index.tsx:8578-8588`） | 新增 `saveOrderPriceLog`，成功路径异步回写，失败不影响跳转 |

剩余缺口（未建模或未取证，不是漏改）：

- 3C 原厂包装选择与显示器尺寸：RN 草稿没有 `isOriginalFactory` / `tvSize` 字段，需要先在货物域建模再加拦截。
- 报关信息：RN 无 `customs` 域；港澳台收件场景目前只能被互寄规则拦住。
- 高价值物品实价：RN 保价金额即物品价值，没有小程序 `realPrice` 的双字段结构。
- `limitCust` 的合同客户口径：RN 筛单请求没有合同能力入参，目前只能按扫码客户码置 1。
- 保价必保产品：参考端 `ExistsProductInsurance`（`utils/prodcuts.ts:1-35`）必保只有 JZZH/NJZZH/YTY/YTYDS/NZBRH，
  RN 仍把 DJBK/DJTH 视为必保（旧交接文档如此记录）；需要生产端真机核对后再决定是否收窄，本轮未改。
- 送货方式默认值：参考端快递默认 `PICKUPSTAIRS`、零担默认 `PICKNOTUPSTAIRS`，RN 草稿默认固定 `PICKNOTUPSTAIRS`；
  生产 App 的实际默认值未取证，本轮未改。
- 联系人公司名：参考端会把 `company` 拼进详细地址，RN 下单载荷尚未使用该字段。
- 地址详细字段已按参考端修正，但需要真实下单后核对运单地址；静态门禁不能替代这一步。
- 「电子云签」：RN 已有 `fileCode` 校验，本轮未改。
- 报价接口偶发失败仍是既有失败态（文案 + 重试入口），本轮未改。

## 2026-10-25 寄件优惠券链路复核

完整链路、触发条件、清除规则与特殊场景见 [coupon-flow.md](./coupon-flow.md)。本轮对齐的代码点：

- 请求门槛：产品价格不可见、客户编码扫码不再请求优惠券（createExpressCouponQueryRequest）。
- 自动选券：普通现付、非扫码、手机号 11 位时自动选第一张可用券并重算；手动/列表带入的券不被覆盖；输入指纹不变时不重复自动选券。
- 月结联动：选券时若为月结，切回现付并提示「已取消月结支付」。
- 清除：最新券列表为空时清空已选券并重算；新产品无券优惠时清空（上一轮已做）。
- 弹层：打开时无已选券默认预选第一张可用券，与参考端 Picker 一致。
- 测试：新增 coupon-actions.test.cjs 5 例，coupon/contracts 补价格可见性与扫码门槛 1 例。
- 模板带入的取件时间：参考端按模板 `beginAcceptTime` 的小时匹配首日时段，RN 直接把模板时间当已选值、匹配不到就走默认时段；`templateId` / `templatePickupTime` 未进草稿。
- 送货方式默认值：参考端快递默认上楼（`PICKUPSTAIRS`）、零担默认不上楼，RN 固定 `PICKNOTUPSTAIRS`；电梯上楼（`isHasElevator`）未建模。