# Taro RN 重构交付与续作说明

生成日期：2026-07-13

## 1. 续作入口

- 当前项目：`D:\codeSpace\com.project`
- 参考项目：`D:\10531845\Desktop\CZH-DEV\mp-taro3`
- 当前分支：`master`
- 当前基线提交：`41d3bee`
- 总体计划：`docs/rn-refactor-plan.md`
- 工程规则：根目录 `AGENTS.md`
- 当前工作区包含一批连续重构中的未提交改动，后续对话必须先执行 `git status --short`，在现有改动上继续，不能 reset、checkout 或回滚这些文件。

本项目目标不是复制旧小程序，而是提取业务契约、规则和接口语义后，按 Taro RN App 的页面、service、shared facade 和异步 cache 分层重构。当前只面向 Android/iOS RN App，不维护小程序构建。

## 2. 不可违反的约束

1. Codex 不执行 RN bundle、Taro build、Gradle、Xcode、Android/iOS 打包或发布包验证。打包由用户执行并反馈结果。
2. 日常验证只使用 TypeScript、ESLint、Stylelint、业务规则、路由、模块体积、runtime config、RN boundary 和其他静态门禁。
3. 业务代码不得直接调用小程序 API、H5/DOM API、Taro RN unsupported API 或 RN Native API。
4. Taro 同步 storage API 全部禁用；缓存只能通过 `src/cache` 的异步 facade。
5. 扫码、定位、电话、支付、文件、WebView 等端能力必须通过 `shared/platform`、`shared/native` 或对应 facade。
6. RN 样式优先 Flex；禁止 Grid、float、fixed/sticky、复杂选择器、`background-image` 和其他 Web-only CSS。
7. 新增 SCSS 必须使用 `src/styles` token，并通过严格 CSS 治理；不要提高基线或文件预算掩盖问题。
8. 页面自然复杂时允许保留页面级编排，但新增职责应优先落到明确的 component、mapper、rules、use case 或 service 中。
9. 手工编辑使用 `apply_patch`，不改动与当前切片无关的用户内容。

## 3. 当前整体进度

当前工作区已经完成或正在承载以下连续重构成果：

| 模块 | 当前状态 |
| --- | --- |
| 工程门禁 | `verify:static`、RN boundary、路由注册表、模块体积、runtime config、平台配置和 CSS 双模式门禁已建立 |
| CSS 治理 | 208 个业务 SCSS 全量 token 化，颜色/字号/行高/圆角/字重债务均为 0 |
| 请求与缓存 | OWS 响应、RN 原生/本地 cookie 双向同步、登录失效、异步缓存和账号隔离已收口 |
| 查询工具 | 价格时效、派送范围、网点、货物查询已拆出独立 service/页面职责 |
| 订单 | 列表、详情、关注、取消、修改、电子存根和售后动作已形成 App 端主链路；待揽件改单已覆盖基础字段、打包服务件数、代收、保价和上门服务 |
| 发票 | 中心、申请、详情、预览、抬头和 E 卡开票相关 service 已按职责拆分 |
| 批量寄 | 多收件人、地址识别、逐票计价、单次批量提交、草稿缓存和部分成功归一已落地 |
| 支付 | 待支付列表、App 收银台、支付结果页和 `payCreate/payConfirm/payCancel` 编排已落地；原生支付能力仍为 `pending` |
| 寄件代收货款 | 本次交付已完成独立草稿、额度、账户选择、协议、报价、下单和样式接入 |
| 寄件预约能力 | 已完成定时/通知派送与夜间揽收；包含范围校验、输入指纹、时段选择、费用确认、报价和下单字段 |
| 寄件送货进仓 | 已完成 type 0-4 筛单、预约暂存、H5 消息桥、附件、报价/下单字段和用户确认；筛单与消息上下文均 fail-closed |
| 登录验收 | 已对照参考端、Taro RN 4.2 和项目内回 App 模式修复键盘点击、原生 cookie jar 延迟恢复、重复 replace 竞态及 `auth=Y` WebView 动态守卫；“我的”push 登录、成功后 replace 返回；新增原生依赖后仍需重建包完成短信、`ECO_TOKEN`、回跳与重启会话实机验收 |
| 寄件模板 | 查询、新增、删除、使用、默认状态及名称/默认元数据编辑已落地；完整模板内容编辑继续等待后端 schema 承接新增寄件字段 |
| 寄件普通纸箱 | 已完成 9 种纸箱目录、草稿/缓存、RN 单选区、报价体积下限和报价/下单 `packageInfoList`；不污染货物真实体积 |
| 寄件木包装 | 已完成木架、木箱、两种木托多选及纸箱并存；报价使用 `packageLtlType`，下单精确映射 `SJ/BG/SP/NSP` 与 `receive[0].packing` |
| 寄件拆包装 | 已完成拆木/非木包装复选及三类包装并存；报价发送组合 `packageLtlType` 和两个数量字段，下单发送顶层 `unpackageLtlInfo` |
| 收件自提服务点 | 已完成 `expressPickup` 地址网点查询、20km/pickupSelf/deptNo fail-closed 过滤、最近服务点语义、指定网点回填、报价失效和下单字段 |
| 寄件保价增强 | 已完成全额保/省心保/易碎保、货物标签证明、客户动态额度、试算 subtype、主报价 flags、`bjlx/insuranceSource` 和提交前重校验 |
| 寄件优惠券 | 已完成当前订单可用/不可用券查询、原价费用恢复、300ms 自动查询合并、异常恢复、竞态隔离、RN 选择卡片、详情/手输/清除和重新报价闭环 |
| 订单改单代收 | 已完成待揽件发件人权限、详情映射、客户额度、账户上下文桥、RN 表单和 `/modifyOrder` 四字段差异提交 |
| 订单改单上门 | 已完成 `source=0` 时段、夜揽能力、三种送货方式、输入指纹和 `/modifyOrder` 差异合并 |
| 客户中心 | 已并行接入客户资料与能力摘要，展示代收额度、月结付款和合同状态，支持接口部分降级 |
| 客服售后读入口 | 已补投诉记录、理赔处理中和理赔已完成三个登录后受控 WebView 入口，普通路径与 hash query 均保留认证上下文 |
| 签收 PDC 反馈 | 已按已签收状态和 `PDC_KDYZJO/PDC_KDYZJT` 来源接入一次性查询、`Y/N` 面板与 `ONE/TWO` 提交闭环 |
| 原生服务评价 | 已按订单角色与状态查询可靠快递员身份，接入 1-5 星、标签、建议和提交闭环；查询失败保留受控 H5 降级 |
| 动态场景问卷 | 已按角色、运输状态、来源和 7 天窗口接入 SCORE/LABEL/NPS 队列；PDC 反馈优先展示，查询部分失败可降级 |

权威的模块细节、接口表和后置能力仍以 `docs/rn-refactor-plan.md` 为准，不要仅依赖本交付摘要判断全项目已完成。

## 4. 本次交付：寄件代收货款

### 4.1 领域模型

代收货款不再散落在 `goods.reviceMoneyAmount` 和 `service.reciveLoanType` 中，而是独立为：

```ts
interface ExpressCollectionDraft {
  type: '' | 'NORMAL' | 'INTRADAY'
  amount: number
  account: string
  accountName: string
  limit: number
  agreementAccepted: boolean
}
```

核心规则集中在 `src/services/express/collection.rules.ts`：

- `NORMAL` 表示三日退，报价映射为 `R3`。
- `INTRADAY` 表示即日退，报价映射为 `R1`。
- 默认额度为 `1_000_000` 元，登录后可通过客户能力接口刷新。
- 启用服务后必须填写正金额、选择审核账户、确认协议，且金额不得超过额度。
- 类型或金额变化会清除旧报价；账户、户名、额度和协议变化不影响价格。
- 取消服务会清理代收字段并在必要时使旧报价失效。
- 金额输入保留编辑文本，支持 `0.`、`.5` 等输入过程，写入草稿前统一限制为两位小数。

### 4.2 接口与 payload

- 客户能力：`POST /gwapi/userService/eco/user/secure/customerLabel`
- 报价字段：`reciveLoanType`、`reviceMoneyAmount`
- 下单字段：`reciveLoanType`、`reciveLoanAccount`、`accountName`、`reviceMoneyAmount`
- 报价与下单均使用当前草稿真实值，不再固定提交空账户或空户名。
- `draftStorage` 兼容旧草稿中的 `goods.reviceMoneyAmount` 和 `service.reciveLoanType`，恢复后统一转成新模型。

### 4.3 账户 WebView 消息桥

账户管理继续由受控 H5 承接：

```text
source: EXPRESS_COLLECTION_ACCOUNT
url: /depponmobile/h5/index#/customerCenterPackagePages/dshk/tkzh/list?from=EXPRESS_SERVICE
```

App 只接受以下消息契约：

```json
{
  "event": "COLLECTION_CHANGE",
  "args": {
    "bankAccount": "622200001234",
    "countName": "张三"
  }
}
```

`src/shared/webview/appWebMessage.ts` 会校验来源、事件、账户和户名，并通过一次性内存桥交给寄件页消费。它不使用 `getStorageSync/setStorageSync/removeStorageSync`，其他 WebView source 也不能注入代收账户。

代收协议使用公开受控 H5：

```text
source: EXPRESS_COLLECTION_RULES
url: /depponmobile/h5/index#/queryPackagePages/service/detail/index?value=COLLECTION
```

### 4.4 页面与样式

- `pages/express/hooks/useExpressCollection.ts`：额度查询、账户回填和代收动作编排。
- `pages/express/components/ExpressCollectionCard.tsx`：开关、返款类型、金额、账户、手续费、协议和刷新提示。
- `ExpressCollectionCard.scss`：开关、返款类型和金额输入样式，102 行。
- `ExpressCollectionDetails.scss`：账户、手续费、协议和提示样式，128 行。
- 两个样式文件均低于组件 SCSS 180 行上限，不提高治理预算。

## 5. 本次关键文件

新增：

