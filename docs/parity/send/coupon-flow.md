# 寄件优惠券链路（mp-taro3 对照）

日期：2026-10-25。对照参考端 `src/pages/send/express/index.tsx`、`src/store/reducers/send.ts`、`src/utils/send.ts`（`CreateCouponParams`）、`src/components/Coupon/*`、`src/pages/coupon/express` 与 RN 的 `services/coupon/**`、`services/express/billing/couponOrder.rules.ts`、`pages/express/hooks/useExpressCoupons.ts`、`pages/express/components/ExpressCouponCard|ExpressCouponSheet`。

## 1. 什么时候请求优惠券

参考端 `handleQueryCoupon`（`index.tsx:4468`）的进入条件：

1. 已有选中产品（`product`），且产品在列表中；
2. 产品价格可见（`ExistsProductPrice(productItem).visible`）；
3. 不是客户编码扫码（`SCAN_ROLE.CUSTOMER`）、不是铁路产品（`EXPRESS_ROLE.RAILWAY`）。

RN 的 `createExpressCouponQueryRequest` 现在同样要求：收寄件联系人、已选产品且产品有 `producteCode`、产品价格可见；客户编码扫码直接返回 `null`。请求 key 变化后由 `useExpressCoupons` 300ms 防抖自动查询；登录态缺失时只提示。

## 2. 请求参数

| 字段 | 参考端 | RN |
|---|---|---|
| `productCode` | 产品的 PPC code（`producteCode`） | 同 |
| `freight` / `couponFeeList` | 用「券前原价」：FRT + 线路限时优惠 + 该券已抵扣的费用（按 `couponRankType` 判断 FRT/BF/AD/BZ） | `getExpressCouponOriginalFee` 同口径，费用类型 FRT/BF/AD/NMBZ |
| `channel` | `GetOmsChannel({expressRole})` | 运行时 `omsChannel` |
| `mobile` | 寄件人手机号 | 同 |
| 收寄地址 | `省-市-区` | 同 |
| `paymentType` | 仅 ECARD 时传 | RN 无 ECARD 支付，未传 |

## 3. 返回与展示

- 响应分 `available` / `unAvailable` 两组；RN 映射成 `CouponCardView`，可用券可直接选，不可用券展示 `useLimit` 禁用原因。
- 优惠券卡：类型名、面额/折扣、门槛、有效期、限星期、标签（新领取/即将到期/推荐，最多 4 个）、状态文案（已使用/已过期/已转赠）。
- 寄件页入口显示「N张待使用 / 已选券码 / 暂无可用」；已选券优先展示优惠金额（`¥` 券显示 `-¥金额`）。
- 弹层按可用/不可用分组，可用券带「最优惠 / 即将到期」角标和「本单可减 X 元」；不可用券展示禁用说明。参考端 Picker 默认预选第一张可用券，RN 现已对齐（打开时无已选券则预选 `available[0]`）。
- 券详情：RN 关闭弹层后进入券详情页（`couponDetail`），参考端直接进入详情页。

## 4. 携带优惠券计价与回写

- 选择/取消券都会把草稿标记为报价过期并重新询价；询价请求带 `promotionsCode=couponNumber`、`customerMobile=寄件人手机号`，下单 `receive[0].couponNumber` 同步。
- 参考端自动选券（`handleQueryCoupon`）：
  - 非扫码、`expressRole` 为空/BIG/LOGISTICS、非月结/合同客户、手机号 11 位、付款方式不是 ECARD/月结/到付、券来源为空或 Default；
  - 有可用券且「重量/体积/产品」相对上次推荐发生变化时，自动选 `available[0]` 并重新询价。
  - RN 现按「非扫码 + 现付 + 手机号 11 位 + 输入指纹变化」自动选第一张可用券；手动选过/从券列表带入的券不会被覆盖（用 `autoCouponCode` 记录自动选中的券）。
- **月结 + 选券**：参考端 `handleCouponChange` 会把付款方式改成现付并提示「已取消月结支付」；RN 已对齐（选券时若为月结，切到现付并提示）。

## 5. 什么时候清除优惠券

| 场景 | 参考端 | RN |
|---|---|---|
| 新产品没有券优惠 | `handleProductChange` 清空券 | `selectExpressProduct` 用 `getExpressCouponDiscount <= 0` 清空 |
| 最新券列表为空（无可用也无不可用） | `SEND_COUPON_LIST_FAIL` 清空券与列表 | 已对齐：清空券并重新询价 |
| 手动「不使用」 | 清空并重算 | 已对齐 |
| 下单成功 | 寄件状态整体重置 | 草稿清理，券随之清空 |
| 券查询网络失败 | 参考端同样清空 | RN 保留已选券（避免网络抖动丢券），仅展示错误 |
| 券已过期/失效但仍在列表 | 保留当前券，等下次推荐/重算 | 保留；券不在列表时也不主动清（与参考端一致） |

## 6. 特殊场景清单

- **客户编码扫码**：不请求优惠券；RN 已跳过。
- **铁路产品**：不请求优惠券；RN 无铁路入口。
- **月结/合同客户**：参考端不自动选券（避免覆盖协议价）；RN 目前只能按付款方式排除月结，合同能力未进草稿，自动选券对合同客户仍可能发生。
- **到付/E卡**：参考端不自动选券；RN 排除到付（`PAY_ARIIVE`），无 E 卡。
- **产品价格不可见**：参考端不请求券；RN 已跳过。
- **全额抵扣/0 元券**：价格可见性由 `existsExpressQuotePrice` 兼容「运费被券全额抵扣」的情况。
- **券弹窗广告**：参考端有配置驱动的全屏券弹窗（`DPExpressCouponPopup`，图片/宽高来自配置）；RN 未实现。
- **券不可用原因弹层**：参考端对「发货人手机号需与登录手机号一致」等不可用券有底部弹层（最多 2 张，支持去修改发货人/查看更多）；RN 未实现，不可用券直接在弹层列表展示原因。
- **券列表页带入**：RN 从券列表「去使用」会把 `couponNumber` 通过 `expressDraftBridge.carryFromCoupon` 带入寄件页并重算；带入的券不会被自动选券覆盖。
- **登录前后**：未登录只提示登录后匹配，不发券请求；登录返回后按恢复草稿重新询价并查询券。

## 7. 仍未对齐/待确认

- 合同客户不自动选券：需要把客户合同能力带进草稿或传入 hook。
- 券查询失败时是否清空已选券：参考端清空，RN 保留；若生产要求严格对齐可改，但网络抖动会丢用户券。
- 参考端的券弹窗广告与不可用原因弹层未实现（UI 能力，非计价逻辑）。
- 优惠券 `couponSource`（Default/CouponPicker/CouponList/Cancel）未建模，RN 用 ref 近似自动选券归属，不参与埋点与下单。
