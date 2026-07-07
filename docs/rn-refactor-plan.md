# Taro RN App 重构计划

## 当前结论

当前项目 `D:\codeSpace\com.project` 已经是 pnpm workspace，并包含 `apps/com.deppon.app` 这个 Taro RN 应用骨架。目标不是再维护小程序端，而是把参考项目 `D:\10531845\Desktop\CZH-DEV\mp-taro3` 的业务能力重构到 RN App，最终面向 Android 和 iOS。

参考项目是 Taro 3.6、React 17、Redux、Less 的小程序工程；当前 App 骨架是 Taro 4.2、React 18、React Native 0.73、Sass。两者平台和运行时差异很大，因此迁移策略必须是重构，不是复制 `src`。

## 结构盘点

参考项目主要模块：

- `api`：按业务域拆分的接口封装。
- `http`：基于 `Taro.request` 的请求层，带 cookie 和登录失效处理。
- `store`：Redux actions、reducers、constants、types。
- `utils`：登录、路由、缓存、支付、定位、联系人、寄件等业务工具。
- `pages`：首页、寄件、查件、订单、支付、发票、会员、联系人、批量寄件等完整小程序页面。
- `components`：大量业务组件和 UI 组件。
- `sensors`：小程序神策 SDK。

业务模块迁移判断：

| 模块 | 业务含义 | 迁移判断 |
| --- | --- | --- |
| `home` | 首页、运营位、寄件入口、查询入口、营销弹窗、隐私协议、新客券 | 可迁，但要 App 化：首页做主入口，不照搬订阅、收藏和分享逻辑。 |
| `send/express` | 核心寄件下单巨石页：地址、产品、价格、优惠、取件、增值服务、实名、支付 | 首期核心，但必须拆分重构。 |
| `order/list` | 查快递、寄/收件订单、待支付、关注、搜索、筛选 | 首期主链路。 |
| `order/detail` | 轨迹、地图、快递员、签收、复制单号、电子存根、货物补充明细、照片凭证、单据票证、催单、通知派送、拦截作废、收件方式、联系营业部、评价、支付入口、修改/售后入口 | 首期迁基础详情、轨迹列表、单号复制、电子存根、尺寸/包装费用只读明细、照片凭证只读预览、电子合同状态和完成态 WebView 预览、待支付提示、催单、通知派送、拦截作废、收件方式 H5、联系营业部、评价 H5 和售后快捷入口；地图/原生评价表单/完整售后状态机后置。 |
| `center` | 我的、订单统计、地址簿、发票、客服、客户中心、会员、设置入口 | 首期做 App 我的页骨架，并拆出客服中心、客户中心等 App 化页面。 |
| `login` / `user` | 登录、绑定、实名、签收码、注销 | 登录必须先迁；签收码读能力和实名签收登记进入首期，完整实名核验后置。 |
| `contact` | 地址簿、地址编辑、智能解析、委托寄件联系人 | 首期迁地址簿基础能力。 |
| `query` | 服务查询、价格时效、收派范围、网点、货物/禁寄查询 | 价格时效、收派范围、网点列表/详情和货物/禁寄查询进入首期；地图导航能力仍走 App 原生 facade 后置接入。 |
| `pay` | 运单支付、收银台、PDA 支付、E 卡、支付状态 | 首期保留支付入口/待支付展示，并提供 E 卡读中心和 H5 承接；真实支付等原生能力 ready 后接入。 |
| `coupon` / `member` / `memberService` | 优惠券、会员、SVIP、营销权益 | 优惠券个人列表/兑换/详情、会员等级/SVIP 摘要和福利中心 WebView 承接进入首期；会员支付、营销弹窗和订阅消息后置。 |
| `invoice` | 发票、抬头、申请、预览、支付 | 发票读中心、抬头管理、申请草稿/预览、历史电子票预览和发送邮箱进入首期；真实提交、支付和纸票邮寄后置拆分。 |
| `batch` / `ai` / `print` / `pda` | 批量、AI 下单、蓝牙打印、签收/PDA | 高风险，后置。 |
| `common` / `web` | 协议、图片、状态页、投诉、理赔、WebView 承接 | WebView 和客服中心进入首期；投诉/理赔先 H5 承接，复杂售后状态机后置。 |

配置和工具层同样重要：`config/send.ts`、`config/product.ts`、`config/order.ts` 是业务枚举和规则核心；`utils/send.ts`、`utils/order.ts`、`utils/contact.ts`、`utils/cache.ts` 中的纯业务规则可抽取，但小程序 UI、生命周期、授权和跳转逻辑不迁。

当前项目已经具备：

- RN 原生工程：`android`、`ios`。
- Taro RN 配置：`config/index.ts` 中的 `rn` 输出配置。
- 请求层雏形：`src/request`。
- 初始页面：`src/pages/home`、`src/pages/express`。

## 已确认方向

- 只保留 App/RN 构建入口，根脚本不再暴露小程序构建。
- 参考项目的业务语义可以复用，但页面结构、状态层、平台 API 和样式体系要重新设计。
- 小程序专属能力必须走 RN 适配层，不能在业务页面散落 `wx.*`、`my.*` 或小程序插件调用。
- 迁移优先级从主链路开始：首页、寄件、查件、订单、我的/登录。
- 旧项目 OWS 接口主要依赖 `ECO_TOKEN` cookie 会话，不应直接套用当前请求层的 `Authorization: Bearer` 逻辑。

## 当前底座调整

- 根脚本已收敛到 `dev:app`、`build:app`、`android`、`ios`、`start:app`。
- App 脚本已收敛到 RN 构建：`dev`、`build`、`build:rn`、`dev:rn`。
- App 包已移除 `@tarojs/plugin-platform-weapp`、`@tarojs/plugin-platform-alipay`、`@tarojs/plugin-platform-h5`、`@tarojs/plugin-platform-jd`、`@tarojs/plugin-platform-qq`、`@tarojs/plugin-platform-swan`、`@tarojs/plugin-platform-tt` 等小程序/H5 平台插件直接依赖，保持 RN-only 依赖边界。
- `app.config.ts` 已改为首期主链路页面：`home`、`login`、`express`、`expressSuccess`、`priceQuery`、`dispatchQuery`、`stationQuery`、`goodsQuery`、`accountSettings`、`accountCancel`、`realNameCenter`、`contactList`、`contactEdit`、`orderList`、`orderDetail`、`orderCancel`、`orderStub`、`paymentList`、`couponList`、`couponDetail`、`supportCenter`、`customerCenter`、`signCode`、`ecardCenter`、`memberCenter`、`invoiceCenter`、`invoiceApply`、`invoiceDetail`、`invoicePreview`、`invoiceTaxpayerList`、`invoiceTaxpayerEdit`、`privacySettings`、`mine`、`web`。
- `metro.config.js` 已补 pnpm workspace 的 `watchFolders`、`nodeModulesPaths` 和 symlink 支持。
- Taro RN 所需 native peer 依赖已显式放入 `com.deppon.app`，包括 `@tarojs/router-rn`、React Navigation、gesture handler、screens、safe area、svg、webview、pager view 等。
- 原生身份已做首轮同步：Taro RN `appName`、Android `getMainComponentName` 和 iOS `moduleName` 统一为 `DepponApp`；Android `applicationId` 为 `com.deppon.app`；iOS Bundle ID 为 `com.deppon.app`；Android/iOS 展示名为“德邦快递”。
- 已建立 `src/app.bootstrap.ts`、`src/shared/config/runtime.ts`、`src/shared/navigation/routes.ts`、`src/shared/platform/capabilities.ts`。
- 已建立 `src/shared/platform/scan.ts`，首页和后续查件/寄件扫码入口统一依赖扫码 facade，不直接调用小程序 `Taro.scanCode`。
- 已建立 `src/shared/platform/phone.ts`，App 端通过 RN `Linking` 承接拨打电话能力，页面不再直接调用小程序 `Taro.makePhoneCall`。
- 首页和预约寄件页已从模板占位变成可继续承接业务的 App 页面骨架。
- 已新增 `src/cache`、`src/request/deppon.ts`、`src/request/cookieJar.ts`、`src/request/events.ts` 和 `src/services/auth`，承接 OWS cookie 会话、响应归一、登录失效事件和 App 登录服务骨架。
- 已新增 `src/shared/components/AppTabBar`，RN 首期先采用页面内共享底部导航，不依赖小程序 `tabBar` 配置；首页、寄件、查快递、我的四个主入口已接入同一导航数据源。
- 已新增 `src/shared/navigation/appNavigation.ts`，集中处理 App 内路由安全兜底、主入口 `redirectTo`、普通页面 `navigateTo` 和受保护入口登录守卫，避免页面各自判断跳转形态。
- 已补齐 `shared/platform` 首期 facade：定位、地图、文件选择/上传/下载/预览、支付、通知、外部 App/小程序、实名核验、电话和扫码都通过统一能力矩阵暴露，默认 pending 的能力会明确降级为“待接入 App 原生模块”。
- 已新增工程验证脚本：根目录 `typecheck:app`、`lint:app`、`check:app-boundaries`、`verify:app`，App 包内 `typecheck`、`lint`、`check:rn-boundaries`、`verify`，后续每轮可用一条命令执行类型检查、ESLint、RN 边界检查和 RN build。
- 已新增原生环境检查脚本：根目录 `check:app-native-env`，App 包内 `check:native-env`，用于检查 JDK、Android SDK、Gradle wrapper、iOS 构建宿主等 Android/iOS 编译前置条件。

## 高风险平台能力

这些能力不能直接从参考项目搬过来：

- 登录：原项目依赖微信/支付宝小程序授权和静默登录。
- 支付：原项目依赖小程序支付、支付宝小程序 `my.tradePay` 等。
- 扫码：小程序 `Taro.scanCode` 需要替换为 RN 扫码库。
- 定位/地图：需要 RN 权限、定位 SDK、地图组件。
- 上传/下载：要确认 App 端文件、相册、相机和权限实现。
- 分享/订阅消息/跳小程序：App 端要么替换成原生分享/推送，要么取消。
- 埋点：小程序神策 SDK 需要替换成 App SDK 或统一埋点网关。

当前已在 `src/shared/platform/capabilities.ts` 建立能力清单，后续迁移业务时先接适配层，再接页面。

电话能力当前边界：

- `APP_NATIVE_CAPABILITIES.phone` 标记为 `ready`，因为 RN 可通过系统 `tel:` scheme 承接。
- `shared/platform/phone.ts` 暴露 `dialPhone`，统一做号码清洗、格式校验和 `Linking.openURL`。
- `pages/order/detail` 已接入寄件人、收件人和快递员拨号动作。
- 后续其他模块迁移旧项目 `Taro.makePhoneCall` 时统一复用 `dialPhone`。

