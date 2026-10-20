# 生产端页面承载方式(原生 Flutter vs H5)

用途：判断某个生产端页面值不值得做**像素级对齐**。生产端 `com.deppon.dpapp` 4.0.7.0 是 **Flutter + GetX** 应用(`libapp.so` / `flutter_assets` / 708 个自有 Dart 文件)，页面分两类：

- **Flutter 原生页**：页面本身由 Dart widget 渲染，值得按量测结果逐项对齐。
- **H5 页**：Flutter 侧只是壳（标题栏 + 分享），正文由 `webview_flutter` 平台视图承载；像素对齐没有意义，只对齐入口、标题、URL 白名单与回调。

## 判定方法

运行时判定（本次采用的权威口径）：

1. `adb shell uiautomator dump` 后，若正文区域出现 `android.webkit.WebView` 节点 → H5。
2. `adb shell dumpsys activity top` 中出现 `io.flutter.plugins.webviewflutter.WebViewProxyApi$WebViewPlatformView` → 当前页承载了 WebView。
3. 只有 Flutter 语义节点（`android.view.View` / `android.widget.ImageView` / `android.widget.Button`，无 WebView）→ Flutter 原生页。

静态参照：Dart 文件清单（[dpapp-file-inventory.txt](./dpapp-file-inventory.txt)）里，`package:dpapp/pages/system/webviews/*` 是通用 WebView 承载页（`common_web` / `ows_web` / `ows2_web` / `oss_web` / `mas_web` / `pmc_web` / `master_order_web`），业务页各自带独立 `view.dart` 的通常是 Flutter 原生页。

## 已判定结果

| 页面 | 生产端 Dart 页面 | 承载 | 证据 | 对齐策略 |
|---|---|---|---|---|
| 我的 | `pages/mine/*` | Flutter 原生 | `prod-mine1.xml` 无 WebView | 可逐项对齐 |
| 设置（齿轮） | `pages/system/settings` | Flutter 原生 | `prod-settings1.xml` 无 WebView | 已对齐（第九轮） |
| 个人设置（手机号） | `pages/account/account_info` | Flutter 原生 | `prod-profile-settings1.xml` 无 WebView | 已对齐（第九轮） |
| 账号注销 | `pages/account/account_cancel` + `account_cancel_confirm` | Flutter 原生 | `prod-cancel1.xml` 无 WebView；第二步页在 Dart 清单中存在 | 首屏已对齐文案；两步流程待补 |
| 地址簿列表 | `pages/contact/contact_list` | Flutter 原生 | `prod-addressbook1.xml` 无 WebView | 可逐项对齐 |
| 创建/编辑地址 | `pages/contact/contact_detail` | Flutter 原生 | `prod-address-edit1/2.xml` 无 WebView | 2026-10-19 已对齐主要字段 |
| 协议说明 / 法律条款与隐私政策 | `pages/system/webviews/*` | **H5** | `prod-agreement1.xml` 正文即 WebView；`dumpsys activity top` 见 `WebViewPlatformView` | 不做像素对齐 |
| 隐私设置（我的快捷行） | `pages/system/webviews/*` | **H5** | `prod-privacy2.xml` 出现 `android.webkit.WebView`，正文为客户编码 + 字段隐藏开关 | 不做像素对齐 |
| 偏好设置 | `pages/system/webviews/*` | **H5** | `prod-preference1.xml` 正文即 WebView（“您想要设置的是？”） | 不做像素对齐（RN 已按 H5 打开） |
| 客服中心 | `pages/system/webviews/*` | **H5** | `prod-support.xml` | 不做像素对齐（已知） |
| 积分乐园 | `pages/system/webviews/*` | **H5** | `prod-privacy1.xml`（误入）出现 WebView | 不做像素对齐 |
| 发票申请 | — | 跳微信小程序 | `prod-invoice.xml` 仅确认弹窗 | 平台性差异（已知） |

## H5 页面 URL 候选

从 `libapp.so` 字符串池提取到的德邦自有 H5 入口（未逐页确认与具体页面的对应关系，仅作入口对齐候选）：

```
https://www.deppon.com/depponmobile/mow/center/accountSet    // 账号/设置类
https://www.deppon.com/depponmobile/protocol/service        // 服务协议
https://www.deppon.com/depponmobile/protocol/record         // 已签署协议
https://www.deppon.com/help/privacy_policy.html             // 隐私政策
https://www.deppon.com/depponmobile/mow/index
https://www.deppon.com/depponmobile/mow/customer/bind
https://www.deppon.com/depponmobile/h5/index
https://www.deppon.com/depponmobile/survey/{land,evaluate,done,already}
https://www.deppon.com/depponmobile/pay/payTip
https://www.deppon.com/depponmobile/billingRules
https://www.deppon.com/depponmobile/contraband
https://mas.deppon.com/cms-h5/h5.html
https://im.deppon.com.cn/dzfront/web/vChat
```

## 对 RN 的结论

1. **只对 Flutter 原生页做像素对齐**：我的、设置、个人设置、账号注销、地址簿列表/编辑、寄件、订单等。
2. **H5 页不对齐 UI**：RN 侧只需保证入口存在、标题与生产端一致、URL 受控（`src/shared/webview/appWeb.ts` 白名单），不复制页面内容。
3. 发现 H5 页差异先确认承载方式，再决定是否投入；避免把 H5 页的边框、间距、按钮样式反推到 RN 原生页。

## 2026-10-19 补充：H5 页面 URL 的运行时实证方法

