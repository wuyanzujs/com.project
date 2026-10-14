import type { PrintListResponse, PrintListResult, PrintOrderListItem, PrintOrderRaw } from './types'

interface PrintListPaginationFallback {
  pageIndex: number
  pageSize: number
}

/**
 *
 * @param value 原始值
 * @description 空值返回空串，其余转字符串去空格
 */
function normalizeText(value: unknown) {
  if (value === null || value === undefined) {
    return ''
  }

  return String(value).trim()
}

/**
 *
 * @param value 原始值
 * @param fallback 兜底值
 * @description 转非负整数，非法时返回兜底值
 */
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

/**
 *
 * @param value 原始值
 * @param fallback 兜底值
 * @description 转正整数，非法时返回兜底值
 */
function toPositiveInteger(value: unknown, fallback: number) {
  const normalized = toNonNegativeInteger(value, fallback)

  return normalized > 0 ? normalized : fallback
}

/**
 *
 * @param value 收件人手机号
 * @description 手机号脱敏，无值时返回 --
 */
export function maskPrintRecipientPhone(value: unknown) {
  const phone = normalizeText(value)

  if (phone.length <= 7) {
    return phone || '--'
  }

  return `${phone.slice(0, 3)}****${phone.slice(-4)}`
}

/**
 *
 * @param province 省
 * @param city 市
 * @param area 区
 * @param address 详细地址
 * @description 拼接收件人省市区与详细地址
 */
export function createPrintRecipientAddress(province: unknown, city: unknown, area: unknown, address: unknown) {
  const segments = [province, city, area, address]
    .map(normalizeText)
    .filter(Boolean)
    .filter((segment, index, list) => segment !== list[index - 1])

  return segments.join('') || '地址信息暂缺'
}

/**
 *
 * @param raw 打印订单原始数据
 * @param index 列表下标，用于兜底 key
 * @description 归一打印订单为列表展示项
 */
export function normalizePrintOrder(raw: PrintOrderRaw, index = 0): PrintOrderListItem {
  const id = normalizeText(raw.id)
  const waybillNumber = normalizeText(raw.waybillNumber)
  const fallbackKey = `print-order-${index + 1}`

  return {
    key: id || waybillNumber || fallbackKey,
    id,
    waybillNumber: waybillNumber || '--',
    recipientName: normalizeText(raw.receiveName) || '收件人信息暂缺',
    recipientPhone: maskPrintRecipientPhone(raw.receivePhone),
    address: createPrintRecipientAddress(raw.receiveProvince, raw.receiveCity, raw.receiveArea, raw.receiveAddress),
    ...(raw.deviceType === '1' || raw.deviceType === '2' ? { deviceType: raw.deviceType } : {})
  }
}

/**
 *
 * @param raw 打印列表原始响应
 * @param fallback 分页兜底值
 * @description 归一打印列表分页与列表数据
 */
export function normalizePrintListResult(raw: PrintListResponse, fallback: PrintListPaginationFallback): PrintListResult {
  const pageSize = toPositiveInteger(raw.pageSize, fallback.pageSize)
  const pageIndex = toPositiveInteger(raw.pageNum, fallback.pageIndex)
  const pageOffset = (pageIndex - 1) * pageSize
  const list = (raw.list ?? []).map((item, index) => normalizePrintOrder(item, pageOffset + index))
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