扫码能力当前边界：

- `shared/platform/scan.ts` 暴露 `scanCode`、`scanWaybillCode` 和 `extractWaybillNumberFromScanValue`。
- `scanWaybillCode` 负责统一处理二维码/条码结果中的 `waybillNumber`、`waybillNo`、`waybillNum`、`billNo`。
- 当前 `APP_NATIVE_CAPABILITIES.scan` 仍是 `pending`，页面会展示统一“扫码能力待接入 App 原生模块”提示。
- 后续只需要在 `scanCode` 内部接入 RN 原生相机/扫码模块，业务页面不再改调用形态。

参考项目中的平台能力数量级：

| 能力 | 数量级 | RN App 迁移方向 |
| --- | ---: | --- |
| `Taro.scanCode` | 7 处 | 原生相机扫码 facade，统一返回 `result/type`。 |
| `Taro.getLocation` | 6 处 | App 权限 + 原生定位，明确坐标系转换。 |
| 支付 | 微信支付 7 处，支付宝支付 5 处 | 微信/支付宝 App SDK bridge，统一 `pay({ channel, payload })`。 |
| `Taro.navigateToMiniProgram` | 17 处 | 微信小程序拉起、支付宝 scheme 或 H5/App 内兜底。 |
| `Taro.requestSubscribeMessage` | 6 处 | App push、站内信、短信或服务通知替代。 |
| `Taro.uploadFile/downloadFile` | 上传 13 处，下载 5 处 | FormData 上传本地 URI，下载到 cache/document，再预览或系统打开。 |
| `Taro.makePhoneCall` | 24 处 | `Linking.openURL('tel:...')` 封装。 |
| `wx.*` / `my.*` | 业务直接 `wx.*` 2 处，`my.*` 14 处 | 按能力替换，实名、授权、地址、文件选择和支付需单独确认。 |
| `process.env.TARO_ENV` | 252 处 | 改为 App runtime/channel/capability 矩阵。 |

当前 App 已新增 `scripts/check-rn-boundaries.mjs` 作为自动门禁：

- 扫描范围：`apps/com.deppon.app/package.json` 和 `apps/com.deppon.app/src/**/*.ts(x)`。
- 禁止 App 包直接依赖小程序/H5 平台插件：`@tarojs/plugin-platform-weapp`、`@tarojs/plugin-platform-alipay`、`@tarojs/plugin-platform-h5`、`@tarojs/plugin-platform-jd`、`@tarojs/plugin-platform-qq`、`@tarojs/plugin-platform-swan`、`@tarojs/plugin-platform-tt`。
- 校验关键 native 身份：Taro RN `appName`、Android `app_id/app_name/MainActivity`、iOS `moduleName/DisplayName/Bundle ID`，防止 `taroDemo` 这类模板运行时身份回流。
- 禁止直接使用 `wx.*`、`my.*`。
- 禁止直接使用 `Taro.scanCode`、`Taro.getLocation`、`Taro.chooseLocation`、`Taro.openLocation`、`Taro.makePhoneCall`、`Taro.uploadFile`、`Taro.downloadFile`、`Taro.requestSubscribeMessage`、`Taro.navigateToMiniProgram`、`Taro.chooseImage/chooseMedia/chooseVideo`、`Taro.getUserProfile/authorize/getSetting/openSetting`、`Taro.saveImageToPhotosAlbum`。
- 这些能力必须先落到 `shared/platform` facade 或独立领域 service，再由页面消费。
- 当前 App 源码扫描通过；参考项目扫描命中大量文件，说明后续迁移不能复制旧页面调用形态。

当前 `shared/platform` 已落地的首期结构：

```text
shared/platform/
  capabilities.ts
  scan.ts
  phone.ts
  location.ts
  map.ts
  files.ts
  payment.ts
  notifications.ts
  externalApp.ts
  realName.ts
  index.ts
```

分层职责：

- 能力矩阵层维护 `scan/location/payment/phone/filePicker/documentPreview/notification/externalMiniProgram/realName` 等状态。
- facade 层向业务暴露 `scanCode()`、`dialPhone()`、`getCurrentAppLocation()`、`openMapLocation()`、`chooseAppFile()`、`uploadAppFile()`、`downloadAppFile()`、`payWithApp()`、`requestAppNotificationPermission()`、`openExternalApp()`、`verifyRealName()` 等稳定方法。
- 当前除电话外默认都标记为 `pending`，业务可以先接统一调用和降级提示，真实 native bridge 后续只需要替换 facade 内部实现。
- 后续接入原生时再新增 `native/modules.ts`、`native/permissions.ts` 等桥接层，只包装 `NativeModules`、`Linking`、权限请求和 Android/iOS 差异。
- 业务渠道码、地图 key、登录类型、OMS/CRM code 放到 `shared/config` 或领域模块，不放入 native bridge。

## 请求与状态迁移

参考项目的请求层有几个关键行为需要在 RN App 中重建：

- `HTTP_GET/HTTP_POST` 基于 `Taro.request`，默认 `POST`、`10s timeout`、`loading=true`、`login=true`。
- 相对 URL 拼接到 `HTTP_URI`。
- 响应后从 header/cookies 提取 `ECO_TOKEN` 并写入本地 cookie 缓存。
- 微信小程序请求会把 `ECO_TOKEN` 回填到 `Cookie` header；App 端需要以 cookie jar 或后端确认的新鉴权方式替代。
- OWS 包体中的 `status` 会被归一为布尔值，`"1"`、`0`、`"success"` 视为成功。
- `401 + status=901` 视为登录失效，`429` 视为操作频繁。

当前 RN 请求层只负责通用 HTTP、Bearer token 和 transform。下一步应新增一层 `depponRequest`，负责 OWS 包体、cookie 会话、登录失效事件和业务错误，而不是把旧项目请求层整段搬过来。

当前已落地的请求/会话底座：

- `request/index.ts`：保留通用 HTTP client。
- `request/deppon.ts`：新增 OWS client，负责 `status` 归一、`401 + 901`、`429`、cookie 保存和业务响应结构。
- `request/cookieJar.ts`：统一保存、读取、清理 `ECO_TOKEN` cookie。
- `request/events.ts`：提供 `authExpired`、`rateLimited` 事件，不在请求层直接跳页面或弹窗。
- `cache/storage.ts`、`cache/dpCache.ts`：提供 RN/Taro storage adapter 和带过期策略的缓存工具。
- `services/auth`：先落登录服务边界，包含 `queryUserInfo`、`checkEcoToken`、`logout`、`sendSmsMessage`、短信登录骨架。
- `services/contact`：先落地址簿基础能力，包含分页查询、保存、删除、默认地址、地址解析、地址联想、乡镇补全、地址详细度校验和选择参数约定。
- `shared/navigation/authGuard.ts`：以 `ECO_TOKEN` 作为 App 登录态证据，统一生成登录页 `redirectUrl`、处理登录跳转去重和安全页面入口拦截。
- `app.bootstrap.ts`：配置 baseURL/timeout，并监听 `authExpired` 清理 App 会话，再通过统一 guard 跳转登录页。

## Login / Mine 首期切片

登录和我的模块已按 App 端重新收敛，不复制参考项目中的小程序授权、营销注册分支和 Redux 用户状态机。

已落地边界：

- `services/auth/auth.api.ts`：封装短信发送、手机号验证码登录、查询用户、校验 `ECO_TOKEN` 和退出登录。
- `services/auth/auth.service.ts`：负责手机号/验证码校验、登录请求组装、用户缓存、用户展示名和脱敏手机号。
- `pages/login/index`：实现短信登录表单、验证码发送、60 秒重发倒计时、6 位验证码校验、协议勾选和协议入口。
- `pages/mine/index`：实现用户摘要、登录、账号设置、地址簿、寄件、订单、待支付、客服中心、客户中心、签收码和 E 卡入口。
- `shared/webview/appWeb.ts` 与 `pages/web/index`：实现协议、客服、投诉、理赔等 H5 能力的统一路由生成、来源映射、HTTPS 白名单和 RN WebView 承接；客服入口已覆盖首页、我的页和订单详情页。
- `pages/privacy/settings`：实现隐私政策、个人信息清单、合作方清单、权限调用清单等入口，并支持同步、确认和撤销隐私条款。

关键约束：

- 登录接口沿用旧项目真实契约：`account`、`verifyCode`、`loginType`、`sysCode`。页面和 service 不再混发 `mobile`、`smsCode`、`code` 等非登录接口字段。
- App 端首期只承接手机号短信登录；微信/支付宝小程序静默登录、绑定授权、实名核验和营销注册记录先不迁入页面主流程。
- 协议首期做前端强校验和 Web 承接入口，隐私版本查询/保存/撤销已由隐私设置页承接；首页隐私弹窗仍后置。
- 我的页只消费 `authService` 和路由入口，不直接读 cookie 或请求层事件。
- WebView 默认只允许 `https` 和 `APP_RUNTIME_CONFIG.webAllowedHosts` 中的域名；H5 客服 URL、Web baseURL 和白名单都通过 runtime/env 管理。

本轮补齐登录态守卫边界：

- `request/deppon.ts` 继续只负责 OWS 响应归一、cookie 和事件，不直接做页面跳转。
- `request/deppon.ts` 已恢复旧项目 `login` 语义：只有 `login !== false` 的请求在 `401 + 901` 时触发 `authExpired`。
- `shared/navigation/authGuard.ts` 统一判断 `ECO_TOKEN`、生成登录 URL、避免重复跳登录。
- 订单列表、地址簿列表/编辑、首页订单入口、寄件/查价地址簿入口和我的页快捷入口已接入 `ensureAuthenticated`。
- `pages/mine` 在无 `ECO_TOKEN` 时不再请求 `queryUserInfo`，只展示未登录态。
- `authExpired` 事件触发后会清理会话并跳转登录页，登录页自身不会重复跳转。

## Account Settings 首期切片

账号设置从旧项目 `pages/user/detail`、`pages/user/close/index`、`pages/user/close/confirm` 中拆出 App 可用能力，不复制旧页面的 Redux 多账号回退、SVIP 头像装饰和小程序页面栈逻辑。

已落地边界：