- `apps/com.deppon.app/src/services/express/collection.rules.ts`
- `apps/com.deppon.app/src/pages/express/hooks/useExpressCollection.ts`
- `apps/com.deppon.app/src/pages/express/components/ExpressCollectionCard.tsx`
- `apps/com.deppon.app/src/pages/express/components/ExpressCollectionCard.scss`
- `apps/com.deppon.app/src/pages/express/components/ExpressCollectionDetails.scss`
- `apps/com.deppon.app/src/shared/webview/appWebMessage.ts`

主要修改：

- `services/express/types.ts`
- `services/express/express.draft.ts`
- `services/express/express.payload.ts`
- `services/express/draftStorage.ts`
- `services/customer/customer.api.ts`
- `services/customer/customer.service.ts`
- `services/customer/types.ts`
- `pages/express/index.tsx`
- `pages/express/components/ExpressServiceSection.tsx`
- `shared/native/AppWebView.tsx`
- `pages/web/index.tsx`
- `shared/webview/appWeb.ts`
- `scripts/check-business-rules.cjs`
- `scripts/style-governance-baseline.json`
- `docs/rn-refactor-plan.md`

## 6. 静态验证证据

本次交付通过：

- TypeScript：通过。
- ESLint：通过。
- Stylelint：通过。
- CSS 日常门禁：通过。
- CSS 严格门禁：通过，201/201 个业务 SCSS 使用 token，存量债务全部为 0。
- CSS 治理测试：62/62 通过。
- RN boundary：通过。
- 路由注册表：通过。
- 模块体积：通过。
- runtime config：通过。
- 平台配置一致性：通过；Harmony 未启用，相关门禁按设计跳过。
- 业务规则：162/162 通过；覆盖登录、首次登录草稿保留、派送范围、夜揽、送货进仓、普通纸箱、收件自提服务点、签收单返单/云签、寄件产品点城市/融合/升级、DCZP 电池推荐、改单代收权限/diff、改单基础保价、改单上门时间/送货方式、客户能力摘要与部分降级、客服售后受控入口、签收 PDC 反馈、原生服务评价、动态场景问卷/NPS、账户上下文、附件安全和深拷贝兼容。
- `git diff --check`：通过，仅有 Git 的 LF/CRLF 提示，无空白错误。

本次没有执行任何 Taro/RN bundle、Gradle、Xcode、Android/iOS 打包或安装包验证，也不能据此声明原生包已通过。

## 7. 用户需要运行时确认的事项

1. 在 Android/iOS App 中确认代收金额输入、小数编辑、开关和卡片布局符合预期。
2. 确认目标 H5 账户页在 RN WebView 中实际发送 `COLLECTION_CHANGE` 消息；若 H5 当前仍只写小程序同步缓存，需要 H5 按上面的 `postMessage` 契约适配，不能在 App 业务代码中恢复同步 storage。
3. 使用真实测试账号确认 `customerLabel.teanLimit`、`custNumber` 与后端环境返回一致。
4. 使用测试订单确认报价明细中的 `HK` 代收手续费和创建订单字段被后端接受。
5. 原生微信/支付宝支付能力仍为 `pending`，收银台会在 `payCreate` 前阻断，不会创建悬挂支付单。
6. 使用真实地址确认 `matchFeatureAoi` 返回 `nightPickUpEnable/startTime/endTime`，并确认 `dispatchTimeByDeptCode` 接收夜揽范围字段后返回 `nightOpeningList`。
7. 在 Android/iOS 上确认取件日期横向滚动、普通/夜间/不可用时段、50 元/票确认提示和卡片换行布局。
8. 用测试订单确认报价字段 `nightAccept`、下单扩展 `nightAccept/nightAcceptStatus` 和快速时段 `currentFirstTime` 被后端接受。
9. 在 Android/iOS 上确认包装区 9 张远程图片、长文案截断和单选状态正常，并用测试订单确认 PPC 与创建订单接受普通纸箱 `packageInfoList`。
10. 使用真实待揽件发件订单确认 `receiverLoanType/receiverMoneyAmount` 详情字段、客户额度和账户 H5 消息，并验证启用、修改、关闭代收的 `/modifyOrder` 四字段被后端接受。
11. 使用普通快递、零担和 `NZBRH/ZBTH` 重包订单确认改单时段、夜揽费用提示、送货方式显示阈值，并验证 `/modifyOrder` 接受 `beginAcceptTime/pickPeriodTime/deliveryMode/channelType` 与夜揽扩展字段。
12. 使用已绑定与未绑定客户账号确认 `customerLabel.teanLimit/exPayWay/ifExistContract` 的实际单位和语义，并确认客户资料或能力接口单独失败时页面仍保留另一部分内容。
13. 使用已签收运单从 `PDC_KDYZJO`、`PDC_KDYZJT` 来源进入安全详情，确认未反馈时只出现一次签收确认面板，并验证 `ONE/TWO` 与 `Y/N` payload 被后端接受；普通订单详情不应请求或展示该面板。
14. 使用运输中/已签收的寄件人与收件人订单确认场景问卷顺序、1-5 星标签、0-10 NPS、关闭清理和提交后推进；`PDC_KDYZJO/PDC_KDYZJT` 来源应先处理 PDC 反馈，再显示仍未填写的 NPS。
15. 在 Android/iOS 上确认木包装复选、与纸箱并存和长价格文案布局；用快递及零担测试地址确认报价接受 `packageLtlType`，创建订单接受 `SJ/BG/SP/NSP` 明细与 `receive[0].packing`。
16. 在 Android/iOS 上确认拆木/非木包装复选、三类服务并存和摘要布局；用零担测试地址确认报价接受两个 0/1 数量字段及组合 `packageLtlType`，创建订单接受顶层 `unpackageLtlInfo`，并核对 `CBF` 实际费用。
17. 使用带 `orderExtendFields.packingService` 的待揽件发件订单确认改单页恢复件数、开关和 1..999 步进；分别验证修改数量与关闭服务时 `/modifyOrder` 接受字符串件数及 `"0"`，并核对 2 元/件参考费用与后端实际收费一致。

## 8. 工作区保护说明

当前工作区不是单一代收货款补丁，还包含批量寄、支付收银台、发票 service 拆分、订单详情 hooks、查询 service 拆分和 CSS 门禁等连续改动。下一对话必须：

- 先读取当前文件和 `git status`，不要假设 `HEAD` 就是最新实现。
- 不要删除未跟踪文件；其中多数是本轮连续重构的新模块。
- 不要为了缩小 diff 回滚其他模块。
- 发现同一文件已有改动时，基于当前内容继续编辑。
- 继续使用 `docs/rn-refactor-plan.md` 记录每个业务切片的边界、端点、约束和后置能力。

## 9. 本次续作：预约派送与夜间揽收

### 9.1 派送偏好

- `deliveryPreference.rules.ts` 统一常规派送、定时派送、等寄件人通知和等收件人通知四种互斥状态。
- 定时派送使用 `canOrderCityDelivery` 校验范围，日期限制为预计到达后 7 天；等收件人通知支持未来 30 天不可收货日期。
- 能力证明写入 `availabilityKey`，覆盖收件地址、货物重体积、产品、预计到达时间和送货方式；旧异步响应、旧草稿或产品变化不能绕过范围校验。
- 参考端明确排除的 `DCZP/TKDR` 保守阻断；`JDL派` 的 pickup config 快速分支尚未迁入，仍以范围接口明确成功为准。

### 9.2 夜间揽收

- `pickupTime.rules.ts`：夜揽地址能力、2 小时缓存、草稿兼容、北京时间 18:00 截单、50 元/票确认、报价和下单扩展字段。
- `pickupTime.options.ts`：合并 `openingList/nightOpeningList/blankOpeningList`，按日期和时间排序，不可用时段不可选择，重复“一小时上门”优先保留夜间项。
- `express.service.ts`：先请求 `/gwapi/queryService/eco/query/range/matchFeatureAoi`，再把 `nightOpening/nightStartTime/nightEndTime` 传给 `/gwapi/orderService/eco/order/dispatchTime/dispatchTimeByDeptCode`。
- 报价提交 `nightAccept=Y/N`；创建订单提交 `nightAccept=Y/N`，夜间额外提交 `nightAcceptStatus=-1`；快速取件时段提交展示文本和 `currentFirstTime=Y`。
- `useExpressPickupTime.ts` 与 `ExpressPickupTimeCard.tsx`：RN 日期/时段选择、刷新保留有效选择、请求指纹隔离和费用确认。只有收费夜间时段时不自动默认，必须由用户显式选择。
- 发件地址、收寄互换和自送切换会清理夜揽能力与选择；货物变化清理时段，但可复用地址未变且仍在 2 小时内的能力结果。
- 草稿缓存、跨页桥和模板暂存对 `nightCapability` 做深拷贝，旧 `type: 0` 草稿恢复为普通取件，不使用同步 storage。

### 9.3 静态门禁

- `check-business-rules` 当前 162 条，覆盖能力缓存、service 编排、三类时段、截单边界、费用确认、payload、快速时段、登录、首次登录草稿保留、送货进仓、普通纸箱、收件自提服务点、签收单返单/云签、寄件产品点城市/融合/升级、DCZP 电池推荐、改单代收货款、改单基础保价、改单上门服务、客户能力摘要、客服售后受控入口、签收 PDC 反馈、原生服务评价和动态场景问卷/NPS。
- `check-rn-boundaries` 增加 Taro 默认导入改名、namespace、具名导入和 CommonJS 解构别名检查，防止通过别名绕过小程序/unsupported API 门禁。
- 新增业务组件 SCSS 均使用 token/Flex；叠加服务点筛选、结果和选择模式拆分后，样式基线为 201 个业务 SCSS、存量债务 0，未提高组件预算或模块体积预算。

## 10. 本次续作：送货进仓与登录验收

### 10.1 送货进仓领域边界

- `warehouse.rules.ts`、`warehouse.payload.ts`、`warehouse.service.ts` 分别承接筛单证明、报价/下单字段和接口编排，不把旧小程序页面状态或 Redux 合并回寄件页。
- 筛单只接受明确的 type 0-4；`status=true` 但 result/type 缺失、空值或未知值按失败处理，不能归一为安全 type 0。
- type 2/3/4 必须在当前地址、货物和产品输入指纹上得到明确确认。内部互斥清理不写 `acknowledged`；只有用户“我知道了”“无需进仓”或明确开启服务才记录决定。
- 精准进仓 type 3 在非旧零担产品且重量达到 100kg 时只自动开启一次；用户明确拒绝后不会再次自动开启。
- 报价提交 `isWarehousingService/deliverWarehouseWay/warehouseCode/warehouseProcess/jcType`；普通订单不发送 `deliveryToWarehouse`，启用后才发送预约、附件和扩展字段。

