# 订单模块接口对照(order/api.md)

生成:2026-10-18。**来源:mp-taro3 小程序源码(真实调用)+ 生产端 libapp.so 字符串实证 + RN 已接端点扫描**,非 HAR;字段语义以 `mp-taro3/src/type/*.ts` 为准,与生产端差异待最终核对。
全量端点函数映射:[../mp-api-inventory.txt](../mp-api-inventory.txt)。

> **2026-10-18 核对修正**:① `TEMPLATE_API_ROOT`/`COURIER_API_ROOT` 常量拼接端点属首轮扫描盲区,orderTemplate×3 与 courier×4 实为已接;② 复扫确认催件(queryUrgeButtons/queryUrgeMenus/submitUrge + orderUrgent v2)、评价(courier/evaluation + evaluate/detail + commentService 全套)、modifyNotifyDeliver 均已接;③ 改单保持原生决策落地:wayBill/modify 5 端点已接入 `orderApi`(queryWaybillExp/LtlChangeRecord、submitWaybillExp/LtlChangeAccept、submitWaybillChangePrice)。修正后 RN 全局:已接 128,缺 109。

## 已接(抽样核对即可)

RN `services/order/*` 已接 orderService 主链路 13 个(orderList/orderDetail/modifyOrder/removeOrder/revokeOrder/queryGoodsRemark/dispatchTimeNew 等)、waybillService 20 个(轨迹/关注/签收等主体)、commentService 全部 7 个(评价/NPS 问卷)。**评论域 RN 零缺口。**

## RN 缺失端点(按功能影响排序)

**waybillService(缺 12)——生产端"运单修改/异常"域,RN 侧最大接口缺口**
- `waybill/modify/secure/changeAcceptExpWaybill` / `changeAcceptLtlWaybill` — 受理运单修改(快运/零担)【P0,对应生产端 order_modify 与 H5 改单并存的原生路径】
- `waybill/modify/secure/waybillChangePriceSubmit` — 改价提交【P0】
- `waybill/modify/secure/queryExpWaybillChangeRecord` / `queryLtlWaybillChangeRecord` — 变更记录【P1】
- `wayBill/abnormal/secure/click` / `escalation` — 异常上报/升级【P1,详情页 actions 域】
- `wayBill/secure/queryMasterAndSlaveWaybillNos` — 主子运单号(order_detail/master 组件)【P1】
- `wayBill/reject/secure/queryWaybillAccessSign` — 拒收签【P2】
- `wayBill/scanStatus/secure/wayBillScanStatus` — 扫描节点状态【P2】
- `wayBill/secure/queryOnlyRemind`、`waybillSendItCasually` — 提醒/随意寄【P3】

**orderService(缺 12)**
- `orderTemplate/secure/queryOrderTemplate / addModifyOrderTemplate / deleteOrderTemplate / recommendTemplate` — **订单模板四件套**(RN 有 express/template 页面,核对实际调用端点;若走不同路径需统一)【P0,存量页面接口待核】
- `secure/queryOrderTime` / `dispatchTime/pilotCityDispatchTime` — 时间窗(与寄件共用)【P0】
- `secure/preAllocationCourier` — 预分配快递员【P1】
- `secure/queryGoodsNameList` — 货物名【P1】
- `secure/isHaveOrderByResource`、`distribute/collectModel`、`orderExpands/uploadWifiInfo`、`secure/queryOrderUseHll` — 场景类【P2-P3】

**trackService(缺 2)**
- `secure/getCourierLocation` — 快递员实时位置(order_detail/postman+map)【P1】
- `secure/trackLocationToOWSEntity` — 轨迹转实体【P1】

**催件域(onlineService,RN-MISS 大盘内节选)**
- `complaint/secure/getUrgeButtons` + `complaint/secure/urgeOrder` — 催件按钮与催单(order_urge 模块)【P1】
- `evaluate/secure/queryEvaluateDetail`、`courier/evaluation/secure/commit` + `isCommited` — 评价(RN 有 evaluation 页,核对端点)【P1】

**messageService(缺 7)** — 消息中心/列表依赖(intMsg 4 个 + captcha 2 个 + gislocation),见 [message/structure.md](../message/structure.md)【P2】

## 与生产端的对应关系

生产端 order 61 文件的每个子模块都能在小程序端点上找到落点:order_query(游客查件)→ orderList 免登录态 + queryOrderTime;order_urge → complaint/urgeOrder;waybill_info → wayBill 系;order_modify → wayBill/modify 系;order_stub → wayBill 附件。**waybillService/modify 12 端点是 RN 完全未触达的生产端原生改单能力**,与 H5 改单(mow/order/modifyOrder)的关系需抓包/问团队最终确认。
