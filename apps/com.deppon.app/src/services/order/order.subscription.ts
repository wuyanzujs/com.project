import { orderApi } from './order.api'
import { getOrderClassLabel } from './order.mapper'
import { createServiceFailure } from '../serviceResponse'

import type {
  OrderDetailActionView,
  WaybillSubscriptionRaw,
  WaybillSubscriptionView
} from './types'
import type { DepponResponse } from '../../request/deppon'

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function formatSubscriptionTime(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return ''
  }

  const timestamp = Number(value)
  const date = new Date(Number.isFinite(timestamp) ? timestamp : String(value))

  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  const pad = (item: number) => String(item).padStart(2, '0')

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function normalizeWaybillSubscription(
  raw: WaybillSubscriptionRaw
): WaybillSubscriptionView | null {
  const waybillNumber = normalizeText(raw.wayBillNo)

  if (!waybillNumber) {
    return null
  }

  const orderClass = Number(raw.orderClassification)
  const rawStatusText = normalizeText(raw.statusType)

  return {
    id: waybillNumber,
    role: raw.isReceiver === 'Y' && raw.isSender !== 'Y' ? 'receive' : 'sender',
    senderName: normalizeText(raw.sender),
    senderCity: normalizeText(raw.sendCity),
    consigneeName: normalizeText(raw.consignee),
    consigneeCity: normalizeText(raw.consignCity),
    waybillNumber,
    statusText: Number.isFinite(orderClass)
      ? getOrderClassLabel(orderClass, rawStatusText)
      : rawStatusText || '未知状态',
    createdAt: formatSubscriptionTime(raw.createWaybillTime),
    isExpress: raw.tableType === '2' || raw.tableType === 'EXPRESS'
  }
}

export function createOrderSubscriptionAction(
  subscribed: boolean | null,
  loading = false
): OrderDetailActionView | null {
  if (subscribed === null) {
    return null
  }

  return {
    kind: 'subscribe',
    title: loading ? '处理中' : subscribed ? '取消关注' : '关注运单',
    summary: subscribed ? '当前运单已关注' : '当前运单物流动态',
    target: 'subscription',
    tone: subscribed ? 'neutral' : 'primary',
    badgeText: 'App',
    loginRequired: true
  }
}

export const orderSubscriptionService = {
  async queryList(): Promise<DepponResponse<WaybillSubscriptionView[]>> {
    const response = await orderApi.querySubscriptions()

    if (!response.status || !response.result) {
      return createServiceFailure(response.message || '暂未获取到关注运单')
    }

    return {
      ...response,
      result: response.result
        .filter((item): item is WaybillSubscriptionRaw => !!item)
        .map(normalizeWaybillSubscription)
        .filter((item): item is WaybillSubscriptionView => !!item)
    }
  },

  async queryStatus(waybillNumber?: string | null) {
    const normalizedNumber = normalizeText(waybillNumber)

    if (!normalizedNumber) {
      return createServiceFailure<boolean>('缺少运单号')
    }

    const response = await orderApi.querySubscriptionStatus(normalizedNumber)

    if (!response.status || typeof response.result !== 'boolean') {
      return createServiceFailure<boolean>(
        response.message || '暂未获取到关注状态'
      )
    }

    return response as DepponResponse<boolean>
  },

  async setSubscribed(waybillNumber: string, subscribed: boolean) {
    const normalizedNumber = normalizeText(waybillNumber)

    if (!normalizedNumber) {
      return createServiceFailure<null>('缺少运单号')
    }

    const response = subscribed
      ? await orderApi.subscribeWaybill({ wayBillNo: normalizedNumber })
      : await orderApi.cancelWaybillSubscription({
          wayBillNo: normalizedNumber
        })

    if (!response.status || response.result === false) {
      return createServiceFailure<null>(
        response.message ||
          (subscribed ? '关注失败，请稍后再试' : '取消关注失败，请稍后再试')
      )
    }

    return {
      ...response,
      result: null
    } satisfies DepponResponse<null>
  }
}
