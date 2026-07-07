import { paymentApi } from './payment.api'
import { APP_RUNTIME_CONFIG } from '../../shared/config/runtime'

import type {
  PaymentItem,
  PaymentOrderType,
  PaymentListResult,
  PaymentSummary,
  QueryUnpaidPaymentListOptions,
  QueryUnpaidPaymentOptions
} from './types'
import type { DepponResponse } from '../../request/deppon'

const DEFAULT_PAYMENT_RANGE_DAYS = 30
const DEFAULT_PAGE_SIZE = 10
const UNPAID_STATUS = 0

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function formatPaymentDateTime(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
    date.getSeconds()
  )}`
}

function getPaymentDateRange(days = DEFAULT_PAYMENT_RANGE_DAYS) {
  const endDate = new Date()
  const startDate = new Date()
  const rangeDays =
    Number.isFinite(days) && days > 0 ? days : DEFAULT_PAYMENT_RANGE_DAYS

  endDate.setHours(23, 59, 59, 0)
  startDate.setDate(startDate.getDate() - rangeDays)
  startDate.setHours(0, 0, 0, 0)

  return {
    startTime: formatPaymentDateTime(startDate),
    endTime: formatPaymentDateTime(endDate)
  }
}

function createFailure<TResult>(message: string): DepponResponse<TResult> {
  return {
    status: false,
    message,
    result: null
  }
}

function getOrderTypeByRole(role: QueryUnpaidPaymentOptions['role']) {
  return role === 'receive' ? 'DR' : 'OR'
}

function normalizePaymentItem(item: PaymentItem): PaymentItem {
  return {
    ...item,
    active: item.active ?? true
  }
}

function getPaymentAmount(item: PaymentItem) {
  const amount = Number(item.unWriteoffAmount || item.totalAmount || 0)

  return Number.isFinite(amount) ? amount : 0
}

function createPaymentSummary(
  waybillNumber: string,
  items: PaymentItem[],
  disabledReason?: string
): PaymentSummary {
  const amount = items.reduce(
    (total, item) => total + getPaymentAmount(item),
    0
  )

  return {
    waybillNumber,
    count: items.length,
    amount,
    items,
    canPay: items.length > 0 && !disabledReason,
    disabledReason
  }
}

function filterUnsupportedPayments(items: PaymentItem[]) {
  return items.filter((item) => item.isJdPay !== 'Y').map(normalizePaymentItem)
}

function getTotalPaymentAmount(items: PaymentItem[]) {
  return items.reduce((total, item) => total + getPaymentAmount(item), 0)
}

export const paymentService = {
  getDateRange: getPaymentDateRange,

  getOrderTypeByRole,

  async queryUnpaidList(
    options: QueryUnpaidPaymentListOptions = {}
  ): Promise<DepponResponse<PaymentListResult>> {
    const dateRange = getPaymentDateRange()
    const pageIndex = options.pageIndex ?? 1
    const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE
    const response = await paymentApi.queryUnpaidList(
      {
        ...dateRange,
        orderSource: APP_RUNTIME_CONFIG.appClientChannel,
        pageSize,
        pageIndex,
        writeOffStatus: UNPAID_STATUS,
        customerProperty: getOrderTypeByRole(options.role ?? 'sender'),
        waybillNo: options.waybillNumber?.trim()
      },
      options.loading ?? false
    )

    if (!response.status || !response.result) {
      return createFailure(response.message || '暂未获取到待支付运单')
    }

    const list = filterUnsupportedPayments(response.result.list ?? [])
    const totalRows = response.result.totalRows ?? list.length

    return {
      ...response,
      result: {
        list,
        pageIndex: response.result.pageNum ?? pageIndex,
        pageSize: response.result.pageSize ?? pageSize,
        totalPage:
          response.result.totalPage ??
          Math.max(1, Math.ceil(totalRows / pageSize)),
        totalRows,
        pageAmount: getTotalPaymentAmount(list)
      }
    }
  },

  async queryUnpaidByWaybill(
    options: QueryUnpaidPaymentOptions
  ): Promise<DepponResponse<PaymentSummary>> {
    const waybillNumber = options.waybillNumber?.trim()

    if (!waybillNumber) {
      return createFailure('缺少运单号，暂无法查询待支付费用')
    }

    const dateRange = getPaymentDateRange()
    const customerProperty = getOrderTypeByRole(options.role)
    const response = await paymentApi.queryUnpaidList(
      {
        ...dateRange,
        orderSource: APP_RUNTIME_CONFIG.appClientChannel,
        pageSize: options.pageSize ?? DEFAULT_PAGE_SIZE,
        pageIndex: 1,
        writeOffStatus: UNPAID_STATUS,
        customerProperty: customerProperty as PaymentOrderType,
        waybillNo: waybillNumber
      },
      options.loading ?? false
    )

    if (!response.status || !response.result) {
      return createFailure(response.message || '暂未获取到待支付费用')
    }

    const rawItems = response.result.list ?? []
    const normalItems = filterUnsupportedPayments(rawItems)
    const disabledReason =
      rawItems.length > 0 && normalItems.length === 0
        ? '该运单暂不支持 App 在线支付'
        : undefined

    return {
      ...response,
      result: createPaymentSummary(
        waybillNumber,
        normalItems,
        disabledReason
      )
    }
  }
}
