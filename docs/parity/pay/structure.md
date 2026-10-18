# 支付模块生产端结构深挖(dpapp/pages/pay)

生成:2026-10-18(M1;接口参照 = mp-taro3 小程序源码,生产端 libapp.so 实证)
来源:[dpapp-file-inventory.txt](../dpapp-file-inventory.txt)、[mp-api-inventory.txt](../mp-api-inventory.txt)。标注"推断"待真机/量测验证。

## 生产端文件树

```
pages/pay/
├─ pay_confirm/    controller + view              # 确认支付页
├─ pay_waybill/    bind.dart + controller + view  # 运单支付(推断:运单与支付单绑定)
├─ waybill_unpaid/ controller + view              # 待支付运单列表
├─ waybill_paid/   controller + view              # 已支付运单列表
├─ common/         enum + utils
└─ widgets/        cost_sheet 费用明细、method_item 支付方式项、month_sheet 月结、
                   paid_query / unpaid_query / query_empty 查询与空态
```

## 形态要点

1. **生产端支付是"运单维度"**:待支付/已支付运单列表(pay_waybill/waybill_unpaid/waybill_paid),寄后付形态;RN 侧 payment 是"订单待支付"维度(list/checkout/result)。**两者关系需真机确认**:生产端下单页支付(order confirm)之外,还有独立的待支付运单入口。
2. **月结是一等公民**(month_sheet),E 卡支付走独立通道(接口实证,见下)。
3. 支付方式项、费用明细 sheet 是独立组件(method_item/cost_sheet)。

## 接口参照(小程序 api/payment.ts,13 端点)

| 端点(gwapi) | 小程序函数 | RN 状态 |
|---|---|---|
| onlineService/.../pay/pmc/secure/queryUnWriteOffList | FetchPaymentList | ✅ 已接 |
| onlineService/.../pay/pmc/secure/payCreate | CreatePaymentOrder / CreateInvoicePaymentOrder | ✅ 已接 |
| onlineService/.../pay/pmc/secure/payConfirm | ConfirmPaymentOrder | ✅ 已接 |
| onlineService/.../pay/pmc/secure/payCancel | CancelPaymentOrder | ✅ 已接 |
| onlineService/.../pay/pmc/secure/queryPayOrderList | FetchPdaPaymentList | ❌ RN 缺(支付单列表) |
| onlineService/.../pay/secure/queryIsPreCardPay | ExistsECardPayment | ❌ RN 缺(E 卡支付判断) |
| onlineService/.../pay/secure/preCardConfirm | ConfirmECardOrder | ❌ RN 缺(E 卡支付确认) |
| onlineService/.../pricetime/queryExpTltPrice | FetchPdaOrderInfo | ❌ RN 缺(特惠价格) |
| wechatService/.../payScore/*(2 个)、alipay payafteruse/*(2 个) | 支付分/先用后付 | 🚫 平台专属(微信/支付宝小程序容器能力),RN 豁免 |

生产端 libapp.so 实证同样调用 online/pay 系端点(见 [endpoint 对比](../../parity/README.md) 数据基线)。

## RN 现状对照(apps/com.deppon.app)

- 页面:payment/list、payment/checkout、payment/result。
- 接口:pmc 四件套已接;E 卡支付通道与 queryPayOrderList 未接。

## Gap 方向(进 gaps 评审)

1. 待支付/已支付运单列表页(生产端双列表 + 查询空态)是否对齐 RN payment/list 形态。
2. E 卡支付通道(2 端点)+ 月结支付交互(month_sheet)。
3. 支付方式清单与 method_item 的枚举对齐(P0,影响下单闭环)。