### 10.2 H5 暂存和消息边界

- 暂存端点：`POST /gwapi/queryService/eco/query/staging/secure/setStaging`。
- 暂存成功后通过受控 `EXPRESS_WAREHOUSE` WebView 打开 `/depponmobile/mow/send/warehouse/index`，URI 携带 `warehouseId/ecoToken/source`。
- `SEND_WAREHOUSE` 只在存在一次性 expectation 且当前 WebView URL 的 `warehouseId` 与 `stagingId` 一致时消费；返回结果还绑定寄件输入指纹，旧页面和旧草稿结果会被忽略。
- 附件只接受最多 9 个 HTTPS、无用户名密码的 URL；未知字段、错误 source/event、过大消息和不安全 URL 均拒绝。
- 登出和账号身份变化都会清空 expectation/pending 消息，避免跨账号回填。

### 10.3 登录静态验收与实机回归

- 参考项目和当前 RN 的短信契约一致：`{ mobile, sysCode, messageType: 'login' }`。对照后补齐登录端始终携带的 `registerRecord`，当前请求为 `{ account, verifyCode, loginType, sysCode, registerRecord }`；App 只填来源页和 `APP` 系统码，旧小程序营销/设备字段保持空值，不迁入静默授权、营销领券或 Redux 用户巨石。
- 原“我的”页登录按钮把 `createLoginRedirectUrl` 交给 `navigateToAppRoute`，而通用导航会把登录路由改写为“我的”，因此点击看起来无反应。我的、账号设置和注销页现已统一调用 `navigateToLogin`；通用导航也不再吞掉合法登录 URL，RN boundary 继续禁止业务页手工生成登录 URL。
- Taro 4.2 的公开契约使用 `response.header`，兼容 header/cookies 解析仍被保留；后续源码核验确认 RN 实现不会填充 `cookies`，且原生 `fetch` 不保证向 JS 暴露 `Set-Cookie`。当前以 `shared/native/AppSessionCookie` 读取系统 cookie jar 作为 RN 主路径，登录服务等待异步持久化且只有确认真实 `ECO_TOKEN` 后才返回成功。
- RN router 已解码外层 query；登录页现在保留已是 `/pages/...` 的目标，仅对仍为 `%2Fpages%2F...` 的兼容值解码一次，嵌套 `%26/%3D` 不再被拆坏。
- 发码和登录对请求层未归一的异常也会给出可见重试提示，不再只恢复按钮而没有反馈。
- 从“我的”显式登录使用 push，登录成功后才 replace 回“我的”或原安全页面，入口不再与页面挂载争用同一次 replace。
- 寄件和批量寄提交前会显式标记匿名草稿；首次登录建立账号 owner 时只保留这些短时标记的草稿，其他账号缓存仍清理，账号切换/退出仍执行完整隔离。
- 静态业务规则已覆盖登录 URL、防假登录、RN Cookie 形态、空 `header` 下的兼容 `headers`、登录请求字段和 `registerRecord` 来源页，后续改动不能再把登录入口改回普通业务路由。
- 二次验收增加真实 facade 调用：mock 当前页为“我的”并执行 `navigateToLogin`，确认 `redirectTo` 收到 `/pages/login/index?redirectUrl=%2Fpages%2Fmine%2Findex`。当前 `app.config.ts` 没有 Taro `tabBar`，自定义 `AppTabBar` 页面位于同一根 Stack，不使用小程序 `switchTab`。
- 2026-07-15 实机反馈显示“点击登录无跳转/未登录”，因此原结论只能视为静态验收。登录页现改用 `shared/native/AppFormScrollView`，固定 `keyboardShouldPersistTaps='handled'`，避免手机号或验证码键盘开启时首次点击只收起键盘而不触发提交；业务页不得直接写该 RN 属性。
- 新增 `shared/navigation/navigationRuntime.ts` 统一承接 `navigateTo/redirectTo` Promise；入口和登录成功回跳若被 RN router 拒绝，会展示“页面打开失败”并释放登录跳转锁，不再静默吞掉失败。
- 关键登录导航在等待 Promise 后还会核对当前页面路径。Taro RN Router Promise 在 dispatch 后立即 resolve，不代表页面已挂载；当前只 dispatch 一次并等待页面实例，超时后提示和释放 in-flight，禁止第二次 `redirectTo` 覆盖首次导航。该确认只用于登录入口和登录成功回跳，不改变普通业务跳转的同步调用契约。
- 登录页只有在 `ECO_TOKEN`、用户缓存和目标路由三项都确认成功后才提示“登录成功”。若会话已落盘但目标页未打开，按钮改为“返回原页面”，再次点击不会重新提交验证码登录。
- 2026-07-16 实机反馈继续显示“点击无跳转/未登录”，证实旧 `Headers` mock 不能代表 RN。新增原生 cookie manager 后，旧 Android/iOS 包均不能验收当前源码；用户需重新安装依赖并重建，抓取脱敏登录响应并确认 `status/result`、系统 cookie jar 与本地 storage 中的 `ECO_TOKEN`、用户缓存和目标路由。
- 回 App 模式复核结果：登录、支付结果和注销成功继续使用 App 路由 `replace`；寄件成功页保留业务完成页跳转；只有 H5 数据回传使用 `postMessage -> 一次性 bridge -> navigateBack -> useDidShow consume`。登录不得改用小程序 `switchTab`、同步 storage 或页面私有 H5 回跳。
- 参考端只证明 `MOBILE_VERIFICATION_CODE` 和小程序系统码；`APP_SYSTEM_CODE=APP` 是 RN runtime 配置，不由参考小程序背书。若实机能发码但登录接口拒绝，请优先核对脱敏响应中的系统码校验和 `Set-Cookie`，不要回退为 `WECHAT_MINI` 伪装小程序。
- 真实 Android/iOS 仍需用户手验“我的 -> 登录页 -> 发码 -> 勾协议 -> 登录 -> 原目标 -> 杀进程重启仍登录”；静态检查不替代后端短信、渠道码和响应头联调。

### 10.4 签收单返单与电子云签增强

- `services/express/valueAdded.ts` 统一 OMS `NO_RETURN_SIGNED/CUSTOMER_SIGNED_FAX/CUSTOMER_SIGNED_ORIGINAL/RETURNBILL_TYPE_ONLINE/ORIGINAL_ONLINE` 与 PPC `NONE/FAX/ORIGINAL/ONLINE/ORIGINAL_ONLINE`；纸质返单要求按 R1-R8 去重并固定顺序，备注最多 20 字，返单张数限制为 1-99。
- `FAX/ORIGINAL/ORIGINAL_ONLINE` 必须至少选择一项 R1-R8，备注不能替代要求；`ONLINE` 只要求 `fileCode`。`DCZP` 选择后会清理云签类型、要求、备注、张数和凭证。
- `express.payload.ts` 只在云签类型发送 `fileCode`，只在纸质返单张数大于 1 时发送 `returnBillQty`；报价、下单和旧草稿恢复均 fail-closed。
- 模板保存不持久化临时 `fileCode`，但保留返单类型和纸质要求；模板带入后的云签必须重新完成签署。
- 电子云签通过 `EXPRESS_RETURN_BILL_CLOUD_SIGN` 受控 WebView 承接，`useExpressReturnBill` 统一处理类型更新和回填；消息必须匹配一次性 `messageContext` 和 `ONLINE_SIGN { value }`，离开页面或错误回跳会取消 expectation。
- 寄件主页面已回落到约 704 行，继续低于 720 行冻结预算；返单职责没有继续堆回页面巨石。
- 本切片不迁返单图片上传、OCR、代打回单文件和委托书附件；这些能力仍需独立的 App 文件/上传 facade 后再接入。

## 11. 本次续作：普通纸箱包装

### 11.1 领域与 payload

- 首切片只包含 `ZX_DP`、`ZX_DP_01`、`ZX_DP_2S`、`ZX_DP_02` 至 `ZX_DP_07` 共 9 种普通纸箱；目录中的名称、尺寸、适用品类、价格、远程图片和体积下限来自参考端稳定配置。
- 包装独立为 `ExpressPackagingDraft`，不写入 `goods`。非法 code 和旧缓存缺字段统一归一为空，不猜测后端包装类型。
- 报价 `totalVolume` 使用货物体积与纸箱体积下限的较大值；该计算只存在于 payload mapper，不回写用户货物体积。
- 报价和下单均按选择条件发送 `packageInfoList: [{ type: 'COUNT', data: '1', packageCode }]`；未选包装时字段不存在，下单 `receive[0].totalVolume` 仍是用户真实货物体积。
- 包装变化会清空已选产品、页面旧报价和当前异步请求有效性，必须重新获取价格。

### 11.2 草稿、桥与页面

- `draftStorage` 保存/恢复包装并深拷贝；仅选择纸箱也算有意义草稿。
- 查价、优惠券和品名选择属于同一寄件表单往返，保留包装；再寄、批量识别、扫码、派送范围、专属快递员和模板带入是外部业务来源，清空包装，避免实际包材被隐式复用。
- 模板创建暂存来源于当前表单，可保留包装，但 stage/consume 均深拷贝对象。
- `ExpressPackagingCard` 是独立顶层分区，提供“无需包装”和 9 个固定高度纸箱选择行，使用真实商品图；SCSS 为 102 行，全量使用 token/Flex。

### 11.3 明确后置能力

木架、木箱、木托、防水包装、拆包装、3C 原厂包装、雪具和智能包装推荐具有不同计量、组合或接口契约，不进入本切片，也不得用普通纸箱 `COUNT=1` 规则代替。

## 12. 本次续作：订单改单代收货款

### 12.1 权限和领域契约

