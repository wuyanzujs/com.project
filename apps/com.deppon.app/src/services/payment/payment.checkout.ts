import { paymentApi } from './payment.api'
import { getPaymentItemAmount } from './payment.service'
import { APP_RUNTIME_CONFIG } from '../../shared/config/runtime'
import { APP_ROUTES } from '../../shared/navigation/routes'
import { createAppRouteUrl } from '../../shared/navigation/routeUrl'
import {
  getNativeCapabilityErrorMessage,
  isNativeCapabilityError,
  isNativeCapabilityReady
} from '../../shared/platform/capabilities'
import { payWithApp } from '../../shared/platform/payment'
import { authService } from '../auth'
import { createServiceFailure as createFailure } from '../serviceResponse'

import type {
  PaymentCancelRequest,
  PaymentCheckoutResult,
  PaymentCheckoutRouteOptions,
  PaymentCheckoutValidation,
  PaymentCheckoutView,
  PaymentCommand,
  PaymentConfirmResponse,
  PaymentCreateRequest,
  PaymentItem,
  PaymentOrder,
  SubmitPaymentCheckoutOptions
} from './types'
import type { DepponResponse } from '../../request/deppon'

export const APP_PAYMENT_UNAVAILABLE_MESSAGE = '当前版本暂不支持在线支付'

function normalizeText(value?: string | null) {
  return (value ?? '').trim()
}

function getPaymentItemKey(item: PaymentItem) {
  return [
    normalizeText(item.accountStatementDetailNo),
    normalizeText(item.waybillNum),
    item.orderSubType
  ].join(':')
}

export function selectPaymentCheckoutItems(
  items: PaymentItem[],
  detailNo?: string | null
) {
  const normalizedDetailNo = normalizeText(detailNo)
  const candidates = normalizedDetailNo
    ? items.filter(
        item =>
          normalizeText(item.accountStatementDetailNo) === normalizedDetailNo
      )
    : items
  const seenKeys = new Set<string>()

  return candidates.filter(item => {
    const key = getPaymentItemKey(item)

    if (seenKeys.has(key)) {
      return false
    }

    seenKeys.add(key)
    return true
  })
}

export function validatePaymentCheckout(
  items: PaymentItem[]
): PaymentCheckoutValidation {
  if (!items.length) {
    return {
      valid: false,
      message: '未找到可支付费用'
    }
  }

  for (const item of items) {
    if (!normalizeText(item.waybillNum)) {
      return {
        valid: false,
        message: '支付费用缺少运单号'
      }
    }

    if (!normalizeText(item.accountStatementDetailNo)) {
      return {
        valid: false,
        message: `运单 ${item.waybillNum} 缺少支付明细编号`
      }
    }

    if (item.isJdPay === 'Y') {
      return {
        valid: false,
        message: `运单 ${item.waybillNum} 暂不支持在线支付`
      }
    }

    const amount = getPaymentItemAmount(item, 'UNPAID')

    if (!Number.isFinite(amount) || amount <= 0) {
      return {
        valid: false,
        message: `运单 ${item.waybillNum} 的待支付金额不正确`
      }
    }
  }

  return {
    valid: true,
    message: ''
  }
}

export function createPaymentCheckoutView(
  items: PaymentItem[]
): PaymentCheckoutView {
  const normalizedItems = selectPaymentCheckoutItems(items)
  const waybillNumbers = Array.from(
    new Set(normalizedItems.map(item => normalizeText(item.waybillNum)))
  ).filter(Boolean)

  return {
    items: normalizedItems,
    amount: normalizedItems.reduce(
      (total, item) => total + getPaymentItemAmount(item, 'UNPAID'),
      0
    ),
    count: normalizedItems.length,
    waybillNumbers
  }
}

export function createPaymentCheckoutUrl(
  options: PaymentCheckoutRouteOptions
) {
  return createAppRouteUrl(APP_ROUTES.paymentCheckout, {
    waybillNumber: normalizeText(options.waybillNumber),
    role: options.role,
    source: options.source,
    detailNo: normalizeText(options.detailNo)
  })
}

export function buildPaymentCreateRequest(
  items: PaymentItem[]
): PaymentCreateRequest {
  return {
    orderSource: APP_RUNTIME_CONFIG.appClientChannel,
    returnUrl: APP_ROUTES.paymentResult,
    list: selectPaymentCheckoutItems(items)
  }
}

export function createPaymentCancelRequest(
  order: PaymentOrder
): PaymentCancelRequest {
  return {
    orderSource: order.orderSource,
    appId: order.appId,
    payNo: order.payNo,
    requestFrom: order.requestFrom,
    paymentChannelNo: order.paymentChannelNo
  }
}

