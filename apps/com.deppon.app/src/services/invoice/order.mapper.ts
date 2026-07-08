import type {
  InvoiceOrderRaw,
  InvoiceOrderView,
  InvoiceStatusClass
} from './types'

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function formatDateTime(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
    date.getSeconds()
  )}`
}

function normalizeText(value?: string | number | null) {
  return String(value ?? '').trim()
}

function toFiniteNumber(value: unknown) {
  const numberValue = Number(value)

  return Number.isFinite(numberValue) ? numberValue : 0
}

function truncateText(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value
}

function normalizeTimestamp(value?: number | null) {
  if (!value) {
    return null
  }

  return value < 10000000000 ? value * 1000 : value
}

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

export function normalizeInvoiceOrder(item: InvoiceOrderRaw): InvoiceOrderView {
  const status = normalizeOrderStatus(item)

  return {
    id: item.orderNo,
    waybillNumber: item.sourceBillNo,
    businessTime: formatTimestamp(item.businessDate),
    senderText: [
      truncateText(normalizeText(item.departurecity), 6),
      truncateText(normalizeText(item.consignorContacts), 8)
    ].filter(Boolean).join(' '),
    consigneeText: [
      truncateText(normalizeText(item.arrivalcity), 6),
      truncateText(normalizeText(item.consignee), 8)
    ].filter(Boolean).join(' '),
    amount: toFiniteNumber(item.unbilledAmount ?? item.unbillAmount),
    unverAmount: toFiniteNumber(item.unverAmount),
    unpaidAmount: toFiniteNumber(item.unPayAmount),
    paymentType: normalizeText(item.paymentType),
    electronSupported: Boolean(item.electricSpecialTicketAuth),
    ...status
  }
}
