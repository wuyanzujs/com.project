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
| `order/detail` | 轨迹、地图、快递员、签收、复制单号、电子存根、货物补充明细、照片凭证、单据票证、催单、通知派送、拦截作废、收件方式、联系营业部、评价、支付入口、修改/售后入口 | 已迁基础详情、轨迹、电子存根、只读凭证、支付提示、售后快捷动作、原生服务评价和动态场景问卷/NPS；地图和完整售后状态机后置。 |
| `center` | 我的、订单统计、地址簿、发票、客服、客户中心、会员、设置入口 | 首期做 App 我的页骨架，并拆出客服中心、客户中心等 App 化页面。 |
| `login` / `user` | 登录、绑定、实名、签收码、注销 | 登录必须先迁；签收码读能力和实名签收登记进入首期，完整实名核验后置。 |
| `contact` | 地址簿、地址编辑、智能解析、委托寄件联系人 | 首期迁地址簿基础能力。 |
| `query` | 服务查询、价格时效、收派范围、网点、货物/禁寄查询 | 价格时效、收派范围、网点列表/详情和货物/禁寄查询进入首期；地图导航能力仍走 App 原生 facade 后置接入。 |
| `pay` | 运单支付、收银台、PDA 支付、E 卡、支付状态 | 首期保留支付入口/待支付展示，并提供 E 卡读中心和 H5 承接；真实支付等原生能力 ready 后接入。 |
| `coupon` / `member` / `memberService` | 优惠券、会员、SVIP、营销权益 | 优惠券个人列表/兑换/详情、会员等级/SVIP 摘要和福利中心 WebView 承接进入首期；会员支付、营销弹窗和订阅消息后置。 |
| `invoice` | 发票、抬头、申请、预览、支付 | 发票读中心、可开票运单号搜索、抬头管理、普通运单电子票提交、历史电子票预览和发送邮箱进入首期；支付、E 卡开票和纸票邮寄后置拆分。 |
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
- 根目录已新增 `.node-version`，并在 `package.json` 中声明 `node: 24.13.0`、`pnpm: 11.9.0`，本地、CI 和打包机应按同一版本执行。
- 根 `README.md` 和 `apps/com.deppon.app/readme.md` 已从模板说明改为当前 RN-only App 的环境、命令、分层、路由和迁移规则说明。
- App 包已移除 `@tarojs/plugin-platform-weapp`、`@tarojs/plugin-platform-alipay`、`@tarojs/plugin-platform-h5`、`@tarojs/plugin-platform-jd`、`@tarojs/plugin-platform-qq`、`@tarojs/plugin-platform-swan`、`@tarojs/plugin-platform-tt` 等小程序/H5 平台插件直接依赖，保持 RN-only 依赖边界。
- `app.config.ts` 的页面列表已改为从 `shared/navigation/routeRegistry.ts` 派生；`APP_ROUTES`、主导航和登录守卫也从同一份注册表生成，新增页面不再多处手写路径。
- `metro.config.js` 已补 pnpm workspace 的 `watchFolders`、`nodeModulesPaths` 和 symlink 支持。
- Taro RN 所需 native peer 依赖已显式放入 `com.deppon.app`，包括 `@tarojs/router-rn`、React Navigation、gesture handler、screens、safe area、svg、webview、pager view 等。
- 原生身份已做同步：Taro RN `appName`、Android `namespace/applicationId/fastlane packageName/MainActivity/MainApplication` 和 iOS `moduleName/Bundle ID/LaunchScreen` 已对齐 App 身份；Android/iOS 展示名为“德邦快递”。
- 已删除 App 包内 `project.config.json`、`project.tt.json` 等小程序 IDE 配置，并将 `types/global.d.ts` 的 `TARO_ENV` 收窄为 `rn`，避免 RN-only 工程继续暗示小程序构建入口。
- Taro RN 依赖链中的 `expo` 已显式声明为 App 依赖，Android `settings.gradle` 和 iOS `Podfile` 的 Expo autolinking 通过 `@tarojs/taro-rn` 定位依赖，兼容 pnpm workspace 布局。
- 已建立 `src/app.bootstrap.ts`、`src/shared/config/runtime.ts`、`src/shared/navigation/routes.ts`、`src/shared/platform/capabilities.ts`。
- 已建立 `src/shared/platform/scan.ts`，首页和后续查件/寄件扫码入口统一依赖扫码 facade，不直接调用小程序 `Taro.scanCode`。
- 已建立 `src/shared/platform/phone.ts`，App 端通过 RN `Linking` 承接拨打电话能力，页面不再直接调用小程序 `Taro.makePhoneCall`。
- 首页和预约寄件页已从模板占位变成可继续承接业务的 App 页面骨架；首页订单中心服务卡已接入 `APP_ROUTES.orderList`，不再是静态展示。
- 已新增 `src/cache`、`src/request/deppon.ts`、`src/request/cookieJar.ts`、`src/request/events.ts` 和 `src/services/auth`，承接 OWS cookie 会话、响应归一、登录失效事件和 App 登录服务骨架。缓存 adapter 不再使用 Taro 同步存储 API，改为异步 `Taro.getStorage/setStorage/removeStorage`，App 启动先 hydrate 已登记的 key 到内存镜像后再挂载业务页。
- 已新增 `src/shared/components/AppTabBar`，RN 首期先采用页面内共享底部导航，不依赖小程序 `tabBar` 配置；首页、寄件、查快递、我的四个主入口已接入同一导航数据源。
- 已新增 `src/shared/navigation/appNavigation.ts`，集中处理 App 内路由安全兜底、主入口 `redirectTo`、普通页面 `navigateTo` 和受保护入口登录守卫，避免页面各自判断跳转形态。
- 已新增 `src/shared/navigation/routeRegistry.ts`，统一声明页面 `name/path/title/main/loginRequired`；`app.config.ts`、`routes.ts`、`appNavigation.ts` 不再分别维护页面列表、主入口和登录守卫。
- 首页、我的页、账号设置和客服中心的静态入口数据已收紧为 `AppRoutePath`，新增入口必须引用 `APP_ROUTES`；需要 query 的详情/搜索/WebView 路由统一通过 `shared/navigation/routeUrl.ts` 的 `createAppRouteUrl`、`appendRouteQuery` 或 `createRouteQuery` 生成，不在页面里复制 `createQuery`。
- 已新增 `scripts/check-route-registry.mjs` 和 `check:routes` 门禁，校验路由注册表唯一性、页面文件存在性、主导航顺序、登录路由和派生消费关系。
- 已新增 `src/styles` 样式基础层，集中维护颜色、字号、行高、间距、圆角 token，以及页面、卡片、按钮、空态等通用类；既有页面不做一次性大面积替换，后续业务切片逐步迁移。
- 已补齐 `shared/platform` 首期 facade：定位、地图、文件选择/上传/下载/预览、支付、通知、外部 App/小程序、实名核验、电话和扫码都通过统一能力矩阵暴露，默认 pending 的能力会明确降级为“待接入 App 原生模块”。
- 已新增工程验证脚本：根目录 `typecheck:app`、`lint:app`、`check:app-boundaries`、`check:app-routes`、`check:app-module-size`、`check:app-business-rules`、`verify:app`，App 包内 `typecheck`、`lint`、`check:rn-boundaries`、`check:routes`、`check:module-size`、`check:business-rules`、`verify:static`、`verify`；默认 verify 只执行静态门禁，不生成 RN bundle，bundle 由 `verify:bundle:android/ios` 显式触发。
- 已新增 `scripts/check-module-size.mjs` 和 `check:module-size` 门禁，新页面默认不超过 420 行，新 service 默认不超过 450 行；已存在或自然复杂的页面/service 使用带原因的冻结预算，目标是阻止无意识膨胀，而不是为了行数机械拆分。
- 已新增 `scripts/check-business-rules.cjs` 和 `check:business-rules`，首批覆盖 service 失败响应形态、OWS 状态归一、`ECO_TOKEN` cookie 提取、路由 query、扫码分类、寄件模板映射/保存 payload/草稿桥、寄件草稿校验、关注运单映射和详情动作、订单修改草稿/差异请求/校验、网点反馈 H5 参数、优惠券卡片/详情归一、优惠券价格时效 payload、批量寄入口/校验规则、打印中心入口/打印前置规则、发票申请校验/抬头校验/提交 payload、订单金额/重量/手机号展示和订单详情动作 VM 等纯函数规则，后续拆 mapper/rules/useCases 时继续补用例。
- 已新增原生环境检查脚本：根目录 `check:app-native-env`，App 包内 `check:native-env`，用于检查 JDK、Android SDK、Gradle wrapper、iOS 构建宿主等 Android/iOS 编译前置条件。
- 已新增 `.github/workflows/app-quality.yml`，push 和 pull request 统一执行 `pnpm install --frozen-lockfile`、静态 `pnpm verify:app` 和 `pnpm check:app-native-env`，把 RN-only 边界、路由、体量和运行时配置固化到协作入口；Android/iOS bundle 与原生包保留给显式发布流程。

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

- `shared/platform/scan.ts` 暴露 `scanCode`、`scanAppCode`、`scanWaybillCode`、`parseAppScanValue` 和 `extractWaybillNumberFromScanValue`。
- `parseAppScanValue` 负责统一处理二维码/条码结果中的 raw 运单号、`waybillNumber`、`waybillNo`、`waybillNum`、`billNo`、`ltlWaybillNumber`、`skiingWaybillNumber` 和 `printId`。
- 旧寄件二维码里的 `pickupManId`、`courierNo`、`driverId`、`acceptDept`、`businessCode`、`shipperNumber` 会被识别为寄件业务二维码并保留 `role/value`；`sceneId` 和 `partner=Y` 也会进入解析结果，后续寄件页接入时不再回挖旧小程序工具函数。
- `services/express` 已提供 `ExpressScanContext`、`applyExpressScanContext`、`clearExpressScanContext`、`createExpressScanContextView` 和 `SCAN_QR_CODE` 草稿桥接来源。当前只承接旧项目已明确的下单字段映射：`pickupManId/driverId -> pickupManId`，`shipperNumber -> shipperNumber`，`acceptDept/businessCode -> acceptDept`；带入或移除扫码上下文时会清空旧报价和协议勾选，提示重新获取价格，并在寄件页展示扫码来源说明和移除入口。
- 客户编码二维码会在价格时效请求中带入 `customerCode/customerMonthly/customerContract`，在筛单请求中带入 `customerCode/limitCust`，并在创建订单时提交 `shipperNumber`；不在前端硬编码账号月结/合同权限，是否可月结、是否合同客户和费用规则仍以后端校验为准。
- 首页和发票中心扫码使用 `scanAppCode` 分类分流：普通运单进入订单详情或发票运单搜索，`printId` 云打印码进入面单打印中心，寄件业务二维码、短链和非德邦二维码不进入普通查件链路。首页扫码遇到 `sendQrCode` 时，会把 `ExpressScanContext` 写入寄件草稿并通过登录守卫进入寄件页；发票中心仍只消费运单号。
- 当前不复制旧小程序里的 `p.url.cn` 短链网络解析、云打印小程序外跳和寄件二维码状态机；这些能力后续按 App 原生扫码、打印和寄件 service 独立接入。
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
| 小程序分享/开放能力按钮 | 多处 `useShareAppMessage`、`openType=share/getPhoneNumber` | App 分享、登录、客服等 SDK facade，不能直接迁小程序组件开放能力。 |
| `Taro.uploadFile/downloadFile` | 上传 13 处，下载 5 处 | FormData 上传本地 URI，下载到 cache/document，再预览或系统打开。 |
| `Taro.makePhoneCall` | 24 处 | `Linking.openURL('tel:...')` 封装。 |
| `wx.*` / `my.*` | 业务直接 `wx.*` 2 处，`my.*` 14 处 | 按能力替换，实名、授权、地址、文件选择和支付需单独确认。 |
| `process.env.TARO_ENV` | 252 处 | 改为 App runtime/channel/capability 矩阵。 |

当前 App 已新增 `scripts/check-rn-boundaries.mjs` 作为自动门禁：

- 扫描范围：`apps/com.deppon.app/package.json`、`apps/com.deppon.app/src/**/*.ts(x)`、关键 Android/iOS 原生身份文件和小程序 IDE 项目配置文件。
- 禁止 App 包直接依赖小程序/H5 平台插件：`@tarojs/plugin-platform-weapp`、`@tarojs/plugin-platform-alipay`、`@tarojs/plugin-platform-h5`、`@tarojs/plugin-platform-jd`、`@tarojs/plugin-platform-qq`、`@tarojs/plugin-platform-swan`、`@tarojs/plugin-platform-tt`。
- 校验关键 native 身份：Taro RN `appName`、Android `namespace/app_id/app_name/fastlane packageName/MainActivity/MainApplication`、iOS `moduleName/DisplayName/Bundle ID/LaunchScreen`，防止 `taroDemo` 这类模板运行时身份回流。
- 校验 Taro RN 原生 autolinking：`expo` 必须作为 App 显式依赖，Android `settings.gradle` 和 iOS `Podfile` 必须使用兼容 pnpm workspace 的依赖解析方式。
- 禁止保留 `project.config.json`、`project.tt.json`、`project.swan.json`、`project.qq.json`、`project.jd.json` 等小程序 IDE 配置文件。
- 禁止业务代码直接拼 `APP_ROUTES.web`；所有 WebView 承接必须通过 `shared/webview/appWeb.ts` 的 `createAppWebUrl` 统一生成，便于来源、标题、登录态和白名单治理。
- 禁止业务代码直接写 `` `${APP_ROUTES.xxx}?` `` 或 `APP_ROUTES.xxx + '?'` 拼动态 query；App 内动态 URL 必须通过 `shared/navigation/routeUrl.ts` 生成。
- `shared/webview/appWeb.ts` 已将 H5 来源收敛为 `APP_WEB_TARGETS` / `AppWebSource`，客服、订单售后、客户中心、E 卡、会员和隐私协议等静态入口都必须引用受控来源；新增 H5 入口先登记来源，再在页面或 service 中使用。
- 禁止直接使用 `wx.*`、`my.*`。
- 禁止保留 `process.env.TARO_ENV` 或 `Taro.getEnv` 多端运行时分支；App 端差异使用 `shared/config/runtime.ts` 和 capability 矩阵表达。
- 禁止直接使用 `Taro.scanCode`、`Taro.getLocation`、`Taro.chooseLocation`、`Taro.openLocation`、`Taro.makePhoneCall`、`Taro.uploadFile`、`Taro.downloadFile`、`Taro.requestSubscribeMessage`、`Taro.navigateToMiniProgram`、`Taro.chooseImage/chooseMedia/chooseVideo`、`Taro.getUserProfile/authorize/getSetting/openSetting`、`Taro.saveImageToPhotosAlbum`、`Taro.setClipboardData/getClipboardData`、`Taro.previewImage`、`Taro.openDocument`、`Taro.onUserCaptureScreen/offUserCaptureScreen`、`Taro.getFileSystemManager/createSelectorQuery`。
- 同一门禁会解析 `@tarojs/taro` 的默认导入改名、namespace、具名导入和 CommonJS 解构；`Foo.scanCode()`、`import { scanCode as scan }` 等别名写法不能绕过 RN boundary。
- 禁止直接使用 `useShareAppMessage`、`useShareTimeline`、`onShareAppMessage` 和小程序组件 `openType`；分享、登录、客服等开放能力必须先走对应 `shared/platform` facade，当前按能力矩阵降级。
- 禁止直接迁入旧项目 `EVENT_TRACK` 或 `sensors` 小程序埋点入口；埋点统一通过 `shared/platform/analytics.ts` 预留 App SDK facade。
- 禁止业务代码直接调用 RN `NativeModules`、`PermissionsAndroid`、`Linking`、`Share.share`、`Alert.alert`；这些 API 只能在 `shared/platform` 或后续 `shared/native` 中封装。
- 禁止 `Taro.getStorageSync`、`Taro.setStorageSync`、`Taro.getStorageInfoSync`、`Taro.removeStorageSync`、`Taro.clearStorageSync`；异步 Taro 缓存 API 也只能在 `src/cache` facade 内使用。业务层不得直接调用 `window/document/localStorage/sessionStorage/navigator`，不得直接 import `react-native`、`react-native-webview` 或其他 RN 原生包。
- RN 页面布局优先使用 Flex，通过 `flexDirection`、`alignItems`、`justifyContent` 等受支持属性表达。SCSS 禁止 `float`、`display: grid/inline-grid`、`grid-*`、`position: fixed/sticky`、`inset`、单边 `border-*-style`、`background-image`、`box-shadow`、复合类和类选择器之间的后代/兄弟组合；遮罩和固定操作区使用受控容器内的 absolute 布局，状态样式直接添加到目标元素 modifier class。
- 这些能力必须先落到 `shared/platform` facade 或独立领域 service，再由页面消费。
- 当前 App 源码扫描通过；参考项目扫描命中大量文件，说明后续迁移不能复制旧页面调用形态。