export function normalizePaymentCommand(
  response: PaymentConfirmResponse
): PaymentCommand {
  if (response.payStatus === 'PAY_SUCCESS') {
    return {
      kind: 'settled',
      transactionId: response.transactionId
    }
  }

  const alipayOrder = normalizeText(response.orderInfo || response.tradeNo)

  if (alipayOrder) {
    return {
      kind: 'native',
      channel: 'alipay',
      payload: {
        orderInfo: alipayOrder,
        tradeNo: normalizeText(response.tradeNo)
      }
    }
  }

  if (
    response.timeStamp &&
    response.nonceStr &&
    response.packages &&
    response.sign
  ) {
    return {
      kind: 'native',
      channel: 'wechat',
      payload: {
        appId: response.appId,
        nonceStr: response.nonceStr,
        package: response.packages,
        paySign: response.sign,
        signType: response.signType,
        timeStamp: response.timeStamp
      }
    }
  }

  if (normalizeText(response.cashierUrl)) {
    return {
      kind: 'native',
      channel: 'h5Cashier',
      payload: {
        url: normalizeText(response.cashierUrl)
      }
    }
  }

  if (
    response.payStatus === 'PAY_FAILED' ||
    response.payStatus === 'CANCELED'
  ) {
    return {
      kind: 'invalid',
      message: '支付单当前不可支付，请刷新后重试'
    }
  }

  return {
    kind: 'invalid',
    message: '支付渠道返回信息不完整'
  }
}

function getPaymentUserId() {
  const user = authService.getCachedUser()

  return normalizeText(
    user?.id || user?.originalOpenId || user?.openId || ''
  )
}

async function cancelPaymentOrder(order: PaymentOrder | null) {
  if (!order) {
    return
  }

  try {
    await paymentApi.cancelOrder(createPaymentCancelRequest(order))
  } catch {
    // The original payment error remains the actionable result for the user.
  }
}

function createCheckoutResult(
  order: PaymentOrder,
  view: PaymentCheckoutView,
  command: PaymentCommand,
  transactionId?: string
): PaymentCheckoutResult {
  return {
    amount: view.amount,
    channel: command.kind === 'native' ? command.channel : undefined,
    outTradeNo: order.outTradeNo,
    paid: true,
    payNo: order.payNo,
    subject: order.subject,
    transactionId,
    waybillNumber: view.waybillNumbers[0] || order.outTradeNo
  }
}

export const paymentCheckoutService = {
  isPaymentAvailable() {
    return isNativeCapabilityReady('payment')
  },

  async submit(
    options: SubmitPaymentCheckoutOptions
  ): Promise<DepponResponse<PaymentCheckoutResult>> {
    const view = createPaymentCheckoutView(options.items)
    const validation = validatePaymentCheckout(view.items)

    if (!validation.valid) {
      return createFailure(validation.message)
    }

    if (!this.isPaymentAvailable()) {
      return createFailure(APP_PAYMENT_UNAVAILABLE_MESSAGE)
    }

    let order: PaymentOrder | null = null

    try {
      const createResponse = await paymentApi.createOrder(
        buildPaymentCreateRequest(view.items)
      )

      if (!createResponse.status || !createResponse.result) {
        return createFailure(
          createResponse.message || '创建支付单失败，请稍后重试'
        )
      }

      order = createResponse.result

      const confirmResponse = await paymentApi.confirmOrder({
        ...order,
        userId: order.userId || getPaymentUserId() || null
      })

      if (!confirmResponse.status || !confirmResponse.result) {
        await cancelPaymentOrder(order)
        return createFailure(
          confirmResponse.message || '确认支付信息失败，请稍后重试'
        )
      }

      const command = normalizePaymentCommand(confirmResponse.result)

      if (command.kind === 'invalid') {
        await cancelPaymentOrder(order)
        return createFailure(command.message)
      }

      if (command.kind === 'settled') {
        return {
          status: true,
          message: '',
          result: createCheckoutResult(
            order,
            view,
            command,
            command.transactionId
          )
        }
      }

      const nativeResult = await payWithApp({
        source: options.source,
        channel: command.channel,
        orderNumber: order.payNo || view.waybillNumbers[0],
        payload: {
          ...command.payload,
          paymentOrder: order
        }
      })

      if (!nativeResult.paid) {
        await cancelPaymentOrder(order)
        return createFailure('支付未完成')
      }

      return {
        status: true,
        message: '',
        result: createCheckoutResult(
          order,
          view,
          command,
          nativeResult.transactionId
        )
      }
    } catch (error) {
      await cancelPaymentOrder(order)

      if (isNativeCapabilityError(error)) {
        return createFailure(getNativeCapabilityErrorMessage(error))
      }

      return createFailure(
        error instanceof Error ? error.message : '支付失败，请稍后重试'
      )
    }
  }
}
