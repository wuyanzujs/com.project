# 寄件模块差异清单(send/gaps.md)

生成:2026-10-18(M1)。合并 [structure.md](./structure.md) 结构差异与 [api.md](./api.md) 接口差异,供 M1 评审后进 M2 实现。
来源标注:【结构】= 生产端文件树推断;【接口】= 小程序源码 + libapp.so 实证。UI 量测差异待 dpshots(每项实现前先量测)。

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
| 7 | 批量寄 Excel 导入(batch/express/excel + queryFileUploadInfoBatch) | 结构+接口 | RN batch 页补导入入口与解析 |
| 8 | 货物名搜索(queryGoodsNameList + hot/lately 历史热词) | 结构+接口 | cargo/query 页接入 |
| 9 | 物料供应 queryMaterialSupply(packing 包装选择联动) | 接口 | 货物信息包装行接入 |
| 10 | 预分配快递员 preAllocationCourier(tiles/postman) | 接口 | 指定快递员行接入 |
| 11 | 跑马灯公告 marquee | 结构 | 首页/下单页公告位 |
| 12 | 实名拦截 real_auth、协议确认 queryIsAgreement | 结构+接口 | 下单前置检查(实名 RN 已有 realname 域) |

## P2-P3(长尾)

- 公益寄 charitable、大件物流 logistics 独立入口【结构】
- queryAlonePrice / queryFreightPrice / routeDeliModel / orderPriceLog 等价格长尾端点【接口】
- E 卡弹层(ecard_introl/ecard_protocol,与 pay 模块 E 卡通道联动)【结构+接口】

## 已确认无差异(抽样)

价格时效主接口 queryPriceTime(含 YTY 置底、雪具包装费加价的业务规则,小程序与 RN 同源);createOrder 下单主接口;地址簿全套接口。