发布契约由 `scripts/check-platform-build.mjs` 自动检查：

- Android/iOS Fastlane 打包前按锁文件安装依赖并生成各自 RN bundle，iOS 同时执行 Pods 安装和 `SKIP_BUNDLING=1`。
- iOS Fastlane 只能使用存在的 `.xcworkspace`，禁止直接构建 `.xcodeproj`。
- 动态比较 Taro RN `appName`、Android `getMainComponentName()` 和 iOS `moduleName`，三者必须一致。
- 提供 `dev:rn:reset-cache` 处理 `app.config` 修改后的 Metro 缓存，并检查直接 RN 原生依赖不存在多版本。
- 当前不引入 Harmony；未来检测到 Harmony 插件或配置时，条件门禁会检查 Taro `>=4.1.0`、Vite、`projectPath/hapName`、CPP 类型引用、`__taroNotSupport` 监听及 Harmony 样式限制。

当前 `shared/platform` 已落地的首期结构：

```text
shared/platform/
  analytics.ts
  capabilities.ts
  clipboard.ts
  scan.ts
  phone.ts
  location.ts
  map.ts
  files.ts
  payment.ts
  notifications.ts
  externalApp.ts
  realName.ts
  share.ts
  index.ts
```

分层职责：

- 能力矩阵层维护 `scan/location/payment/phone/filePicker/documentPreview/notification/externalMiniProgram/realName/share/analytics` 等状态。
- facade 层向业务暴露 `scanCode()`、`dialPhone()`、`getCurrentAppLocation()`、`openMapLocation()`、`chooseAppFile()`、`uploadAppFile()`、`downloadAppFile()`、`payWithApp()`、`requestAppNotificationPermission()`、`openExternalApp()`、`verifyRealName()`、`shareWithApp()`、`trackAppEvent()` 等稳定方法。
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
- `request/cookieJar.ts`：统一保存、读取、清理 `ECO_TOKEN`，并通过可注入 runtime adapter 与 RN 原生 cookie jar 双向同步。
- `request/events.ts`：提供 `authExpired`、`rateLimited` 事件，不在请求层直接跳页面或弹窗。
- `cache/storage.ts`、`cache/dpCache.ts`：提供启动 hydrate 的异步 Taro storage adapter、运行期内存镜像和带过期策略的缓存工具；业务层只通过 cache facade 读写。
- `services/auth`：先落登录服务边界，包含 `queryUserInfo`、`checkEcoToken`、`logout`、`sendSmsMessage`、短信登录骨架。
- `services/contact`：先落地址簿基础能力，包含分页查询、保存、删除、默认地址、地址解析、地址联想、乡镇补全、地址详细度校验和选择参数约定。
- `shared/navigation/authGuard.ts`：以 `ECO_TOKEN` 作为 App 登录态证据，统一生成登录页 `redirectUrl`、处理登录跳转去重和安全页面入口拦截。
- `app.bootstrap.ts`：先挂载 `shared/native/AppSessionCookie`、hydrate storage 与原生 cookie，再配置 baseURL/timeout；监听 `authExpired` 时同时清理两侧会话，再通过统一 guard 跳转登录页。

## Login / Mine 首期切片

登录和我的模块已按 App 端重新收敛，不复制参考项目中的小程序授权、营销注册分支和 Redux 用户状态机。

已落地边界：

- `services/auth/auth.api.ts`：封装短信发送、手机号验证码登录、查询用户、校验 `ECO_TOKEN` 和退出登录。
- `services/auth/login.rules.ts`：集中构造 App 短信登录请求和 RN 安全的 `registerRecord`；只保留来源页、`APP` 系统码和旧接口要求的空字段信封，不调用小程序设备/启动参数 API。
- `services/auth/auth.service.ts`：负责手机号/验证码校验、登录请求组装、用户缓存、用户展示名和脱敏手机号。
- `pages/login/index`：实现短信登录表单、验证码发送、60 秒重发倒计时、6 位验证码校验、协议勾选和协议入口。
- `shared/native/AppFormScrollView.tsx`：封装 RN 表单滚动容器的键盘点击语义，登录页输入后首次点击按钮仍会进入业务 handler；页面禁止直接使用 RN `keyboardShouldPersistTaps` 属性。
- `pages/mine/index`：实现用户摘要、登录、账号设置、地址簿、寄件、订单、待支付、客服中心、客户中心、签收码和 E 卡入口。
- 显式登录入口统一调用 `shared/navigation/authGuard.navigateToLogin`；通用导航不再把合法登录 URL 改写回“我的”，RN boundary 仍禁止业务页手工生成登录 URL，以保留回跳、去重和提示语义。
- `shared/webview/appWeb.ts` 与 `pages/web/index`：实现协议、客服、投诉、理赔等 H5 能力的统一路由生成、来源映射、HTTPS 白名单和 RN WebView 承接；客服入口已覆盖首页、我的页和订单详情页。
- `pages/privacy/settings`：实现隐私政策、个人信息清单、合作方清单、权限调用清单等入口，并支持同步、确认和撤销隐私条款。

关键约束：

- 登录接口沿用旧项目真实契约：`account`、`verifyCode`、`loginType`、`sysCode`、`registerRecord`。页面和 service 不再混发 `mobile`、`smsCode`、`code` 等非登录接口字段；`registerRecord` 只记录安全来源页和 App 系统码，其他小程序营销/设备字段保持空值。
- App 端首期只承接手机号短信登录；微信/支付宝小程序静默登录、绑定授权、实名核验和营销活动状态机不迁入页面主流程。
- 协议首期做前端强校验和 Web 承接入口；隐私版本查询、首页轻提示、保存确认和撤销确认都由 `privacyService` 收口。
- 我的页只消费 `authService` 和路由入口，不直接读 cookie 或请求层事件。
- WebView 默认只允许 `https` 和 `APP_RUNTIME_CONFIG.webAllowedHosts` 中的域名；H5 客服 URL、Web baseURL 和白名单都通过 runtime/env 管理。

本轮补齐登录态守卫边界：

- `request/deppon.ts` 继续只负责 OWS 响应归一、cookie 和事件，不直接做页面跳转。
- `request/deppon.ts` 已恢复旧项目 `login` 语义：只有 `login !== false` 的请求在 `401 + 901` 时触发 `authExpired`。
- `shared/navigation/authGuard.ts` 统一判断 `ECO_TOKEN`、生成登录 URL、避免重复跳登录。
- 订单列表、地址簿列表/编辑、首页订单入口、寄件/查价地址簿入口和我的页快捷入口已接入 `ensureAuthenticated`。
- `pages/mine` 在无 `ECO_TOKEN` 时不再请求 `queryUserInfo`，只展示未登录态。
- `authExpired` 事件触发后会清理会话并跳转登录页，登录页自身不会重复跳转。
- Taro RN 4.2 的 `request` 实现只把原生 `fetch` 的 `Headers` 放到 `response.header`，不提供 `cookies`，而 RN `fetch` 又不能可靠向 JS 暴露 `Set-Cookie`。现保留 header/cookies 解析作为兼容路径，同时以 `@preeternal/react-native-cookie-manager` 封装 `shared/native/AppSessionCookie`：请求统一使用 `credentials: include`，登录响应读不到 header 时从系统 cookie jar 取得 `ECO_TOKEN`，再写入异步 storage、原生网络 cookie store 和 WebKit cookie store。Android 原生网络写 CookieJar 为异步动作，成功包体后的恢复最多重试 5 次、每次间隔 40ms，仍未取得 token 才拒绝登录。
- 登录业务规则覆盖显式登录 URL 不被改写、短信/登录 payload、`registerRecord` 来源页归一、无 Cookie 拒绝假登录、原生 cookie jar fallback、公开登录接口 `login=false`、启动 hydrate 和多种兼容响应形态。
- 登录入口验收会 mock “我的”当前页并实际执行 `navigateToLogin`，断言发出的目标是带安全回跳参数的注册登录路由；RN App 未配置 Taro `tabBar`，四个主入口使用自定义 `AppTabBar` 且都位于同一根 Stack，因此不能套用小程序 `switchTab` 或嵌套 `tabNav` 结论。
- 参考项目只能证明 `MOBILE_VERIFICATION_CODE` 及小程序 `WECHAT_MINI/ALIPAY_MINI` 系统码，不能证明原生 App 的系统码。当前 `APP_SYSTEM_CODE=APP` 继续由 runtime config 管理，不伪装成小程序渠道；最终值仍需以 App 后端联调配置为准。
- 登录回跳参数只在仍是 `%2Fpages%2F...` 的兼容形态下解码一次，已由 RN 路由解码的嵌套 query 不再二次展开。
- 发码和登录页面对未被请求层归一的异常提供显式重试提示，避免网络或运行时异常发生后只恢复按钮、用户侧没有反馈。
- `shared/navigation/navigationRuntime.ts` 统一观察 RN 路由 Promise；只有非空当前 pathname 与目标一致才确认成功，页面栈短暂为空会继续等待，最终未命中才显示失败提示。
- Taro RN Router 的 Promise 在 dispatch 后立即 resolve，并不等待页面挂载。关键登录导航因此只允许 dispatch 一次，再等待页面实例出现；确认超时只提示失败并释放 in-flight，不再发第二次 `redirectTo` 覆盖仍在进行的首次 replace。普通业务跳转继续保留原同步调用形态，避免扩大改动面。
- 登录守卫使用 in-flight Promise 代替固定 800ms 时间锁，并发鉴权只发起一次跳转且在导航成功或失败后释放；提示 toast 不可用时不阻断登录页导航。登录页异步请求返回和 finally 写状态前检查 mounted 状态，用户已离开时不再 setState 或强制回跳。
- 登录页只有在 `ECO_TOKEN` 与用户缓存均落盘、且目标路由确认打开后才提示“登录成功”。会话已经建立但回跳失败时，按钮切换为“返回原页面”，后续点击只重试导航，不会再次提交手机号和验证码。
- “我的”显式登录使用 `navigateTo` 打开登录页，登录成功后才 `replace` 回安全目标，避免入口 replace 与页面挂载竞态；寄件/批量寄首次登录前通过 cache facade 短时标记匿名草稿，建立账号 owner 时只保留这些草稿，其他私有缓存与账号切换仍严格清理。
- 2026-07-16 的再次实机反馈确认旧静态假设不足：仅兼容 `Headers` 仍会出现“登录凭证保存失败”。本轮已加入原生 cookie manager，因此必须重新安装依赖并重建 Android/iOS 原生包；运行时继续验证发码、协议、`status/result`、原生与 storage 中的 `ECO_TOKEN`、用户缓存、原目标回跳和杀进程后的会话恢复。
- 项目内回 App 模式已再次核对：App 内登录使用 push 进入、成功后 route replace 返回；支付结果和注销成功使用 App route；寄件成功页按业务完成页保留普通跳转；只有受控 H5 数据回传使用 `postMessage -> 一次性 bridge -> navigateBack -> useDidShow consume`。登录不新增 URL scheme、H5 私有回跳或小程序页面栈逻辑。
- `pages/web` 现在对 `auth=Y` 做页面级动态守卫：未登录时不渲染 WebView，保存完整当前 Web App 路由并进入统一登录页；登录成功后 replace 回原 Web 服务。公开协议等 `auth=N` 目标不受影响，非法或未登记 URL 仍先按白名单 fail-closed。
- RN boundary 已锁定键盘点击容器、原生 Cookie 恢复入口、`credentials: include`、认证 WebView 动态判断和统一登录守卫；叠加模板元数据规则后当前业务规则为 190/190。

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

隐私设置已从旧项目 `pages/common/protocol/list` 中拆出 App 可用能力，不迁小程序分享、Redux 多账号回退和复杂首页弹窗状态机。

已落地边界：

- `services/privacy/privacy.api.ts`：封装隐私版本查询、保存确认和撤销确认接口。
- `services/privacy/privacy.service.ts`：归一最新版本、已同意版本、是否已确认最新版本、状态文案和首页提示 VM；同一版本在单次 App 运行内不会重复弹出。
- `pages/privacy/settings`：提供协议清单入口、版本状态卡片、同步状态、同意最新条款和撤销同意条款。
- `pages/home/index`：已登录账号进入首页时轻量检查隐私版本；若未确认最新版本，仅提示前往隐私设置阅读和确认，不在首页替用户保存同意。
- `shared/webview/appWeb.ts`：补充隐私政策、个人信息清单、电子运单服务协议、合作方清单、权限调用清单和免赔协议的 WebView 来源映射。
- `pages/mine` 和统一路由已接入 `APP_ROUTES.privacySettings`，入口受登录守卫保护。

关键约束：

