import type {
  PrintListResponse,
  PrintListResult,
  PrintOrderListItem,
  PrintOrderRaw
} from './types'

interface PrintListPaginationFallback {
  pageIndex: number
  pageSize: number
}

function normalizeText(value: unknown) {
  if (value === null || value === undefined) {
    return ''
  }

  return String(value).trim()
}

function toNonNegativeInteger(value: unknown, fallback: number) {
  if (value === null || value === undefined || value === '') {
    return fallback
  }

  const normalized = Number(value)

  if (!Number.isFinite(normalized) || normalized < 0) {
    return fallback
  }

  return Math.floor(normalized)
}

function toPositiveInteger(value: unknown, fallback: number) {
  const normalized = toNonNegativeInteger(value, fallback)

  return normalized > 0 ? normalized : fallback
}

export function maskPrintRecipientPhone(value: unknown) {
  const phone = normalizeText(value)

  if (phone.length <= 7) {
    return phone || '--'
  }

  return `${phone.slice(0, 3)}****${phone.slice(-4)}`
}

export function createPrintRecipientAddress(
  province: unknown,
  city: unknown,
  area: unknown,
  address: unknown
) {
  const segments = [province, city, area, address]
    .map(normalizeText)
    .filter(Boolean)
    .filter((segment, index, list) => segment !== list[index - 1])

  return segments.join('') || '地址信息暂缺'
}

export function normalizePrintOrder(
  raw: PrintOrderRaw,
  index = 0
): PrintOrderListItem {
  const id = normalizeText(raw.id)
  const waybillNumber = normalizeText(raw.waybillNumber)
  const fallbackKey = `print-order-${index + 1}`

  return {
    key: id || waybillNumber || fallbackKey,
    id,
    waybillNumber: waybillNumber || '--',
    recipientName: normalizeText(raw.receiveName) || '收件人信息暂缺',
    recipientPhone: maskPrintRecipientPhone(raw.receivePhone),
    address: createPrintRecipientAddress(
      raw.receiveProvince,
      raw.receiveCity,
      raw.receiveArea,
      raw.receiveAddress
    ),
    ...(raw.deviceType === '1' || raw.deviceType === '2'
      ? { deviceType: raw.deviceType }
      : {})
  }
}

export function normalizePrintListResult(
  raw: PrintListResponse,
  fallback: PrintListPaginationFallback
): PrintListResult {
  const pageSize = toPositiveInteger(raw.pageSize, fallback.pageSize)
  const pageIndex = toPositiveInteger(raw.pageNum, fallback.pageIndex)
  const pageOffset = (pageIndex - 1) * pageSize
  const list = (raw.list ?? []).map((item, index) =>
    normalizePrintOrder(item, pageOffset + index)
  )
  const totalRows = toNonNegativeInteger(raw.totalRows, list.length)
  const fallbackTotalPage = Math.max(1, Math.ceil(totalRows / pageSize))
  const totalPage = toPositiveInteger(raw.totalPage, fallbackTotalPage)

  return {
    list,
    pageIndex,
    pageSize,
    totalPage,
    totalRows
  }
}