- 只处理安全订单详情中的待揽件订单修改，不扩展运输中运单修改。页面必须同时满足 `modifyFlag=true`、`isSender=Y`、`orderClassification=0`，且 `productCodeFlag` 未明确为 false。
- 详情优先读取参考端稳定字段 `receiverLoanType/receiverMoneyAmount`，并兼容 `reciveLoanType/reviceMoneyAmount`；账户读取 `reciveLoanAccount/reciveLoanAccountName`。
- `OrderEditCollectionDraft` 独立保存启用状态、三日退/即日退、金额、账户、户名、客户额度和协议，不把字段散回页面或联系人/货物模型。
- 校验要求正金额、不得超过额度、账户与户名齐全并同意协议；原订单已经启用代收时视为已有协议确认，用户关闭后再开启必须重新确认。

### 12.2 修改请求和账户桥

- 启用或修改代收时，`modifyOrder` 成组发送 `reciveLoanType/reviceMoneyAmount/accountName/reciveLoanAccount`；关闭时发送 `NORMAL/0/''/''`；四字段未变化时全部省略。
- 客户绑定和额度复用 `selectCustName/customerLabel` service，接口结果只更新本地 `limit`，不会形成订单字段差异。
- `ORDER_EDIT_COLLECTION_ACCOUNT` 复用受控账户 H5，但打开前注册绑定订单号的 `messageContext`。WebView 回传必须同时匹配 source、context 和 `COLLECTION_CHANGE` 字段校验，且只能消费一次。
- 单改页从账户 H5 返回时保留本地草稿，不重新拉取详情覆盖账户；提交成功后仍按原流程返回上一页。

### 12.3 页面与后置边界

- `OrderEditCollectionSection` 作为改单页独立顶层分区，提供开关、返款类型、金额、账户、协议和额度提示；两个 SCSS 分别 102/115 行，全量使用 token/Flex。
- 代收切片不迁产品、付款、返单、包装、送货进仓等其他改单服务，也不把旧 Redux `orderEdit` 巨石状态迁回 App；基础保价已在后续独立切片接入。
- 账户 H5 若仍只写小程序同步 storage，需要 H5 按现有 `postMessage` 契约适配；RN 业务代码不得恢复同步 storage。

### 12.4 本次续作：订单改单基础保价

- `services/order/order.edit.insurance.ts` 将待揽件改单保价独立为 draft/rules/payload 边界，读取详情 `insuredAmount` 与 `orderExtendFields`，不把保价字段散回货物模型。
- 普通产品允许编辑或清除保价金额；普通产品上限为 1000000 元，参考端必保产品（如 `DJBK`）上限按 9990000 元处理，必保产品不能提交 0 金额。
- 参考端 `orderExtendFields.bjlx=0/1` 分别代表全额保/省心保，未知非空特殊类型同样 fail-closed 为只读；免费基础保障产品无金额时展示 2000 元默认保障。
- 用户修改保价金额时提交 `insuredAmount` 与空 `insuranceSource`；`NFLF/NLRF` 详情金额为 0 时按参考端契约显式补交 2000 元与 `insuranceSource=DEFAULT`，确认变更会展示“免费基础保障”，其他本地状态不会伪造保价 diff。
- `OrderEditInsuranceSection` 使用 RN `Input`、统一 token/Flex 样式和受控规则入口；不迁产品切换、优惠券、预约取件、送货方式、图片上传或原生文件能力。
- `check-business-rules` 新增保价策略归一、特殊类型锁定、上限/必保校验、成组差异、登录路由和 App 登录契约用例；叠加后续切片后当前业务规则总数为 162，样式基线为 201 个 SCSS，债务保持 0。

## 13. 本次续作：订单改单上门时间与送货方式

### 13.1 领域与接口边界

- `order.edit.schedule.ts` 负责详情映射、输入指纹、重包/零担显示规则、夜揽能力有效期、校验和 `/modifyOrder` 差异；查询编排、时段归一和选择更新分别拆到 `schedule.service/options/selection`，没有继续扩大 `order.edit.ts`。
- 夜揽能力使用 `POST /gwapi/queryService/eco/query/range/matchFeatureAoi`；改单时段使用 `POST /gwapi/orderService/eco/order/dispatchTime/dispatchTimeByDeptCode` 且固定 `source=0`。详情快捷预约仍独立使用 `dispatchTimeNew source=4 + orderDispatchFlag`，两条链路没有混用。
- 地址夜揽证明按地址绑定并保留 2 小时；时段响应合并普通、夜间和不可用窗口。地址、件重体积或产品变化后，请求指纹使旧响应失效，未重新取得有效选择时不能提交。

### 13.2 页面与提交契约

- `useOrderEditSchedule.ts` 自动防抖查询并隔离过期响应；`OrderEditScheduleSection.tsx` 提供 RN 日期/时段和三种送货方式选择，SCSS 为 169 行，全量使用 token/Flex。
- 三种送货方式固定为 `PICKNOTUPSTAIRS/PICKUPSTAIRS/PICKSELF`。`NZBRH/ZBTH` 重包隐藏；零担始终显示；普通快递仅重量大于 60kg 或体积大于 0.36m³ 时显示。
- 时间变化提交 `beginAcceptTime`，响应有值时提交 `pickPeriodTime`；原 `ServicePoint` 订单同时提交 `channelType=VISITING_SERVICE`。送货方式仅在当前可见且真实变化时提交 `deliveryMode`。
- 普通/夜间切换提交 `nightAccept=Y/N` 和 `nightAcceptStatus=-1/空`；这些扩展字段与保价 `insuranceSource` 通过统一合并函数组合，不会再被后写领域覆盖。
- 夜间时段继续执行北京时间 18:00 截单判断和 50 元/票费用确认；原订单已是夜间时段时，查询只补齐展示文案，不会误判成用户新选择而重复要求确认。

### 13.3 静态验收与后置能力

- 业务规则新增 7 条，覆盖三种送货枚举、重包/零担/普通阈值、`source=0` 请求、时段归一、夜揽能力与费用确认、ServicePoint 特殊字段、隐藏送货差异以及多领域扩展字段合并；叠加后续切片后当前共 162 条。
- 本切片不迁产品切换、重新报价、优惠券、木包装、JDL 揽收配置或改单图片上传；这些能力需要各自完整的报价/权限/端能力契约后再接入。

## 14. 本次续作：客户中心服务能力摘要

- `customerService.queryCustomerOverview` 并行查询 `selectCustName` 与 `customerLabel`，客户资料和能力结果独立归一；一个接口失败时返回另一部分与局部 warning，只有两个接口都失败才整体失败。
- `createCustomerCapabilitySummary` 统一生成代收额度、月结付款和合同客户文案，并以客户资料编码作为能力接口缺少 `custNumber` 时的安全兜底；页面不直接读取 `teanLimit/exPayWay/ifExistContract`。
- `CustomerCapabilitySection` 是独立 RN 顶层分区，新增 SCSS 全量使用 token/Flex；刷新按钮一次同步资料与能力，不新增缓存，因此不存在跨账号复用能力结果。
- 客户绑定/解绑、月结管理、合同变更、隐私面单和号码保护继续通过现有受控 H5 承接；当前未发现可确认的原生写接口，不伪造表单提交。
- 业务规则新增 2 条，覆盖能力展示 VM 与双接口部分降级；叠加后续切片后当前总数 162。

## 15. 本次续作：客服售后记录与理赔进度

- `shared/webview/appWeb.ts` 新增 `SUPPORT_COMPLAINT_RECORD`、`SUPPORT_CLAIM_PROCESSING`、`SUPPORT_CLAIM_COMPLETED`，精确对应参考端 `/depponmobile/complaint/record`、理赔列表 `tab=2` 和 `tab=3`。
- `services/support/support.service.ts` 在“售后处理”中新增投诉记录、理赔处理中和理赔已完成三个入口；所有入口都要求登录，并统一追加 `sonSource=APP_SUPPORT_CENTER`、当前 `ecoToken` 和 `pageSource=APP`。
- 普通投诉路径通过普通 query 追加上下文；理赔进度保留 hash route 中原有 `tab`，再追加认证 query，不把参数错误放到 hash 外。
- 页面继续复用 `pages/web/index`，没有新增路由或复制旧小程序投诉/理赔页面；申请、材料上传、处理节点和原生售后状态机仍由 H5/后续独立能力承接。
- 业务规则新增 1 条，锁定三个 source、精确 URL、客服分组、登录要求以及普通路径/hash query 拼接；叠加后续切片后当前总数 162。

## 16. 本次续作：签收 PDC 轻量反馈

- `services/order/order.pdcFeedback.api.ts` 独立封装 `/queryFeedback` 与 `/submitFeedback`，没有继续扩大共享 `order.api.ts`；查询保持参考端 `login=false/loading=false/timeout=3000`，提交保持登录请求。
- `services/order/order.pdcFeedback.ts` 只接受已签收 `orderClassification=2`、有效运单号和 `PDC_KDYZJO/PDC_KDYZJT` 来源；前者映射 `ONE`，后者映射 `TWO`，普通详情和公开轨迹模式都不触发。
- `useOrderPdcFeedback.ts` 在当前详情上下文上查询反馈状态，只有后端明确返回 `N` 才展示；`OrderPdcFeedbackPanel` 通过共享 `AppDialog` 提交“已收到/未收到”，失败时保留面板供重试。
- 提交 payload 固定为 `waybillNo/sendFrequency/feedbackResult`，没有迁入旧小程序埋点、CoverView、图片资产或全局状态；原生服务评价保持独立领域边界。
- 新增业务规则锁定来源、签收状态、公开模式、`ONE/TWO`、`Y/N` 和两个端点；叠加后续切片后当前 162 条。新增 SCSS 为 74 行，全量 token/Flex，201 个业务 SCSS 债务仍为 0。

## 17. 本次续作：订单原生服务评价

