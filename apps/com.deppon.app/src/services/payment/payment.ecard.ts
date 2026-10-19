import { ecardApi } from '@/services/ecard'
import { APP_RUNTIME_CONFIG } from '@/shared/config/runtime'

import { paymentApi } from './payment.api'
import { buildPaymentCreateRequest, createPaymentCancelRequest, createPaymentCheckoutView } from './payment.checkout'

import type { ECardChannelView, ECardCheckRequest, PaymentCheckoutResult, PaymentItem, PaymentOrder } from './types'

const EMPTY_CHANNEL: ECardChannelView = {
  balance: 0,
  enabled: false,
  passwordSet: false,
  registered: false,
  tips: ''
}

/**
 *
 * @param item 待支付费用项
 * @description 组装 E 卡可用性查询请求
 */
export function createECardCheckRequest(item: PaymentItem): ECardCheckRequest {
  return {
    waybillNum: item.waybillNum || '',
    orderSubType: item.orderSubType || ''
  }
}

/**
 *
 * @param balance E 卡余额
 * @param amount 待支付金额
 * @description 余额是否足够覆盖本次支付
 */
export function isECardBalanceSufficient(balance: number, amount: number) {
  return balance >= amount
}

/**
 * @description E 卡通道可支付时必须同时满足开通、密码和余额要求
 */
export function canPayWithECard(channel: ECardChannelView | null, amount: number): boolean {
  return Boolean(channel?.enabled && channel.registered && channel.passwordSet && isECardBalanceSufficient(channel.balance, amount))
}

/**
 * @description 使用本次费用明细选择默认支付方式，避免读取页面上一轮金额
 */
export function selectPaymentCheckoutChannel(items: PaymentItem[], channel: ECardChannelView): 'APP' | 'ECARD' {
  const view = createPaymentCheckoutView(items)

  return view.items.length > 0 && canPayWithECard(channel, view.amount) ? 'ECARD' : 'APP'
}

/**
 *
 * @param item 待支付费用项,空表示无可探测对象
 * @description 探测 E 卡支付通道:后端可用性 + 余额/注册/密码态;不可用返回 enabled=false 的视图
 */
export async function loadECardChannel(item: PaymentItem | null): Promise<ECardChannelView> {
  if (!item) {
    return EMPTY_CHANNEL
  }

  const checkResponse = await paymentApi.queryECardPayable(createECardCheckRequest(item))

  if (!checkResponse.status || !checkResponse.result) {
    return EMPTY_CHANNEL
  }

  const balanceResponse = await ecardApi.queryBalance()

  if (!balanceResponse.status || !balanceResponse.result) {
    return { ...EMPTY_CHANNEL, enabled: true }
  }

  return {
    balance: Number(balanceResponse.result.balance) || 0,
    enabled: true,
    passwordSet: Boolean(balanceResponse.result.passwordSet),
    registered: Boolean(balanceResponse.result.existCustomer),
    tips: balanceResponse.result.rechargeDesc || ''
  }
}

/**
 *
 * @param items 待支付费用项
 * @description 创建 E 卡支付单(仅创建,确认在密码校验后)
 */
export async function createECardOrder(items: PaymentItem[]): Promise<{ order: PaymentOrder | null; status: boolean; message: string }> {
  const view = createPaymentCheckoutView(items)
  const response = await paymentApi.createOrder(buildPaymentCreateRequest(view.items))

  if (!response.status || !response.result) {
    return { order: null, status: false, message: response.message || '创建支付单失败，请稍后重试' }
  }

  return { order: response.result, status: true, message: '' }
}

/**
 *
 * @param payNo 支付单号
 * @param password E 卡支付密码
 * @description E 卡密码确认扣款;订单来源与 payCreate 同取 App 渠道码
 */
export async function confirmECardPayment(payNo: string, password: string): Promise<{ status: boolean; message: string }> {
  const response = await paymentApi.confirmECardOrder({
    appId: APP_RUNTIME_CONFIG.appClientChannel,
    password,
    payNo
  })

  return { status: Boolean(response.status && response.result), message: response.message || '' }
}

/**
 *
 * @param order 已创建的支付单,可为空
 * @description 放弃 E 卡支付时取消支付单,失败静默(原始流程以用户侧提示为准)
 */
export async function discardECardOrder(order: PaymentOrder | null): Promise<void> {
  if (!order) {
    return
  }

  try {
    await paymentApi.cancelOrder(createPaymentCancelRequest(order))
  } catch {
    // 取消失败不阻塞用户侧错误提示。
  }
}

/**
 *
 * @param payNo 支付单号
 * @param amount 支付金额
 * @param waybillNumber 运单号
 * @description 组装 E 卡支付成功后的收银台结果
 */
export function createECardCheckoutResult(payNo: string, amount: number, waybillNumber: string): PaymentCheckoutResult {
  return {
    amount,
    outTradeNo: payNo,
    paid: true,
    payNo,
    subject: 'E卡支付',
    waybillNumber
  }
}
