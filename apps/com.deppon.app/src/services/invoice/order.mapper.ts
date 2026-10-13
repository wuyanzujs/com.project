import type {
  InvoiceOrderRaw,
  InvoiceOrderView,
  InvoiceStatusClass
} from './types'

/**
 *
 * @param value 数字值
 * @description 数字补零为两位字符串
 */
function pad(value: number) {
  return String(value).padStart(2, '0')
}

/**
 *
 * @param date 日期对象
 * @description 格式化为日期时间字符串
 */
function formatDateTime(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
    date.getSeconds()
  )}`
}

/**
 *
 * @param value 待处理的文本或数字
 * @description 转成去掉首尾空格的字符串
 */
function normalizeText(value?: string | number | null) {
  return String(value ?? '').trim()
}

/**
 *
 * @param value 待转换的值
 * @description 转成有限数字，非法值返回 0
 */
function toFiniteNumber(value: unknown) {
  const numberValue = Number(value)

  return Number.isFinite(numberValue) ? numberValue : 0
}

/**
 *
 * @param value 文本
 * @param maxLength 最大长度
 * @description 超长文本截断并加省略号
 */
function truncateText(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value
}

/**
 *
 * @param value 秒级或毫秒级时间戳
 * @description 统一时间戳为毫秒
 */
function normalizeTimestamp(value?: number | null) {
  if (!value) {
    return null
  }

  return value < 10000000000 ? value * 1000 : value
}

/**
 *
 * @param value 时间戳
 * @description 格式化时间戳为日期时间文案
 */
function formatTimestamp(value?: number | null) {
  const timestamp = normalizeTimestamp(value)

  if (!timestamp) {
    return '--'
  }

  const date = new Date(timestamp)

  if (Number.isNaN(date.getTime())) {
    return '--'
  }

  return formatDateTime(date)
}

/**
 *
 * @param item 开票运单原始数据
 * @description 解析运单开票状态与可开票标记
 */
function normalizeOrderStatus(item: InvoiceOrderRaw): {
  statusText: string
  statusClass: InvoiceStatusClass
  canApply: boolean
  pendingPayment: boolean
} {
  const pendingPayment = item.unverifyAmount === '1'
  const delay = item.ifCanOpenInvoiceMark === '2'
  const inTransit = item.ifCanOpenInvoiceMark === '1'
  const canApply = item.ifCanOpenInvoiceMark === '0' && !pendingPayment

  if (pendingPayment) {
    return {
      statusText: '待支付',
      statusClass: 'Process',
      canApply,
      pendingPayment
    }
  }

  if (!canApply) {
    return {
      statusText: delay ? '折扣中' : inTransit ? '未签收' : '不可开票',
      statusClass: 'Cancel',
      canApply,
      pendingPayment
    }
  }

  return {
    statusText: '可开票',
    statusClass: 'Success',
    canApply,
    pendingPayment
  }
}

/**
 *
 * @param item 开票运单原始数据
 * @description 把开票运单原始数据转成视图
 */
export function normalizeInvoiceOrder(item: InvoiceOrderRaw): InvoiceOrderView {
  const status = normalizeOrderStatus(item)

  return {
    id: item.orderNo,
    waybillNumber: item.sourceBillNo,
    businessTime: formatTimestamp(item.businessDate),
    senderText: [
      truncateText(normalizeText(item.departurecity), 6),
      truncateText(normalizeText(item.consignorContacts), 8)
    ]
      .filter(Boolean)
      .join(' '),
    consigneeText: [
      truncateText(normalizeText(item.arrivalcity), 6),
      truncateText(normalizeText(item.consignee), 8)
    ]
      .filter(Boolean)
      .join(' '),
    amount: toFiniteNumber(item.unbilledAmount ?? item.unbillAmount),
    unverAmount: toFiniteNumber(item.unverAmount),
    unpaidAmount: toFiniteNumber(item.unPayAmount),
    paymentType: normalizeText(item.paymentType),
    electronSupported: Boolean(item.electricSpecialTicketAuth),
    ...status
  }
}