- `services/order/order.evaluation.api.ts` 独立封装 `/queryEvaluateDetail` 与 `/courier/evaluation/secure/commit`，没有把评价接口并回订单 API 巨石；订单评价查询与快递员详情页的 `isCommited` 是两套场景契约，当前采用订单详情能够返回快递员身份的前者。
- `order.evaluation.rules.ts` 只允许寄件角色的运输中/已签收订单和收件角色的运输中/已签收订单进入；收件角色或已签收映射 `cateGory=0/recordType=DELIVERY`，寄件运输中映射 `cateGory=1/recordType=COLLECTION`，已签收提交 `sign=Y`。
- 查询结果必须同时提供快递员工号和姓名才生成评价 VM；`NOT_EVALUATED` 映射待评价，已评价结果归一星级与标签，缺失身份时 fail-closed 并提供受控 H5 降级。
- `order.evaluation.catalog.ts` 按揽收/派送和 1-5 星提供参考端稳定标签：揽收 1-4 星 12 个负向标签、5 星 11 个正向标签；派送 1-4 星 10 个负向标签、5 星 9 个正向标签。提交至少选择一个标签，建议可空，非空至少 8 字、最多 250 字。
- `pages/order/evaluation` 是登录后独立 RN 页面；订单详情评价动作改为 App 路由，星级变化清空旧标签，提交只发送 `waybillNo/recordType/courierCode/courierName/starLevel/suggestion/evaluationLabels`。原生加载失败时 fallback 保留 `S0505/S0907`，并用 `channel=APP` 标识 App 渠道。
- 新增 5 条业务规则覆盖端点、角色/状态映射、待评价/已评价归一、快递员身份 fail-closed、标签目录、草稿校验、提交 payload、App 路由和 H5 fallback；叠加后续切片后当前共 162 条。新增两个 SCSS 全量 token/Flex，样式基线为 201 个业务 SCSS、存量债务 0。

## 18. 剩余重构建议

新对话不要直接从旧项目复制下一个页面。建议按以下顺序继续：

1. 读取 `AGENTS.md`、本交付文档和 `docs/rn-refactor-plan.md`，再检查当前工作区与静态门禁。
2. 对照旧项目与当前路由/service，列出尚未迁移或仍由 H5/pending 承接的业务能力。
3. 下一候选优先核对寄件木包装的核价 schema，或拆特殊保价的动态额度与服务互斥；打印和支付依赖尚未提供的原生 SDK 时，不应伪造实现。
4. 每个切片先确认 API、状态、页面和端能力边界，再实现 rules/mapper/use case、页面接入和静态测试。
5. 完成后只运行静态门禁，由用户自行打包和反馈运行时问题。

## 19. 本次续作：订单动态场景问卷与 NPS

### 19.1 场景计划与窗口

- `order.sceneSurvey.rules.ts` 按安全详情中的角色、`orderClassification`、原始 `orderTime/signTime/signVoucherTime`、来源和 7 天窗口生成问卷计划；公开轨迹、缺少运单号或过期状态不会查询问卷。
- 运输中寄件人按开单当天选择 `S0206`，否则选择 `S0601`，之后依次查询 `T0101/T0401`；运输中收件人只查询 `S0601`。
- 已签收寄件人依次查询 `N0101/S0908`；已签收收件人依次查询 `N0101/T0201/S0907_1/T0501`。
- `PDC/ECS` 通知来源按参考端只保留签收 NPS；`PDC_KDYZJO/PDC_KDYZJT` 的轻量收货反馈继续独立查询并获得弹窗优先级，关闭或提交后才展示仍未填写的 NPS，两套 payload 不混用。

### 19.2 查询、提交与降级

- SCORE/LABEL 使用 `/queryComment` 判断是否已填写、`/queryCommentScene` 读取首题和 `/insertComment` 提交；标签评分范围只接受整数 `1..5`，越界、小数或缺字段配置 fail-closed。
- NPS 使用 `/queryCustomerQuestionnaire` 判断填写状态、`/addCustomerQuestionnaire` 提交；评分固定为 `0..10`，级联原因按贬损者/被动者/推荐者目录限制每类最多三项。
- `order.sceneSurvey.orchestrator.ts` 使用 `Promise.allSettled` 保留成功问卷并统计失败项；页面进度只计算当前可填写项，同时明确提示另有暂未加载项，不因单场景接口异常清空整个队列。
- `useOrderSceneSurvey.ts` 使用 generation 和提交锁隔离切换运单后的旧响应；关闭会清空队列、进度、完成态和失败计数，不能在隐藏状态下残留问卷。

### 19.3 页面与静态边界

- `OrderSceneSurveyPanel`、`OrderSceneScoreForm`、`OrderNpsSurveyForm` 使用 RN `AppDialog/AppPressable` 和 Taro RN 表单组件，不调用小程序 API、DOM 或 RN Native API。
- 问卷样式按弹层和表单拆为 71/167 行两个 SCSS；当前 201 个业务 SCSS 均使用 token/Flex，严格样式债务保持 0，未提高组件行数预算。
- 业务规则当前为 162 条；除场景顺序、7 天窗口、通知来源、首题归一、标签边界、两套提交 payload、NPS 目录和查询部分失败降级外，还覆盖 RN 路由拒绝时的可见反馈与恢复回调、寄件产品点城市/融合/升级、DCZP 电池推荐和收件自提服务点。

## 20. 本次续作：寄件产品可用性与 DCZP 推荐

### 20.1 领域与接口边界

- `services/express/productAvailability.rules.ts` 独立承接产品角色、地址参数、客户能力归一、融合/升级开关、DCZP 电池标签判断和默认报价选择；`passProductCode` 不再错误复用用户选择的 `omsProductCode`。
- `express.api.ts` 新增 `/queryPointCityByProduct`、`/queryNewProductPointCity`、`/queryPointCityByAddress`。三个接口作为报价可选能力使用 3 秒超时和 `login=false`，即使旧会话异常也不会把能力失败误当成必须中断报价的登录失效。
- `productAvailability.service.ts` 先在真实 `ECO_TOKEN` 存在时查询账号客户能力，再用 `Promise.allSettled` 查询 DCZP 点城市、产品融合、产品升级和货物标签。融合只有明确 `false` 才为 `OLD`；升级只有明确 `NEW` 才按合同标记选择 `CONTRACT/UNIVERSAL`；不明确结果保持 `EXP`。
- 当前 RN 角色只映射已存在输入：普通寄件默认融合角色，`pickupManId` 保持快递产品，`shipperNumber` 使用扫码客户编码，`driverId/acceptDept` 使用 `DRIVER_QR_CODE`，`businessCode` 保持 `EXP`；没有迁入旧端 WAYBILL、特快、铁路或雪具分支。

### 20.2 报价与推荐契约

- `buildFreightRequest` 接受瞬时 `ExpressProductAvailability`，发送正确的 `passProductCode`、客户编码/月结/合同标记、`isOffSiteTransfer=N`；`CONTRACT/UNIVERSAL` 额外发送 `collectMode=BZLS`，自提映射 `deliveryMode=ZDZT`，其他派送映射 `BZPS`。
- 客户编码二维码优先于账号客户编码；只有扫码编码与账号能力编码一致时才继承月结和合同权限，不一致时按 `0/0` 传递，避免凭二维码在前端伪造客户权限。
- `queryGoodsRemark` 命中 `battery_category` 且 DCZP 点城市明确为 `true` 时才发送 `isRecommendDczp=Y`；页面保留后端报价顺序，只把 DCZP 作为默认选择。标签与开关均不写入寄件草稿、模板或缓存。
- `expressService.quote` 返回产品列表与本次能力上下文；`useExpressQuote` 继续保留 request key 和 latest-request 竞态保护，旧报价响应不能覆盖新草稿。

### 20.3 静态验收与后置能力

- 新增 5 条业务规则，覆盖精确地址与接口参数、RN 扫码角色、OMS 产品码隔离、融合/升级降级、DCZP 推荐、账号/扫码客户冲突和 service 编排；叠加服务点切片后当前总数为 162 条。
- RN boundary 新增领域 API 分层门禁，页面和 shared 层不能直接导入 `services/*.api`；同时锁定产品可选能力必须使用 `Promise.allSettled` 独立降级。
- 本切片只接入寄件主报价。批量寄继续使用参考端默认 `EXP`，价格时效查询继续走无扫码的 `EXP` 默认角色；特快、铁路、雪具、工业大件和其他特殊入口需要独立业务输入后再建模。
- 仅完成静态验收，不执行 Taro build、RN bundle、Gradle、Xcode 或安装包验证；后端仍需用户打包后核对三个能力端点和 `queryPriceTime` 对 App 渠道字段的真实响应。

## 21. 本次续作：收件自提服务点

### 21.1 查询与选择契约

- 地址网点继续使用 `POST /gwapi/queryService/eco/query/branch/stationSearch`；`PICKUP + EXPRESS` 精确映射 `matchtypes: ['expressPickup']`，不复制旧小程序网点页面或定位状态机。
- 选择模式只保留 `source=Address`、`pickupSelf=true`、距离 `0..20km`、非空 `deptNo` 和非空网点名的数据。20km 边界包含，负距离、空距离、城市列表项和缺少 `deptNo` 的异常数据全部 fail-closed。
- `StationItem.id` 精确承接后端 `deptNo`，`StationItem.code` 只承接 `deptCode` 供详情/反馈使用；下单服务点绝不回退使用 `deptCode`。
- 用户可选择具体服务点，也可选择“使用最近服务点”。后者通过一次性桥回传 `station=null`，清空显式网点字段，由后端按收件地址匹配最近点。

### 21.2 草稿、页面与下单字段

- `ExpressDraft.deliveryPoint` 独立保存 `{ code, name }`；仅在 `deliveryMode=PICKSELF` 时有效。收件地址变化、地址互换或退出 `PICKSELF` 会清空旧值并使报价失效。
- 指定服务点时创建订单只写 `receivingToPoint=deptNo` 和 `receivingToPointName`；未指定、异常数据或非自提模式写空字段，不猜测网点编码。
- `stationSelection` 按 source 隔离并一次性消费；`useExpressDeliveryPoint` 在寄件页 `useDidShow` 回填。草稿 storage、跨页 bridge 和模板 bridge 都归一并深拷贝该对象。
- 网点页筛选器、结果列表和选择提示已拆为独立组件/SCSS；寄件页使用 `ExpressDeliveryPointField` 和 hook 控制器，父页面只保留编排。模块体积、RN 样式映射和 180/300 行 CSS 门禁均未放宽。

### 21.3 静态与运行时边界

- 业务规则新增 2 条，锁定 `expressPickup`、20km/负距离/`pickupSelf`/`deptNo` 过滤、null 最近点、清理规则、一次性桥和精确下单字段；当前总数 162 条。
- 当前 201 个业务 SCSS 全量使用 token/Flex，颜色、字号、行高、圆角和字重债务保持 0。
- 仅完成静态验收。用户重新打包后仍需用真实地址确认后端距离单位、`pickupSelf/deptNo` 返回、`useDidShow` 回填时机，以及创建订单对两个服务点字段的接受情况。

