# 生产端对齐档案索引(docs/parity)

最新工作交接：[2026-10-19 RN 寄件对齐与真机验证](../handoffs/2026-10-19-send-production-parity-handoff.md)。当前优先寄件真实联调，已安装开发包并完成基础真机冒烟，代码尚未提交。

总计划:[../plans/2026-10-18-production-parity-deep-dive.md](../plans/2026-10-18-production-parity-deep-dive.md)
数据基线:`D:\rea-targets\dpapp-4.0.7.0.apk`(com.deppon.dpapp 4.0.7.0,Flutter/GetX,708 个自有 Dart 文件),全量清单见 [dpapp-file-inventory.txt](./dpapp-file-inventory.txt)。**页面承载方式(Flutter 原生 vs H5)判定表见 [production-surface.md](./production-surface.md):H5 页只对齐入口与 URL,不做像素对齐。**

## 模块状态

| 模块 | 生产端文件 | 档案 | 深挖 | 对齐 |
|---|---|---|---|---|
| 寄件 send | 102 | [structure](./send/structure.md) · [api](./send/api.md) · [gaps](./send/gaps.md) · [ui-measure](./send/ui-measure.md) · [主链路](./send/main-flow.md) · [真机冒烟](./send/device-smoke.md) | ✅ M0/M1；初始态 UI 已量测 | 🔶 2026-10-19 主功能已补，开发包已装机、基础冒烟通过；真实报价/网点回填/下单联调与生产展开态量测待验收 |
| 订单 order | 61 | [structure](./order/structure.md) · [api](./order/api.md) · [gaps](./order/gaps.md) | ✅ M0 结构 / ✅ M1 接口+gaps | 🔶 改单 5 端点澄清为 MP-ONLY(入口归推送立项);已取消态详情对照完成,客服按钮待补 |
| 登录 login | 14 | [login/api.md](./login/api.md) | ✅ M2 captcha 契约(探针+开源同源实证) | 🔶 captcha 域+点选组件+登录频控接线已实现(2026-10-18),触发 code 待抓包收敛 |
| 消息 message | 4 | [message/structure.md](./message/structure.md) | ✅ M0(随立项) | ❌(需新增) |
| 扫一扫 scan | 3 | [scan/structure.md](./scan/structure.md) | ✅ M0(随立项) | ❌(需新增) |
| 支付 pay | 19 | [pay/structure.md](./pay/structure.md) | ✅ M1 | ❌ |
| 地址簿 contact | 32 | [contact/structure.md](./contact/structure.md) | ✅ M1(接口零缺口) | 🔶 2026-10-19 列表页真机对照完成(灰底白卡 + 地址展示去重)；编辑页按生产端补齐标题态/分机号/占位文案/纯蓝按钮,「保存到地址簿 vs 设为默认地址」结案(生产端只有「设为默认地址」);地区/城市缺少城市选择器 |
| 首页 home/main、查询 query、快递员 courier、我的 mine、账号 account、工具 system | 89 | — | ⬜ M1 | 🔶 骨架已有；query 自送服务点列表已按生产端「德邦快递服务点」重做(2026-10-19)；设置/个人设置/账号注销(两步)已按生产端对齐(2026-10-19) |
| 优惠券 coupon、寄件服务 service、打印 printer | 45 | — | ⬜ M2 | 🔶 骨架已有 |
| 会员 member/E卡、客服、发票 | 少量/生产端无独立发票页 | — | ⬜ M3 | 🔶 |

每个模块深挖后在本表登记档案链接与日期;对齐完成标准 = verify:app 全绿 + dpshots 量测比对通过。

**2026-10-19 真机对照补充(第四轮)**:

- 货物信息页:4 条已登记差异全部收口(上传照片占位、输入框图标、页面分享、语音填写图标),另按 `uiautomator bounds` 修正热门寄件标题层级、热词配色、捎话计数位置。量测表见 [send/ui-measure.md](./send/ui-measure.md) 末节,差异收口见 [send/gaps.md](./send/gaps.md)。
- 客服中心:生产端是 **WebView 承载的 H5**(原生层仅标题栏 + 分享,`prod-support.xml` 只暴露 2 个可读节点),RN 为原生列表页。已清掉 `WebView`/`需登录`/`H5` 等研发角标与工程说明文案,分区改为「常用服务/售后服务/帮助中心」以贴近截图;完全一致需改受控 WebView,待确认 owstest 环境 H5 路径。
- 发票:生产端点「发票申请」弹「您确定打开“微信”,进入“德邦快递”小程序」确认框(`prod-invoice.xml` 仅 5 个可读节点),即**发票主流程不在生产 App 内**。因此 RN 原生发票中心/申请页与生产端不可像素对齐,属于已知平台性差异,不按生产端 UI 反推。


## HAR 抓包方案决策简报(M0 ③,待决策)

接口级深挖(api.md)依赖生产端真实请求/响应,静态字符串池拿不到请求体。三个选项:

- **选项 A(推荐):找 Flutter 团队要一个关闭证书校验的测试包**。零逆向风险、最快;顺带索要接口文档,一劳永逸。作为自家公司 App,这是正路。
- **选项 B:reFlutter 重打包现 4.0.7.0 包**(reFlutter 还能顺带确认 snapshot hash `78da37fe...` 对应的 Dart SDK 版本)。需要重签名安装,可能触发安全 SDK 风控(自家 App 可控);产物仅内网抓包使用。
- **选项 C(不推荐):Frida 动态 hook 绕过校验**。复杂度最高,仅当 A/B 都不可行。

无论 A/B:mitmproxy/Reqable 抓核心页面的完整操作流(寄件下单→支付、订单列表→详情→催件、地址簿增删改)导出 HAR → 交 REA 分析 → 逐模块产出 `docs/parity/<模块>/api.md`。

**决策记录:2026-10-18 项目 owner 决定先跳过 HAR。** 接口契约改用 **mp-taro3 小程序源码**(`D:\10531845\Desktop\CZH-DEV\mp-taro3`,真实调用,204 端点已抽取至 [mp-api-inventory.txt](./mp-api-inventory.txt))+ **生产端 libapp.so 端点实证**(160 个)交叉参照:生产∩小程序 127 端点,同接口体系实锤。三方对比明细见各模块 api.md;HAR 仅剩"字段语义最终核对"一个用途,降级为可选。

**数据基线补充**(2026-10-18 修正):小程序 201 端点、生产端 160、RN 已接 **128**(含 `*_API_ROOT` 常量拼接端点补扫 +7)、**缺 109**;服务域缺口 Top:onlineService 29、user/waybill/order/query/pricetime 9-12、messageService 7;commentService 全覆盖。小程序 wechatService 5 端点(支付分/先用后付)为平台专属,RN 豁免。**已决策(2026-10-18):运单改单保持原生**——wayBill/modify 5 端点已接入 `services/order/core/order.api.ts`,UI 入口待真机场景确认。

**M2 澄清(2026-10-18)**:`pricetimeService/secure/queryCouponRecommend` 为 **MP-ONLY 误标**——生产端 libapp.so 无此端点,小程序内仅 PDA 线下开单场景定义且无页面调用;生产端下单页券 tile 走 `couponService/queryCouponOrder`,RN 已接全链路,**该缺口关闭**。真实 captcha 缺口(`messageService/eco/message/captcha/getCaptchaAction|checkCaptchaAction`)为 **PROD-ONLY**,契约需从生产端二进制挖,详见 [send/api.md](./send/api.md)。

**2026-10-19 页面承载方式判定**:

生产端是 Flutter + GetX,页面分 Flutter 原生页与 `webview_flutter` 承载的 H5 页。用 `uiautomator dump` 是否出现 `android.webkit.WebView`、`dumpsys activity top` 是否出现 `WebViewProxyApi$WebViewPlatformView` 判定。已确认 **H5**(不做像素对齐):协议说明/法律条款与隐私政策、隐私设置、偏好设置、客服中心、积分乐园;已确认 **Flutter 原生**(按量测对齐):我的、设置、个人设置、账号注销、地址簿列表、创建/编辑地址。明细见 [production-surface.md](./production-surface.md)。

2026-10-19 补充：H5 入口的真实 URL 用 `adb` + WebView devtools 在运行时抓取（方法见 [production-surface.md](./production-surface.md)），偏好设置/隐私设置/协议说明已按实测地址对齐，客服中心待决策。

2026-10-19 补充（「我的」会员卡）：生产端卡面实测文案为「普通会员 / 2项权益 › / 当前成长值 0/85」，优惠券上方有红底白字角标「2张快过期啦」（实测底色 `#f0484e`、高 63px 实测 ≈ 33 设计 px、左边缘设计稿 x≈82）。RN 已补该角标（数据源 `couponService.queryExpireCount()`），成长值上限与权益计数保持与生产端一致的格式。

2026-10-19 宫格几何核对：「我的」快捷行/服务宫格的格子高度（136/124）、图标显示尺寸（56/48，源图内容占比 0.9167）、角标右边距（24）均与生产端一致；仅服务宫格角标高度由 32 改为 28（实测 54px÷1.92）、圆角改为胶囊。

2026-10-19 底栏与客服入口：底部 TabBar 实测底栏高 215px（≈112 设计 px）、图标墨迹 72px、标签字高 48px、选中色 `#1957ff`；RN 底栏矮约 7 设计 px、图标略大，因图标素材不同且无设计稿暂不调整。「我的 → 客服中心」已按生产端实测改为 H5 `#/partsPackagePages/customer/index`。

2026-10-19 在线客服：生产端是 IM 会话页 `im.deppon.com.cn/dzfront/web/vChat`，`token`/`code` 每次打开都不同、需接口换取；RN 目前指向客服主页 `serviceWebURL`，差距已记录，待抓到 token 换取方式后统一三处客服入口。