- 撤销同意条款成功后清理 App 会话并返回我的页，不复用旧项目 Redux 登出和小程序多账号回退分支。
- WebView 仍走 HTTPS 白名单和来源映射，不在页面直接拼接 H5 域名。
- 首页隐私提示只在已登录且未确认最新版本时出现；接口失败或未登录时不打扰首页使用。
- 首页只负责弹窗和跳转，版本判断、弹出文案和单次运行去重都保留在 `privacyService`。

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
- `contact.addressIntegrity.ts`：归一地址校验请求，并把后端响应拆为 `pass/review/unavailable/blocked`，避免页面各自猜测 `status/message`。

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
- `pages/contact/list` 在 `select` 模式写入选择桥前调用地址完整性校验；后端提示地址不完整时允许用户选择“修改地址”或“继续使用”，确认修改会携带当前联系人进入编辑页。
- `pages/contact/edit` 在新增或更新联系人前复用同一校验；选择继续修改会保留表单，选择仍然保存才调用保存接口。网络校验失败只提示并继续，`authExpired` 会中止当前动作并交给统一登录失效流程。
- `pages/contact/hooks/useContactAddressIntegrity.ts` 统一承接请求锁、弹窗语义和失败降级，列表与编辑页不直接解析 OWS 响应，也不能重复提交校验。
- `pages/express` 在 `useDidShow` 中消费选择结果，先把 `Contact.telephone` 映射成寄件草稿的 `mobile`，再调用 `setExpressContact` 触发报价/取件依赖清理。

保留这个桥接的约束：选择桥只传递选择结果，不直接改寄件草稿；报价、取件、网点清理等业务副作用统一留在 `services/express`。

按定位推荐联系人仍依赖 `shared/platform/location`；当前 `location` capability 为 `pending`，因此本轮不调用旧小程序 `Taro.getLocation`，待 App 原生定位 facade ready 后再接入。

## Express 首期切片

寄件模块已开始按 RN App 端重新建模，首期不照搬参考项目 `send/express` 的巨石页面和 Redux 状态机，而是拆成“页面草稿 + 领域 service + API 薄封装”：

- `services/express/types.ts`：定义 `ExpressDraft`、`ExpressContact`、`ExpressGoods`、产品报价、取件时间、下单请求/响应等首期契约。
- `services/express/express.api.ts`：只封装 OWS 端点，包含价格时效、取件时间、货物品名/标签、保价、筛单、下单拦截、创建订单、订单详情、取消订单。
- `services/express/express.draft.ts`：拆出 draft 默认值、联系人映射、地址展示和下单/查价基础校验；草稿变更规则由独立 mutation 模块承接。
- `services/express/express.mutations.ts`：集中处理货物/服务/取件方式变更、优惠券归一、报价失效、产品选择、取件时间映射和收寄地址依赖清理，页面只保留状态更新编排。
- `services/express/couponOrder.rules.ts`：按当前报价恢复优惠券查询所需的原始 `FRT/BF/AD/NMBZ` 费用；优惠券减免只加回 `couponRankType` 对应费用，线路限时优惠只加回运费，并生成绑定产品、地址、手机号和 App OMS 渠道的稳定请求与竞态 key。
- `services/coupon/expressCoupon.api.ts` 与 `expressCoupon.service.ts`：接入 `/queryCouponOrder`，将 `available/unAvailable` 分别归一为可选与只读券卡 VM；API 或映射运行时异常统一返回可重试失败，个人券列表、兑换码领取和寄件上下文可用券查询保持独立接口职责。
- `pages/express/hooks/useExpressCoupons.ts` 与 `ExpressCouponCard.tsx`：报价选中产品后以 300ms debounce 自动查询适用券，旧响应按请求 key 丢弃；自动 timer、手动刷新和卸载共享清理边界，异常按 mounted/key 收敛为 error，不会留下旧列表或 loading。页面支持可用/不可用券、详情、手输券码、选择、清除和登录后恢复草稿。任一券码变化都清空页面旧报价并要求重新计价，不复制旧 Redux Picker 或自动推荐状态机。
- `services/express/express.payload.ts`：拆出价格时效、取件时间、保价试算、筛单和创建订单 payload 组装，页面不直接拼 OWS 字段。
- `services/express/express.service.ts`：保留货物品名、报价、取件时间、保价、筛单、下单拦截、创建订单、订单详情和取消订单等 API 编排。
- `services/express/draftBridge.ts`：提供一次性跨页草稿桥，当前用于价格时效查询结果带入寄件页，不引入 Redux 巨石状态。
- `pages/express/index`：升级为 RN App 表单壳，包含收寄地址、货物信息、付款/送货方式、取件时间、产品价格、备注、协议和提交入口。
- `pages/express/components/ExpressContactPanel.tsx`、`ExpressGoodsSection.tsx`、`ExpressServiceSection.tsx` 和 `ExpressQuoteSection.tsx`：拆出收寄地址、货物信息、服务方式和产品价格面板，页面继续负责草稿状态、报价失效、登录守卫和提交编排，避免寄件页继续膨胀。
- `pages/express/index`：货物名称支持按输入关键词查询后端品名推荐，点击候选只回填标准品名；分类信息仅作为辅助展示，不写入下单字段。
- `services/express/insurance.product.ts`、`insurance.rules.ts` 与 `insurance.view.ts`：独立承接产品必保/免费保障/全额保/省心保权限、货物标签能力、动态上限、金额校验、报价/下单字段和页面 VM，不把保价状态并回货物或 Redux 巨石。
- `services/customer/customer.service.ts`：归一 `customerLabel.insuredPriceCap` 为客户保价额度；客户编码二维码只有与当前账号客户一致时才继承该额度，避免扫码上下文跨客户复用权限。
- `services/express/productAvailability.service.ts`：有货物名称时始终在 `Promise.allSettled` 中查询货物标签，不再只为 DCZP 推荐查询；结果同时生成当前地址/品名指纹绑定的保价能力。
- `pages/express/hooks/useExpressInsurance.ts` 与 `ExpressInsuranceCard.tsx`：提供基础保/全额保/省心保选择、易碎保自动归一、动态额度、免费保障、费用试算和请求版本隔离；旧单金额输入已从货物卡移除。
- `services/express/insuranceRules.ts`：新增保价规则 VM，将基础保、全额保、省心保的收费和理赔说明结构化为 App 页面可消费的数据，不复用旧项目保价编辑 Redux 状态机。
- `pages/express/insurance/index`：新增 App 原生保价说明页，寄件页保价金额旁提供规则入口；页面只展示规则说明，不承担保价金额提交或费用试算。
- `services/express/monthlyPay.ts`：新增月结付款提示 VM，只消费客户中心读结果并输出页面提示/引导，不复用旧项目付款弹窗、合同状态机和优惠联动。
- `pages/express/index`：选择月结时同步当前账号客户中心状态；已绑定时展示客户编码并引导月结中心，未绑定或未登录时引导受控客户绑定 WebView，提交结果仍以后端月结/合同权限校验为准。
- `services/express/collection.rules.ts`：将代收货款收敛为独立 `ExpressCollectionDraft`，统一返款类型、金额、审核账户、额度、协议、手续费和报价/下单字段映射；不复用旧项目 Redux 代收状态。
- `services/customer/customer.service.ts`：通过 `customerLabel` 能力归一当前客户代收额度、保价额度和合同标识，寄件页只消费稳定的 `CustomerCapability`，接口异常时保守使用默认额度并展示可刷新提示。
- `pages/express/hooks/useExpressCollection.ts` 与 `ExpressCollectionCard.tsx`：编排三日退/即日退、金额、账户、协议和额度刷新；关闭服务时统一清理代收草稿并使旧报价失效。
- `shared/webview/appWebMessage.ts`：为代收账户页提供来源受限、事件受限的一次性内存消息桥；H5 只能以 `EXPRESS_COLLECTION_ACCOUNT/COLLECTION_CHANGE` 回传已审核账户，业务代码不使用同步缓存或直接访问 RN Native API。
- `services/express/deliveryPreference.rules.ts`：将派送偏好收敛为独立草稿，统一常规派送、定时派送、等寄件人通知和等收件人通知四种互斥状态，负责日期窗口、能力请求、报价字段、下单扩展字段和校验规则。
- `services/express/express.api.ts` 与 `express.service.ts`：接入定时派送范围查询；只有当前产品提供预计到达时间、收件地址完整且后端明确返回支持时，页面才会启用定时派送；`DCZP/TKDR` 按参考端已知规则保守排除。
- `pages/express/hooks/useExpressDeliveryPreference.ts` 与 `ExpressDeliveryPreferenceCard.tsx`：承接派送范围查询、预计到达后 7 天日期、六个派送时段和未来 30 天不可收货日期；能力结果带地址、货物、产品和送货方式指纹，输入变化或异步旧响应不能重新写入失效的定时派送状态。
- `services/express/pickupTime.rules.ts` 与 `pickupTime.options.ts`：拆出夜间揽收能力缓存、草稿兼容、北京时间截单、费用确认、时段响应归一和日期/时段 VM；普通、夜间和不可用时段按日期合并排序，重复“一小时上门”优先保留夜间时段。
- `services/express/express.api.ts` 与 `express.service.ts`：先通过 `matchFeatureAoi` 查询寄件地址是否支持夜间揽收，再将 `nightOpening/nightStartTime/nightEndTime` 传给 `dispatchTimeByDeptCode`；地址能力在草稿缓存中保留 2 小时，失败时仍可降级查询普通取件时段。
- `pages/express/hooks/useExpressPickupTime.ts` 与 `ExpressPickupTimeCard.tsx`：提供 RN 日期/时段选择、刷新保留有效选择、旧请求输入指纹隔离和夜间费用确认；页面主文件只消费控制器，不保存取件状态机。
- `services/express/warehouse.rules.ts`、`warehouse.payload.ts`、`warehouse.service.ts`：将送货进仓筛单、预约暂存、报价字段、订单扩展字段和 H5 URI 编排收敛为独立领域边界；筛单结果缺失或 type 非 0-4 时 fail-closed。
- `pages/express/hooks/useExpressWarehouse.ts` 与 `ExpressWarehouseCard.tsx`：承接 type 0-4、100kg 精准进仓一次自动开启、用户确认/拒绝、自提与派送互斥、staging 等待和报价失效；type 2/3/4 未得到当前证明上的明确确认时不能提交。
- `shared/webview/appWebMessage.ts`：`SEND_WAREHOUSE` 必须匹配当前 WebView URL 的 `warehouseId/stagingId`、输入指纹和一次性 expectation；附件限制为 HTTPS、无凭据、最多 9 个，并在账号切换/登出时清空桥状态。
- `services/express/packaging.catalog.ts`、`packaging.rules.ts` 与 `packaging.payload.ts`：独立承接 9 种普通纸箱、4 种木包装和 2 种拆包装目录、非法 code 归一、报价体积下限、报价失效及报价/下单差异映射，不把旧小程序包装 Redux 状态并回货物模型。
- `pages/express/components/ExpressPackagingCard.tsx`：使用参考端真实纸箱/木包装目录和价格提供 RN 纸箱单选、木包装多选与拆包装多选；“无需包装”清理三类服务，组件作为寄件页顶层分区，不嵌套在货物卡中。
- `services/express/draftStorage.ts`、`draftBridge.ts` 与 `template.bridge.ts`：旧缓存缺少包装或包含非法 code 时恢复为空；查价、优惠券和品名选择往返保留当前包装，再寄、批量、扫码、派送范围、快递员和模板带入不隐式继承实际包材，所有桥均深拷贝包装对象。
- `services/express/productAvailability.rules.ts`：将 `passProductCode` 从 OMS 产品码中拆出，按普通寄件、快递员二维码、客户编码二维码、司机二维码和营业部二维码归一为产品融合角色；当前 RN 没有旧端运单号、特快、铁路等输入，不虚构 `NEWEXP/TZKJC/DZLY` 分支。
- `services/express/productAvailability.service.ts`：登录态先通过客户能力 service 获取客户编码、月结、合同与保价额度，客户编码二维码优先使用扫码值且只有与账号客户一致时才继承权限；随后以 `Promise.allSettled` 独立查询 DCZP 点城市、产品融合、产品升级和货物标签，单个可选接口失败不会拖垮主报价。
- `services/express/express.api.ts`：接入 `queryPointCityByProduct`、`queryNewProductPointCity` 和 `queryPointCityByAddress`；融合接口只有明确 `false` 才切到 `OLD`，升级接口只有明确 `NEW` 才按合同客户/散客切到 `CONTRACT/UNIVERSAL`，其他结果保持 `EXP`。
- `express.payload.ts` 与 `pages/express/hooks/useExpressQuote.ts`：报价请求发送产品角色、客户权限、`isOffSiteTransfer=N` 和升级角色需要的 `collectMode/deliveryMode`；同时按保价类型发送 `fullCoverage/sxb/isFragileArticles`，把客户动态额度和标签能力应用到草稿后再选择产品；报价列表原顺序不变。
- `services/query/query.station.ts` 与 `stationSelection.ts`：地址网点查询在 `PICKUP + EXPRESS` 下使用 `expressPickup`，选择模式只保留 `source=Address`、`pickupSelf=true`、距离 `0..20km`、非空 `deptNo` 和名称的服务点；`StationItem.id/code` 分别固定映射 `deptNo/deptCode`。
- `services/express/deliveryPoint.rules.ts`：将收件自提服务点独立为 `{ code, name }` 草稿，`code` 只接受 `StationItem.id/deptNo`，不回退 `deptCode`；未指定网点表示由后端匹配最近服务点，收件地址变化、地址互换或退出 `PICKSELF` 统一清空。
- `pages/express/hooks/useExpressDeliveryPoint.ts`、`ExpressDeliveryPointField.tsx` 与 `pages/query/stations` 选择模式：通过 source 隔离的一次性内存桥往返具体服务点或 null 最近点；网点筛选、结果列表和选择提示分别拆入独立组件/SCSS，页面主文件只保留查询和导航编排。
- `express.payload.ts`：创建订单仅按有效自提草稿写 `receivingToPoint=deptNo` 与 `receivingToPointName`；异常网点、未指定网点和非自提方式均写空字段，不猜测编码。
- `services/express/valueAdded.ts`：将签收单返单拆成独立规则，承接 OMS/PPC 五类映射、R1-R8 归一、纸质/纯云签校验、1-99 张数、`DCZP` 云签限制和模板/旧缓存兼容，不迁旧项目委托书、图片上传和复杂营销状态机。
- `pages/express/components/ExpressReturnBillCard.tsx` 与 `hooks/useExpressReturnBill.ts`：服务方式中提供纸质返单要求、返单张数和电子云签入口；hook 负责类型更新、报价失效和一次性 WebView 回填，寄件主页面只保留控制器接线并维持 720 行冻结预算。
- `express.payload.ts`：报价和下单分别映射 PPC/OMS 返单类型；只有云签类型携带 `fileCode`，纸质返单张数大于 1 时才追加 `orderExtendFields[{ key: 'returnBillQty', value }]`。
- `shared/webview/appWebMessage.ts` 与 `pages/web/index.tsx`：电子云签使用受控 source、一次性 `messageContext` 和 `ONLINE_SIGN` 消息回填 `fileCode`；错误来源、上下文、额外字段、空值和重复消费均拒绝，离开页面会取消 expectation。
- `services/template`：模板 schema 不保存临时 `fileCode`，加载/保存仍保留返单类型与纸质要求，带入寄件页后云签类型必须重新签署。
- `pages/express/index`：隐私面单作为服务选项接入，首次开启时展示 App 内确认说明，确认结果写入本地缓存；创建订单时通过 `encryptInfo: 'Y' | 'N'` 传给后端。
- `pages/express/index` 已移除演示联系人“填入”能力，联系人来源只保留地址簿选择、新增后回填和查价草稿带入。
- `services/express/draftStorage.ts`：新增寄件草稿持久化，使用 2 小时 TTL 缓存收寄件、货物、服务、报价和备注；提交成功后清理。
- `pages/express/index`：草稿变化自动保存，页面初始化优先恢复草稿；未登录点击提交时先保存草稿，再跳登录页，登录后回到寄件页继续提交。
- `services/express.submitDraft`：下单前新增货物标签和筛单校验。`queryGoodsRemark` 返回 `displayType=forbid` 时阻断；`sieveOrder/tips` 返回 `type=2/3/4` 时必须完成当前证明上的明确确认，未确认时阻断并展示后端 `reason`，`type=1` 作为提醒类结果暂不阻断。