## 22. 本次续作：寄件保价类型与动态额度

### 22.1 领域与额度边界

- `insurance.product.ts` 保存产品必保、免费保障、全额保和省心保权限；必保产品上限为 9990000 元，省心保上限为 500 元，普通产品使用 `customerLabel.insuredPriceCap`，无有效动态额度时默认 1000000 元。
- `insurance.rules.ts` 负责能力指纹、金额/类型校验、报价字段、试算 subtype、下单扩展字段、草稿清理和 mutation；`insurance.view.ts` 只生成页面 VM，`insuranceRule.types.ts` 只承接说明页 DTO，所有新模块均保持在体积预算内。
- `fragile_articles` 自动归一为易碎保，`worry_free_protection` 只推荐省心保，`limitation_insure` 清空金额并禁止保价。货物名称、收寄地址和扫码客户上下文变化会清除能力证明，产品变化会重新归一 QEB/SXB 权限。
- 客户编码二维码只有与账号客户编码一致时才继承 `insuredPriceCap`；不匹配时额度按散客语义处理，不能通过扫码获得其他客户权限。

### 22.2 报价、试算与下单

- 固定保障试算继续调用 `/gwapi/pricetimeService/eco/fixedProtection/queryFixedProtection`，`subType` 按基础/全额保、SXB 和易碎保分别映射 `QEB/SXB/YSB`，页面使用请求版本与输入 key 拒绝旧响应。
- 主报价按当前能力发送 `insuredAmount/fullCoverage/sxb/isFragileArticles`；易碎标签即使未填金额也会发送 `isFragileArticles=Y`，其他特殊类型必须有正整数金额。
- 创建订单将全额保、省心保、基础保和易碎保映射为 `bjlx=0/1/3/4`；`NFLF/NLRF` 未填金额时提交 2000 元并附加 `insuranceSource=DEFAULT`。
- 提交前重新查询货物标签并与草稿中的当前证明逐字段对比；标签变化或旧草稿缺少证明时直接要求重新报价，避免用过期易碎/禁保能力下单。
- 模板后端 schema 没有保价类型字段，因此只保存金额；加载模板时特殊类型恢复为 `NORMAL`。草稿 storage、寄件 bridge 和模板 bridge 均归一并深拷贝保价 capability。

### 22.3 页面、静态门禁与登录回跳复核

- `useExpressInsurance.ts` 与 `ExpressInsuranceCard.tsx/.scss` 替代货物卡中的旧单金额输入，提供类型分段选择、动态额度、免费保障、规则入口和费用试算；寄件主页面保持 662 行，组件/SCSS 均低于 180 行。
- 当前业务规则为 178/178；除保价切片外，新增锁定登录关键 replace 导航、in-flight 守卫、空页面栈失败和寄件优惠券请求/异常契约。样式基线为 205 个业务 SCSS，债务为 0。
- 登录回跳再次对照支付结果、注销成功、寄件成功和 WebView 一次性桥：登录已使用统一 `redirectUrl + navigateToAppRoute(..., { replace: true })` 模式。若新包仍不回跳，应先确认 `ECO_TOKEN` 与用户缓存是否成功落盘；H5 回 App 场景继续使用 `postMessage -> bridge -> navigateBack -> useDidShow consume`，不新增页面私有跳转。
- 未执行 Taro build、RN bundle、Gradle、Xcode 或安装包验证；真实客户额度、货物标签和创建订单字段仍需用户打包后联调确认。

## 23. 本次续作：寄件可用优惠券查询与选择

### 23.1 接口与费用契约

- 新增 `POST /gwapi/couponService/eco/coupon/new/secure/queryCouponOrder`，请求包含 `freight/productCode/arriveProvinceName/channel/mobile/sendAnAddress/receivesAnAddress/couponFeeList`；当前 RN 付款模型没有 E 卡，不发送可选 `paymentType`。
- `couponOrder.rules.ts` 从当前产品报价恢复原始 `FRT/BF/AD/NMBZ` 费用。`YHJ/YHQ` 优惠只按 `couponRankType` 加回对应费用，`XLYHF` 线路限时优惠只加回运费；包装明细仍读取 PPC `BZ`，查询枚举按参考端发送 `NMBZ`。
- `expressCoupon.service.ts` 将后端 `available/unAvailable` 分别映射为可选和只读券卡；空数组是正常无券结果，接口失败才进入错误态。

### 23.2 页面与状态边界

- `useExpressCoupons.ts` 在当前报价、地址、手机号和登录态完整后以 300ms debounce 自动查询，使用稳定请求 key 与 latest-request 协调器拒绝旧响应；手动刷新会取消待执行自动查询并复用同 key 在途请求，选择优惠券导致产品报价失效后会清空列表，重新报价后再按新上下文查询。
- 查询 API 或映射抛异常时，service 统一返回可重试失败，hook 同时以 `try/catch + mounted/key` 双重保护收敛为 error；请求失效、定时器取消或页面卸载后不会继续写旧列表或把状态留在 loading。
- `ExpressCouponCard.tsx` 提供独立 RN 卡片和底部选择层，支持可用券、不可用原因、券详情、手动券码、选择、清除、刷新和登录后草稿恢复；旧 `ExpressOrderOptionsSection` 只保留备注、协议与校验，不再承载优惠券状态。
- 选择、手输或清除统一复用 `updateExpressCouponNumber`，清空页面旧报价并提示重新获取价格；最终仍由价格时效的 `promotionsCode/customerMobile` 和创建订单接口校验，不以前端可用券列表冒充结算结果。

### 23.3 静态与后置能力

- 本优惠券切片累计新增 4 条业务规则，覆盖四类原始费用恢复、地址/渠道 payload、无产品 fail-closed、300ms 自动查询窗口、available/unAvailable 卡片归一和运行时异常归一；叠加登录导航竞态规则后当前共 178 条。
- 优惠券样式按卡片、弹层、券项拆成 57/85/85 行三个 SCSS；当前 205 个业务 SCSS 全量 token/Flex、债务为 0，未提高组件、types 或样式预算。
- 未迁参考端自动推荐首张券、月结自动切现付、`couponSource/couponRecommend` Redux 状态、营销埋点和小程序 Picker。优惠券自动最优、复杂互斥和 E 卡付款需要独立结算契约后再接入。

## 24. 本次续作：登录导航与优惠券竞态收口

- `shared/navigation/navigationRuntime.ts` 只有读取到非空且与目标一致的 pathname 才确认成功；RN 页面栈短暂为空时继续等待，最终仍为空则失败提示。关键导航只 dispatch 一次，迟到的首次跳转不会再被第二次 replace 覆盖。
- `shared/navigation/authGuard.ts` 已用 in-flight Promise 代替 800ms 时间窗；并发鉴权只发起一个登录跳转，导航成功或失败后都释放。登录提示不可用时不会阻断实际跳转。
- `pages/login/index.tsx` 在短信或登录请求返回、以及 finally 恢复按钮前检查 mounted 状态；用户已经离开登录页时不再 setState 或强制回跳。会话已经落盘但目标路由失败时仍保留“返回原页面”重试语义。
- 项目内其他回 App 模式继续保持边界：登录入口 push、成功后 App route replace；支付结果和注销成功使用 App route；寄件成功按完成页流程导航；受控 H5 数据回传使用 `postMessage -> bridge -> navigateBack -> useDidShow consume`，不引入 URL scheme、小程序 `switchTab` 或 H5 私有登录回跳。
- 新增 6 条业务规则，覆盖登录 in-flight、提示降级、慢路由复核、空页面栈失败、优惠券 debounce 和运行时异常；当前业务规则为 178/178。未执行 Taro build、RN bundle、Gradle、Xcode 或安装包验证。

## 25. 本次续作：寄件木包装

### 25.1 报价与下单契约

- 包装专属契约已从增长中的 `types.ts` 抽到 `packaging.types.ts` 并由原入口兼容再导出；`ExpressPackagingDraft` 新增 canonical `woodenCodes`，支持 `WOOD_03` 木架、`WOOD_04` 木箱、`WOOD_01` 木托 1 号和 `WOOD_02` 木托 2 号同时多选，也允许与一个普通纸箱并存。未知、重复和乱序 code 会统一过滤、去重并恢复目录顺序。
- 报价继续只把纸箱放入顶层 `packageInfoList`；木包装不伪装成纸箱计价项，而是发送顶层 `packageLtlType='WOOD_PACKAGE'`，未选择时发送空字符串。仓储暂存复用同一个报价 builder，因此不会形成第二套包装契约。
- 创建订单使用独立 mapper：木架映射 `VOLUME/1/SJ`，木箱映射 `VOLUME/1/BG`，木托 1/2 号映射 `COUNT/1/SP|NSP`；`receive[0].packing` 对相同“木托”语义去重。纸箱与木包装明细按稳定目录顺序合并，下单真实货物体积不被包材体积覆盖。
- 批量寄继续复用 `ExpressReceiveOrder`，但本切片没有擅自增加批量包装字段；`packing` 在共享类型中保持可选，仅普通寄件 builder 显式发送。

### 25.2 草稿、页面与样式

- 包装归一器负责创建、恢复、patch 更新和数组深拷贝；`draftStorage` 将“只选择木包装”识别为有意义草稿。寄件 draft bridge 与模板 stage/consume 自动保留并隔离数组，外部业务来源仍沿用既有清空策略。
- `ExpressPackagingCard` 保留普通纸箱单选，新增木包装复选区、真实目录图片、静态价格和最低价信息；头部摘要在多项选择时收敛为数量，避免窄屏溢出，实际收费提示保持“价格以快递员核实为准”。
- 原纸箱 SCSS 继续冻结在既有预算；新增分组样式独立为 `ExpressPackagingGroups.scss`。当前 206 个业务 SCSS 全量 token/Flex，样式债务为 0。

### 25.3 静态规则与运行时边界