- `services/account/account.api.ts`：封装注销验证码和账号注销接口。
- `services/account/account.service.ts`：归一账号概览、绑定手机号、验证码发送、注销提交和成功后的本地会话清理。
- `pages/account/settings`：展示账号资料、绑定手机号、客户编码、安全与隐私入口、退出登录和注销账号入口。
- `pages/account/cancel`：展示注销影响、发送注销验证码、输入 6 位验证码、显式确认后提交注销。
- `pages/mine`：登录态用户头像侧按钮改为进入账号设置，退出登录从“我的”页直出改为设置页内操作。
- 统一路由和登录守卫已接入 `APP_ROUTES.accountSettings` / `APP_ROUTES.accountCancel`。

关键约束：

- 注销账号必须由用户主动进入注销页、获取短信验证码、输入验证码并勾选确认，不做页面加载即提交的隐式动作。
- 注销成功后只清理 App 本地 `ECO_TOKEN` 和用户缓存，再回到我的页；不复用旧项目 Redux 清理和小程序 `switchTab`。
- 设置页不展示 token、openId 等敏感字段；绑定信息只展示脱敏手机号。
- 账号绑定/解绑、第三方授权、多账号切换和国家网络身份认证原生 SDK 后置。

首期接入端点：

| 能力 | 端点 |
| --- | --- |
| 发送注销验证码 | `/gwapi/messageService/eco/message/sendSmsMessage` |
| 注销账号 | `/gwapi/userService/eco/user/secure/cancel` |

## RealName 首期切片

实名认证首期从旧项目 `pages/user/real/index`、`pages/user/real/auth`、`pages/user/real/app` 和 `api/user.ts` 中抽取 App 可用能力，不迁小程序 `wx.ncidas`、分享和神策埋点。

已落地边界：

- `services/realname/realname.api.ts`：封装实名状态查询、身份证实名提交、实名删除、网络身份认证凭证和授权结果提交接口。
- `services/realname/realname.service.ts`：归一实名状态 VM，提供姓名/二代身份证校验、身份证号脱敏、手填认证、删除实名信息和未来网络身份认证 facade 流程。
- `pages/realname/center`：展示实名状态、已认证信息、手填身份证实名表单、删除实名和国家网络身份认证降级入口。
- `shared/platform/realName.ts`：国家网络身份认证入口继续走平台 facade；当前能力矩阵为 `pending`，页面展示统一降级提示。
- 账号设置页和我的页已接入 `APP_ROUTES.realNameCenter`，入口受登录守卫保护。

关键约束：

- 页面不直接调用 `wx.ncidas` 或任何小程序实名 API；后续 App 原生 SDK ready 后只替换 `shared/platform/realName`。
- 手填身份证实名由后端最终校验，前端仅做姓名、生日和身份证校验位的基础校验。
- 删除实名信息必须二次确认；删除后不清理登录态，只刷新当前实名状态。
- 签收码实名登记仍保留轻量真实姓名登记；身份证实名中心不与签收码页面强耦合。

首期接入端点：

| 能力 | 端点 |
| --- | --- |
| 查询实名状态 | `/gwapi/userService/eco/user/secure/queryRealNameAuth` |
| 提交/删除身份证实名 | `/gwapi/userService/eco/user/secure/realNameAuth` |
| 网络身份认证凭证 | `/gwapi/userService/eco/user/idVerification/bizSeq` |
| 网络身份认证结果提交 | `/gwapi/userService/eco/user/idVerification/authByNetworkId` |

后置能力：

- App 端国家网络身份认证 SDK/原生模块接入。
- 实名状态与寄件下单前置校验、批量寄件实名提醒联动。
- 身份证 OCR、实名异常申诉和多账号实名状态切换。

## Privacy Settings 首期切片

隐私设置已从旧项目 `pages/common/protocol/list` 中拆出 App 可用能力，不迁小程序分享、Redux 多账号回退和首页弹窗状态机。

已落地边界：

- `services/privacy/privacy.api.ts`：封装隐私版本查询、保存确认和撤销确认接口。
- `services/privacy/privacy.service.ts`：归一最新版本、已同意版本、是否已确认最新版本和状态文案。
- `pages/privacy/settings`：提供协议清单入口、版本状态卡片、同步状态、同意最新条款和撤销同意条款。
- `shared/webview/appWeb.ts`：补充隐私政策、个人信息清单、电子运单服务协议、合作方清单、权限调用清单和免赔协议的 WebView 来源映射。
- `pages/mine` 和统一路由已接入 `APP_ROUTES.privacySettings`，入口受登录守卫保护。

关键约束：

- 撤销同意条款成功后清理 App 会话并返回我的页，不复用旧项目 Redux 登出和小程序多账号回退分支。
- WebView 仍走 HTTPS 白名单和来源映射，不在页面直接拼接 H5 域名。
- 首页安装/更新隐私弹窗后置，后续应复用 `privacyService`，不在首页复制接口逻辑。

首期接入端点：

| 能力 | 端点 |
| --- | --- |
| 查询隐私版本 | `/gwapi/userService/eco/user/secure/queryUserPrivacyBehavior` |
| 保存隐私确认 | `/gwapi/userService/eco/user/secure/userPrivacyBehavior` |
| 撤销隐私确认 | `/gwapi/userService/eco/user/secure/cancelPrivacyBehavior` |

## Contact 首期切片

地址簿是寄件 MVP 的前置能力，首期按两个 RN 页面拆分：

- `pages/contact/list/index`：负责列表检索、选择、新增入口、默认地址标识、编辑/删除入口。首期支持 `mode: select | manage`，暂不做批量选择。
- `pages/contact/edit/index`：承接新增/编辑、字段校验、文本地址解析、地址联想和保存。小程序的 `detail + query` 在 RN 中优先合并，不先拆额外页面。

已落地服务边界：

- `contactService.queryList`
- `contactService.save`
- `contactService.remove` / `removeMany`
- `contactService.setDefault`
- `contactService.queryDefault`
- `contactService.analyze` / `analyze4`
- `contactService.applyAnalysisToContact`
- `contactService.queryAddressHints`
- `contactService.queryTownList`
- `contactService.checkAddressDetail`
- `contactService.queryCount`

不纳入首期：

- 微信/支付宝地址导入、系统通讯录、分享邀填地址。
- 图片识别、AI/VLM 多地址识别、语音识别、剪贴板自动识别。
- 批量寄件多人选择、批量删除、委托寄件、模板寄件、订单修改等多来源分支。
- 地址数量上限下的一键清理和按月份批量清理。

与寄件页约定：

```ts
type ContactSelectTarget = 'sender' | 'consignee'
type ContactSelectMode = 'select' | 'manage'
```

选择结果由后续寄件模块统一处理：发件人变化清空预约时间和接货网点；收件人变化清空派送网点、进仓、预约和通知等依赖状态。

当前已落地一个轻量选择桥 `services/contact/selection.ts`：

- 寄件页进入地址簿时传 `target: 'sender' | 'consignee'`，回填目标由 `target` 决定，不依赖联系人自身 `type`。
- `pages/contact/list` 在 `select` 模式下查询真实地址簿，选择后写入 `{ target, contact }` 并 `navigateBack`。
- `pages/contact/edit` 支持基础新增/编辑保存；从寄件选择流进入时，保存成功后把新地址写入同一选择桥并返回寄件页。
- `pages/contact/edit` 已接入文本智能识别：用户粘贴“姓名、电话、省市区、详细地址”后可自动填充表单，识别成功后仍要求用户核对。
- `services/contact/selection.ts` 使用 `returnDelta` 区分“列表进入编辑”和“页面直接新增”，避免保存后多退或少退。
- `pages/contact/list` 在 `manage` 模式下支持单条删除和设为默认地址；设默认复用更新联系人接口并本地刷新默认标识，删除前有确认弹窗。
- `pages/express` 在 `useDidShow` 中消费选择结果，先把 `Contact.telephone` 映射成寄件草稿的 `mobile`，再调用 `setExpressContact` 触发报价/取件依赖清理。

保留这个桥接的约束：选择桥只传递选择结果，不直接改寄件草稿；报价、取件、网点清理等业务副作用统一留在 `services/express`。

## Express 首期切片

寄件模块已开始按 RN App 端重新建模，首期不照搬参考项目 `send/express` 的巨石页面和 Redux 状态机，而是拆成“页面草稿 + 领域 service + API 薄封装”：

- `services/express/types.ts`：定义 `ExpressDraft`、`ExpressContact`、`ExpressGoods`、产品报价、取件时间、下单请求/响应等首期契约。
- `services/express/express.api.ts`：只封装 OWS 端点，包含价格时效、取件时间、货物品名/标签、保价、筛单、下单拦截、创建订单、订单详情、取消订单。
- `services/express/express.service.ts`：负责 draft 默认值、联系人映射、收寄地址互换、依赖失效、校验、报价请求组装、取件时间请求组装和下单请求组装。
- `services/express/draftBridge.ts`：提供一次性跨页草稿桥，当前用于价格时效查询结果带入寄件页，不引入 Redux 巨石状态。
- `pages/express/index`：升级为 RN App 表单壳，包含收寄地址、货物信息、付款/送货方式、取件时间、产品价格、备注、协议和提交入口。
- `pages/express/index`：货物名称支持按输入关键词查询后端品名推荐，点击候选只回填标准品名；分类信息仅作为辅助展示，不写入下单字段。
- `pages/express/index`：保价金额支持按当前产品、重量、体积调用保价费用试算；页面只展示标准保费反馈，不迁旧项目保价弹窗、标签营销和复杂分支。
- `services/express/insuranceRules.ts`：新增保价规则 VM，将基础保、全额保、省心保的收费和理赔说明结构化为 App 页面可消费的数据，不复用旧项目保价编辑 Redux 状态机。
- `pages/express/insurance/index`：新增 App 原生保价说明页，寄件页保价金额旁提供规则入口；页面只展示规则说明，不承担保价金额提交或费用试算。
- `pages/express/index`：隐私面单作为服务选项接入，首次开启时展示 App 内确认说明，确认结果写入本地缓存；创建订单时通过 `encryptInfo: 'Y' | 'N'` 传给后端。
- `pages/express/index` 已移除演示联系人“填入”能力，联系人来源只保留地址簿选择、新增后回填和查价草稿带入。
- `services/express/draftStorage.ts`：新增寄件草稿持久化，使用 2 小时 TTL 缓存收寄件、货物、服务、报价和备注；提交成功后清理。
- `pages/express/index`：草稿变化自动保存，页面初始化优先恢复草稿；未登录点击提交时先保存草稿，再跳登录页，登录后回到寄件页继续提交。
- `services/express.submitDraft`：下单前新增货物标签和筛单校验。`queryGoodsRemark` 返回 `displayType=forbid` 时阻断；`sieveOrder/tips` 返回 `type=2/3/4` 时阻断并展示后端 `reason`，`type=1` 作为提醒类结果暂不阻断。