首期保留的业务规则：

- 发件人变化后清空取件时间、接货网点、已选产品价格。
- 收件人变化后清空已选产品价格。
- 收寄地址互换时清空取件时间、夜揽地址能力和派送偏好，避免详细地址变化复用旧范围结果。
- 下单前校验协议、收寄件完整度、手机号、地址差异、货物名称、重量、件数和产品价格。
- 下单前必须具备 `ECO_TOKEN`，未登录不会直接打安全接口，避免 401 后丢失当前寄件表单。
- 隐私面单不影响报价，开启/关闭不会清空已选产品；最终是否成功生效仍以后端下单校验为准。
- 月结付款在 RN 首期只做客户编码可见提示和客户绑定引导，不在前端硬编码合同客户、统一结算、折扣价和代收货款权限。
- `passProductCode` 表示产品融合/升级角色，不是 `selectedProduct.omsProductCode`；普通寄件默认 `EXP`，融合明确关闭时回到空角色，司机和营业部二维码使用 `DRIVER_QR_CODE`。
- 客户编码二维码覆盖账号客户编码，但不会凭扫码值直接伪造月结或合同权限；账号能力与扫码编码不一致时按散客能力报价，最终权限仍以后端校验为准。
- DCZP 推荐只由本次报价的点城市与货物标签结果共同派生，不持久化 `battery` 或产品开关字段；点城市、融合、升级、标签任一失败均按各自默认语义降级。
- 代收货款只有在正金额、不超过客户额度、已选择审核账户并确认协议时才允许下单；`NORMAL/INTRADAY` 在报价中分别映射为 `R3/R1`，报价与下单始终提交真实账户、户名和金额。
- 代收账户管理继续由受控 H5 承接，但账户结果只允许通过来源隔离的一次性消息桥进入寄件草稿，页面和 WebView 不共享同步 storage。
- 定时派送会在报价中区分普通 `appointmentDelivery=Y` 和夜间 `nightDelivery=Y`，下单时分别写入 `isAppointmentDeliver` 或 `nightDelivery` 扩展字段，并提交结构化 `appointmentDeliveryTime` 时间窗。
- 等寄件人通知在报价和下单中使用 `notifyIsDeliver=N`；等收件人通知使用 `waitReceiveNotifyDeliver` 与逗号分隔的 `waitReceiveNotifyNotDeliverTime`，不把两套通知语义混写。
- 派送偏好与自提互斥；收件地址变化或收寄地址互换会清空全部派送偏好，货物变化会清空依赖重量/体积校验的定时派送，任何派送偏好变化都要求重新报价。
- 收件自提服务点只接受地址匹配接口中 0..20km、明确支持 `pickupSelf` 且带 `deptNo` 的结果；20km 边界包含，负距离、空距离和仅有 `deptCode` 的异常项 fail-closed。
- 用户可不指定具体自提点，此时草稿和下单字段保持空，由后端按地址匹配最近点；指定点变化、收件地址变化、地址互换或退出 `PICKSELF` 都会使旧报价失效并清除旧选择。
- 定时派送的后端支持结果必须与当前地址、货物、产品、预计到达时间和送货方式指纹一致；提交前指纹不一致会阻断并要求重新校验，异步旧响应不能回写新草稿。
- 夜间揽收只在 `matchFeatureAoi` 明确返回支持并给出起止时间时进入取件时段请求；能力缓存 2 小时，寄件地址变化立即清理，货物变化清理已选时段但可复用仍有效的地址能力。
- 夜间时段必须由用户显式选择并确认 50 元/票费用提示；北京时间 18:00 后不允许预约次日 06:00 前的夜间时段。报价提交 `nightAccept=Y/N`，下单扩展提交 `nightAccept=Y/N`，夜间额外提交 `nightAcceptStatus=-1`。
- 送货进仓筛单 type 2/3/4 统一要求用户明确确认；互斥清理只清服务字段，不伪造“无需进仓”决定。精准进仓 100kg 自动开启仅发生一次，后续拒绝会保留明确拒绝证明。
- 送货进仓暂存通过 `/gwapi/queryService/eco/query/staging/secure/setStaging`，返回的 `stagingId` 必须与 WebView 当前 URL 的 `warehouseId` 一致后才消费 `SEND_WAREHOUSE`。
- 普通纸箱为可选单选服务；报价体积使用 `max(货物真实体积, 纸箱体积下限)`，但不回写草稿，下单 `receive[0].totalVolume` 始终保留货物真实体积。
- 选择纸箱时，报价和创建订单顶层都只发送 `packageInfoList: [{ type: 'COUNT', data: '1', packageCode }]`；未选择时字段完全省略，包装变化会清除已选产品和页面旧报价并要求重新计价。
- 木包装支持 `WOOD_03/WOOD_04/WOOD_01/WOOD_02` 多选，并可与一个普通纸箱并存；草稿只保存稳定业务 code，归一时按目录顺序去重并丢弃未知值。
- 木包装报价不混入纸箱 `packageInfoList`，而是通过顶层 `packageLtlType='WOOD_PACKAGE'` 表达；未选木包装时按参考契约发送空字符串。纸箱仍独立影响报价体积下限。
- 创建订单才把木架、木箱、木托 1 号、木托 2 号分别映射为 `VOLUME/SJ`、`VOLUME/BG`、`COUNT/SP`、`COUNT/NSP`，并在 `receive[0].packing` 发送去重后的 `木架,木箱,木托` 文案。
- 拆包装支持 `UNPACKING_01` 拆木包装和 `UNPACKING_02` 拆非木包装独立复选，可与纸箱、木包装并存；草稿保存 canonical `unpackingCodes`，不复制旧页面 `active/count` 状态，当前选择精确映射为数量 1、未选为 0。
- 报价始终发送顶层 `unpackingWoodPackagingNumber/unpackingNonWoodPackagingNumber`，并按木包装/拆包装组合发送空值、`WOOD_PACKAGE`、`UN_PACKAGE` 或 `WOOD_PACKAGE,UN_PACKAGE`；拆包装不进入纸箱或木包装 `packageInfoList`。
- 创建订单始终发送顶层 `unpackageLtlInfo` 两个数值字段；统一报价 VM 将后端 `CBF` 费用稳定展示为“包装服务-拆包装”，目录中的 20/10 元只作为选择信息，最终费用仍以后端报价为准。
- `draftStorage`、寄件 draft bridge 和模板 stage/consume 均通过包装归一器深拷贝 `woodenCodes/unpackingCodes`；只选择木包装或拆包装也属于有意义草稿。外部再寄、批量识别、扫码、派送范围、专属快递员和模板带入仍按既有策略清空包装。
- `ExpressPackagingCard` 保留纸箱单选，同时增加木包装和拆包装复选区；木包装静态目录价只作为选项信息，实际费用明确以快递员核实为准。
- “一小时内”等快速取件时段下单使用展示时段作为 `beginAcceptTime`，并提交 `currentFirstTime=Y`；刷新取件时间时优先保留后端仍返回的当前选择，不自动把仅有的收费夜间时段设为默认值。
- 返单纸质首期只承接 R1-R8、备注和 1-99 张数；代打回单文件、返单图片 OCR/上传、委托书及其他返单附件仍后置，不用 RN UI 伪造。
- 电子云签只承接受控 WebView 的合同签署回传，不在业务页直接调用 WebView/RN Native API；云签凭证不进入模板或长期缓存。
- 送货进仓预约、工序字段、附件回传和 type 2/3/4 二次确认已形成 RN App 切片；复杂仓库收费计算、更多工序矩阵和后端未提供的营销分支仍不在首期范围内。
- 保价类型已原生化：普通/全额保/省心保互斥，`fragile_articles` 自动映射易碎保，`worry_free_protection` 仅推荐省心保，`limitation_insure` 禁止保价；普通额度使用 `insuredPriceCap` 或 1000000 元默认值，必保产品上限 9990000 元，省心保上限 500 元。
- 保价试算按 `QEB/SXB/YSB` 调用固定保障接口；主报价发送 `fullCoverage/sxb/isFragileArticles`，创建订单发送 `bjlx=0/1/3/4`，`NFLF/NLRF` 未填金额时提交 2000 元与 `insuranceSource=DEFAULT`。
- 提交前重新查询货物标签并对比当前能力证明；标签变化、地址/品名/扫码上下文变化或旧草稿缺少证明时要求重新报价，不能用过期能力下单。
- 可用优惠券查询只在已有当前产品报价、收寄地址和发件手机号完整且已登录时执行；请求精确发送 `freight/productCode/arriveProvinceName/channel/mobile/sendAnAddress/receivesAnAddress/couponFeeList`。当前付款模型没有 E 卡，因此不伪造可选 `paymentType`。
- 选择、手输或清除优惠券继续统一写入 `draft.couponNumber`，价格时效请求通过既有 `promotionsCode + customerMobile` 校验真实优惠；优惠券查询结果本身不替代重新报价和下单后端校验。
- 页面只处理交互反馈，接口状态归一、cookie 会话和登录失效仍由 `request/deppon.ts` 管理。

首期接入端点：

| 能力 | 端点 |
| --- | --- |
| 价格时效 | `/gwapi/pricetimeService/eco/pricetime/queryPriceTime` |
| DCZP 产品点城市 | `/gwapi/pricetimeService/eco/pricetime/queryPointCityByProduct` |
| 产品融合开关 | `/gwapi/pricetimeService/eco/pricetime/queryNewProductPointCity` |
| 产品升级开关 | `/gwapi/pricetimeService/eco/pricetime/queryPointCityByAddress` |
| 收件自提服务点 | `/gwapi/queryService/eco/query/branch/stationSearch`（`matchtypes: ['expressPickup']`） |
| 夜间揽收范围 | `/gwapi/queryService/eco/query/range/matchFeatureAoi` |
| 取件时间（含夜揽切片） | `/gwapi/orderService/eco/order/dispatchTime/dispatchTimeByDeptCode` |
| 货物品名 | `/gwapi/onlineService/eco/online/cargo/queryCargoInfo` |
| 货物标签 | `/gwapi/orderService/eco/order/queryGoodsRemark` |
| 保价费用 | `/gwapi/pricetimeService/eco/fixedProtection/queryFixedProtection` |
| 客户代收/保价额度 | `/gwapi/userService/eco/user/secure/customerLabel` |
| 寄件可用优惠券 | `/gwapi/couponService/eco/coupon/new/secure/queryCouponOrder` |
| 定时派送范围 | `/gwapi/onlineService/eco/online/print/order/secure/canOrderCityDelivery` |
| 下单筛单 | `/gwapi/orderService/eco/order/sieveOrder/tips` |
| 送货进仓信息暂存 | `/gwapi/queryService/eco/query/staging/secure/setStaging` |
| 是否可下单 | `/gwapi/orderService/eco/order/secure/queryIsCanCreateOrder` |
| 创建订单 | `/gwapi/orderService/eco/order/mysql/createOrder` |
| 订单详情 | `/gwapi/orderService/eco/order/secure/orderDetail` |
| 取消订单 | `/gwapi/orderService/eco/order/secure/revokeOrder` |

后置能力：

- 特快、当日达、铁路、雪具、工业大件等当前 RN 没有入口契约的特殊产品矩阵。
- 优惠券自动最优推荐、复杂营销互斥、月结/合同客户完整结算规则、支付分、E 卡和真实支付。
- 智能包装推荐、防水包装、雪具、3C 原厂包装、通电验机和保价标签增强；这些能力具有不同字段或端能力，不与纸箱、木包装或拆包装切片混用。
- 批量寄件、模板寄件、再次下单、扫码角色初始化。

App 端渠道码已从小程序环境分支中解耦到 runtime：

```ts
APP_RUNTIME_CONFIG.env
APP_RUNTIME_CONFIG.appClientChannel
APP_RUNTIME_CONFIG.omsChannel
```

当前非生产默认值用于本地和测试联调；真实生产后端域名、H5 入口、WebView 白名单、系统码和渠道码必须通过环境变量提供。`scripts/check-runtime-config.mjs` 已接入 `verify`，会阻止 `runtime.ts` 硬编码 token，并在 `APP_ENV=production` 时校验关键变量、https URL、WebView host 白名单和固定 token 参数。

## Query Price 首期切片

价格时效查询已经从首页 Web 占位改成 RN 原生页面，首期不照搬参考项目 `pages/query/price` 的语音识别、定位、城市选择器、营销弹窗和多层 Redux 状态，而是复用现有寄件报价领域能力：

- `pages/query/price/index`：支持手填寄/收省市区、乡镇和详细地址，也支持从地址簿选择后回填。
- `pages/query/price/components/QueryPriceProductCard.tsx`：承接可选产品卡片展示，复用统一报价 VM 展示价格、时效、计费重量和费用明细，页面主文件只保留查询流程和寄件跳转。
- `services/express.validateExpressPriceTimeDraft`：新增轻量价格查询校验，只校验收寄地址、重量、件数和地址差异，不要求姓名、手机号和电子运单协议。
- `services/express.quotePriceTime`：复用 PPC 价格时效端点和 `buildFreightRequest`，但与下单 `quote` 的联系人校验解耦。
- `services/express/express.quoteView.ts`：沉淀报价结果展示 VM，统一价格文案、时效兜底、计费重量和费用明细行；价格时效页和寄件报价组件不再各自判断 PPC 字段。
- `services/express/draftBridge.ts`：价格结果点击“去寄件”时携带当前 draft 和已选产品，寄件页 `useDidShow` 消费后立即清理。
- `services/contact/selection.ts`：选择来源扩展为 `EXPRESS | QUERY_PRICE`，保证地址簿文案和回填意图可追踪。
- `pages/home/home.data.ts`：`查价格` 入口改为 `APP_ROUTES.priceQuery`，不再落入空 Web 承接页。

首期保留规则：

- 查询页可以没有联系人姓名和手机号，因为价格时效只依赖地址、重量、件数、服务方式和产品约束。
- 地址、货物或送货方式变化后清空已查询产品，并提示重新查询。
- 页面只消费报价展示 VM，不直接散落后端 PPC 字段。
- 从查价页带入寄件页时不自动勾选电子运单协议；寄件页仍按下单校验要求用户完善姓名、手机号和协议。