- 新增 2 条业务规则并扩展既有包装规则，锁定木包装目录映射、canonical 去重、报价/下单字段分离、`packing` 文案、报价失效和 storage/draft/template bridge 深拷贝；当前业务规则为 180/180。
- 已运行完整静态门禁，不执行 Taro build、RN bundle、Gradle、Xcode 或安装包验证。用户仍需用真实测试环境确认价格时效接口接受空值/`WOOD_PACKAGE`，创建订单接受四种包材 code 与 `packing` 层级，并在 Android/iOS 检查远程图片、复选状态和窄屏布局。

## 26. 本次续作：寄件拆包装服务

### 26.1 领域、报价与下单契约

- 本能力是寄件下单的拆包装增值服务，不是订单存根中已完成的“拆包装照片”只读凭证。`ExpressPackagingDraft` 新增 canonical `unpackingCodes`，只接受 `UNPACKING_01` 拆木包装和 `UNPACKING_02` 拆非木包装，按目录顺序过滤、去重；两项均可独立选择，也可与纸箱、木包装同时存在。
- 参考端选择时只在 `active/count` 间切换空值和 1，RN 草稿不保留页面状态机，而由 mapper 将已选项映射为 1、未选项映射为 0。报价始终发送顶层 `unpackingWoodPackagingNumber/unpackingNonWoodPackagingNumber`。
- `packageLtlType` 已扩展为四态：空字符串、`WOOD_PACKAGE`、`UN_PACKAGE`、`WOOD_PACKAGE,UN_PACKAGE`。拆包装不进入报价纸箱 `packageInfoList`，也不进入下单木包装 `packageInfoList` 或 `receive[0].packing`。
- 普通寄件创建订单始终发送顶层 `unpackageLtlInfo: { unpackingNonWoodPackagingNumber, unpackingWoodPackagingNumber }`；共享类型保持字段可选，避免本切片静默改变批量寄已有请求。报价明细 `CBF` 统一展示为“包装服务-拆包装”，目录 20/10 元不替代后端最终计费。

### 26.2 草稿、页面与边界

- 包装归一器、`draftStorage`、寄件 draft bridge 和模板 stage/consume 自动深拷贝 `unpackingCodes`；仅选择拆包装也会保存为有意义草稿。查价/优惠券/品名往返继续保留，外部再寄、批量识别、扫码、派送范围、专属快递员和模板带入按既有包装策略清空。
- `ExpressPackagingCard` 新增拆包装复选分组，复用现有固定行高、图标、价格和 checkbox 视觉；摘要纳入三类服务，多项时收敛为数量，“无需包装”会清理全部纸箱、木包装和拆包装。
- 本切片未新增 SCSS 行数，只将分组边界 modifier 改成通用命名；当前仍为 206 个业务 SCSS 全量 token/Flex，债务为 0。

### 26.3 静态规则与运行时边界

- 新增 2 条业务规则并扩展包装既有规则，覆盖拆包装目录映射、canonical 去重、四态 `packageLtlType`、报价 0/1 字段、下单顶层对象、CBF 费用名、报价失效和 storage/draft/template bridge 深拷贝；当前业务规则为 182/182。
- 已运行完整静态门禁，未执行 Taro build、RN bundle、Gradle、Xcode 或安装包验证。用户仍需用真实零担产品确认价格时效与创建订单接口接受字段层级、空值 0、组合枚举和 CBF 计费，并在 Android/iOS 检查复选与窄屏摘要。

## 27. 本次续作：RN 登录原生会话与回跳收口

### 27.1 参考端与根因

- 参考小程序和 RN App 使用同一 OWS 登录端点，但参考端主流程依赖微信/支付宝授权、静默登录和小程序页面栈；RN 继续保留手机号验证码登录，不迁入小程序 API、Redux 用户巨石或营销状态机。
- Taro RN 4.2 `request` 只返回 `header=response.headers`，不会填充 `cookies`；原生 `fetch` 又不能可靠把 `Set-Cookie` 暴露给 JS。此前只扩展 `Headers.get/getSetCookie/raw/map` 的方案无法保证取得 `ECO_TOKEN`，会让成功包体被 `authService` 判为“登录凭证保存失败”并清会话。
- Taro RN Router 的 `navigateTo/redirectTo` 在 dispatch 后立即 resolve，不等待页面挂载。此前确认失败后再发一次 replace 会与首次导航竞争，不能作为恢复手段。

### 27.2 当前实现

- 新增维护中的 `@preeternal/react-native-cookie-manager@6.3.3`，且只由 `shared/native/AppSessionCookie.ts` import。该 facade 同步 RN 网络 cookie store、iOS WebKit cookie store 和 cache adapter；页面、service 和 request 业务代码不直接调用 RN Native API。
- `request` 显式使用 `credentials: include`；`cookieJar` 保留响应头兼容解析，缺失时从原生 jar 读取，启动时在原生 jar 与异步 storage 间 hydrate，退出/过期时同时清理。登录与短信端点显式 `login=false`，失败不会误发全局 `authExpired`。
- “我的”使用 push 打开登录页；登录成功仍通过安全 `redirectUrl` replace 返回。关键导航只 dispatch 一次并等待路由实例，超时只提示失败和释放 in-flight。
- 当前工程没有登录 deep link/URL scheme 监听。项目内 H5 回传继续走 `postMessage -> bridge -> navigateBack -> useDidShow consume`，它不替代 App 内登录返回，也不为登录发明无服务端契约的 scheme。

### 27.3 静态验收与用户回归

- 新增 2 条业务规则并改写导航竞态规则，覆盖 RN header 不可见时的原生 cookie fallback、启动 hydrate/清理、公开登录接口、个人中心 push 登录和单次 replace；当前业务规则为 184/184。RN boundary 还锁定 `credentials: include` 与 native facade 位置。
- 完整 `verify:static` 已通过：TypeScript、ESLint、Stylelint、62/62 样式治理用例、CSS 日常/严格门禁、RN boundary、路由、模块体积、runtime config、184/184 业务规则和 platform build config 全部通过。未执行 Taro build、RN bundle、Gradle、Xcode 或安装包验证。
- 这是原生依赖变化。用户打包前需按锁文件重新安装依赖；iOS 重新 pod install，Android/iOS 都要重建原生包。实机按“我的 -> 登录页 -> 发码 -> 勾协议 -> 登录 -> 原目标 -> 杀进程重启”验收，并确认系统 cookie jar、本地 `DEPPON_COOKIE` 和用户缓存均已建立。

## 28. 本次续作：订单改单打包服务件数

### 28.1 详情、状态与校验边界

- `services/order/order.edit.packaging.ts` 将参考端稳定的 `orderExtendFields.packingService` 收敛为独立 `{ count }` 草稿；详情缺失、空值、非法值恢复为 0，重复扩展字段按最后一个值处理。
- `0` 表示关闭打包服务，启用后件数限制为 `1..999` 的整数；参考端 2 元/件只用于页面估算，不伪造报价接口或具体包材价格。
- 本能力表示快递员按现场难度执行的“打包动作件数”，不是普通寄件的纸箱、木包装、拆包装目录，也不增加未知包装 code、类型或图片上传字段。

### 28.2 页面与修改 payload

- `OrderEditDraft` 新增独立 `packaging` 字段，`validateOrderEditDraft` 统一包含包装件数校验；页面新增 `OrderEditPackagingSection`，提供开关、数字输入和 Lucide 加减步进。
- `/modifyOrder` 仅在件数真实变化时追加 `{ key: 'packingService', value: String(count) }`；关闭服务显式发送 `"0"`，未变化时完全不发送该字段。
- 包装 diff 复用统一扩展字段合并器，可与 `insuranceSource`、`nightAccept` 等其他改单领域同时提交，不会互相覆盖。

### 28.3 静态门禁与后置能力

- 新增 2 条业务规则，覆盖详情恢复、最后值语义、输入归一、1..999 上限、2 元参考费用、启用/清除字符串 diff、总表单校验及与保价扩展合并；当前业务规则为 186/186。
- 新增组件 161 行、领域规则 124 行、SCSS 125 行；样式基线为 207 个业务 SCSS，全部使用 token/Flex，未提高 180 行组件 SCSS 或模块体积预算。
- 本切片不包含具体纸箱/木包装类型、产品/线路、付款方式、返单或图片上传；这些能力仍需各自的详情、权限、报价和 `/modifyOrder` 契约后再接入。
- 未执行 Taro build、RN bundle、Gradle、Xcode 或安装包验证；真实订单详情字段、清零语义和后端费用仍需用户打包后联调。

## 29. 本次续作：寄件模板元数据编辑

### 29.1 更新契约与边界

- `template.mapper.ts` 新增元数据变化判断、保存 payload 和列表本地更新；修改时原样携带旧模板完整 `template` 正文，只覆盖 `id/templateName/defaultFlag/sysCode`，不会因只编辑名称而丢失联系人、货物、取件、付款、产品、保价或返单字段。
- `template.service.updateMetadata` 不查询模板列表，不受 5 条新增上限影响；无变化、缺 ID、校验失败或接口失败都返回稳定失败，页面不会关闭编辑层或覆盖当前列表。
- 列表本地更新保持唯一默认状态：把当前模板设为默认时会同步取消其他模板默认；改为普通模板时不会擅自指定新的默认模板。

### 29.2 页面与后置能力

- `TemplateMetaEditor` 使用 AppDialog、输入框和分段控制，只编辑 5 字内名称及默认/普通状态；保存中禁止关闭和重复提交，失败保留当前输入供重试。
- 本切片不是完整模板内容编辑。后端现有模板 schema 仍无法完整表达木包装、拆包装、代收货款、进仓、派送偏好、动态保价能力证明等新增 `ExpressDraft` 字段，不能把当前寄件页草稿强行覆盖到旧模板正文。
- 新增 1 个 SCSS 并登记样式基线；当前 208 个业务 SCSS 全量 token/Flex，存量债务为 0。

### 29.3 静态规则

- 新增 2 条业务规则，覆盖完整正文保留、唯一默认状态、无变化不请求、更新不查询数量上限和后端失败恢复。
- 修复 `defaultFlag` 在列表更新中的字面量类型收窄，TypeScript 不再被该未完成切片阻断。

## 30. 本次续作：登录实机反馈复核与 Web 鉴权收口

### 30.1 对照结论