首期保留的业务规则：

- 发件人变化后清空取件时间、接货网点、已选产品价格。
- 收件人变化后清空已选产品价格。
- 收寄地址互换时，如果省市区变化，则同步清空取件依赖。
- 下单前校验协议、收寄件完整度、手机号、地址差异、货物名称、重量、件数和产品价格。
- 下单前必须具备 `ECO_TOKEN`，未登录不会直接打安全接口，避免 401 后丢失当前寄件表单。
- 隐私面单不影响报价，开启/关闭不会清空已选产品；最终是否成功生效仍以后端下单校验为准。
- 首期未迁入进仓、工序收费、二次确认弹窗等复杂分支，因此筛单高风险类型先保守阻断，不在 RN App 中静默提交。
- 保价首期承接手填金额、费用试算和规则说明；足额保/省心保选择、易碎保、无忧保标签、保价上限动态规则和月结客户差异后续再独立建模。
- 页面只处理交互反馈，接口状态归一、cookie 会话和登录失效仍由 `request/deppon.ts` 管理。

首期接入端点：

| 能力 | 端点 |
| --- | --- |
| 价格时效 | `/gwapi/pricetimeService/eco/pricetime/queryPriceTime` |
| 取件时间 | `/gwapi/orderService/eco/order/dispatchTime/pilotCityDispatchTime` |
| 货物品名 | `/gwapi/onlineService/eco/online/cargo/queryCargoInfo` |
| 货物标签 | `/gwapi/orderService/eco/order/queryGoodsRemark` |
| 保价费用 | `/gwapi/pricetimeService/eco/fixedProtection/queryFixedProtection` |
| 下单筛单 | `/gwapi/orderService/eco/order/sieveOrder/tips` |
| 是否可下单 | `/gwapi/orderService/eco/order/secure/queryIsCanCreateOrder` |
| 创建订单 | `/gwapi/orderService/eco/order/mysql/createOrder` |
| 订单详情 | `/gwapi/orderService/eco/order/secure/orderDetail` |
| 取消订单 | `/gwapi/orderService/eco/order/secure/revokeOrder` |

后置能力：

- 产品推荐、产品升级、产品开关、特殊产品矩阵。
- 优惠券、月结客户、合同客户、支付分、E 卡和真实支付。
- 夜间揽收、网点切片、预约派送、送货进仓、代收货款、签收单返单。
- 包装推荐、木架/木箱、拆包装、雪具、3C 原厂包装、通电验机、保价标签增强。
- 批量寄件、模板寄件、再次下单、扫码角色初始化。

App 端渠道码已从小程序环境分支中解耦到 runtime：

```ts
APP_RUNTIME_CONFIG.appClientChannel
APP_RUNTIME_CONFIG.omsChannel
```

当前默认值是 `APP`，真实后端渠道码需要后续和接口方确认后通过环境变量调整。

## Query Price 首期切片

价格时效查询已经从首页 Web 占位改成 RN 原生页面，首期不照搬参考项目 `pages/query/price` 的语音识别、定位、城市选择器、营销弹窗和多层 Redux 状态，而是复用现有寄件报价领域能力：

- `pages/query/price/index`：支持手填寄/收省市区、乡镇和详细地址，也支持从地址簿选择后回填。
- `services/express.validateExpressPriceTimeDraft`：新增轻量价格查询校验，只校验收寄地址、重量、件数和地址差异，不要求姓名、手机号和电子运单协议。
- `services/express.quotePriceTime`：复用 PPC 价格时效端点和 `buildFreightRequest`，但与下单 `quote` 的联系人校验解耦。
- `services/express/draftBridge.ts`：价格结果点击“去寄件”时携带当前 draft 和已选产品，寄件页 `useDidShow` 消费后立即清理。
- `services/contact/selection.ts`：选择来源扩展为 `EXPRESS | QUERY_PRICE`，保证地址簿文案和回填意图可追踪。
- `pages/home/home.data.ts`：`查价格` 入口改为 `APP_ROUTES.priceQuery`，不再落入空 Web 承接页。

首期保留规则：

- 查询页可以没有联系人姓名和手机号，因为价格时效只依赖地址、重量、件数、服务方式和产品约束。
- 地址、货物或送货方式变化后清空已查询产品，并提示重新查询。
- 页面只消费 `ExpressProductQuote` VM，不直接散落后端 PPC 字段。
- 从查价页带入寄件页时不自动勾选电子运单协议；寄件页仍按下单校验要求用户完善姓名、手机号和协议。

后置能力：

- 城市选择器、定位填充、地址智能解析、语音/图片识别。
- 产品推荐、取件时间联动、特殊货物提醒、计费规则 H5。
- 将查价草稿持久化到本地缓存，支持 App 被系统回收后的恢复。

## Query Dispatch 首期切片

收派范围查询已经从旧项目 `pages/query/dispatch` 的小程序定位、城市选择器、授权弹窗和分享逻辑中拆出，首期改成 RN 可用的手填/粘贴地址查询：

- `services/query/query.api.ts`：封装快递收派范围、零担收派范围、地址乡镇匹配和网点查询接口。
- `services/query/query.service.ts`：复用地址智能解析补齐省市区编码，将快递/零担后端响应归一为 `DispatchRangeResult`，将地址/区县网点响应归一为 `StationQueryResult`。
- `services/query/query.service.ts`：新增网点详情 VM，按网点编码读取详情接口，统一归一地址、电话、业务范围、营业时间和坐标。
- `pages/query/dispatch/index`：支持快递/零担切换、完整地址粘贴识别、省市区/详细地址手填、收派范围查询、命中乡镇高亮和可寄件提示。
- `pages/query/stations/index`：支持网点类型、快递/零担业务类型、完整地址识别、省市区/详细地址手填、网点列表、电话拨打和地图导航降级提示。
- `pages/query/stations/detail/index`：新增 App 原生网点详情页，通过列表传入的网点编码重新查询详情，展示地址、电话、业务范围、营业时间和坐标占位；导航继续走 `shared/platform/map.openMapLocation`。
- 首页快捷入口和客服中心自助查询已接入 `APP_ROUTES.dispatchQuery`、`APP_ROUTES.stationQuery`、`APP_ROUTES.goodsQuery`。

首期保留规则：

- 页面不直接调用 `Taro.getLocation`、`Taro.chooseLocation`、`Taro.openLocation` 或小程序授权能力；导航统一走 `shared/platform/map.openMapLocation`，当前按原生能力矩阵降级。
- 地址编码失败时要求用户粘贴更完整的省市区地址，不引入旧项目城市选择器状态机。
- “去寄件”只跳寄件页，不自动写入寄件草稿；后续若要带入地址，需要走 `expressDraftBridge` 或独立查询草稿桥。

首期接入端点：

| 能力 | 端点 |
| --- | --- |
| 地址乡镇匹配 | `/gwapi/queryService/eco/query/addressImagineTown` |
| 快递收派范围 | `/gwapi/queryService/eco/query/range/queryAddressImagine` |
| 零担收派范围 | `/gwapi/queryService/eco/query/logisticsRange/queryAreaRange` |
| 地址网点查询 | `/gwapi/queryService/eco/query/branch/stationSearch` |
| 区县网点查询 | `/gwapi/queryService/eco/query/branch/queryDeptNet` |
| 网点详情 | `/gwapi/queryService/eco/query/branch/queryDeptInfoByCode` |

后置能力：

- RN 原生定位、地图选点和营业部导航。
- 城市选择器、IP 定位、附近网点和分享。

## Goods / Contraband 首期切片

货物/禁寄查询从旧项目 `pages/common/goods` 中拆出为 App 查询工具页，不迁旧页面的批量寄件分支、Redux 状态回写和小程序弹窗状态机。

已落地边界：

- `services/express.checkGoodsByName`：复用货物备注接口，将后端标签归一为 `ok / risk / unknown / forbid` 四类结果。
- `services/goods`：负责品名搜索、热门品名兜底、最近查询缓存和校验结果历史。
- `pages/query/goods/index`：支持货物名搜索推荐、热门品名、最近查询、禁寄/风险/未知提示和“带入寄件”。
- `services/express/draftBridge.ts`：新增 `GOODS_QUERY` 来源，带入寄件时只写货物名称并清空报价结果。
- 首页快捷入口和客服中心自助查询已接入 `APP_ROUTES.goodsQuery`。

关键约束：

- 页面不直接消费小程序 `pages/common/goods` 的 source 分支，也不写批量寄件或旧 Redux 缓存。
- 首期按纯货物名称做通用校验；收寄地维度的精准校验可后续在页面补地址选择后透传给同一个 service。
- `forbid` 结果不允许带入寄件；`unknown` 和 `risk` 允许继续，但寄件下单前仍会再次走提交校验。
- 热门品名当前用 App 端稳定兜底数据，不把旧小程序配置中心调用硬搬进页面；后续可在 `goodsQueryService` 中替换为远程配置。

首期接入端点：

| 能力 | 端点 |
| --- | --- |
| 品名推荐 | `/gwapi/onlineService/eco/online/cargo/queryCargoInfo` |
| 货物禁寄/风险提示 | `/gwapi/orderService/eco/order/queryGoodsRemark` |

后置能力：

- 按寄件地/收件地做更精细的禁寄判断。
- 从配置中心读取热门品名并按城市/业务线灰度。
- 与批量寄件、多收件人和 AI 下单草稿联动。

## Home Search / Track 首期切片

首页运单查询已经从静态展示升级为可执行入口：

- `pages/home/components/search`：支持输入运单号，前端做空格清理、转大写和基础格式校验。
- 查询成功后跳转 `APP_ROUTES.orderDetail`，传入 `waybillNumber` 和 `source=HOME_SEARCH`，复用订单详情页已有运单详情和轨迹查询能力。
- 扫码入口走 `shared/platform/scan.scanWaybillCode`，当前因原生扫码能力未接入而统一降级提示。

关键约束：

- 首页搜索不新增独立查件 API，不绕过 `services/order`；订单详情仍是运单详情和轨迹的唯一页面 VM。
- 首页搜索进入订单详情时走公开轨迹模式，只调用非 secure 的 `/gwapi/trackService/eco/track/queryNewTrack`，不要求登录，也不展示寄收件隐私信息。
- App 端扫码后续应在 `shared/platform/scan` 内接入 native bridge，页面只消费统一返回的码值。
- 旧项目的小程序扫码、订阅、支付入口、营销追踪和 H5 轨迹页外跳不进入首期。

## Order 首期切片

