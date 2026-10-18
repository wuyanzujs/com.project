# 订单模块差异清单(order/gaps.md)

生成:2026-10-18(M1)。合并 [structure.md](./structure.md) 与 [api.md](./api.md),供评审后进 M2。
来源标注:【结构】= 生产端文件树推断;【接口】= 小程序源码 + libapp.so 实证。

## P0(主链路与存量页面正确性)

| # | 差异项 | 来源 | RN 现状 | 对齐动作 |
|---|---|---|---|---|
| 1 | 运单修改原生通道(wayBill/modify 5 端点:受理改单×2、改价、变更记录×2) | 接口 | order/edit 走 orderService/modifyOrder 已对齐;wayBill/modify 5 端点 **2026-10-18 已接入 orderApi**(queryWaybillExp/LtlChangeRecord、submitWaybillExp/LtlChangeAccept、submitWaybillChangePrice),typecheck 通过 | ✅ owner 决策**保持原生**(2026-10-18);剩余动作 = 详情页受理改单/改价的 UI 入口接线(需真机确认触发场景) |
| 2 | 订单模板四端点(orderTemplate 系) | 接口 | ✅ 已核对:queryOrderTemplate / addModifyOrderTemplate / deleteOrderTemplate 已接(template.api.ts 经 TEMPLATE_API_ROOT 常量拼接,首轮扫描盲区);仅缺 recommendTemplate(暂无 UI 场景,挂起) | 无需动作 |
| 3 | ~~改单/取消的 H5 形态~~ | 结构(明文 URL) | — | ✅ 已决策:保持原生,不跟随 H5 形态 |
| 4 | 详情页操作集 actions(allot/invalid/sign/transit)+ cannot 不可操作态 | 结构 | detail 135 行已组件化;invalidWaybill/revokeOrder 已接, allot/sign/transit 待核 | 对照真机详情页,补齐操作枚举 |

## P1(高频能力)

| # | 差异项 | 来源 | 对齐动作 |
|---|---|---|---|
| 5 | 催件闭环(order_urge 三页 + getUrgeButtons/urgeOrder) | 结构+接口 | ✅ 接口已接(orderApi:queryUrgeButtons/queryUrgeMenus/submitUrge + orderUrgent v2);剩余 = UI 层对照生产端催件三页形态 |
| 6 | 游客查件(order_query:输单号 + 历史 + 登录引导) | 结构 | RN order/list 加免登录形态或独立查询页 |
| 7 | 运单详情与订单详情分离(waybill_info + 附件预览 file/images/screenshot) | 结构 | 电子存根 stub 页扩展附件预览 |
| 8 | 地图轨迹 + 快递员实时位置(OrderMapController + getCourierLocation/trackLocationToOWSEntity) | 结构+接口 | 详情页地图组件;定位走 shared/platform |
| 9 | 异常上报(wayBill/abnormal click/escalation) | 接口 | 详情页动作位 |
| 10 | 主子运单(queryMasterAndSlaveWaybillNos + master 组件) | 结构+接口 | 多件单聚合展示 |

## P2-P3(长尾)

- NPS 评价入口(nps.dart;评价域接口 RN 已全覆盖,仅入口形态)【结构】
- 关注运单 ex_follow 逻辑对照(subscriptions 页已存)【结构】
- 拒收签 queryWaybillAccessSign、扫描节点 scanStatus、queryOnlyRemind、waybillSendItCasually【接口】
- notifi 推送开关组件(依赖 message 模块立项)【结构】

## 已确认无差异(抽样)

评价/NPS 问卷接口(commentService 7 端点 RN 全接);orderList/orderDetail/modifyOrder/revokeOrder/removeOrder 主接口;轨迹主体(waybillService 20 个已接)。
