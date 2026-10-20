# 寄件模块接口对照(send/api.md)

生成:2026-10-18。**来源:mp-taro3 小程序源码(真实调用)+ 生产端 libapp.so 字符串实证 + RN 已接端点扫描**,非 HAR;字段语义以 `mp-taro3/src/type/*.ts` 实体定义为准,与生产端的字段差异待最终核对。
全量端点函数映射:[../mp-api-inventory.txt](../mp-api-inventory.txt);三方对比明细:生产 160 ∩ 小程序 127,RN 覆盖 118/234。

## 2026-10-19 主流程契约修正

以下以小程序真实调用点与当前 RN 实现复核，优先于下方初版缺口统计；不重新统计全项目端点覆盖率。

| 端点 | 核实语义与本轮处理 |
|---|---|
| onlineService/eco/online/cargo/queryCargoInfo | 已有品名联想接口，入参 keyWord/pageIndex/pageSize；本轮修复编辑页和旧响应回填，未新增重复端点 |
| orderService/eco/order/secure/queryGoodsNameList | 入参 standardLevelGoodsNames，返回 string[]，小程序服务页用于标准分类；不是货物搜索或热词接口 |
| orderService/eco/order/secure/preAllocationCourier | **本轮新增成功页调用**；POST {orderNumber}，courierCode?/courierName?/courierPhone?，loading=false/login=false/timeout=3000；按小程序 api/order.ts:593 及 sendService/success 的 handleInitDispatch 校准，不能作为下单前指定快递员 |
| pricetimeService/eco/pricetime/secure/queryFileUploadInfoBatch | 入参数组 {busynessKey}，返回 {busynessKey,fileUrl}[]，真实调用在 Express/Photo/Example；不是 Excel 上传接口 |
| pricetimeService/eco/pricetime/secure/queryMaterialSupply | 入参 sysCode/customerCode/productCode，返回 materialList(picCode/materialName/unitPrice/materialSpec)，小程序火锅物料专属；不泛化为通用包装库存 |
| onlineService/eco/online/agreement/secure/queryIsAgreement | 小程序针对赣州南康、徐州睢宁、宿迁宿城的家电家居场景，入参 senderMobile/receiveMobile/agreementType；不是通用运单协议已读状态 |

生产 APK 只证明存在 send/cargo/query/lately、success/postman 等模块和部分端点字符串，完整请求字段仍按同体系小程序调用核实，尚未做生产抓包验收。主流程差异与验证见 [main-flow.md](./main-flow.md)。

## 已接(无需动作,抽样核对参数即可)

RN `services/express/express.api.ts` 等已接 pricetime 主链路:queryPriceTime(价格时效)、queryPointCityByProduct、queryNewProductPointCity、queryPointCityByAddress、fixedProtection;orderService 下单主链路(createOrder 在 RN 已接,不在缺失清单);地址簿全套(见 [contact/api 参照](../contact/structure.md))。

## RN 缺失端点(按下单链路影响排序)

**pricetimeService(缺 11,其中券推荐已澄清无需接入)**
- ~~`secure/queryCouponRecommend`~~ — **2026-10-18 M2 澄清:MP-ONLY 误标**。生产端 libapp.so 无此端点;小程序源码中仅 `FetchPdaOrderCoupon`(PDA 线下开单券,入参仅 waybillNumber)定义且无页面调用。生产端下单页券能力走 `couponService/queryCouponOrder`(prod∩mp BOTH,对应生产 `pages/coupon/coupon_express` + `models/request/send/coupon_express.dart`),RN 已接并挂入下单页(useExpressCoupons + ExpressCouponCard/Sheet)。**无需接入,缺口关闭。**
- `secure/queryMaterialSupply` — 物料供应(包装材料库存)【P1】
- `secure/queryFileUploadInfoBatch` — 业务图片信息（已核实为 Photo/Example，不作为 Excel 导入契约）
- `queryAlonePrice` / `other/queryFreightPrice` — 单独计价/散单运费【P1,场景待核】
- `queryExpTltPrice` — 特惠价格(支付模块也引用)【P1】
- `queryPilotCityBatch` / `secure/routeDeliModel` — 试点城市批量/路线配送模型【P2】
- `secure/queryProductInfo` — 产品信息【P2】
- `orderPriceLog/save` + `orderPriceLog/query` — 价格日志【P3】

**messageService(缺 7,下单相关 2)**
- `captcha/getCaptchaAction` + `captcha/checkCaptchaAction` — 图形验证码【P0,登录/风控链路】。**PROD-ONLY:小程序源码无 captcha 概念,契约只能从生产端挖**;生产端实现为点选文字验证码(`pages/login/widgets/click_captcha.dart` + `common/components/captcha/request/encrypt_util.dart`,依赖 `package:encrypt`)
- `intMsg/secure/*`(4 个)与 `rmq/gislocation` — 消息/推送域,归 message 模块【P2】

**orderService(缺 12,寄件相关 4)**
- `secure/queryOrderTime`、`dispatchTime/dispatchTimeNew`(dispatchTimeNew 是否已接待核)、`dispatchTime/pilotCityDispatchTime` — 取件时间窗(schedule 组件)【P0,下单必经】
- `secure/preAllocationCourier` — **成功页调度快递员，本轮已接**；下单前指定快递员来源仍待核
- `secure/queryGoodsNameList` — 标准品名分类查询，不是 cargo/query 搜索热词来源
- 其余(orderTemplate×4、uploadWifiInfo、isHaveOrderByResource、distribute/collectModel、queryOrderUseHll)见 [order/api.md](../order/api.md)

**onlineService(缺 33,寄件相关节选)**
- `cargo/queryCargoInfo` — **已接**货物搜索联想，本轮修复编辑交互
- `agreement/secure/queryIsAgreement` — 特定地区家电家居协议查询，待对应场景对齐
- `searchJdDetectText` — 京东地址检测(推断:电商地址粘贴检测)【P3】

## 与生产端的对应关系

小程序 api/send.ts(35 端点)与生产端 pages/send 结构高度对应:价格(queryPriceTime)、下单(createOrder)、取件时间(dispatchTime*)、货物(queryCargoInfo/queryGoodsNameList)、地址识别(addressAiResolution)、优惠券(queryCouponRecommend)。**未发现生产端有小程序没有的寄件专属端点**(生产 160 中 pricetime 7 个全部包含于小程序 14 个)。