订单模块已开始按 App 主链路重构，首期承接“列表 -> 详情 -> 轨迹”的读链路，并在详情页补充单号复制、未支付费用提示、催单、通知派送、拦截作废、收件方式 H5、联系营业部、评价 H5 和售后快捷动作；真实支付、订阅、完整售后状态机、地图和原生评价表单不从旧项目直接迁入。

已落地边界：

- `services/order/types.ts`：定义寄件/收件列表原始响应、列表 VM、订单详情 VM、运单详情原始响应和轨迹响应。
- `services/order/order.api.ts`：封装寄件订单列表、收件订单列表、订单详情、运单详情、轨迹列表、取消订单和删除订单端点。
- `services/order/order.service.ts`：统一最近一个月默认查询范围、寄件/收件列表归一、运单详情字段归一、轨迹查询、取消订单、终态订单删除和删除权限判断。
- `services/order/order.service.ts`：提供 `getOrderCopyNumber`，统一确定详情页复制运单号或订单号的优先级。
- `services/order/order.service.ts`：新增催单 VM，按待揽件寄件人订单或运输中主单生成催单动作，点击后再查询后端话术和按钮；查看进度走受控 H5，提交催单走 `orderUrgent` 接口。
- `services/order/order.service.ts`：新增通知派送动作，仅在安全详情、寄件角色、运输中、有运单号且后端 `isDlyNotified=N` 时展示，提交统一调用 `modifyNotifyDeliver`。
- `services/order/order.service.ts`：新增拦截作废高风险动作，仅在安全详情、寄件角色、运输中、有运单号且后端 `canBeVoided=Y` 时展示；提交统一调用 `invalidWaybill`，并把“货物已出发需去运单修改拦截”的后端文案归一为页面可消费的结果 VM。
- `services/order/order.service.ts`：新增收件方式 H5 动作，仅在安全详情、收件角色、运输中且有运单号时展示，页面不直接拼 `/depponmobile/orderStayTmp`。
- `services/order/order.service.ts`：新增联系营业部动作，仅在作废订单且有营业部编码时展示；优先使用详情电话，否则通过 `deptTelephone` 查询，最终兜底 95353。
- `services/order/order.service.ts`：新增评价 H5 动作，按寄件/收件角色生成问卷场景码和结构化 `rowData`，页面不拼评价 H5 参数。
- `services/payment`：封装待支付费用查询、详情页汇总和待支付列表分页，不复用旧项目合并支付和小程序收银台状态机。
- `pages/order/list`：支持我寄的/我收的切换、时间范围、状态、付款方式筛选、关键字搜索、分页加载和跳详情；寄件待揽件订单在后端允许修改时展示“取消订单”，并跳转取消原因页处理；已签收、已退回、已取消、已作废、已失效等终态订单展示“删除”，成功后从当前列表移除。
- `pages/order/list`：终态寄件订单支持“再来一单”，终态收件订单支持“一键回寄”；列表项会先读取订单详情，再生成寄件草稿，不从列表摘要字段拼凑下单数据。
- `pages/order/detail`：按 `orderNumber` / `waybillNumber` 读取详情，展示状态、寄收信息、货物/付款/产品和轨迹列表。
- `pages/order/detail`：已拆分公开轨迹模式和安全详情模式。仅有运单号、无订单上下文时只查公开轨迹；带订单号、角色或 `view=secure` 时才要求登录并读取安全详情。
- `pages/order/detail`：安全详情模式下已接入取消订单动作。首期只在待揽件、有订单号且后端详情未显式禁止修改时展示“取消订单”，并跳转取消原因页处理。
- `pages/order/detail`：安全详情模式下已接入终态订单删除动作，成功后回到订单列表；公开轨迹模式不展示删除，避免未登录轨迹页操作安全订单。
- `pages/order/detail`：安全详情模式下已接入“再来一单/一键回寄”，由 `orderService.createExpressDraftFromOrderDetail` 将订单详情归一为新的寄件草稿，再通过 `expressDraftBridge` 带入寄件页；不会复用旧项目 Redux 重放状态。
- `pages/order/detail`：安全详情模式下会按运单号查询最近一个月未核销费用，展示待支付金额提示；点击“去支付”先走 `shared/platform/payment.payWithApp`，当前因 App 原生支付能力未接入而统一降级提示。
- `pages/order/stub`：新增电子存根首期只读页，入口由订单详情的 `orderService.getStubEntry` 生成，页面通过 `orderService.queryDetail` 重新读取详情并消费 `OrderStubView`，展示寄收信息、货物明细、费用、订单编号和照片凭证分组。
- `services/order/order.service.ts`：新增电子存根 VM，统一处理存根标题、单号、寄收件信息、号码脱敏、费用字段、结构化分区和后置能力提示；页面不直接拼旧项目 `orderService/doc` 巨石字段。
- `services/order/order.service.ts`：新增货物补充 VM，解析 `goodsSize` 为尺寸详情，补充计费重量/计费方式，并按包装费查询 `packagingFee` 生成木包装/非木包装费用明细；包装费接口失败不会影响存根正文展示。
- `pages/order/stub`：新增货物补充分区，展示尺寸详情和包装费用明细，不迁旧项目尺寸/包装底部弹窗状态机。
- `services/order/order.service.ts`：新增照片凭证 VM，按运输中/已签收且有运单号的订单并发查询取货照片、复磅照片、送达照片、拍照签收照片、签回单、国补信息采集、拆包装、清点码货、贴码、家装完工、通电验机、双人派送、木包装、送新取旧和揽收拍照；单个图片接口失败不会影响存根正文展示。
- `services/order/order.service.ts`：统一封装快递/零担增值服务图片 `imageScene` 映射，页面不需要知道 `queryWayBillImages`、`queryLtlWayBillImages` 或各业务 scene 常量。
- `pages/order/stub`：新增照片凭证分区，首期只展示远程缩略图和页面内大图预览，不调用小程序 `Taro.previewImage`、下载或保存相册能力。
- `services/order/order.service.ts`：新增单据票证 VM，抽取详情中的 `fileCode/returnFileId`，查询电子合同状态并生成完成态合同 WebView 预览入口；状态文案和预览 URL 都收敛在订单 service。
- `pages/order/stub`：新增单据票证分区，展示电子合同状态；合同完成时通过 `ORDER_STUB_CONTRACT_PREVIEW` 进入受控 RN WebView，不调用 `Taro.downloadFile` 或 `Taro.openDocument`。
- `pages/order/detail`：安全详情模式下已接入在线客服，统一走 `shared/webview/appWeb.ts` 的 `ORDER_DETAIL_SERVICE` 来源和 RN WebView 白名单，不在页面散落 H5 URL。
- `services/order/order.service.ts`：新增订单详情售后动作 VM，统一生成在线客服、投诉、在线理赔、去开票和修改运单入口，页面只按 `OrderDetailActionView` 渲染，不直接拼 H5 URL 或散落状态判断。
- `pages/order/detail`：新增“售后服务”分区。催单在 App 内展示后端话术弹层，通知派送和拦截作废在 App 内二次确认后提交，联系营业部统一走 App 电话 facade，收件方式、评价、投诉、在线理赔和修改运单首期通过 RN WebView 承接受控 H5；去开票优先进入 App 原生发票中心；公开轨迹模式不展示售后动作。
- `pages/order/cancel`：提供 App 原生取消原因选择和其他原因输入，提交时复用 `orderService.cancelOrder(orderNumber, reason)`，成功返回后列表/详情通过 `useDidShow` 刷新。
- `pages/payment/list`：提供独立待支付运单页，支持我寄的/我收的切换、运单号搜索、分页、金额汇总、跳订单详情和支付入口降级；入口已接入我的页和订单列表。
- `pages/express/success`：从下单结果承接订单号/运单号，可直接跳订单详情或订单列表。

关键约束：

- 详情查询优先使用 `waybillNumber`，再兜底 `orderNumber`。旧项目在运输中/已签收等状态下优先使用运单详情，RN App 保持这个语义。
- 运单详情原始字段和订单详情字段不同，不能直接复用一个后端 DTO。当前 `WaybillDetailRaw` 会在 service 层归一为页面消费的 `OrderDetail`。
- 收件列表 `statustype` 是中文状态，不可直接 `Number(statustype)`；当前按 `待揽收/运输中/已签收/已退回/已取消/已作废` 映射到订单大类。
- 公开查件只展示轨迹状态和轨迹明细，不读取 `queryNewWaybillDetail`，避免未登录用户被安全详情接口拦截，也避免公开页面泄露联系人、地址和电话。
- 取消订单不照搬旧项目 H5 取消页，当前保留 RN 原生原因页；后续若后端提供动态原因或拦截分流，应继续走 `service -> 页面动作` 的方式，不复制旧小程序状态机。
- 再来一单只复用寄收件、货物、重量、体积、付款/送货等可确认字段；一键回寄会将原收件人作为新发件人、原寄件人作为新收件人。取件时间、报价、协议和已选产品需在寄件页重新确认。
- 订单详情在线客服和售后 H5 不直接写死在页面中。真实客服 URL、售后 H5 来源和允许域名由 runtime/env、`shared/webview/appWeb.ts` 与订单 service 统一约束。
- 订单详情投诉仅在安全详情、有运单号、状态进入运输/派送/签收窗口且订单时间仍在首期 90 天窗口内展示；状态或时限的最终可办理性仍以后端/H5 为准。
- 订单详情催单不复制旧页面的埋点、分享、地图和评价联动。首期只承接按钮查询、话术确认、提交催单和查看催单进度，按钮是否可见以后端 `getUrgeButtons` 为准。
- 订单详情通知派送不复用旧小程序 Redux 状态；成功后重新拉取详情，让后端状态自然驱动入口消失。完整收件方式编辑、等通知时间窗和派送偏好仍后置。
- 订单详情拦截作废属于高风险动作，不直接照搬旧页面埋点和多处状态更新；首期只在后端明确允许时展示，提交前强确认，成功后刷新详情。若后端提示需要通过运单修改操作拦截，则引导到受控修改运单 H5。
- 订单详情收件方式首期只做受控 H5 承接，不迁旧项目里的派送偏好原生状态机；后续可按接口契约拆成 App 原生收件方式编辑页。
- 订单详情联系营业部不直接调用 `Taro.makePhoneCall`；电话拨打统一走 `shared/platform/phone.dialPhone`，查询营业部电话失败时兜底服务热线。
- 订单详情复制单号不直接散落 `Taro.setClipboardData`；页面使用 `shared/platform/clipboard.copyTextToClipboard`，公开轨迹和安全详情复用同一规则。
- 电子存根首期迁结构化存根、尺寸/包装费用只读明细、照片凭证只读预览和电子合同完成态 WebView 预览，不迁旧项目 `pages/orderService/doc` 中的合同 PDF 下载、图片保存相册、支付按钮和弹窗状态机；这些能力涉及 App 文件、相册、下载和支付原生能力，后续按独立 service/API 切片接入。
- 订单详情评价首期只承接问卷 H5，不迁旧项目 `FetchWaybillEvaluate`、PDC 评价和场景评价弹层；后续若原生化，需要单独建评价 service 和表单 VM。
- 订单详情修改运单首期仅对非收件角色、有运单号且详情未显式禁止修改的订单展示，完整核验、拦截、作废和派送状态机后续再拆原生。
- 支付入口不直接跳旧小程序收银台，也不提前创建支付单；当前只查询未支付费用并把支付动作收口到 App 原生能力 facade。
- 待支付列表仅展示当前接口返回的可 App 在线支付费用；旧项目里 `isJdPay=Y` 的派送中/签收场景先过滤，避免在 App 内展示不可付账单。
- 页面只消费归一后的 VM，不直接散落后端字段名。

