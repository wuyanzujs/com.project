import { paymentApi } from './payment.api'
import { APP_RUNTIME_CONFIG } from '../../shared/config/runtime'
import { appendRouteQuery } from '../../shared/navigation/routeUrl'
import { authService } from '../auth'
import { createServiceFailure } from '../serviceResponse'

import type {
  PaymentItem,
  PaymentListStatus,
  PaymentOrderType,
  PaymentListResult,
  PaymentSummary,
  PaymentWriteOffStatus,
  QueryPaymentListOptions,
  QueryUnpaidPaymentListOptions,
  QueryUnpaidPaymentOptions
} from './types'
import type { DepponResponse } from '../../request/deppon'

const DEFAULT_PAYMENT_RANGE_DAYS = 30
const PAID_PAYMENT_RANGE_DAYS = 180
const DEFAULT_PAGE_SIZE = 10
const PAYMENT_EVALUATE_WEB_PATH = '/depponmobile/survey/land'
const PAYMENT_WRITE_OFF_STATUS: Record<
  PaymentListStatus,
  PaymentWriteOffStatus
> = {
  UNPAID: 0,
  PAID: 1
}

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

function getOrderTypeByRole(role: QueryUnpaidPaymentOptions['role']) {
  return role === 'receive' ? 'DR' : 'OR'
}

function normalizeText(value?: string | null) {
  return (value ?? '').trim()
}

export function getPaymentWriteOffStatus(
  status: PaymentListStatus = 'UNPAID'
): PaymentWriteOffStatus {
  return PAYMENT_WRITE_OFF_STATUS[status]
}

export function getPaymentRangeDays(status: PaymentListStatus = 'UNPAID') {
  return status === 'PAID'
    ? PAID_PAYMENT_RANGE_DAYS
    : DEFAULT_PAYMENT_RANGE_DAYS
}

export function getPaymentEvaluateScene(item: PaymentItem) {
  return item.paymentMethod === 'FC' ? 'S0705' : 'S0405'
}

function createPaymentEvaluateRowData(item: PaymentItem) {
  return JSON.stringify([
    {
      field: 'waybillNumber',
      data: normalizeText(item.waybillNum)
    }
  ])
}

export function createPaymentEvaluateWebUri(
  item: PaymentItem,
  mobile = authService.getCachedUser()?.mobile || ''
) {
  return appendRouteQuery(PAYMENT_EVALUATE_WEB_PATH, {
    channel: APP_RUNTIME_CONFIG.systemCode,
    mobile: normalizeText(mobile),
    scene: getPaymentEvaluateScene(item),
    rowData: createPaymentEvaluateRowData(item)
  })
}

export function createPaymentWaybillQuery(value?: string | null) {
  const waybillNumbers = String(value ?? '')
    .split(/[,，\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)

  if (waybillNumbers.length > 1) {
    return {
      waybillNos: waybillNumbers
    }
  }

  if (waybillNumbers.length === 1) {
    return {
      waybillNo: waybillNumbers[0]
    }
  }

  return {}
}

function normalizePaymentItem(item: PaymentItem): PaymentItem {
  return {
    ...item,
    active: item.active ?? true
  }
}

function toFiniteAmount(value: unknown) {
  const amount = Number(value)

  return Number.isFinite(amount) ? amount : null
}

function getFirstFiniteAmount(...values: unknown[]) {
  for (const value of values) {
    const amount = toFiniteAmount(value)

    if (amount !== null) {
      return amount
    }
  }

  return 0
}

export function getPaymentItemAmount(
  item: PaymentItem,
  status: PaymentListStatus = 'UNPAID'
) {
  if (status === 'PAID') {
    return getFirstFiniteAmount(
      item.writeoffAmount,
      item.totalAmount,
      item.unWriteoffAmount
    )
  }

  return getFirstFiniteAmount(item.unWriteoffAmount, item.totalAmount)
}

function createPaymentSummary(
  waybillNumber: string,
  items: PaymentItem[],
  disabledReason?: string
): PaymentSummary {
  const amount = items.reduce(
    (total, item) => total + getPaymentItemAmount(item, 'UNPAID'),
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

function normalizePaymentList(items: PaymentItem[], status: PaymentListStatus) {
  if (status === 'UNPAID') {
    return filterUnsupportedPayments(items)
  }

  return items.map(normalizePaymentItem)
}

function getTotalPaymentAmount(
  items: PaymentItem[],
  status: PaymentListStatus
) {
  return items.reduce(
    (total, item) => total + getPaymentItemAmount(item, status),
    0
  )
}

export const paymentService = {
  getDateRange: getPaymentDateRange,

  getOrderTypeByRole,

  async queryPaymentList(
    options: QueryPaymentListOptions = {}
  ): Promise<DepponResponse<PaymentListResult>> {
    const status = options.status ?? 'UNPAID'
    const dateRange = getPaymentDateRange(getPaymentRangeDays(status))
    const pageIndex = options.pageIndex ?? 1
    const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE
    const response = await paymentApi.queryUnpaidList(
      {
        ...dateRange,
        orderSource: APP_RUNTIME_CONFIG.appClientChannel,
        pageSize,
        pageIndex,
        writeOffStatus: getPaymentWriteOffStatus(status),
        customerProperty: getOrderTypeByRole(options.role ?? 'sender'),
        ...createPaymentWaybillQuery(options.waybillNumber)
      },
      options.loading ?? false
    )

    if (!response.status || !response.result) {
      return createServiceFailure(
        response.message ||
          (status === 'PAID' ? '暂未获取到支付记录' : '暂未获取到待支付运单')
      )
    }

    const list = normalizePaymentList(response.result.list ?? [], status)
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
        pageAmount: getTotalPaymentAmount(list, status)
      }
    }
  },

  queryUnpaidList(
    options: QueryUnpaidPaymentListOptions = {}
  ): Promise<DepponResponse<PaymentListResult>> {
    return this.queryPaymentList({
      ...options,
      status: 'UNPAID'
    })
  },

  async queryUnpaidByWaybill(
    options: QueryUnpaidPaymentOptions
  ): Promise<DepponResponse<PaymentSummary>> {
    const waybillNumber = options.waybillNumber?.trim()

    if (!waybillNumber) {
      return createServiceFailure('缺少运单号，暂无法查询待支付费用')
    }

    const dateRange = getPaymentDateRange()
    const customerProperty = getOrderTypeByRole(options.role)
    const response = await paymentApi.queryUnpaidList(
      {
        ...dateRange,
        orderSource: APP_RUNTIME_CONFIG.appClientChannel,
        pageSize: options.pageSize ?? DEFAULT_PAGE_SIZE,
        pageIndex: 1,
        writeOffStatus: getPaymentWriteOffStatus('UNPAID'),
        customerProperty: customerProperty as PaymentOrderType,
        ...createPaymentWaybillQuery(waybillNumber)
      },
      options.loading ?? false
    )

    if (!response.status || !response.result) {
      return createServiceFailure(response.message || '暂未获取到待支付费用')
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
