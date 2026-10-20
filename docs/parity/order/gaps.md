## 2026-10-19 订单详情操作区渠道角标清理

用户可见的 `App` / `H5` 是研发实现的渠道标记，生产端不会展示。已从 `createOrderDetailActions` 的 7 处分支移除（保留 客服/预约/待确认/高风险/电话 这些有业务语义的角标），业务测试断言同步改为「不再展示渠道角标」。`pnpm verify:app` 全绿（299 + 71）。

## 2026-10-19 订单详情操作态取证（生产端 4.0.7.0）

证据：`.dpshots/rn-send-20261019/prod-orders3.{png,xml}`（我寄的列表）、`prod-order-detail2.{png,xml}`（运单 DPK202798855150 详情）。

- 列表卡片按钮：`复制`、`删除`、`再来一单`；整卡可点进详情。
- 详情底栏（**已取消**态）：`客服`（左，图标+文字）、`再来一单`、`重新寄件`（右侧两个按钮），与 RN 现状一致（gaps #4 已收口那条）。
- 其余状态（待揽收/待支付/运输中/已签收）在生产端当前账号下**没有可用订单**，无法取证；测试环境建单会真实下单，属越界操作，未执行。该项保持挂起，等有对应状态的运单数据后再对照 allot/sign/transit 底栏。

# 订单模块差异清单(order/gaps.md)

生成:2026-10-18(M1)。合并 [structure.md](./structure.md) 与 [api.md](./api.md),供评审后进 M2。
来源标注:【结构】= 生产端文件树推断;【接口】= 小程序源码 + libapp.so 实证。

## P0(主链路与存量页面正确性)

| # | 差异项 | 来源 | RN 现状 | 对齐动作 |
|---|---|---|---|---|
| 1 | 运单修改原生通道(wayBill/modify 5 端点:受理改单×2、改价、变更记录×2) | 接口 | order/edit 走 orderService/modifyOrder 已对齐;wayBill/modify 5 端点已接入 orderApi | ✅ **M2 澄清(2026-10-18):5 端点实为 MP-ONLY**(endpoint-compare 172-176 行;生产端 libapp.so「改单/改价」0 命中,生产 App 无改单 UI)。小程序参照:`pages/order/detail/modify/index.tsx` 底部弹窗「运单更改确认」(该更改由站点发变更,付款方式 {paymentName}→到付,拒绝'3'/同意'2'),触发 = 微信订阅消息深链(详情页 URL 带 eventId,source 前缀 WMC_GGDQR→LOGISTICS / GWMC_GGDQR→EXPRESS),EXPRESS 查询 handleStatus==='4' 时弹。**RN 入口依赖推送深链方案,归并入消息/推送立项**;弹窗规格已备,推送通道决策后即可实现 |
| 2 | 订单模板四端点(orderTemplate 系) | 接口 | ✅ 已核对:queryOrderTemplate / addModifyOrderTemplate / deleteOrderTemplate 已接(template.api.ts 经 TEMPLATE_API_ROOT 常量拼接,首轮扫描盲区);仅缺 recommendTemplate(暂无 UI 场景,挂起) | 无需动作 |
| 3 | ~~改单/取消的 H5 形态~~ | 结构(明文 URL) | — | ✅ 已决策:保持原生,不跟随 H5 形态 |
| 4 | 详情页操作集 actions(allot/invalid/sign/transit)+ cannot 不可操作态 | 结构+UI | detail 组件化完整(OrderDetailFooterActions:客服/再来一单/取消/删除/查看订单列表 + OrderServiceActions 售后区) | ✅ 已取消态已对齐(2026-10-19):生产底栏 = 客服 + 再来一单 + 重新寄件;RN 补「客服」入口(跳客服中心)、主按钮按态切换(已取消 = 重新寄件,经 draftBridge FRESH_SEND 全新草稿进寄件页;其余态保持查看订单列表),已取消态隐藏生产没有的刷新/删除。详情查询主数据源已切订单详情(orderNumber 优先,运单详情仅公开物流态兜底),解除测试环境「运单不存在」阻塞;正常态 allot/sign/transit 底栏待真机数据可用后对照 |

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
