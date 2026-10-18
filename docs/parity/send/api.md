# 寄件模块接口对照(send/api.md)

生成:2026-10-18。**来源:mp-taro3 小程序源码(真实调用)+ 生产端 libapp.so 字符串实证 + RN 已接端点扫描**,非 HAR;字段语义以 `mp-taro3/src/type/*.ts` 实体定义为准,与生产端的字段差异待最终核对。
全量端点函数映射:[../mp-api-inventory.txt](../mp-api-inventory.txt);三方对比明细:生产 160 ∩ 小程序 127,RN 覆盖 118/234。

## 已接(无需动作,抽样核对参数即可)

RN `services/express/express.api.ts` 等已接 pricetime 主链路:queryPriceTime(价格时效)、queryPointCityByProduct、queryNewProductPointCity、queryPointCityByAddress、fixedProtection;orderService 下单主链路(createOrder 在 RN 已接,不在缺失清单);地址簿全套(见 [contact/api 参照](../contact/structure.md))。

## RN 缺失端点(按下单链路影响排序)

**pricetimeService(缺 11)**
- `secure/queryCouponRecommend` — 下单页券推荐(tiles/coupon 依赖)【P0,影响转化】
- `secure/queryMaterialSupply` — 物料供应(包装材料库存)【P1】
- `secure/queryFileUploadInfoBatch` — 批量文件上传信息(批量寄 Excel 导入配套)【P1】
- `queryAlonePrice` / `other/queryFreightPrice` — 单独计价/散单运费【P1,场景待核】
- `queryExpTltPrice` — 特惠价格(支付模块也引用)【P1】
- `queryPilotCityBatch` / `secure/routeDeliModel` — 试点城市批量/路线配送模型【P2】
- `secure/queryProductInfo` — 产品信息【P2】
- `orderPriceLog/save` + `orderPriceLog/query` — 价格日志【P3】

**messageService(缺 7,下单相关 2)**
- `captcha/getCaptchaAction` + `captcha/checkCaptchaAction` — 图形验证码(生产端 send/common 有 captcha 加密组件 encrypt_util)【P0,登录/风控链路】
- `intMsg/secure/*`(4 个)与 `rmq/gislocation` — 消息/推送域,归 message 模块【P2】

**orderService(缺 12,寄件相关 4)**
- `secure/queryOrderTime`、`dispatchTime/dispatchTimeNew`(dispatchTimeNew 是否已接待核)、`dispatchTime/pilotCityDispatchTime` — 取件时间窗(schedule 组件)【P0,下单必经】
- `secure/preAllocationCourier` — 预分配快递员(tiles/postman)【P1】
- `secure/queryGoodsNameList` — 货物名清单(cargo/query 热词来源)【P1】
- 其余(orderTemplate×4、uploadWifiInfo、isHaveOrderByResource、distribute/collectModel、queryOrderUseHll)见 [order/api.md](../order/api.md)

**onlineService(缺 33,寄件相关节选)**
- `cargo/queryCargoInfo` — 货物信息(cargo/info)【P1】
- `agreement/secure/queryIsAgreement` — 协议确认(common/widgets/protocol)【P1】
- `searchJdDetectText` — 京东地址检测(推断:电商地址粘贴检测)【P3】

## 与生产端的对应关系

小程序 api/send.ts(35 端点)与生产端 pages/send 结构高度对应:价格(queryPriceTime)、下单(createOrder)、取件时间(dispatchTime*)、货物(queryCargoInfo/queryGoodsNameList)、地址识别(addressAiResolution)、优惠券(queryCouponRecommend)。**未发现生产端有小程序没有的寄件专属端点**(生产 160 中 pricetime 7 个全部包含于小程序 14 个)。