首期接入端点：

| 能力 | 端点 |
| --- | --- |
| 寄件订单列表 | `/gwapi/orderService/eco/order/secure/orderList` |
| 收件订单列表 | `/gwapi/waybillService/eco/wayBill/secure/receiveOrderList` |
| 订单详情 | `/gwapi/orderService/eco/order/secure/orderDetail` |
| 运单详情 | `/gwapi/waybillService/eco/wayBill/secure/queryNewWaybillDetail` |
| 运单轨迹 | `/gwapi/trackService/eco/track/queryNewTrack` |
| 取消订单 | `/gwapi/orderService/eco/order/secure/revokeOrder` |
| 删除订单 | `/gwapi/orderService/eco/order/secure/removeOrder` |
| 待支付费用 | `/gwapi/onlineService/eco/online/pay/pmc/secure/queryUnWriteOffList` |
| 催单按钮 | `/gwapi/onlineService/eco/online/complaint/secure/getUrgeButtons` |
| 催单话术 | `/gwapi/onlineService/eco/online/complaint/secure/urgeOrder` |
| 提交催单 | `/gwapi/orderService/eco/order/urgent/secure/v2/orderUrgent` |
| 通知派送 | `/gwapi/waybillService/eco/waybill/modify/secure/modifyNotifyDeliver` |
| 拦截作废 | `/gwapi/waybillService/eco/wayBill/secure/invalidWaybill` |
| 营业部电话 | `/gwapi/queryService/eco/query/organizetion/deptTelephone` |
| 取货/复磅照片 | `/gwapi/waybillService/eco/wayBill/secure/queryOpenBoxImages` |
| 签收底单/送达照片 | `/gwapi/waybillService/eco/wayBill/secure/signCounterfoil` |
| 拍照签收照片 | `/gwapi/waybillService/eco/wayBill/secure/querySignImages` |
| 签回单照片 | `/gwapi/waybillService/eco/wayBill/secure/queryNewSignImages` |
| 快递增值服务图片 | `/gwapi/waybillService/eco/wayBill/secure/queryWayBillImages` |
| 零担增值服务图片 | `/gwapi/waybillService/eco/wayBill/secure/queryLtlWayBillImages` |
| 送新取旧图片 | `/gwapi/waybillService/eco/wayBill/secure/queryHomeImages` |
| 家装完工图片 | `/gwapi/waybillService/eco/wayBill/secure/powerOnTesting/signedImgs` |
| 通电验机图片 | `/gwapi/waybillService/eco/wayBill/secure/powerOnTesting/exp/signedImgs` / `/gwapi/waybillService/eco/wayBill/secure/powerOnTesting/ltl/signedImgs` |
| 木包装图片 | `/gwapi/waybillService/eco/wayBill/secure/getWoodPackagInfo` |
| 包装费用明细 | `/gwapi/waybillService/eco/wayBill/secure/packagingFee` |
| 电子合同状态 | `/gwapi/onlineService/eco/online/secure/queryContractDetail` |
| 电子合同预览 | `/gwapi/onlineService/eco/online/secure/contractPreview` |

首期承接动作：

| 能力 | 承接方式 |
| --- | --- |
| 在线客服 | `ORDER_DETAIL_SERVICE` + RN WebView |
| 催单 | App 原生话术弹层 + `orderUrgent` |
| 催单进度 | `/depponmobile/mow/order/urgeProgress` + RN WebView |
| 通知派送 | App 原生确认弹层 + `modifyNotifyDeliver` |
| 拦截作废 | App 原生强确认 + `invalidWaybill`，必要时引导修改运单 H5 |
| 收件方式 | `/depponmobile/orderStayTmp` + RN WebView |
| 联系营业部 | `shared/platform/phone.dialPhone` |
| 复制单号 | `shared/platform/clipboard.copyTextToClipboard` |
| 服务评价 | `/depponmobile/survey/land` + RN WebView |
| 投诉 | `/depponmobile/complaint/apply/index` + RN WebView |
| 在线理赔 | `/depponmobile/h5/index#/claimPackagePages/index` + RN WebView |
| 尺寸/包装费用 | App 原生只读明细 |
| 电子合同预览 | `ORDER_STUB_CONTRACT_PREVIEW` + RN WebView |
| 修改运单 | `/depponmobile/mow/order/modifyNew/index` + RN WebView |
| 去开票 | `APP_ROUTES.invoiceCenter` |

后置能力：

- 合并支付、App 微信/支付宝真实支付和支付结果轮询。
- 关注/订阅消息、App Push 替代和站内信。
- 完整修改订单状态机、收件方式编辑原生化、派送偏好时间窗、拦截作废进度与退款状态、催单进度原生化、原生评价表单、投诉/理赔进度原生化和开票提交闭环。
- 轨迹地图、快递员实时位置、签收图片、二维码分享、营业部导航。

## Support 首期切片

客服中心首期从旧项目 `pages/center`、`pages/common/complaint`、`pages/common/compensate` 和首页客服入口中抽取 App 可用能力，不迁小程序分享、自动登录、营销跳转和售后状态机。

已落地边界：

- `services/support/support.service.ts`：归一客服中心分组、入口类型、登录要求、WebView 来源、热线号码和 App 内路由，页面只消费 `SupportSectionView` / `SupportEntryView`。
- `pages/support/center`：提供在线客服、95353 热线、投诉、在线理赔、收派范围、网点查询、价格时效和订单列表入口。
- `shared/webview/appWeb.ts`：新增 `SUPPORT_ONLINE_SERVICE`、`SUPPORT_COMPLAINT`、`SUPPORT_CLAIM` 来源，继续走 HTTPS 白名单和统一 WebView 页面。
- 投诉/理赔点击时先做登录守卫，再按当前 `ECO_TOKEN`、`systemCode` 生成 H5 URL，避免未登录回跳携带空 token。
- 热线拨打统一走 `shared/platform/phone.dialPhone`，不在页面直接调用小程序 `Taro.makePhoneCall`。
- 首页“客服中心”和我的页“客服中心”已接入 `APP_ROUTES.supportCenter`；订单详情在线客服继续保留独立上下文入口。

关键约束：

- 客服中心页面本身不强制登录，热线和自助查询可直接访问；投诉、理赔和订单列表等敏感入口按动作单独触发登录守卫。
- 投诉/理赔首期仍由 H5 承接，不复制旧页面的自动登录、分享和埋点状态机。
- 后续若接入 App 原生 IM、投诉进度或理赔进度，应继续从 `services/support` 扩展 VM，不在首页/我的页散落 H5 URL。

首期承接入口：

| 能力 | 承接方式 |
| --- | --- |
| 在线客服 | `APP_RUNTIME_CONFIG.serviceWebURL` + RN WebView |
| 投诉 | `/depponmobile/complaint/list` + RN WebView |
| 在线理赔 | `/depponmobile/h5/index#/claimPackagePages/index` + RN WebView |
| 95353 热线 | `shared/platform/phone.dialPhone` |
| 收派范围 / 网点 / 价格时效 / 订单列表 | App 内已有 RN 页面 |

后置能力：

- 原生 IM SDK、客服会话列表和未读消息。
- 投诉记录、投诉进度、理赔进度和证据材料上传原生化。
- App Push/站内信替代旧订阅消息。

## Customer 首期切片

客户中心首期从旧项目 `api/customer.ts`、`type/customer.ts` 和 `pages/center` 的客户入口中抽取读能力，不迁月结付款规则、客户编码绑定表单、合同客户状态机和小程序订阅消息。

已落地边界：

- `services/customer/customer.api.ts`：封装当前账号绑定客户信息查询接口。
- `services/customer/customer.service.ts`：归一客户编码、客户名称、主联系人、隐私面单状态和绑定状态，页面只消费 `CustomerCenterView`。
- `pages/customer/center`：展示客户绑定状态和客户资料，支持刷新、复制客户编码，并提供客户绑定/管理、月结中心、号码保护和客服中心入口。
- `shared/webview/appWeb.ts`：新增 `CUSTOMER_CENTER`、`CUSTOMER_MONTHLY_CENTER`、`CUSTOMER_PHONE_PROTECT` 来源，继续走统一 WebView 和 HTTPS 白名单。
- `pages/mine` 和统一路由已接入 `APP_ROUTES.customerCenter`，客户中心入口受登录守卫保护。

关键约束：

- 客户中心首期只读，不把月结/合同客户能力直接写进寄件下单的付款规则。
- 绑定、解绑、客户资料修改、代收货款和月结中心继续由受控 H5 承接，后续再按 App 原生能力和接口契约拆分。
- 页面复制客户编码走 `shared/platform/clipboard.copyTextToClipboard`，不直接散落平台 API。

首期接入端点：

| 能力 | 端点 |
| --- | --- |
| 查询绑定客户信息 | `/gwapi/userService/eco/user/secure/selectCustName` |

首期承接 H5：

| 能力 | URL |
| --- | --- |
| 客户中心 | `/depponmobile/mow/customer` |
| 月结中心 | `/depponmobile/mow/customer/dshkCenter` |
| 号码保护 | `/depponmobile/h5/index#/partsPackagePages/customer/phoneProtect` |

后置能力：

- 客户编码绑定/解绑原生化。
- 月结客户、合同客户、统一结算用户和代收货款规则接入寄件报价/下单链路。
- 客户资料变更、审核状态、银行卡/代收账户管理。

## SignCode 首期切片