比在 `libapp.so` 里翻 URL 更可靠的办法：生产端 WebView 开了调试，可以直接读当前页地址。

1. `adb shell cat /proc/net/unix | grep devtools` → 拿到 `@webview_devtools_remote_<pid>`。
2. `adb forward tcp:9222 localabstract:webview_devtools_remote_<pid>`。
3. `curl http://127.0.0.1:9222/json/list` → 返回 `title` 与 `url`（含 `ecoToken` 等参数）。

实测抓到的入口地址：

| 入口 | 生产端实际 URL | 备注 |
|---|---|---|
| 我的 → 偏好设置 | `https://www.deppon.com/depponmobile/mow/center/accountSet?pageSource=APP&sonSource=CENTER_USER_SETTING&ecoToken=...` | 订单详情进入时 `sonSource=ORDER_DETAIL_USER_SETTING` |
| 我的 → 隐私设置 | `https://www.deppon.com/depponmobile/mow/customer/privateSetting?ecoToken=...` | 页面是「隐私面单」设置；H5 未设 document.title，导航栏显示「德邦快递」 |
| 我的 → 协议说明 / 设置 → 协议说明 | `https://www.deppon.com/depponmobile/protocol/record?ecoToken=...` | 页面标题「法律条款与隐私政策」，内容为 隐私政策 / 个人信息清单 / 电子运单服务协议 等 |
| 我的 → 客服中心 | `https://www.deppon.com/depponmobile/h5/index#/partsPackagePages/customer/index?ecoToken=...` | 仍是 H5，RN 目前是原生客服中心页，待决策后统一 |

RN 已按上表对齐：`APP_WEB_TARGETS` 新增 `PROTOCOL_RECORD`、`ORDER_DETAIL_ACCOUNT_PREFERENCES`，`ACCOUNT_PREFERENCES` 补齐来源参数，`CUSTOMER_PRIVATE_BILL` 标题收敛为「隐私设置」；「设置 → 协议说明」与「我的 → 隐私设置」改为 H5 入口。

### 第二批实测（同一方法，2026-10-19 晚）

| 入口 | 生产端实际 URL | 页面标题 |
|---|---|---|
| 我的 → 我的积分 | `https://mas.deppon.com/cms-h5/h5.html#/points-center/home` | 积分乐园 |
| 我的 → 会员卡 | `https://mas.deppon.com/cms-h5/h5.html#/member/home` | 会员中心 |
| 我的 → SVIP 立即开通 | `https://mas.deppon.com/cms/h5.html#/svip-member/home` | SVIP会员 |
| 我的 → 学生专区 | `https://mas.deppon.com/cms-h5/h5.html#/student-member/center` | 学生会员 |
| 我的 → 储值卡 | `https://pcs.deppon.com.cn/#/OpenhomePage` | 储值卡 |
| 我的 → 入群有礼 | `https://www.deppon.com/depponmobile/h5/index#/pages/groupBenefit/index` | 入群有礼 |
| 我的 → 体验调研 | `https://www.deppon.com/depponmobile/survey/center` | 德邦快递客户体验调研 |
| 我的 → 企业福利 | `https://mas.deppon.com/crm-api/mp/base/activity/ui/24-QYJ?code=50d8eefd867f40d38d36b577b45891b7` | 企业福利 |
| 我的 → 优待证优惠 | `https://mas.deppon.com/crm-api/mp/base/activity/ui/24-JRYD?code=054ef1baca474f27a08a440976c5b2d1` | 优待证优惠 |
| 我的 → 号码保护 | `https://www.deppon.com/depponmobile/h5/index#/partsPackagePages/customer/phoneProtect` | 手机号保护 |
| 法律条款与隐私政策 → 隐私政策 | `https://www.deppon.com/depponmobile/h5/index#/homePackagePages/privacy/index` | 隐私政策 |

要点：

- 会员域分两套：`cms-h5/h5.html`（会员中心、积分乐园、学生会员）与老的 `cms/h5.html`（SVIP）；企业福利/优待证是 `crm-api` 活动页，带固定 `code`。
- RN 侧统一跟随运行时 `memberWebURL` 的域名拼（测试环境 mastest、生产 mas），避免测试包跳到生产。
- 储值卡走 `pcs.deppon.com.cn`（另一个域名，未进 RN 的 WebView 白名单），RN 保留原生储值卡入口，暂不接这个 H5。

### 在线客服的真实形态（2026-10-19 实测）

| 入口 | 生产端实际 URL |
|---|---|
| 首页 → 在线客服 | `https://im.deppon.com.cn/dzfront/web/vChat?token=EjU77...&showChat=true&layout=false&code=a383fc41...` |

关键结论：

- 生产端在线客服是 **IM 会话页**（`dzfront/web/vChat`），`token` 与 `code` **每次打开都不同**，必须由接口换取，不能写死在配置里。
- RN 现在用的是 `APP_RUNTIME_CONFIG.serviceWebURL`（`.../dzfront/web/home?showChat=true&layout=true`），是客服主页而不是会话页，且 URL 里没有 token/code。
- 在 `libapp.so` 里翻不到明显的「取客服 token」接口路径（`chat/secure` 下只有 `ecoIsHaveNoReadMessage`），token 可能由 IM 侧下发或走登录链路，需要抓包才能确认。本轮**不改**在线客服，避免改成半吊子。

订单详情、我的、首页浮动客服三处的客服入口，等拿到 token 换取方式后统一处理。