后置能力：

- 城市选择器、定位填充、地址智能解析、语音/图片识别。
- 产品推荐、取件时间联动、特殊货物提醒、计费规则 H5。
- 将查价草稿持久化到本地缓存，支持 App 被系统回收后的恢复。

## Query Dispatch 首期切片

收派范围查询已经从旧项目 `pages/query/dispatch` 的小程序定位、城市选择器、授权弹窗和分享逻辑中拆出，首期改成 RN 可用的手填/粘贴地址查询：

- `services/query/query.api.ts`：封装快递收派范围、零担收派范围、地址乡镇匹配和网点查询接口。
- `services/query/query.dispatch.ts`：复用地址智能解析补齐省市区编码，将快递/零担后端响应归一为 `DispatchRangeResult`，并集中处理收派范围提示和可寄判断。
- `services/query/query.station.ts`：负责地址/区县网点查询、网点详情归一、电话提取、详情路由和反馈 H5 参数。
- `services/query/query.service.ts`：只保留查询域兼容门面，页面继续通过同一 `queryService` API 调用，避免业务页面感知内部拆分。
- `pages/query/dispatch/index`：支持快递/零担切换、完整地址粘贴识别、省市区/详细地址手填、收派范围查询、命中乡镇高亮和可寄件提示。
- `pages/query/stations/index`：支持网点类型、快递/零担业务类型、完整地址识别、省市区/详细地址手填、网点列表、电话拨打、地图导航降级提示、网点反馈 H5 和空结果“去寄件”兜底入口。
- `pages/query/stations/detail/index`：新增 App 原生网点详情页，通过列表传入的网点编码重新查询详情，展示地址、电话、业务范围、营业时间和坐标占位；导航继续走 `shared/platform/map.openMapLocation`，反馈继续走 `STATION_FEEDBACK` 受控 WebView。
- `shared/webview/appWeb.ts`：新增 `STATION_FEEDBACK` 来源，网点反馈统一走 RN WebView 白名单承接。
- 首页快捷入口和客服中心自助查询已接入 `APP_ROUTES.dispatchQuery`、`APP_ROUTES.stationQuery`、`APP_ROUTES.goodsQuery`。

首期保留规则：

- 页面不直接调用 `Taro.getLocation`、`Taro.chooseLocation`、`Taro.openLocation` 或小程序授权能力；导航统一走 `shared/platform/map.openMapLocation`，当前按原生能力矩阵降级。
- 地址编码失败时要求用户粘贴更完整的省市区地址，不引入旧项目城市选择器状态机。
- 收派范围“去寄件”会通过 `expressDraftBridge.carryFromDispatchQuery` 带入查询地址作为收件地址，联系人姓名和手机号仍为空，进入寄件页后需要用户补全并重新获取价格。
- 网点查询空结果“去寄件”只带 `source=QUERY_STATION_EMPTY` 跳转寄件页，不携带网点地址或查询地址，避免把服务网点地址误写成用户收寄地址。
- 网点反馈保留旧问卷的 `scene=P0101/P0102` 和 `rowData` 语义，但由 `queryService.createStationFeedbackWebUri` 统一生成；不迁旧小程序拖动反馈浮层、分享按钮、定位授权和埋点状态机。

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
- 扫码入口走 `shared/platform/scan.scanAppCode`，当前因原生扫码能力未接入而统一降级提示；原生接入后会先分类运单、云打印码和暂不支持的业务二维码。

关键约束：

- 首页搜索不新增独立查件 API，不绕过 `services/order`；订单详情仍是运单详情和轨迹的唯一页面 VM。
- 首页搜索进入订单详情时走公开轨迹模式，只调用非 secure 的 `/gwapi/trackService/eco/track/queryNewTrack`，不要求登录，也不展示寄收件隐私信息。
- App 端扫码后续应在 `shared/platform/scan` 内接入 native bridge，页面只消费统一分类后的扫码结果。
- 旧项目的小程序扫码、订阅、支付入口、营销追踪和 H5 轨迹页外跳不进入首期。

## Batch Express 首期切片

批量寄从旧项目 `pages/batch` 和 `utils/batch.ts` 中先抽取 App 可安全承接的入口和校验规则，不复制旧小程序批量寄页面、Redux 状态机、Excel 弹层、批量识别列表和打印流程。

已落地边界：

- `services/batch/types.ts`、`batch.draft.ts`：定义批量寄联系人、逐票货物/增值服务、公共付款/取件配置、扫码上下文、逐票报价、入口动作 VM 和校验结果；默认值集中在 draft factory，不复制旧 Redux state。
- `services/batch/batch.payload.ts`：将批量草稿映射为一次 `/gwapi/orderService/eco/order/mysql/createOrder` 请求，显式设置 `batch: true`，将多个收货人放入同一个 `receive[]`，并去重地址簿 ID、映射取件和扫码上下文。
- `services/batch/batch.quote.service.ts`：按收货人并行调用现有价格接口，归一每票默认产品和费用；货物、发货人或取件设置变化会清空旧报价。
- `services/batch/batch.service.ts`：沉淀批量寄入口 VM、官网 Excel 批量寄 URL、批量地址文本识别、收货人数量上限、联系人/手机号、收寄地址一致、货物指标、运单号和港澳台互寄校验；`submitDraft` 只做一次下单拦截检查和一次批量创建请求，并归一全部/部分失败结果。
- `services/batch/batch.storage.ts`：通过 `src/cache` facade 持久化批量草稿，登录回跳或页面重建不会丢失收货清单，成功提交后清理。
- `pages/batch/index` 及同页 components：提供发货人地址簿选择、批量文本识别、多收货人逐票货物编辑、逐票价格展示、取件/联系设置和提交反馈；Excel 批量寄复制官网地址，单票入口继续复用寄件页。
- 首页快捷入口新增“批量寄”，通过路由注册表 `batchExpress` 进入。
- `check-business-rules` 新增批量寄入口、校验规则、多个 `receive[]` payload 和单次提交编排用例，防止后续把旧项目规则散回页面或循环调用单票接口。

首期保留规则：

- 批量请求、逐票计价和 service 编排已经接入页面；后端对 `batch: true` 的筛单、实名/协议和逐票错误回传仍需联调确认，页面会阻止未获取产品价格的草稿提交。
- 批量提交必须保持“一次请求包含多个 `receive[]`”，禁止循环调用单票创建接口，避免部分成功且无法回滚；后端逐票错误通过 `orderErrorInfo` 的展示模型另行承接。
- 批量识别首期只支持本地文本格式识别和首条带入单票寄件，后续应复用地址解析 service，并把多收货人列表建成独立 VM，不搬旧 Redux。
- Excel 文件导入依赖 App 文件选择、上传和模板解析能力，首期只提供官网电脑端兜底入口。
- 批量打印依赖 App 原生打印 facade，不直接迁小程序蓝牙打印和云打印二维码逻辑。

## Print 查询切片

面单打印从旧项目 `pages/print`、`pages/common/print` 和 `api/order.ts` 中抽取入口、只读列表契约和打印前置规则，不复制小程序蓝牙 API、GBK 指令、设备缓存和模板写入流程。当前先完成待打印/已打印查询；真实打印仍需要独立原生能力切片。

已落地边界：

- `shared/platform/capabilities.ts`：新增 `print` 原生能力，当前状态为 `pending`。
- `services/print/print.api.ts`：只封装 `queryNewOrderPrintList`，请求精确发送 `pageNum/pageSize/startTime/endTime/searchType`，安全接口继续由统一 OWS 会话处理。
- `services/print/print.mapper.ts`：归一后端空值、分页字段、收件手机号脱敏和省市区详细地址；页面不直接兼容原始响应。
- `services/print/print.rules.ts`：定义今天、近 3 天、近一周、近一个月、近三个月的本地日历范围，默认近 3 天；同时承接分页去重和双 tab 计数部分失败归一。
- `services/print/print.service.ts`：编排列表查询和待打印/已打印计数。两个计数使用 `Promise.allSettled` 独立降级，一个失败时另一个仍展示真实数量；打印前置选择规则继续保留给后续原生打印切片。
- `pages/print/index`：打印中心的“打印订单”已改为可用 App 路由；打印机管理、打印设置和云打印码仍按原生能力状态明确降级。
- `pages/print/list`：新增登录保护的只读列表，支持待打印/已打印 tab、数量、五档日期范围、刷新重试、错误/空态和分页加载；卡片只展示运单、脱敏收件人和地址，不提供勾选、全选或打印动作。
- 我的页新增“面单打印”入口，通过 `printCenter` 路由进入。
- `check-business-rules` 覆盖查询日期、请求契约、映射脱敏、分页去重、双计数部分失败、打印中心入口和打印前置规则；当前全量为 195 条。
- RN boundary 锁定打印列表只能调用 `printService`，禁止页面混入 `printApi`、模板下发、配置、状态回写或选择打印逻辑。

当前保留规则：

- 当前只请求待打印/已打印列表；不请求打印模板、打印配置，不回写打印状态，不执行真实打印，也不调用小程序蓝牙 API。
- 后续真实打印必须先落 `shared/platform/print` 或 `shared/native/print`，只在 facade 内封装蓝牙扫描、连接、模板写入和平台差异。
- 打印状态回写必须跟真实打印成功链路绑定，不能在页面里提前伪造成功。
- 云打印码已经在 `shared/platform/scan` 中识别为 `printCode` 并分流到面单打印中心；打印中心只展示待接入提示，真实云打印下单仍需后续单独建模，不混入普通寄件扫码。

## Courier 首期切片

专属快递员模块从旧项目 `pages/postman/index`、`pages/postman/detail` 和 `api/postman.ts` 中抽取 App 可用主流程，不迁小程序分享、企业微信二维码、实时位置和旧评价弹层。

已落地边界：

- `services/courier/courier.api.ts`：封装已关注列表、快递员详情、关注和取消关注接口。
- `courier.mapper.ts`：归一快递员工号、评分、服务次数和评价标签，页面不直接兼容后端空值与旧字段。
- `courier.rules.ts`：把“找他寄件”的工号转换为 `pickupManId` 寄件上下文。
- `pages/courier/list`：展示已关注快递员，支持刷新、拨号、详情、指定快递员寄件和受控扫码关注入口。
- `pages/courier/detail`：展示评分、服务数据、标签和所属网点，支持关注状态管理、拨号、网点详情和指定快递员寄件。
- `pages/mine` 与统一路由已接入专属快递员入口，列表和详情受登录守卫保护。
- 扫码统一走 `shared/platform/scan`，电话统一走 `shared/platform/phone`，所属营业部复用 `queryService` 和网点详情页。

首期接入端点：

| 能力 | 端点 |
| --- | --- |
| 已关注快递员 | `/gwapi/onlineService/eco/online/courier/secure/courierList` |
| 快递员详情 | `/gwapi/onlineService/eco/online/courier/secure/queryDetail` |
| 关注快递员 | `/gwapi/onlineService/eco/online/courier/secure/binding` |
| 取消关注 | `/gwapi/onlineService/eco/online/courier/secure/unBinding` |

后置能力：

- App 分享名片、企业微信沟通二维码和快递员邀请链路。
- 快递员实时位置和营业部地图导航，统一等待 map/location facade 接入。
- 关联运单评价查询和提交已由订单域独立评价页承接；快递员页后续只补评价后的详情/关注衔接，不复制旧详情页状态机。

## Template 首期切片

寄件模板从旧项目 `pages/sendService/template` 和 `api/send.ts` 中抽取稳定业务语义，不复制模板详情巨石页、Redux 状态回写和同步小程序缓存。

已落地边界：

- `services/template/template.api.ts`：封装模板查询、保存和删除接口，统一按登录态 secure 请求处理。
- `template.mapper.ts`：在后端模板结构与 `ExpressDraft` 之间双向映射，归一空联系人、产品、支付、返单、保价和取件时间字段。
- `template.service.ts`：统一处理 5 个新增模板上限、名称 5 字校验、列表排序、元数据修改、设置默认、删除和寄件草稿桥接；修改现有模板不查询数量，也不受新增上限影响。
- `pages/express/template/list`：支持刷新、编辑名称/默认状态、设置/取消默认、删除、使用模板，并在达到上限时只阻止继续新建。
- `pages/express/template/create`：从寄件页当前草稿保存模板；暂存只经过内存 bridge 或 `expressDraftStorage` facade，不直接调用任何 Storage API。
- `pages/express/index`：新增模板列表和保存入口；模板带入后清空历史报价、产品选择和协议勾选，必须重新报价。
- 路由注册表新增 `expressTemplateList` 和 `expressTemplateCreate`，两页均受登录守卫保护。
- `check-business-rules` 覆盖模板读取映射、保存 payload/校验、元数据 payload 保留完整模板正文、唯一默认状态、修改失败恢复和 `TEMPLATE` bridge 清报价规则。
- `TemplateMetaEditor.scss` 已登记到严格样式基线；当前 208 个业务 SCSS 全量使用 token/Flex，存量债务为 0。

首期接入端点：

| 能力 | 端点 |
| --- | --- |
| 查询模板 | `/gwapi/orderService/eco/orderTemplate/secure/queryOrderTemplate` |
| 保存/修改模板 | `/gwapi/orderService/eco/orderTemplate/secure/addModifyOrderTemplate` |
| 删除模板 | `/gwapi/orderService/eco/orderTemplate/secure/deleteOrderTemplate` |

后置能力：

- 收寄件人、货物、取件、付款、产品、保价和返单的完整模板详情编辑。
- 默认模板自动推荐只在寄件领域明确消费时接入，不恢复旧 Redux 初始化副作用。

## Order 首期切片

订单模块已开始按 App 主链路重构，首期承接“列表 -> 详情 -> 轨迹”的读链路，并在详情页补充单号复制、未支付费用提示、催单、通知派送、拦截作废、收件方式 H5、联系营业部、原生服务评价、动态场景问卷和售后快捷动作；真实支付、订阅、完整售后状态机和地图不从旧项目直接迁入。

已落地边界：

