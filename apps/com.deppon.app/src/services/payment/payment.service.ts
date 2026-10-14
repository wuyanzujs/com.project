import type { DepponResponse } from '@/request/deppon'
import { APP_RUNTIME_CONFIG } from '@/shared/config/runtime'
import { appendRouteQuery } from '@/shared/navigation/routeUrl'

import { paymentApi } from './payment.api'
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

const DEFAULT_PAYMENT_RANGE_DAYS = 30
const PAID_PAYMENT_RANGE_DAYS = 180
const DEFAULT_PAGE_SIZE = 10
const PAYMENT_EVALUATE_WEB_PATH = '/depponmobile/survey/land'
const PAYMENT_WRITE_OFF_STATUS: Record<PaymentListStatus, PaymentWriteOffStatus> = {
  UNPAID: 0,
  PAID: 1
}

/**
 *
 * @param value 数字
 * @description 补零为两位数字字符串
 */
function pad(value: number) {
  return String(value).padStart(2, '0')
}

/**
 *
 * @param date 日期
 * @description 格式化为接口需要的日期时间串
 */
function formatPaymentDateTime(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

/**
 *
 * @param days 往前天数
 * @description 生成支付查询的起止时间范围
 */
function getPaymentDateRange(days = DEFAULT_PAYMENT_RANGE_DAYS) {
  const endDate = new Date()
  const startDate = new Date()
  const rangeDays = Number.isFinite(days) && days > 0 ? days : DEFAULT_PAYMENT_RANGE_DAYS

  endDate.setHours(23, 59, 59, 0)
  startDate.setDate(startDate.getDate() - rangeDays)
  startDate.setHours(0, 0, 0, 0)

  return {
    startTime: formatPaymentDateTime(startDate),
    endTime: formatPaymentDateTime(endDate)
  }
}

/**
 *
 * @param role 用户角色
 * @description 按角色返回订单类型
 */
function getOrderTypeByRole(role: QueryUnpaidPaymentOptions['role']) {
  return role === 'receive' ? 'DR' : 'OR'
}

/**
 *
 * @param value 任意文本
 * @description 去除首尾空格，空值返回空串
 */
function normalizeText(value?: string | null) {
  return (value ?? '').trim()
}

/**
 *
 * @param status 支付列表状态
 * @description 取状态对应的核销状态值
 */
export function getPaymentWriteOffStatus(status: PaymentListStatus = 'UNPAID'): PaymentWriteOffStatus {
  return PAYMENT_WRITE_OFF_STATUS[status]
}

/**
 *
 * @param status 支付列表状态
 * @description 取状态对应的查询天数
 */
export function getPaymentRangeDays(status: PaymentListStatus = 'UNPAID') {
  return status === 'PAID' ? PAID_PAYMENT_RANGE_DAYS : DEFAULT_PAYMENT_RANGE_DAYS
}

/**
 *
 * @param item 支付费用项
 * @description 按支付方式取评价 scene
 */
export function getPaymentEvaluateScene(item: PaymentItem) {
  return item.paymentMethod === 'FC' ? 'S0705' : 'S0405'
}

/**
 *
 * @param type 订单类型
 * @description 取订单类型的中文名称
 */
export function getPaymentOrderTypeLabel(type?: PaymentOrderType | null) {
  if (type === 'CR') {
    return '货款'
  }

  if (type === 'DVAR') {
    return '保管费'
  }

  return '运费'
}

/**
 *
 * @param item 支付费用项
 * @description 构造评价 rowData JSON 串
 */
function createPaymentEvaluateRowData(item: PaymentItem) {
  return JSON.stringify([
    {
      field: 'waybillNumber',
      data: normalizeText(item.waybillNum)
    }
  ])
}

/**
 *
 * @param item 支付费用项
 * @param mobile 评价手机号
 * @description 创建评价页面 URI
 */
export function createPaymentEvaluateWebUri(item: PaymentItem, mobile = authService.getCachedUser()?.mobile || '') {
  return appendRouteQuery(PAYMENT_EVALUATE_WEB_PATH, {
    channel: APP_RUNTIME_CONFIG.systemCode,
    mobile: normalizeText(mobile),
    scene: getPaymentEvaluateScene(item),
    rowData: createPaymentEvaluateRowData(item)
  })
}

/**
 *
 * @param value 运单号文本，可含多个
 * @description 解析运单号为查询参数
 */
export function createPaymentWaybillQuery(value?: string | null) {
  const waybillNumbers = String(value ?? '')
    .split(/[,，\s]+/)
    .map(item => item.trim())
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

/**
 *
 * @param item 支付费用项
 * @description 补全 active 默认值
 */
function normalizePaymentItem(item: PaymentItem): PaymentItem {
  return {
    ...item,
    active: item.active ?? true
  }
}

/**
 *
 * @param value 原始金额
 * @description 转为有效数字，非法返回 null
 */
function toFiniteAmount(value: unknown) {
  const amount = Number(value)

  return Number.isFinite(amount) ? amount : null
}

/**
 *
 * @param values 候选金额列表
 * @description 取首个有效金额，都无效返回 0
 */
function getFirstFiniteAmount(...values: unknown[]) {
  for (const value of values) {
    const amount = toFiniteAmount(value)

    if (amount !== null) {
      return amount
    }
  }

  return 0
}

/**
 *
 * @param item 支付费用项
 * @param status 支付列表状态
 * @description 按状态取费用项的支付金额
 */
export function getPaymentItemAmount(item: PaymentItem, status: PaymentListStatus = 'UNPAID') {
  if (status === 'PAID') {
    return getFirstFiniteAmount(item.writeoffAmount, item.totalAmount, item.unWriteoffAmount)
  }

  return getFirstFiniteAmount(item.unWriteoffAmount, item.totalAmount)
}

/**
 *
 * @param waybillNumber 运单号
 * @param items 费用项列表
 * @param disabledReason 不可支付原因，可选
 * @description 构造运单的待支付汇总
 */
function createPaymentSummary(waybillNumber: string, items: PaymentItem[], disabledReason?: string): PaymentSummary {
  const amount = items.reduce((total, item) => total + getPaymentItemAmount(item, 'UNPAID'), 0)

  return {
    waybillNumber,
    count: items.length,
    amount,
    items,
    canPay: items.length > 0 && !disabledReason,
    disabledReason
  }
}

/**
 *
 * @param items 费用项列表
 * @description 过滤京东支付项并补全字段
 */
function filterUnsupportedPayments(items: PaymentItem[]) {
  return items.filter(item => item.isJdPay !== 'Y').map(normalizePaymentItem)
}

/**
 *
 * @param items 费用项列表
 * @param status 支付列表状态
 * @description 按状态归一支付列表
 */
function normalizePaymentList(items: PaymentItem[], status: PaymentListStatus) {
  if (status === 'UNPAID') {
    return filterUnsupportedPayments(items)
  }

  return items.map(normalizePaymentItem)
}

/**
 *
 * @param items 费用项列表
 * @param status 支付列表状态
 * @description 汇总费用项的支付金额
 */
function getTotalPaymentAmount(items: PaymentItem[], status: PaymentListStatus) {
  return items.reduce((total, item) => total + getPaymentItemAmount(item, status), 0)
}

export const paymentService = {
  getDateRange: getPaymentDateRange,

  getOrderTypeByRole,

  /**
   *
   * @param options 列表查询参数
   * @description 查询待支付或已支付记录列表
   */
  async queryPaymentList(options: QueryPaymentListOptions = {}): Promise<DepponResponse<PaymentListResult>> {
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
      return createServiceFailure(response.message || (status === 'PAID' ? '暂未获取到支付记录' : '暂未获取到待支付运单'))
    }

    const list = normalizePaymentList(response.result.list ?? [], status)
    const totalRows = response.result.totalRows ?? list.length

    return {
      ...response,
      result: {
        list,
        pageIndex: response.result.pageNum ?? pageIndex,
        pageSize: response.result.pageSize ?? pageSize,
        totalPage: response.result.totalPage ?? Math.max(1, Math.ceil(totalRows / pageSize)),
        totalRows,
        pageAmount: getTotalPaymentAmount(list, status)
      }
    }
  },

  /**
   *
   * @param options 列表查询参数
   * @description 查询待支付运单列表
   */
  queryUnpaidList(options: QueryUnpaidPaymentListOptions = {}): Promise<DepponResponse<PaymentListResult>> {
    return this.queryPaymentList({
      ...options,
      status: 'UNPAID'
    })
  },

  /**
   *
   * @param options 查询参数
   * @description 按运单号查询待支付费用汇总
   */
  async queryUnpaidByWaybill(options: QueryUnpaidPaymentOptions): Promise<DepponResponse<PaymentSummary>> {
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
    const disabledReason = rawItems.length > 0 && normalItems.length === 0 ? '该运单暂不支持 App 在线支付' : undefined

    return {
      ...response,
      result: createPaymentSummary(waybillNumber, normalItems, disabledReason)
    }
  }
}