- 参考小程序同样调用 `/gwapi/userService/eco/user/login`，但它还依赖 `Taro.login/my.getAuthCode`、静默授权、Redux 和小程序页面栈；RN 继续使用手机号验证码与 OWS `ECO_TOKEN`，不迁这些平台分支。
- 当前项目内返回 App 的稳定模式已经核对：登录为 App 内 `navigateTo -> redirectUrl -> replace`；支付结果和注销成功使用 App route；只有送货进仓、电子云签、代收账户等受控 H5 数据回传使用 `postMessage -> bridge -> navigateBack -> useDidShow consume`。登录不需要 deep link、URL scheme 或 H5 私有回调。
- “我的”登录入口、`AppPressable` 命中区域、路由注册和 Taro RN `navigateTo/redirectTo` Promise 形态均可达；输入键盘开启时首次点击由 `AppFormScrollView` 的 `keyboardShouldPersistTaps='handled'` 保证进入业务 handler。

### 30.2 会话与动态 Web 守卫

- Taro RN 4.2 成功响应只提供 `header: Headers`，通常不向 JS 暴露 `Set-Cookie`。登录继续从原生系统 CookieJar 恢复 `ECO_TOKEN`；Android 网络层写 CookieJar 是异步动作，首次未命中时最多再读 5 次、每次间隔 40ms，仍无 token 才清理并提示“登录凭证保存失败”。
- `pages/web` 对 `auth=Y` 增加页面级 fail-closed：无 App 会话时不渲染 WebView，保存完整当前 Web App 路由并进入统一登录页，成功后 replace 返回；`auth=N` 协议页和 URL 白名单逻辑保持不变。
- RN boundary 新增结构检查，锁定原生 Cookie 恢复入口、动态 Web 登录判断和统一 `ensureAuthenticated` 调用，防止后续重构只保留共享 Cookie 开关却绕过 App 登录。

### 30.3 静态验收与运行时事项

- 业务规则新增/扩展 2 条登录鉴权用例，覆盖原生 Cookie 延迟出现和认证 Web 目标 fail-closed；叠加模板元数据规则后当前为 190/190。
- 完整 `verify:static` 已通过：TypeScript、ESLint、Stylelint、62/62 样式治理、208 个业务 SCSS 日常/严格门禁、RN boundary、路由、模块体积、runtime config、190/190 业务规则和 platform build config 全部通过。
- 未执行 Taro build、RN bundle、Gradle、Xcode 或安装包验证。`@preeternal/react-native-cookie-manager` 是原生依赖，用户必须按锁文件重新安装并重建 Android/iOS 包后，再验收“我的 -> 登录 -> 发码 -> 勾协议 -> 登录 -> 原目标”、受保护 WebView 回跳和杀进程会话恢复。

## 31. 本次续作：面单打印待打印/已打印只读列表

### 31.1 查询契约与领域分层

- 参考端的真实查询接口为 `POST /gwapi/onlineService/eco/online/print/order/secure/queryNewOrderPrintList`，当前 App 只迁 `pageNum/pageSize/startTime/endTime/searchType` 契约；`searchType=1` 表示待打印，`searchType=2` 表示已打印。
- `print.api.ts` 只描述查询接口；`print.mapper.ts` 归一空值、分页、手机号脱敏和地址；`print.rules.ts` 维护今天、近 3 天、近一周、近一个月、近三个月的本地日历范围，默认近 3 天，并负责分页去重和计数降级。
- `printService.queryCounts` 对两个 tab 使用 `Promise.allSettled`。任一计数失败只把对应数量显示为 `--`，另一侧仍保留真实数量；两个都失败也不阻断当前列表查询。

### 31.2 页面、路由与业务边界

- 路由注册表新增登录保护的 `APP_ROUTES.printList`；打印中心的“打印订单”从 pending 改为 ready，统一通过 App navigation 进入新页面。
- `pages/print/list` 支持待打印/已打印 tab、数量、五档日期范围、错误/空态、重试和分页加载；列表卡片只展示运单号、脱敏收件人和完整地址。
- 本切片不增加勾选、全选、打印按钮、蓝牙适配器、设备缓存、模板下发、打印配置或 `updatePrintStatus`。后续真实打印必须先落 `shared/platform/print` 或 `shared/native/print`，状态回写必须绑定真实原生打印成功结果。

### 31.3 静态规则与验收

- 新增 5 条业务规则并更新原打印中心断言，覆盖日期边界、映射脱敏、分页去重、精确查询 payload 和双计数部分失败；当前业务规则为 195/195。
- RN boundary 锁定列表页只能调用 `printService.queryList`，禁止引入 `printApi`、模板/配置/状态回写或选择打印逻辑；路由与模块体积门禁已通过。
- 新增 4 个 SCSS，严格样式基线为 212 个业务 SCSS、16199 行，全部使用 token/Flex，颜色、字号、行高、圆角和字重债务均为 0。
- 完整 `verify:static` 已通过：TypeScript、ESLint、Stylelint、62/62 样式治理、日常/严格样式门禁、RN boundary、路由、模块体积、runtime config、195/195 业务规则和 platform build config 全部通过；`git diff --check` 无错误，仅保留工作区既有 LF/CRLF 提示。
- 未执行 Taro build、RN bundle、Gradle、Xcode 或安装包验证。用户打包后需核对安全接口的真实列表字段、五档日期范围、分页、tab 数量部分失败提示，以及登录成功回到打印列表的运行时行为。

## 32. 本次续作：联系人地址完整性校验

### 32.1 领域决策与接口边界

- 继续使用 `POST /gwapi/userService/eco/user/contact/secure/checkAddressIsDetail`，请求只发送裁剪后的 `province/city/county/address`；API 显式声明无业务 `result` 依赖。
- `contact.addressIntegrity.ts` 将响应归一为 `pass/review/unavailable/blocked`：明确地址问题和无文案失败都要求用户复核，网络传输失败提示后非阻断继续，`authExpired` 中止当前动作并交给统一登录失效处理。
- 该规则没有迁旧端 Redux、来源分支或小程序定位。按定位推荐联系人仍依赖 `shared/platform/location`，当前 capability 为 `pending`，继续后置。

### 32.2 列表选择与编辑保存

- `useContactAddressIntegrity` 统一请求锁和弹窗语义，避免列表、编辑页重复解析 OWS 响应或重复发起校验。
- 地址簿 `select` 模式在写入选择桥前校验；后端提示不完整时，“修改地址”携带当前联系人进入编辑页，“继续使用”保留原选择和 `navigateBack` 语义。
- 联系人新增/编辑在保存前校验；“继续修改”停留当前表单，“仍然保存”才调用保存接口。`source/target/returnDelta` 与既有选择桥保持不变。

### 32.3 静态规则与后续验证

- 新增 2 条业务规则，覆盖请求字段裁剪、成功/业务失败/无文案失败/网络失败/登录失效决策和 service 精确调用；当前业务规则为 197/197。
- RN boundary 锁定联系人列表和编辑页必须调用统一 `checkAddressIntegrity`，hook 必须通过 `contactService.checkAddressDetail`，页面不能直连 API。
- 本切片未新增 SCSS，严格样式基线仍为 212 个业务 SCSS、16199 行，全部使用 token/Flex，存量债务为 0。
- 完整 `verify:static` 已再次通过：TypeScript、ESLint、Stylelint、62/62 样式治理、日常/严格样式门禁、RN boundary、路由、模块体积、runtime config、197/197 业务规则和 platform build config 全部通过。
- 未执行 Taro build、RN bundle、Gradle、Xcode 或安装包验证。用户打包后需核对真实后端 `status/message/transportFailure/authExpired` 组合、两组弹窗按钮语义、选择桥返回层级和网络降级提示。

## 33. 下一对话目标提示词

```text
/goal 继续完成 D:\codeSpace\com.project 的 Taro RN App 重构。参考项目是 D:\10531845\Desktop\CZH-DEV\mp-taro3，但不能照搬旧小程序页面、Redux 巨石状态或小程序 API，必须按当前项目已有的 pages/services/shared/cache 分层继续做高级前端重构。

开始前必须依次读取：
1. D:\codeSpace\com.project\AGENTS.md
2. D:\codeSpace\com.project\docs\handoffs\2026-07-13-rn-refactor-handoff.md
3. D:\codeSpace\com.project\docs\rn-refactor-plan.md
4. 当前 git status 和相关源码

当前工作区有大量连续重构中的未提交改动，必须在现状上继续，禁止 reset、checkout、删除未跟踪文件或回滚既有改动。先核对交付文档中的静态门禁结果，再对照旧项目审计剩余业务，选择下一个边界完整、可验证的业务切片继续实现。不要重复已完成的 RN 登录原生会话/回跳与认证 WebView 收口、面单打印待打印/已打印只读列表、联系人地址完整性校验、寄件模板元数据编辑、批量寄、收银台、订单详情拆分、发票拆分、寄件代收货款、预约/通知派送、夜间揽收、送货进仓、普通纸箱包装、寄件木包装、寄件拆包装、寄件产品点城市/融合/升级与 DCZP 推荐、收件自提服务点、寄件保价类型与动态额度、寄件可用优惠券查询与选择、订单改单代收货款、订单改单基础保价、改单上门时间/送货方式、订单改单打包服务件数、客户能力摘要、客服售后记录/理赔进度入口、签收 PDC 反馈、原生服务评价和动态场景问卷/NPS。

强制规则：项目只打包 RN App，不维护小程序；业务代码不得直接调用小程序 API、DOM/H5 API、Taro RN unsupported API 或 RN Native API；同步 storage API 禁用；端能力必须通过 shared/platform、shared/native 或 cache facade；RN 样式优先 Flex 并遵守现有 token/CSS 严格门禁。页面确实自然复杂时不必机械拆分，但新增职责必须有清晰边界。

Codex 不得执行 taro build、RN bundle、Gradle、Xcode、Android/iOS 打包或发布包验证。只运行 TypeScript、ESLint、Stylelint、业务规则、路由、模块体积、runtime config、RN boundary 等静态检查；打包由我执行，问题我会反馈。

先分析并给出当前剩余能力审计和本轮切片计划，然后直接实施、补静态规则、更新 docs/rn-refactor-plan.md，并在本轮结束时说明改动、静态验证结果和仍需我运行时确认的事项。
```