- `services/order/types.ts`：定义寄件/收件列表原始响应、列表 VM、订单详情 VM、运单详情原始响应和轨迹响应。
- `services/order/order.api.ts`：封装寄件订单列表、收件订单列表、订单详情、运单详情、轨迹列表、取消订单和删除订单端点。
- `services/order/order.display.ts`：沉淀订单展示格式化能力，包含空值展示、金额、尺寸、手机号脱敏、加密判断和地址拼接。
- `services/order/order.mapper.ts`：拆出寄件/收件列表归一、运单详情字段归一和再来一单/一键回寄草稿转换，不继续膨胀主 service。
- `services/order/order.detailRules.ts`：拆出订单详情状态、角色、运单号、受控 H5 URL 和通用取值规则，供动作 VM 和 service 复用。
- `services/order/order.detailActions.ts`：拆出订单详情售后动作 VM，统一生成在线客服、催单、通知派送、拦截作废、收件方式、联系营业部、评价、投诉、在线理赔、去开票和修改运单入口。
- `services/order/order.detailUseCases.ts`：拆出催单按钮/话术/提交、通知派送、拦截作废和营业部电话兜底等详情动作 API 编排。
- `services/order/order.stubView.ts`：拆出电子存根入口、复制单号、寄收地址、身份文案、货物/费用/订单分区、尺寸明细和后置能力提示 VM，不继续堆进主 service。
- `services/order/order.stubFiles.ts`：拆出电子存根包装费用明细、电子合同状态、合同预览路由和单据票证 VM。
- `services/order/order.stubImages.ts`：拆出取货、复磅、签收、返单、增值服务和木包装等照片凭证查询与图片分组归一。
- `services/order/order.service.ts`：统一最近一个月默认查询范围、订单接口编排、轨迹查询、取消订单、终态订单删除和删除权限判断。
- `services/order/order.subscription.ts`：归一关注运单列表并编排关注状态查询、关注和取消；详情页动态动作由纯 VM 生成。
- `services/order/order.edit.ts`：把安全订单详情归一为编辑草稿，统一校验收寄件、货物、代收、保价和改单上门服务，并合并各领域实际变化的 `/modifyOrder` 请求；页面进入前统一校验 `modifyFlag`、发件人身份、待揽件状态和产品修改权限。
- `services/order/order.edit.collection.ts`：独立承接改单代收货款类型、金额、额度、账户、协议、详情字段兼容和四字段 diff；关闭服务固定发送 `NORMAL/0/空户名/空账户`，未变化时完全不发送代收字段。
- `services/order/order.edit.insurance.ts`：独立承接普通基础保价的详情归一、产品必保/赠送保障策略、特殊 `bjlx` 锁定、金额校验和 `insuredAmount + insuranceSource` 成组差异。
- `services/order/order.edit.packaging.ts`：独立承接改单打包动作件数，从详情扩展字段 `packingService` 恢复 `0..999` 的 canonical 数量，统一 2 元/件参考费用、整数校验和字符串扩展字段 diff；它不表示纸箱、木包装或其他具体包材类型。
- `services/order/order.edit.schedule.ts`、`schedule.options.ts`、`schedule.selection.ts`：独立承接上门时段输入指纹、夜揽能力、普通/夜间/不可用时段归一、送货方式显示规则、选择校验和 `/modifyOrder` 差异；不复用详情快捷预约的 `source=4` 或 `/orderDispatchFlag`。
- `services/order/order.edit.schedule.service.ts` 与 `schedule.api.ts`：先查询地址夜揽能力，再以 `source=0` 查询改单时段；旧异步响应由页面 hook 的请求指纹隔离，不会覆盖新地址或新重体积草稿。
- `services/order/order.edit.types.ts`：隔离改单专属 draft、扩展字段和请求类型，避免继续膨胀共享订单 DTO。
- `services/order/order.detailActions.ts`：新增催单、通知派送、拦截作废、收件方式 H5、联系营业部和 App 评价路由的动作 VM，页面不散落状态判断或 H5 参数。
- `services/order/order.detailUseCases.ts`：催单点击后查询后端话术和按钮；查看进度走受控 H5，提交催单走 `orderUrgent` 接口。
- `services/order/order.detailUseCases.ts`：通知派送统一调用 `modifyNotifyDeliver`；拦截作废统一调用 `invalidWaybill`，并把“货物已出发需去运单修改拦截”的后端文案归一为页面可消费的结果 VM。
- `services/order/order.detailUseCases.ts`：联系营业部优先使用详情电话，否则通过 `deptTelephone` 查询，最终兜底 95353。
- `pages/order/detail/hooks/useOrderDetailData.ts`：集中加载公开轨迹或安全订单详情，并行编排轨迹、待支付、催单入口和关注状态，统一派生页面状态与动作列表。
- `pages/order/detail/hooks/useOrderDetailActions.ts`：承接复制、删除、再寄、支付和通用动作分发；支付动作只生成统一收银台路由，电话和剪贴板等原生能力继续通过 platform facade 调用。
- `pages/order/detail/hooks/useOrderDetailServiceActions.ts`：承接催单、通知派送、拦截作废、营业部电话和预约上门等服务动作，页面不再保存这些流程状态机。
- `pages/order/detail/index.tsx`：只保留路由解析、控制 hook 组合和 JSX 渲染，已移除旧 900 行遗留体积预算，后续按普通页面预算治理。
- `services/payment`：封装待支付费用查询、详情页汇总、费用类型文案、费用明细 VM、待支付列表分页和 App 收银台编排，不复用旧项目小程序授权与收银台状态机。
- `services/payment/payment.checkout.ts`：集中处理支付明细选择与去重、金额校验、`payCreate -> payConfirm -> platform payment -> payCancel` 编排，以及微信、支付宝、H5 收银台确认结果归一。原生支付能力未就绪时会在 `payCreate` 前阻断，避免产生悬挂支付单。
- `pages/order/list`：支持我寄的/我收的切换、时间范围、状态、付款方式筛选、关键字搜索、分页加载和跳详情；寄件待揽件订单在后端允许修改时展示“取消订单”，并跳转取消原因页处理；已签收、已退回、已取消、已作废、已失效等终态订单展示“删除”，成功后从当前列表移除。
- `pages/order/list`：终态寄件订单支持“再来一单”，终态收件订单支持“一键回寄”；列表项会先读取订单详情，再生成寄件草稿，不从列表摘要字段拼凑下单数据。
- `pages/order/list/components/OrderListSections.tsx`：拆出列表页头、寄/收件 tab、搜索、时间/状态/付款筛选和汇总条等纯展示区块，页面主文件不再承载筛选 JSX。
- `pages/order/list/components/OrderListCards.tsx`：拆出订单卡片、列表空态和 loading 展示；页面主文件保留登录守卫、查询、删除、取消和再来一单流程编排。
- `pages/order/detail`：按 `orderNumber` / `waybillNumber` 读取详情，展示状态、寄收信息、货物/付款/产品和轨迹列表。
- `pages/order/detail`：已拆分公开轨迹模式和安全详情模式。仅有运单号、无订单上下文时只查公开轨迹；带订单号、角色或 `view=secure` 时才要求登录并读取安全详情。
- `pages/order/detail`：安全详情模式下已接入取消订单动作。首期只在待揽件、有订单号且后端详情未显式禁止修改时展示“取消订单”，并跳转取消原因页处理。
- `pages/order/detail`：安全详情模式下已接入终态订单删除动作，成功后回到订单列表；公开轨迹模式不展示删除，避免未登录轨迹页操作安全订单。
- `pages/order/subscriptions`：展示已关注运单，支持刷新、进入安全详情和取消关注；订单列表提供统一入口。
- `pages/order/edit`：承接待揽件订单基础信息修改，支持收寄件、货物件重体积、打包服务件数、期望上门时间、夜间揽收、送货方式、基础保价、备注和代收货款；列表与详情只有在后端明确允许、当前用户是发件人且产品允许修改时才可进入。
- `pages/order/edit/hooks/useOrderEditCollection.ts` 与 `OrderEditCollectionSection.tsx`：编排客户绑定/额度查询、三日退/即日退、金额、账户、协议和关闭服务；返回账户时不会重新加载订单覆盖本地草稿。
- `pages/order/edit/components/OrderEditInsuranceSection.tsx`：提供基础保价金额编辑、清除、上限提示和保价规则入口；全额保、省心保及未知特殊 `bjlx` 订单只读锁定。
- `pages/order/edit/components/OrderEditPackagingSection.tsx`：提供打包服务开关、1..999 件输入和加减步进、2 元/件参考费用；关闭服务保留显式清零语义，页面不猜测包材 code 或包装类型。
- `pages/order/edit/hooks/useOrderEditSchedule.ts` 与 `OrderEditScheduleSection.tsx`：自动查询当前地址和货物输入对应的时段，提供日期/时段与三种送货方式选择；地址、件重体积或产品输入变化会取消旧响应并要求重新确认有效时段。
- `shared/webview/appWebMessage.ts`：寄件和改单账户页都必须先注册一次性 expectation，消息回填要求 WebView source 与 `messageContext` 同时匹配；改单 context 绑定订单号，旧页面或其他订单不能消费账户。
- `pages/order/detail/hooks/useOrderSubscription.ts`：独立管理关注状态查询、确认取消和状态切换，避免继续扩大详情页主流程。
- `services/order/order.pdcFeedback.api.ts`：独立封装签收反馈状态查询与提交端点；查询保持参考端 `loading=false/login=false/timeout=3000`，提交仍走登录会话且使用 3 秒超时。
- `services/order/order.pdcFeedback.ts`：将已签收状态、`PDC_KDYZJO/PDC_KDYZJT` 来源、`ONE/TWO` 频次和 `Y/N` payload 收敛为纯规则与 service，不把来源判断散回页面。
- `pages/order/detail/hooks/useOrderPdcFeedback.ts` 与 `OrderPdcFeedbackPanel.tsx`：安全详情加载后只查询一次当前来源运单；后端明确返回 `N` 才展示“是否已收到货物”底部面板，提交失败保留面板并允许重试。
- `services/order/order.evaluation.api.ts`、`order.evaluation.rules.ts` 与 `order.evaluation.catalog.ts`：独立承接订单评价详情查询、寄/收角色与签收状态映射、快递员身份 fail-closed、1-5 星标签目录、草稿校验和提交 payload；不把参考端评价弹层或 Redux 快递员状态并回订单详情。
- `pages/order/evaluation`：提供登录后原生服务评价页，支持星级、标签、最多 250 字建议、已评价只读状态和提交反馈；原生查询失败时才提供 `ORDER_DETAIL_EVALUATE` 受控 WebView 降级，fallback 使用 App 渠道 `channel=APP` 并保留 `S0505/S0907` 场景。
- `services/order/order.sceneSurvey.*` 与 `order.npsSurvey.*`：独立承接动态场景计划、SCORE/LABEL 首题、0-10 NPS 目录、状态查询、提交 payload 和部分失败编排，不与快递员服务评价或 PDC 收货反馈混用。
- `pages/order/detail/hooks/useOrderSceneSurvey.ts` 与 `OrderSceneSurveyPanel`：按当前详情上下文查询并顺序展示可填写问卷；旧请求由 generation 隔离，PDC 面板优先，关闭会清空整个队列。

关注运单端点：