签收码首期从旧项目 `pages/user/sign/index`、`pages/user/sign/auth` 和 `api/user.ts` 中抽取 App 可用能力，不迁小程序分享、`taro3-code` 小程序二维码生成；身份证实名核验已拆到 `pages/realname/center`。

已落地边界：

- `services/sign/sign.api.ts`：封装实名姓名是否存在、保存实名姓名和查询签收码三个接口。
- `services/sign/sign.service.ts`：归一实名状态、签收码、签收人姓名、有效期文案和页面状态，页面只消费 `SignCodeView`。
- `pages/sign/code`：支持进入后自动校验实名状态；未登记实名时可填写 2-20 字符真实姓名并保存；已实名时可查询、刷新和复制签收码。
- `pages/sign/code`：首期展示可复制文本签收码和风险提示，二维码图形展示后续由 App 端二维码组件接入。
- `pages/mine` 和统一路由已接入 `APP_ROUTES.signCode`，签收码入口受登录守卫保护。

关键约束：

- 旧项目 `taro3-code/lib/weapp/utils/qrcode` 不进入 RN App；当前不引入小程序二维码依赖。
- 签收码页面只处理实名签收姓名登记，不直接承接身份证实名核验。
- 签收码复制走 `shared/platform/clipboard.copyTextToClipboard`，不在页面直接使用小程序专属 API。
- 出示签收码属于确认收货授权动作，页面保留异常拒签风险提示。

首期接入端点：

| 能力 | 端点 |
| --- | --- |
| 判断是否有实名姓名 | `/gwapi/userService/eco/user/info/secure/hasRealName` |
| 保存实名姓名 | `/gwapi/userService/eco/user/info/secure/updateRealName` |
| 查询签收码 | `/gwapi/onlineService/eco/online/courier/secure/queryCustomerSignCodeInfo` |

后置能力：

- RN 二维码渲染、亮屏、防截屏等签收展示体验。
- 与身份证实名中心的前置状态提示联动。
- 签收码分享、扫码签收结果回调和签收异常申诉。

## ECard 首期切片

德邦 E 卡首期从旧项目 `pages/common/ecard`、`api/user.ts` 和支付组件中的 E 卡查询能力中抽取 App 可用能力，不迁小程序授权、定位拼参、收银台状态机和原生支付。

已落地边界：

- `services/ecard/ecard.api.ts`：封装 E 卡余额、充值优惠、开通状态、E 卡 H5 链接和游客预览链接接口。
- `services/ecard/ecard.service.ts`：归一余额、开通状态、支付密码状态、充值说明和充值优惠摘要，页面只消费 `ECardOverviewView`。
- `pages/ecard/center`：展示余额、卡片状态、支付密码状态、充值优惠，并提供进入 E 卡、充值和账单三个 H5 承接入口。
- `shared/webview/appWeb.ts`：新增 `ECARD_CENTER`、`ECARD_RECHARGE`、`ECARD_BILL` 来源，后端返回的 H5 URL 仍经过 WebView 白名单校验。
- `shared/config/runtime.ts`：新增 `APP_ECARD_PMC_SYSTEM_CODE` 配置，避免把旧微信/支付宝小程序 PMC 系统码硬编码进 App。
- `pages/mine` 和统一路由已接入 `APP_ROUTES.ecardCenter`，E 卡入口受登录守卫保护。

关键约束：

- E 卡首期只做余额和 H5 承接，不在 RN 内创建支付单、不接微信/支付宝 App 支付 SDK。
- 旧项目打开 E 卡时会尝试定位并把经纬度拼到 H5 URL；当前不直接调用定位，后续接 `shared/platform/location` 后再评估。
- E 卡能否抵扣寄件费用、是否需要支付密码、余额是否充足，仍由收银台/后端校验，寄件页不直接消费 E 卡余额。

首期接入端点：

| 能力 | 端点 |
| --- | --- |
| 生成 E 卡页面 | `/gwapi/onlineService/eco/online/prestore/secure/getPmcPrestorePage` |
| 游客 E 卡页面 | `/gwapi/onlineService/eco/online/prestore/getPmcPreStoreVisitorPage` |
| 查询 E 卡余额 | `/gwapi/memberService/eco/member/secure/getEcardBalance` |
| 查询充值优惠 | `/gwapi/onlineService/eco/online/prestore/secure/queryRechargePromotions` |
| 查询开通状态 | `/gwapi/memberService/eco/member/secure/openCard` |

后置能力：

- E 卡支付、充值结果回跳、支付密码设置和余额抵扣校验。
- 与寄件报价/下单/收银台的 E 卡支付方式联动。
- 定位参数、活动码、快递员推广码和 E 卡营销落地页完整承接。

## Coupon 首期切片

优惠券模块首期从旧项目 `pages/coupon/list` 和 `pages/coupon/detail` 中抽取个人中心可 App 化能力，不迁小程序分享、订阅消息、会员营销 banner 和员工转赠状态机。

已落地边界：

- `services/coupon/coupon.api.ts`：封装个人优惠券列表、兑换码领取和详情查询接口。
- `services/coupon/coupon.service.ts`：归一券类型、金额/折扣、门槛、有效期、状态文案、标签和详情规则，页面只消费 `CouponCardView` / `CouponDetailView`。
- `pages/coupon/list`：支持未使用、已使用、已过期三个 tab，支持兑换码领取，空态和错误态按 App 页面承接。
- `pages/coupon/list`：未使用券点击“去使用”会通过 `expressDraftBridge` 带入寄件草稿的 `couponNumber`，并要求寄件页重新获取价格。
- `pages/coupon/detail`：展示券码、适用产品、发货地、收货地、使用限制和使用说明，不迁条码组件、转赠分享和特殊营销跳转。
- `pages/express`：新增优惠券字段，可展示从优惠券列表带入的券码，也支持手动输入和清除；优惠券变化会清空已选产品并提示重新报价。
- `pages/mine` 和统一路由已接入 `APP_ROUTES.couponList` / `APP_ROUTES.couponDetail`，优惠券入口受登录守卫保护。

关键约束：

- 优惠券 service 只处理券展示和兑换，不直接跳转页面、不修改寄件表单。
- 寄件页仍负责报价和下单校验；优惠券只是草稿字段，最终可用性由价格时效/下单接口确认。
- 旧项目的购买记录、会员福利中心、转赠分享、订阅消息、特殊渠道跳转、券包购买和营销 banner 不进入 RN 首期。

首期接入端点：

| 能力 | 端点 |
| --- | --- |
| 个人优惠券列表 | `/gwapi/couponService/eco/coupon/new/secure/queryNewCouponList` |
| 兑换优惠券 | `/gwapi/couponService/eco/coupon/coupon/secure/exchangeCoupon` |
| 优惠券详情 | `/gwapi/couponService/eco/coupon/new/secure/queryCouponDetail` |

## Member 首期切片

会员模块首期从旧项目 `pages/member/index`、`pages/memberService/svip` 和 `api/member.ts` 中抽取 App 可用读能力，不迁小程序 tab badge、分享、订阅消息、SVIP 购买支付和营销弹窗状态机。

已落地边界：

- `services/member/member.api.ts`：封装会员等级和 SVIP 最新信息两个读接口。
- `services/member/member.service.ts`：归一会员等级、成长值、积分、SVIP 状态和权益摘要，并生成 MAS 福利中心 WebView URL。
- `services/auth`：补充 `generateTmpToken`，会员福利中心打开前尽量沿用旧项目的临时 code 进入方式；获取失败时降级为游客福利中心 URL。
- `pages/member/index`：展示等级、成长值进度、积分、SVIP 摘要、权益服务和福利中心入口。
- 首页“会员权益”服务卡和我的页“会员权益”入口已接入 `APP_ROUTES.memberCenter`，入口受登录守卫保护。
- `shared/webview/appWeb.ts` 已新增 `MEMBER_WELFARE_CENTER` 来源，`runtime` 新增 `APP_MEMBER_WEB_URL` 和 `mastest.deppon.com.cn` 白名单。

关键约束：

- 会员页面只消费 service 归一后的 VM，不直接处理 MAS 营销配置、跳小程序、订阅消息或支付。
- SVIP 购买、续费、购买记录和发券结果后续需结合 App 支付能力和 MAS WebView 登录态再接入。
- 福利中心继续走统一 WebView 白名单，不在页面硬编码外部域名。

首期接入端点：

| 能力 | 端点 |
| --- | --- |
| 会员等级 | `/gwapi/memberService/eco/member/grade/secure/weChatMiniMemberGrade` |
| SVIP 最新信息 | `/gwapi/memberService/eco/member/grade/secure/getSvipNewestInfo` |
| 会员 Web 临时 token | `/gwapi/userService/eco/user/token/secure/generateTmpToken` |

## Invoice 首期切片

发票模块首期从旧项目 `pages/invoice/index`、`pages/invoice/taxpayer`、`pages/invoice/apply`、`pages/invoice/preview` 和 `utils/invoice.ts` 中抽取 App 可用能力，不迁旧页面里的申请提交、支付、电子票下载、纸票邮寄地址修改和小程序扫码查询。

已落地边界：

- `services/invoice/invoice.api.ts`：封装统一发票网关 `invoiceCommonService`，由业务 path 区分可开票运单、开票历史、抬头查询和抬头维护。
- `services/invoice/invoice.service.ts`：归一可开票运单状态、发票历史状态、发票类型、金额、时间、抬头展示、包含运单和电子票预览 VM，并承接抬头校验、保存、删除、企业抬头联想和发送邮箱。
- `pages/invoice/index`：提供“可开票 / 开票历史 / 发票抬头”三个 tab，支持可开票运单分页、近一年开票历史分页、按运单号查询历史和抬头列表查看。
- `pages/invoice/taxpayer/index`：支持抬头列表管理、新增、编辑、删除和默认抬头设置。
- `pages/invoice/taxpayer/edit`：支持个人/单位抬头表单、单位抬头联想补全、税号格式校验和保存。
- `pages/invoice/apply`：从单个可开票运单进入，支持电子普票/电子专票选择、抬头选择、接收邮箱、货物单位和备注，生成前端申请预览并做提交前校验。
- `pages/invoice/detail`：从开票历史进入，展示发票详情、状态、金额、抬头、邮箱、备注，并通过 `queryContainWaybill` 查询发票包含的运单金额。
- `pages/invoice/preview`：从开票历史进入，按申请号调用 `lookInvoice` 查询电子票图片/PDF 链接，页面展示链接并通过平台 facade 尝试下载和文件打开；同页支持填写邮箱并调用 `sendEmail` 重新发送电子票。
- `pages/mine` 和统一路由已接入 `APP_ROUTES.invoiceCenter`，发票入口受登录守卫保护。

