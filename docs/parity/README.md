# 生产端对齐档案索引(docs/parity)

总计划:[../plans/2026-10-18-production-parity-deep-dive.md](../plans/2026-10-18-production-parity-deep-dive.md)
数据基线:`D:\rea-targets\dpapp-4.0.7.0.apk`(com.deppon.dpapp 4.0.7.0,Flutter/GetX,708 个自有 Dart 文件),全量清单见 [dpapp-file-inventory.txt](./dpapp-file-inventory.txt)。

## 模块状态

| 模块 | 生产端文件 | 档案 | 深挖 | 对齐 |
|---|---|---|---|---|
| 寄件 send | 102 | [structure](./send/structure.md) · [api](./send/api.md) · [gaps](./send/gaps.md) | ✅ M0 结构 / ✅ M1 接口+gaps | ❌ |
| 订单 order | 61 | [structure](./order/structure.md) · [api](./order/api.md) · [gaps](./order/gaps.md) | ✅ M0 结构 / ✅ M1 接口+gaps | ❌ |
| 消息 message | 4 | [message/structure.md](./message/structure.md) | ✅ M0(随立项) | ❌(需新增) |
| 扫一扫 scan | 3 | [scan/structure.md](./scan/structure.md) | ✅ M0(随立项) | ❌(需新增) |
| 支付 pay | 19 | [pay/structure.md](./pay/structure.md) | ✅ M1 | ❌ |
| 地址簿 contact | 32 | [contact/structure.md](./contact/structure.md) | ✅ M1(接口零缺口) | 🔶 视觉首轮完成 |
| 首页 home/main、查询 query、快递员 courier、我的 mine、账号 account、工具 system | 89 | — | ⬜ M1 | 🔶 骨架已有 |
| 优惠券 coupon、登录 login、寄件服务 service、打印 printer | 58 | — | ⬜ M2 | 🔶 骨架已有 |
| 会员 member/E卡、客服、发票 | 少量/生产端无独立发票页 | — | ⬜ M3 | 🔶 |

每个模块深挖后在本表登记档案链接与日期;对齐完成标准 = verify:app 全绿 + dpshots 量测比对通过。

## HAR 抓包方案决策简报(M0 ③,待决策)

接口级深挖(api.md)依赖生产端真实请求/响应,静态字符串池拿不到请求体。三个选项:

- **选项 A(推荐):找 Flutter 团队要一个关闭证书校验的测试包**。零逆向风险、最快;顺带索要接口文档,一劳永逸。作为自家公司 App,这是正路。
- **选项 B:reFlutter 重打包现 4.0.7.0 包**(reFlutter 还能顺带确认 snapshot hash `78da37fe...` 对应的 Dart SDK 版本)。需要重签名安装,可能触发安全 SDK 风控(自家 App 可控);产物仅内网抓包使用。
- **选项 C(不推荐):Frida 动态 hook 绕过校验**。复杂度最高,仅当 A/B 都不可行。

无论 A/B:mitmproxy/Reqable 抓核心页面的完整操作流(寄件下单→支付、订单列表→详情→催件、地址簿增删改)导出 HAR → 交 REA 分析 → 逐模块产出 `docs/parity/<模块>/api.md`。

**决策记录:2026-10-18 项目 owner 决定先跳过 HAR。** 接口契约改用 **mp-taro3 小程序源码**(`D:\10531845\Desktop\CZH-DEV\mp-taro3`,真实调用,204 端点已抽取至 [mp-api-inventory.txt](./mp-api-inventory.txt))+ **生产端 libapp.so 端点实证**(160 个)交叉参照:生产∩小程序 127 端点,同接口体系实锤。三方对比明细见各模块 api.md;HAR 仅剩"字段语义最终核对"一个用途,降级为可选。

**数据基线补充**(2026-10-18 修正):小程序 201 端点、生产端 160、RN 已接 **128**(含 `*_API_ROOT` 常量拼接端点补扫 +7)、**缺 109**;服务域缺口 Top:onlineService 29、user/waybill/order/query/pricetime 9-12、messageService 7;commentService 全覆盖。小程序 wechatService 5 端点(支付分/先用后付)为平台专属,RN 豁免。**已决策(2026-10-18):运单改单保持原生**——wayBill/modify 5 端点已接入 `services/order/order.api.ts`,UI 入口待真机场景确认。

**M2 澄清(2026-10-18)**:`pricetimeService/secure/queryCouponRecommend` 为 **MP-ONLY 误标**——生产端 libapp.so 无此端点,小程序内仅 PDA 线下开单场景定义且无页面调用;生产端下单页券 tile 走 `couponService/queryCouponOrder`,RN 已接全链路,**该缺口关闭**。真实 captcha 缺口(`messageService/eco/message/captcha/getCaptchaAction|checkCaptchaAction`)为 **PROD-ONLY**,契约需从生产端二进制挖,详见 [send/api.md](./send/api.md)。