| 能力 | 端点 |
| --- | --- |
| 已关注列表 | `/gwapi/waybillService/eco/wayBill/subscribe/list/records` |
| 查询关注状态 | `/gwapi/waybillService/eco/wayBill/subscribe/exist` |
| 关注运单 | `/gwapi/waybillService/eco/wayBill/subscribe/submit` |
| 取消关注 | `/gwapi/waybillService/eco/wayBill/subscribe/cancel` |
| 修改待揽件订单 | `/gwapi/orderService/eco/order/secure/modifyOrder` |
| 查询改单夜揽能力 | `/gwapi/queryService/eco/query/range/matchFeatureAoi` |
| 查询改单上门时段 | `/gwapi/orderService/eco/order/dispatchTime/dispatchTimeByDeptCode` |
| 查询签收 PDC 反馈状态 | `/gwapi/commentService/eco/comment/secure/queryFeedback` |
| 提交签收 PDC 反馈 | `/gwapi/commentService/eco/comment/secure/submitFeedback` |
| 查询订单服务评价 | `/gwapi/onlineService/eco/online/evaluate/secure/queryEvaluateDetail` |
| 提交快递员服务评价 | `/gwapi/onlineService/eco/online/courier/evaluation/secure/commit` |
| 查询场景评价状态 | `/gwapi/commentService/eco/comment/queryComment` |
| 查询场景评价配置 | `/gwapi/commentService/eco/comment/queryCommentScene` |
| 提交场景评价 | `/gwapi/commentService/eco/comment/insertComment` |
| 查询 NPS 状态 | `/gwapi/commentService/eco/comment/queryCustomerQuestionnaire` |
| 提交 NPS | `/gwapi/commentService/eco/comment/addCustomerQuestionnaire` |
- `pages/order/detail`：安全详情模式下已接入“再来一单/一键回寄”，由 `orderService.createExpressDraftFromOrderDetail` 将订单详情归一为新的寄件草稿，再通过 `expressDraftBridge` 带入寄件页；不会复用旧项目 Redux 重放状态。
- `pages/order/detail`：安全详情模式下会按运单号查询最近一个月未核销费用，展示待支付金额提示；点击“去支付”进入统一 App 收银台，由收银台重新校验当前待支付明细。
- `pages/order/detail/components/OrderDetailSections.tsx`：拆出头部、空态、轨迹、待支付提示、电子存根入口、运输信息和寄收信息等纯展示区块。
- `pages/order/detail/components/OrderDetailActionSections.tsx`：拆出售后动作、底部动作和催单弹层展示；页面主文件保留动作处理和状态编排。
- `pages/order/stub`：新增电子存根首期只读页，入口由订单详情的 `orderService.getStubEntry` 生成，页面通过 `orderService.queryDetail` 重新读取详情并消费 `OrderStubView`，展示寄收信息、货物明细、费用、订单编号和照片凭证分组。
- `services/order/order.stubView.ts`：统一处理存根标题、单号、寄收件信息、号码脱敏、基础费用字段、结构化分区和后置能力提示；页面不直接拼旧项目 `orderService/doc` 巨石字段。
- `services/order/order.stubView.ts`：新增货物补充 VM，解析 `goodsSize` 为尺寸详情，补充计费重量/计费方式；包装费查询由 `order.stubFiles.ts` 承接，接口失败不会影响存根正文展示。
- `pages/order/stub`：新增货物补充分区，展示尺寸详情和包装费用明细，不迁旧项目尺寸/包装底部弹窗状态机。
- `services/order/order.stubImages.ts`：新增照片凭证 VM，按运输中/已签收且有运单号的订单并发查询取货照片、复磅照片、送达照片、拍照签收照片、签回单、国补信息采集、拆包装、清点码货、贴码、家装完工、通电验机、双人派送、木包装、送新取旧和揽收拍照；单个图片接口失败不会影响存根正文展示。
- `services/order/order.stubImages.ts`：统一封装快递/零担增值服务图片 `imageScene` 映射，页面不需要知道 `queryWayBillImages`、`queryLtlWayBillImages` 或各业务 scene 常量。
- `pages/order/stub`：新增照片凭证分区，首期只展示远程缩略图和页面内大图预览，不调用小程序 `Taro.previewImage`、下载或保存相册能力。
- `services/order/order.stubFiles.ts`：新增单据票证 VM，抽取详情中的 `fileCode/returnFileId`，查询电子合同状态并生成完成态合同 WebView 预览入口；状态文案和预览 URL 都收敛在存根文件模块。
- `pages/order/stub`：新增单据票证分区，展示电子合同状态；合同完成时通过 `ORDER_STUB_CONTRACT_PREVIEW` 进入受控 RN WebView，不调用 `Taro.downloadFile` 或 `Taro.openDocument`。
- `pages/order/detail`：安全详情模式下已接入在线客服，统一走 `shared/webview/appWeb.ts` 的 `ORDER_DETAIL_SERVICE` 来源和 RN WebView 白名单，不在页面散落 H5 URL。
- `services/order/order.detailActions.ts`：新增订单详情售后动作 VM，统一生成在线客服、投诉、在线理赔、去开票和修改运单入口，页面只按 `OrderDetailActionView` 渲染，不直接拼 H5 URL 或散落状态判断。
- `pages/order/detail`：新增“售后服务”分区。催单在 App 内展示后端话术弹层，通知派送和拦截作废在 App 内二次确认后提交，联系营业部统一走 App 电话 facade，服务评价进入 App 原生评价页，收件方式、投诉、在线理赔和运输中修改运单继续由 RN WebView 承接；去开票优先进入 App 原生发票中心；公开轨迹模式不展示售后动作。
- `pages/order/cancel`：提供 App 原生取消原因选择和其他原因输入，提交时复用 `orderService.cancelOrder(orderNumber, reason)`，成功返回后列表/详情通过 `useDidShow` 刷新。
- `pages/payment/list`：提供独立待支付运单页，支持我寄的/我收的切换、运单号搜索、分页、金额汇总、基础/增值/减免/已支付费用明细和跳订单详情；“去支付”统一进入 App 收银台，入口已接入我的页和订单列表。
- `pages/payment/checkout`：根据运单号重新查询待支付费用，按明细号锁定付款项，展示金额与支付能力状态；支付能力未就绪时按钮不可提交，也不会请求后端创建支付单。
- `pages/payment/result`：承接支付成功后的金额、支付单号、渠道流水和运单回跳，不复用旧小程序页面栈、营销弹窗或支付后授权逻辑。
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
- 订单详情服务评价已原生化：先以 `FetchWaybillEvaluate` 对应契约查询可评价快递员和已评价状态，只有工号与姓名同时存在才开放表单；寄件运输中使用 `COLLECTION`，收件角色或已签收使用 `DELIVERY`。查询失败保留受控 H5 降级；动态 NPS/轨迹场景问卷已作为独立切片接入，不与服务评价或 PDC payload 混用。
- PDC 反馈只对 `orderClassification=2`、有运单号、非公开轨迹模式且来源包含 `PDC_KDYZJO` 或 `PDC_KDYZJT` 的详情生效；其他订单不会请求反馈接口，也不会展示通用弹层。
- `PDC_KDYZJO` 映射 `sendFrequency=ONE`，`PDC_KDYZJT` 映射 `TWO`；提交只发送 `waybillNo/sendFrequency/feedbackResult`，页面不附加埋点、小程序来源状态或猜测其他后端字段。
- 待揽件修改订单已使用 App 原生页和 `/modifyOrder`，基础字段、打包服务件数、代收货款、基础保价、期望上门时间与送货方式均只发送真实差异；启用/修改代收时四个字段成组提交，关闭时明确清空，额度、协议等本地状态变化不会误发后端字段。
- 打包服务只读取并写回 `orderExtendFields[{ key: 'packingService', value }]`：`0` 表示关闭，启用时限制为 `1..999` 的整数，清除必须显式发送字符串 `"0"`。2 元/件只用于页面参考费用，真实收费以后端改单结果和揽收确认结果为准。
- 待揽件改单基础保价仅允许普通可编辑保价变更；产品要求保价时金额不能为 0，普通产品上限为 1000000 元，参考端必保产品上限按 9990000 元处理。用户金额变化时成组发送 `insuredAmount` 和空 `insuranceSource`；`NFLF/NLRF` 详情金额为 0 时按参考契约补交 2000 元与 `insuranceSource=DEFAULT`，其余未变化不发送。
- 单改期望上门时间使用 `dispatchTimeByDeptCode` 的 `source=0`，与详情快捷预约使用的 `dispatchTimeNew source=4 + orderDispatchFlag` 严格隔离。时间变化提交 `beginAcceptTime`，有值时提交 `pickPeriodTime`；原 `ServicePoint` 订单额外提交 `channelType=VISITING_SERVICE`。
- 夜揽切换通过 `orderExtendFields` 提交 `nightAccept=Y/N` 与 `nightAcceptStatus=-1/空`，并与保价 `insuranceSource` 合并，不能互相覆盖；夜间时段要求当前地址的 2 小时能力证明、北京时间截单校验和 50 元/票费用确认。
- 送货方式只提供 `PICKNOTUPSTAIRS/PICKUPSTAIRS/PICKSELF`。`NZBRH/ZBTH` 重包隐藏；零担订单始终展示；普通快递仅在重量大于 60kg 或体积大于 0.36m³ 时展示，隐藏状态不伪造送货字段差异。
- 详情扩展字段 `bjlx=0/1` 分别表示全额保/省心保，或未知非空特殊类型时，改单页 fail-closed 为只读，不伪造普通基础保价能力；具体纸箱/木包装 code、产品/线路切换、付款方式、优惠券和图片上传仍是后置切片。
- 单改页权限按参考端稳定条件 fail-closed：必须 `modifyFlag=true`、`isSender=Y`、`orderClassification=0`，且 `productCodeFlag` 未明确禁止；仅靠前端路由角色不能获得修改权限。
- 运输中修改运单仅对非收件角色、有运单号且详情未显式禁止修改的订单展示，继续由受控 H5 承接，不与待揽件订单改单混用。
- 支付入口不直接跳旧小程序收银台，也不在列表或详情页创建支付单；只有收银台确认提交且原生支付能力可用时，才执行支付单创建、确认和 platform payment 调用。
- 支付单确认失败、渠道参数不完整、用户取消或原生支付未完成时，由 payment service 统一尝试 `payCancel`；页面不直接处理后端支付单状态。
- 微信、支付宝 App SDK 仍必须在 `shared/platform/payment` 或 `shared/native` 内接入；当前能力矩阵为 `pending`，因此收银台展示不可支付状态，但业务路由和后端契约已经收口。
- 待支付列表仅展示当前接口返回的可 App 在线支付费用；旧项目里 `isJdPay=Y` 的派送中/签收场景先过滤，避免在 App 内展示不可付账单。
- 支付费用类型沿用旧项目稳定语义：`CR` 展示为货款，`DVAR` 展示为保管费，其余类型展示为运费；该规则统一沉淀在 `services/payment`，页面不重复判断后端枚举。
- 支付费用明细只承接旧收银台可纯展示的字段归一：基础运费、增值费用、减免费用和已支付费用；拦截费合并到“转寄/拦截费”，不迁旧小程序收银台弹层、支付方式、分享付款和真实支付确认流程。
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
| 创建支付单 | `/gwapi/onlineService/eco/online/pay/pmc/secure/payCreate` |
| 确认支付单 | `/gwapi/onlineService/eco/online/pay/pmc/secure/payConfirm` |
| 取消支付单 | `/gwapi/onlineService/eco/online/pay/pmc/secure/payCancel` |
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
| 服务评价 | `APP_ROUTES.orderEvaluation` 原生页；失败时 `/depponmobile/survey/land` + RN WebView |
| 投诉 | `/depponmobile/complaint/apply/index` + RN WebView |
| 在线理赔 | `/depponmobile/h5/index#/claimPackagePages/index` + RN WebView |
| 尺寸/包装费用 | App 原生只读明细 |
| 电子合同预览 | `ORDER_STUB_CONTRACT_PREVIEW` + RN WebView |
| 修改运单 | `/depponmobile/mow/order/modifyNew/index` + RN WebView |
| 去开票 | `APP_ROUTES.invoiceCenter` |

后置能力：

- 合并支付、App 微信/支付宝真实支付和支付结果轮询。
- 关注/订阅消息、App Push 替代和站内信。
- 订单产品/线路与价格、付款方式、返单和具体包材类型修改，收件方式编辑原生化、派送偏好时间窗、拦截作废进度与退款状态、催单进度原生化、投诉/理赔详情状态机原生化和开票提交闭环。
- 轨迹地图、快递员实时位置、签收图片、二维码分享、营业部导航。

## Support 首期切片

客服中心首期从旧项目 `pages/center`、`pages/common/complaint`、`pages/common/compensate` 和首页客服入口中抽取 App 可用能力，不迁小程序分享、自动登录、营销跳转和售后状态机。

已落地边界：

- `services/support/support.api.ts`：封装配置中心 `graySwitch` 查询，当前用于体验调研配置。
- `services/support/support.service.ts`：归一客服中心分组、入口类型、登录要求、WebView 来源、热线号码、体验调研配置和 App 内路由，页面只消费 `SupportSectionView` / `SupportEntryView`。
- `pages/support/center`：提供在线客服、95353 热线、体验调研、投诉、投诉记录、在线理赔、理赔处理中、理赔已完成、收派范围、网点查询、价格时效和订单列表入口。
- `shared/webview/appWeb.ts`：除申请入口外，新增 `SUPPORT_COMPLAINT_RECORD`、`SUPPORT_CLAIM_PROCESSING`、`SUPPORT_CLAIM_COMPLETED` 三个受控来源，继续走 HTTPS 白名单和统一 WebView 页面。
- 投诉/理赔申请、记录和进度点击时先做登录守卫，再按当前 `ECO_TOKEN`、`systemCode` 生成 H5 URL，避免未登录回跳携带空 token。
- 热线拨打统一走 `shared/platform/phone.dialPhone`，不在页面直接调用小程序 `Taro.makePhoneCall`。
- 首页“客服中心”和我的页“客服中心”已接入 `APP_ROUTES.supportCenter`；订单详情在线客服继续保留独立上下文入口。

关键约束：

- 客服中心页面本身不强制登录，热线和自助查询可直接访问；投诉、理赔和订单列表等敏感入口按动作单独触发登录守卫。
- 体验调研入口由 `APP_SURVEY_CONFIG_KEY` 指向的配置中心 key 控制，默认 `app_survey_config`；配置缺失或网络失败时不展示入口，不影响客服中心基础能力。
- 投诉/理赔申请、记录和进度仍由 H5 承接，不复制旧页面的自动登录、分享和埋点状态机；普通路径与 hash route query 都通过统一 URL helper 追加认证上下文。
- 后续若原生化投诉或理赔详情状态机，应继续从 `services/support` 扩展 VM，不在首页/我的页散落 H5 URL。

首期承接入口：

| 能力 | 承接方式 |
| --- | --- |
| 在线客服 | `APP_RUNTIME_CONFIG.serviceWebURL` + RN WebView |
| 体验调研 | `APP_SURVEY_CONFIG_KEY` 配置 URL + RN WebView |
| 投诉 | `/depponmobile/complaint/list` + RN WebView |
| 投诉记录 | `/depponmobile/complaint/record` + RN WebView |
| 在线理赔 | `/depponmobile/h5/index#/claimPackagePages/index` + RN WebView |
| 理赔处理中 | `/depponmobile/h5/index#/claimPackagePages/list?tab=2` + RN WebView |
| 理赔已完成 | `/depponmobile/h5/index#/claimPackagePages/list?tab=3` + RN WebView |
| 95353 热线 | `shared/platform/phone.dialPhone` |
| 收派范围 / 网点 / 价格时效 / 订单列表 | App 内已有 RN 页面 |

后置能力：

- 原生 IM SDK、客服会话列表和未读消息。
- 投诉/理赔详情状态机、处理节点展示和证据材料上传原生化。
- App Push/站内信替代旧订阅消息。

## Customer 首期切片

客户中心首期从旧项目 `api/customer.ts`、`type/customer.ts` 和 `pages/center` 的客户入口中抽取读能力，不迁月结付款规则、客户编码绑定表单、合同客户状态机和小程序订阅消息。

已落地边界：

- `services/customer/customer.api.ts`：封装当前账号绑定客户信息查询接口。
- `services/customer/customer.service.ts`：归一客户编码、客户名称、主联系人、隐私面单、代收额度、月结付款和合同状态；`queryCustomerOverview` 并行查询客户资料与服务能力，单接口失败时保留另一部分结果，双接口失败才整体失败。
- `pages/customer/center`：展示客户绑定状态、客户资料和服务能力摘要，支持一次刷新两组数据及复制客户编码；未绑定时主入口直达 `CUSTOMER_BIND`，已绑定时进入 `CUSTOMER_CENTER` 管理，并提供月结中心、号码保护和客服中心入口。
- `pages/customer/center/CustomerCapabilitySection.tsx`：只消费归一后的额度、月结和合同文案，不读取 `teanLimit/exPayWay/ifExistContract` 原始字段，也不新增跨账号缓存。
- `shared/webview/appWeb.ts`：新增 `CUSTOMER_CENTER`、`CUSTOMER_BIND`、`CUSTOMER_MONTHLY_CENTER`、`CUSTOMER_PHONE_PROTECT` 来源，继续走统一 WebView 和 HTTPS 白名单。
- `pages/mine` 和统一路由已接入 `APP_ROUTES.customerCenter`，客户中心入口受登录守卫保护。

关键约束：

- 客户中心首期只读，不把月结/合同客户能力直接写进寄件下单的付款规则。
- 客户资料与能力接口相互独立降级：额度接口异常不清空已加载客户资料，客户资料接口异常也不伪造绑定状态；页面展示局部提示并允许刷新。
- 绑定、解绑、客户资料修改、代收账户管理和月结中心继续由受控 H5 承接；寄件页已原生化代收草稿、额度、报价和下单规则。
- 页面复制客户编码走 `shared/platform/clipboard.copyTextToClipboard`，不直接散落平台 API。

首期接入端点：

| 能力 | 端点 |
| --- | --- |
| 查询绑定客户信息 | `/gwapi/userService/eco/user/secure/selectCustName` |
| 查询客户代收额度 | `/gwapi/userService/eco/user/secure/customerLabel` |

首期承接 H5：

| 能力 | URL |
| --- | --- |
| 客户中心 | `/depponmobile/mow/customer` |
| 绑定客户编码 | `/depponmobile/mow/customer/bind` |
| 月结中心 | `/depponmobile/mow/customer/dshkCenter` |
| 号码保护 | `/depponmobile/h5/index#/partsPackagePages/customer/phoneProtect` |

后置能力：

- 客户编码绑定/解绑原生化。
- 月结客户、合同客户和统一结算用户规则深度接入寄件报价/下单链路。
- 客户资料变更、审核状态和银行卡/代收账户管理原生化。

## SignCode 首期切片

签收码首期从旧项目 `pages/user/sign/index`、`pages/user/sign/auth` 和 `api/user.ts` 中抽取 App 可用能力，不迁小程序分享和 `taro3-code` 小程序二维码生成；身份证实名核验已拆到 `pages/realname/center`。

已落地边界：