关键约束：

- 发票首期只做读中心、抬头管理、申请草稿/预览、历史电子票预览和发送邮箱，不调用 `addTaskInfoByEle` 提交半截申请。
- 申请页登录回跳保留当前运单参数；抬头列表每次 `useDidShow` 刷新，便于从抬头管理返回后继续申请。
- 申请链路后续需要继续接入真实提交、支付单、纸票邮寄地址和电子票下载能力，不复用旧页面巨石状态机。
- 历史详情首期只读，不接入旧项目作废、撤销和纸票邮寄地址修改动作，避免在状态流和原生地址能力未完整确认前提交高风险变更。
- 电子票下载和文件打开统一走 `shared/platform/files`，当前按原生能力矩阵降级为“下载/文件预览能力待接入 App 原生模块”。
- 运单待支付金额仍由支付领域承接，发票页不直接创建支付单。
- 小程序 `Taro.chooseInvoiceTitle` 不进入 RN 首期；企业抬头联想使用后端 `queryCustomerTaxName`。

首期接入端点：

| 能力 | path |
| --- | --- |
| 可开票运单 | `tradeQueryByCustomerCode` |
| 开票历史 | `queryInvoiceHistory` |
| 按运单查询历史 | `queryApplyByWayBillNo` |
| 查询发票包含运单 | `queryContainWaybill` |
| 查询电子票预览 | `lookInvoice` |
| 电子票发送邮箱 | `sendEmail` |
| 发票抬头 | `queryTaxpayerInfo` |
| 新增发票抬头 | `addTaxpayerInfo` |
| 修改发票抬头 | `alterTaxpayerInfo` |
| 删除发票抬头 | `deleteTaxpayerInfo` |
| 企业抬头联想 | `queryCustomerTaxName` |

后置 path：

| 能力 | path |
| --- | --- |
| 运单开票提交 | `addTaskInfoByEle` |
| 电子票下载 | 待接 App 文件下载和系统预览原生模块 |

本轮已验证：

- `pnpm --filter com.deppon.app exec tsc --noEmit`
- `pnpm --filter com.deppon.app exec eslint "src/**/*.{ts,tsx}"`
- `pnpm --filter com.deppon.app run check:rn-boundaries`
- `pnpm --filter com.deppon.app build`
- `pnpm verify:app` 可作为后续同等验证入口，会串行执行 `typecheck`、`lint`、`check:rn-boundaries` 和 `build`。

RN build 仍会输出 Sass legacy API、stylelint CommonJS API、React Native CLI 缓存版本和 Node `DEP0190` 提醒，当前均不是阻塞错误。

原生编译环境记录：

- 已尝试执行 Android `./gradlew.bat :app:assembleDebug`。
- 已新增 `pnpm check:app-native-env` 检查原生编译前置条件。
- 当前机器未设置 `JAVA_HOME`，PATH 中也没有 `java/javac`，因此 Android 原生编译尚未完成验证。
- 当前 `D:\Android\Sdk` 存在，且 `platforms/android-34`、`build-tools/34.0.0`、`platform-tools/adb.exe`、`cmdline-tools/latest/bin/sdkmanager.bat` 均可找到。
- 当前系统是 Windows，iOS 构建需要 macOS/Xcode/CocoaPods 环境，因此本机只记录为跳过。
- 后续补齐 JDK 后，需要继续执行 Android debug/release 构建；iOS 构建也需要在 macOS/Xcode/CocoaPods 环境下验证。

建议目录边界：

```text
src/
  request/
    client.ts
    depponClient.ts
    cookieJar.ts
    types.ts
    error.ts
  cache/
    keys.ts
    storage.ts
    dpCache.ts
  services/
    auth/
    user/
    contact/
    customer/
    ecard/
    gis/
    sign/
    send/
    order/
    coupon/
    payment/
  stores/
    auth.store.ts
    user.store.ts
    expressForm.store.ts
    orderDraft.store.ts
  features/
    home/
    express/
    order/
    user/
```

迁移原则：

- `request` 不直接做页面跳转。
- `api` 只描述接口。
- `service` 编排登录、重试、缓存和业务流程。
- `store` 只放会话、用户摘要、复杂表单草稿和跨页面状态。
- 旧 Redux reducer 中的缓存、埋点、登录副作用应拆出。

## 分阶段计划

### 第 1 阶段：RN App 底座

- 收敛脚本到 `dev:app`、`build:app`、`android`、`ios`。
- 修正 `app.config.ts` 路由，保证实际页面可被 Taro 识别。
- 建立 `@/*` 路径别名、runtime config、request bootstrap。
- 建立 RN 原生能力占位层，显式标记待接入能力。
- 将首页和寄件页从模板占位改为可继续承载业务的 App 页面骨架。

### 第 2 阶段：主链路迁移

首期主链路：

```text
首页 -> 登录/用户态 -> 寄件下单 MVP -> 下单成功 -> 查件/订单列表 -> 订单详情基础 -> 我的
```

- 首页：按 App 信息架构重建常用服务、寄件入口、查件入口、会员入口。
- 登录：确认 App 登录方式后重写登录服务和用户状态；优先接 `queryUserInfo`、`checkEcoToken`、`logout`、短信发送和登录接口。
- 寄件：拆解参考项目中的寄件大页面，按表单步骤和领域服务重构；优先接联系人、地址解析、价格时效、产品推荐、接货时间、货物名称、保价和寄件协议。
- 查件/订单：先迁订单列表、运单详情和轨迹，再迁取消、删除、修改、售后和评价。
- 我的：整合用户资料、常用地址、发票、会员权益入口。

当前 App 路由保持扁平，不照搬参考项目分包：

```ts
pages: [
  'pages/home/index',
  'pages/login/index',
  'pages/express/index',
  'pages/express/success/index',
  'pages/express/insurance/index',
  'pages/query/price/index',
  'pages/query/dispatch/index',
  'pages/query/stations/index',
  'pages/query/stations/detail/index',
  'pages/query/goods/index',
  'pages/account/settings/index',
  'pages/account/cancel/index',
  'pages/realname/center/index',
  'pages/contact/list/index',
  'pages/contact/edit/index',
  'pages/order/list/index',
  'pages/order/detail/index',
  'pages/order/cancel/index',
  'pages/order/stub/index',
  'pages/payment/list/index',
  'pages/coupon/list/index',
  'pages/coupon/detail/index',
  'pages/support/center/index',
  'pages/customer/center/index',
  'pages/sign/code/index',
  'pages/ecard/center/index',
  'pages/member/index/index',
  'pages/invoice/index/index',
  'pages/invoice/apply/index',
  'pages/invoice/detail/index',
  'pages/invoice/preview/index',
  'pages/invoice/taxpayer/index',
  'pages/invoice/taxpayer/edit/index',
  'pages/privacy/settings/index',
  'pages/mine/index',
  'pages/web/index'
]
```

底部导航已按 `首页 / 寄快递 / 查快递 / 我的` 首期落地。由于当前目标是 RN App，不再使用小程序 `tabBar` 配置；四个主入口通过 `shared/components/AppTabBar` 使用页面内固定底栏，主入口跳转统一走 `shared/navigation/appNavigation.ts`，用 `redirectTo` 避免页面栈膨胀，查快递入口继续复用登录守卫。

主入口跳转规则：

- `/pages/home/index`、`/pages/express/index`、`/pages/order/list/index`、`/pages/mine/index` 视为 App 主路由。
- 主路由之间切换使用 `redirectTo`，不通过普通 `navigateTo` 堆叠页面。
- 非主路由继续使用 `navigateTo`，保留详情、编辑、WebView 等页面返回语义。
- 订单列表作为受保护主入口，由 `navigateToAppRoute` 自动触发登录守卫。
- 登录成功、暂不登录、下单成功继续寄件、进入订单列表、订单详情返回主入口等路径统一复用该导航工具。

### 第 3 阶段：原生能力接入

- 扫码、定位、地图、相册/相机、文件上传、支付、分享、推送、埋点。
- 每个能力都通过 `shared/platform` 或独立 native adapter 暴露给业务层。
- 业务页面只依赖领域服务，不直接依赖平台 SDK。

### 第 4 阶段：全量业务补齐

- 发票、会员服务、客服中心、批量寄件、营销权益、支付中心等模块按业务优先级迁移。
- 移除小程序条件分支和小程序插件依赖。
- 建立 App 端回归清单和构建验证流程。

首期后置模块：

- `ai/express`：ASR/VLM、语音、图片能力和接口链都重。
- `batch`：批量下单、Excel/地址解析、多收件人状态机复杂。
- `pay/cashier`、`pda/pay`、支付分、先享后付、E 卡支付和支付结果回跳：依赖原生支付/收银台。
- `order/detail` 的实时地图、Canvas 分享图、快递员位置。
- `print`：蓝牙打印和外部设备能力。
- `invoice`：真实提交、支付、作废和纸票寄送链路长。
- 客服售后全量：原生 IM、投诉记录、理赔进度和材料上传。
- 营销/会员全量：优惠券发放、SVIP 支付、学生专区、活动弹窗。

## 待确认事项

- App 登录方式：手机号验证码、账号密码、微信 App 授权、企业 SSO，或其他。
- App 支付方式：微信 App 支付、支付宝 App 支付、H5 收银台，或暂不接入。
- 接口环境：dev/prod baseURL、鉴权方式、cookie/session 是否继续沿用。
- App 包信息：Android applicationId、iOS Bundle ID、应用名已完成首轮同步；图标、启动页、签名、证书、Android Kotlin namespace 和 iOS Xcode target/Pods 命名仍需后续确认后处理。
- 资产复用边界：参考项目中的图片资源、文案、协议、埋点名称是否可复用。
- 首期范围：MVP 主链路还是全量迁移。
- 外部小程序能力：月结、公益回收、打印、微信支付分、SVIP 等是否必须保留外跳。
- 订阅消息替代：App Push、短信、站内信分别覆盖哪些场景。
- 实名核验：微信 `wx.ncidas` 是否仍是合规必需，App 端是否已有供应商 SDK。
- 文件能力：PDF/Word/图片最大尺寸、预览、保存相册和分享边界。

## 验收原则

- `pnpm dev:app` 能启动 Taro RN watch。
- `pnpm build:app` 能产出 RN bundle。
- `pnpm check:app-boundaries` 不允许 App 源码直接引用小程序专属 API。
- Android/iOS 工程能按目标包名编译。
- 页面不依赖小程序专属运行时。
- 每个迁移模块都有清晰的 API、状态、页面、原生能力边界。