- `services/sign/sign.api.ts`：封装实名姓名是否存在、保存实名姓名和查询签收码三个接口。
- `services/sign/sign.service.ts`：归一实名状态、签收码、签收二维码 payload、签收人姓名、有效期文案和页面状态，页面只消费 `SignCodeView`。
- `pages/sign/code`：支持进入后自动校验实名状态；未登记实名时可填写 2-20 字符真实姓名并保存；已实名时可查询、刷新和复制签收码。
- `pages/sign/code/components/QRCodeMatrix`：使用 App 显式依赖 `qrcode` 生成 QR 矩阵，再用 Taro `View` 渲染；当前只有签收码页面消费，因此保持页面本地，不复用小程序 canvas/image 生成工具。
- `pages/sign/code`：首期展示二维码、可复制文本签收码和风险提示。
- `pages/mine` 和统一路由已接入 `APP_ROUTES.signCode`，签收码入口受登录守卫保护。

关键约束：

- 旧项目 `taro3-code/lib/weapp/utils/qrcode` 不进入 RN App；二维码展示由签收码页面本地组件和显式依赖 `qrcode` 承接。
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

- 亮屏、防截屏等签收展示体验。
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
- `services/coupon/coupon.service.ts`：归一券类型、金额/折扣、门槛、有效期、状态文案、标签和详情规则，`createCouponDetailView` 负责把旧详情里的适用产品、使用限制、换行说明和发/收货地地址分组转换为 RN 页面 VM，页面只消费 `CouponCardView` / `CouponDetailView`。
- `pages/coupon/list`：支持未使用、已使用、已过期三个 tab，支持兑换码领取，空态和错误态按 App 页面承接。
- `pages/coupon/list`：未使用券点击“去使用”会通过 `expressDraftBridge` 带入寄件草稿的 `couponNumber`，并要求寄件页重新获取价格。
- `pages/coupon/detail`：展示券码、适用产品、发货地、收货地、使用限制和使用说明，不迁条码组件、转赠分享和特殊营销跳转。
- `pages/express`：优惠券已拆为独立 RN 卡片；报价后以 300ms debounce 查询当前订单可用/不可用券，运行时异常可显式刷新重试，支持详情、选择、手动输入和清除。从个人券列表或详情带入的券码继续通过草稿桥恢复，任何变化都会清空已选产品并提示重新报价。
- `pages/mine` 和统一路由已接入 `APP_ROUTES.couponList` / `APP_ROUTES.couponDetail`，优惠券入口受登录守卫保护。

关键约束：

- 优惠券 service 只处理券展示、兑换和寄件上下文查询，不直接跳转页面、不修改寄件表单。
- 寄件页仍负责报价和下单校验；优惠券只是草稿字段，最终可用性由价格时效/下单接口确认。选择优惠券后，价格时效请求会携带 `promotionsCode` 和发件人手机号 `customerMobile`，该旧语义统一收口在 `services/express/express.payload.ts`。
- `queryCouponOrder` 的费用列表沿用参考端真实枚举 `FRT/BF/AD/NMBZ`。当前报价若已含优惠券或线路限时减免，会按 `couponRankType` 和 `YHJ/YHQ/XLYHF` 折扣明细恢复原始费用后再查询，避免用优惠后价格错误筛券。
- 参考端自动选择首张券、月结自动切现付、Redux `couponSource/couponRecommend` 和小程序 Picker 不迁；App 由用户明确选择，随后显式重新获取价格。
- 旧项目的购买记录、会员福利中心、转赠分享、订阅消息、特殊渠道跳转、券包购买和营销 banner 不进入 RN 首期。

首期接入端点：

| 能力 | 端点 |
| --- | --- |
| 个人优惠券列表 | `/gwapi/couponService/eco/coupon/new/secure/queryNewCouponList` |
| 兑换优惠券 | `/gwapi/couponService/eco/coupon/coupon/secure/exchangeCoupon` |
| 优惠券详情 | `/gwapi/couponService/eco/coupon/new/secure/queryCouponDetail` |
| 寄件上下文可用券 | `/gwapi/couponService/eco/coupon/new/secure/queryCouponOrder` |

## Member 首期切片

会员模块首期从旧项目 `pages/member/index`、`pages/memberService/svip` 和 `api/member.ts` 中抽取 App 可用读能力，不迁小程序 tab badge、分享、订阅消息、SVIP 购买支付和营销弹窗状态机。

已落地边界：

- `services/member/member.api.ts`：封装会员等级和 SVIP 最新信息两个读接口。
- `services/member/member.service.ts`：归一会员等级、成长值、积分、SVIP 状态和权益摘要；权益 VM 会区分 App 优惠券入口和 MAS 福利中心承接入口，并生成福利中心 WebView URL。
- `services/auth`：补充 `generateTmpToken`，会员福利中心打开前尽量沿用旧项目的临时 code 进入方式；获取失败时降级为游客福利中心 URL。
- `pages/member/index`：展示等级、成长值进度、积分、SVIP 摘要、权益服务和福利中心入口；优惠券权益跳 App 优惠券列表，积分中心和 SVIP 专属券跳受控福利中心 WebView。
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

发票模块首期从旧项目 `pages/invoice/index`、`pages/invoice/taxpayer`、`pages/invoice/apply`、`pages/invoice/preview` 和 `utils/invoice.ts` 中抽取 App 可用能力，普通运单电子票提交已按 RN service 分层接入，不迁旧页面里的支付、电子票下载、纸票邮寄地址修改和小程序扫码查询状态机。

已落地边界：

- `services/invoice/invoice.api.ts`：封装统一发票网关 `invoiceCommonService`，由业务 path 区分可开票运单、开票历史、抬头查询和抬头维护。
- `services/invoice/invoice.history.ts`：拆出开票历史状态、发票类型、时间、包含运单和电子票预览 VM 归一。
- `services/invoice/invoice.taxpayer.ts`：拆出抬头展示归一、抬头表单默认值、保存 payload 和抬头校验规则。
- `services/invoice/invoice.apply.ts`：拆出普通运单电子票申请预览、邮箱校验和提交 payload 组装。
- `services/invoice/invoice.shared.ts`：沉淀发票域通用文本、金额、长度和时间格式化工具。
- `services/invoice/invoice.apply.service.ts`：承接普通运单/储值卡申请提交、电子票预览、邮箱发送、历史包含运单查询、撤销/作废和收票地址修改。
- `services/invoice/invoice.center.service.ts`：承接可开票运单、储值卡和开票历史分页查询，统一日期范围、分页结果和后端列表归一。
- `services/invoice/invoice.taxpayer.service.ts`：承接抬头查询、联想、保存和删除；`invoice.service.ts` 只保留兼容 facade，不再集中保存多个业务域的请求编排。
- `services/invoice/order.mapper.ts`、`orderSearch.service.ts` 和 `invoice.orderAuth.ts`：拆出可开票运单映射、运单号搜索、手机号/短信身份校验、身份验证缓存和倒计时规则。
- `pages/invoice/index`：提供“可开票 / 储值卡 / 开票历史 / 发票抬头”四个 tab，支持可开票运单分页、按运单号搜索可开票记录、扫码填入运单号、手机号/短信身份校验、近一年开票历史分页、按运单号查询历史、储值卡多选和抬头列表查看。
- `pages/invoice/index/invoiceCenterViewModel.ts`：收敛 tab 参数、发票路由 URL、储值卡选择和金额汇总等纯视图规则，页面主文件当前约 745 行，冻结预算为 780 行。
- `pages/invoice/index/components/InvoiceCenterSections.tsx`：拆出页头、tab、搜索条、可开票列表、历史列表、抬头列表、空态和加载态展示；页面主文件保留请求、鉴权、身份校验和跳转编排。
- `pages/invoice/taxpayer/index`：支持抬头列表管理、新增、编辑、删除和默认抬头设置。
- `pages/invoice/taxpayer/edit`：支持个人/单位抬头表单、单位抬头联想补全、税号格式校验和保存。
- `pages/invoice/apply`：从单个可开票运单进入，支持电子普票/电子专票选择、抬头选择、接收邮箱、货物单位和备注，生成前端申请预览并调用 `addTaskInfoByEle` 提交普通运单电子票申请。
- `pages/invoice/detail`：从开票历史进入，展示发票详情、状态、金额、抬头、邮箱、备注，并通过 `queryContainWaybill` 查询发票包含的运单金额。
- `pages/invoice/preview`：从开票历史进入，按申请号调用 `lookInvoice` 查询电子票图片/PDF 链接，页面展示链接并通过平台 facade 尝试下载和文件打开；同页支持填写邮箱并调用 `sendEmail` 重新发送电子票。
- `pages/mine` 和统一路由已接入 `APP_ROUTES.invoiceCenter`，发票入口受登录守卫保护。

关键约束：

- 发票首期只承接普通运单电子票提交，提交 payload 由 `services/invoice` 统一组装，页面不直接拼发票网关字段。
- 可开票运单号搜索复用 `services/invoice` 的订单 VM；后端要求身份校验时在 RN 内弹层承接手机后四位、完整电话或短信验证码，不在页面直接解析发票网关字段。
- 发票中心扫码只复用 `shared/platform/scan` 分类后的运单号；云打印码、寄件业务二维码、短链和非德邦二维码不会进入发票查询。
- 新增发票能力需按 `rule.md` 的拆分建议放入 mapper/service/component，不把接口编排、字段映射和弹层 UI 继续堆进单个页面或主 service。
- 申请页登录回跳保留当前运单参数；抬头列表每次 `useDidShow` 刷新，便于从抬头管理返回后继续申请。
- 申请链路后续需要继续接入支付单、E 卡开票、纸票邮寄地址和电子票下载能力，不复用旧页面巨石状态机。
- 历史详情首期只读，不接入旧项目作废、撤销和纸票邮寄地址修改动作，避免在状态流和原生地址能力未完整确认前提交高风险变更。
- 电子票下载和文件打开统一走 `shared/platform/files`，当前按原生能力矩阵降级为“下载/文件预览能力待接入 App 原生模块”。
- 运单待支付金额仍由支付领域承接，发票页不直接创建支付单。
- 小程序 `Taro.chooseInvoiceTitle` 不进入 RN 首期；企业抬头联想使用后端 `queryCustomerTaxName`。

首期接入端点：

| 能力 | path |
| --- | --- |
| 可开票运单 | `tradeQueryByCustomerCode` |
| 按运单号搜索可开票记录 | `tradeQueryBySourceBillNo` |
| 运单付款人电话校验 | `checkSourcePaymentNumber` |
| 发送运单开票校验验证码 | `sendCheckCode` |
| 校验运单开票短信验证码 | `checkVerificationCode` |
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
| 普通运单电子票提交 | `addTaskInfoByEle` |

后置 path：

| 能力 | path |
| --- | --- |
| E 卡开票提交 | `addPrepayCardTask` |
| 纸票支付单查询 | `queryPayCode` |
| 电子票下载 | 待接 App 文件下载和系统预览原生模块 |

本轮已验证：

- `pnpm --filter com.deppon.app exec tsc --noEmit`
- `pnpm --filter com.deppon.app exec eslint "src/**/*.{ts,tsx}"`
- `pnpm --filter com.deppon.app run check:rn-boundaries`
- `pnpm --filter com.deppon.app run check:routes`
- `pnpm --filter com.deppon.app run check:module-size`
- `pnpm --filter com.deppon.app run check:runtime-config`
- `pnpm --filter com.deppon.app run check:business-rules`（186 条）
- `pnpm --filter com.deppon.app run lint:styles`
- `pnpm --filter com.deppon.app run check:styles`
- `pnpm --filter com.deppon.app run check:styles:strict`

验证边界：

- 自 2026-07-13 起，Codex 默认不主动执行 RN bundle、Android/iOS 打包、Gradle、Xcode 或发布包验证；打包由用户自行执行。
- Codex 日常回归使用类型检查、ESLint、Stylelint、业务规则、RN boundary、路由、模块体积、运行时配置和平台配置门禁。
- `verify`/`verify:static` 只做静态质量检查；`verify:bundle:android`、`verify:bundle:ios` 和原生包脚本保留给用户或 CI 的显式发布流程，不作为 Codex 默认执行入口。

RN build 仍会输出 Sass legacy API、stylelint CommonJS API、React Native CLI 缓存版本和 Node `DEP0190` 提醒，当前均不是阻塞错误。

原生编译环境记录：

- 已新增 `pnpm check:app-native-env` 检查原生编译前置条件。
- 当前机器 `JAVA_HOME=D:\Android\jdk-17`，`java`、Android SDK、`platforms/android-34`、`build-tools/34.0.0`、`platform-tools/adb.exe`、`cmdline-tools/latest/bin/sdkmanager.bat` 和 Gradle wrapper 均已通过 `check:native-env`。
- Android `gradle :app:assembleDebug --dry-run --console=plain --no-daemon` 已通过，Gradle 配置阶段能识别 Taro RN/Expo 原生模块和 Android 任务图。
- 完整 Android `assembleDebug` 在当前工具时限内未获得完成结果，后续仍需在本机或 CI 打包机执行完整 debug/release 构建。
- 当前系统是 Windows，iOS 构建需要 macOS/Xcode/CocoaPods 环境，因此本机只记录为跳过。
- iOS 构建仍需在 macOS/Xcode/CocoaPods 环境下验证。

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

- 首页：按 App 信息架构重建常用服务、寄件入口、查件入口、订单中心、会员入口。
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
  'pages/express/template/list/index',
  'pages/express/template/create/index',
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
  'pages/courier/list/index',
  'pages/courier/detail/index',
  'pages/order/list/index',
  'pages/order/detail/index',
  'pages/order/edit/index',
  'pages/order/subscriptions/index',
  'pages/order/cancel/index',
  'pages/order/stub/index',
  'pages/payment/list/index',
  'pages/print/index',
  'pages/print/list/index',
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
- 登录关键导航会等待非空目标路由确认，但始终只 dispatch 一次；确认失败会提示并释放守卫，不再以第二次 redirect 制造竞态。守卫按 in-flight Promise 去重，不使用固定时间窗或小程序 `switchTab`。
- 新增页面先登记 `shared/navigation/routeRegistry.ts`，再由注册表派生 Taro 页面列表、`APP_ROUTES`、主导航和登录守卫；页面内不要自行维护另一份路径白名单。

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
- `invoice`：E 卡开票、支付、作废和纸票寄送链路长。
- 客服售后全量：原生 IM、投诉/理赔详情状态机和材料上传。
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

- Codex 日常只执行 TypeScript、Lint、业务规则、路由、模块体积、样式治理和 RN 边界等静态门禁，不主动执行 RN bundle、Gradle、Xcode 或安装包验证；打包由用户执行并反馈问题。
- `pnpm dev:app` 能启动 Taro RN watch。
- `pnpm build:app` 能产出 RN bundle。
- `pnpm check:app-boundaries` 不允许 App 源码直接引用小程序专属 API。
- `pnpm check:app-routes` 不允许路由注册表和 Taro 页面列表、主导航、登录守卫脱节。
- `pnpm check:app-module-size` 不允许新增页面/service 无理由膨胀；自然复杂的页面可以保留页面级编排，但必须记录冻结预算和原因。
- Android/iOS 工程能按目标包名编译。
- 页面不依赖小程序专属运行时。
- 每个迁移模块都有清晰的 API、状态、页面、原生能力边界。
- 新增页面样式优先复用 `src/styles` token 和通用类，既有页面按业务切片逐步迁移。
