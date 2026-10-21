import type { OrderDetail, OrderEditPackagingDraft, OrderModifyRequest } from '../core/types'

export const ORDER_EDIT_PACKAGING_EXTEND_KEY = 'packingService'
export const ORDER_EDIT_PACKAGING_MIN_COUNT = 1
export const ORDER_EDIT_PACKAGING_MAX_COUNT = 999
export const ORDER_EDIT_PACKAGING_UNIT_FEE = 2

/**
 *
 * @param value 原始值
 * @description 转为去除首尾空格的文本
 */
function normalizeText(value: unknown) {
  if (value === null || value === undefined) {
    return ''
  }

  return String(value).trim()
}

/**
 *
 * @param detail 订单详情
 * @param key 扩展字段 key
 * @description 倒序读取订单扩展字段的值
 */
function getOrderExtendFieldValue(detail: OrderDetail, key: string) {
  const fields = Array.isArray(detail.orderExtendFields) ? detail.orderExtendFields : []

  for (let index = fields.length - 1; index >= 0; index -= 1) {
    const field = fields[index]

    if (normalizeText(field?.key) === key) {
      return field?.value
    }
  }

  return undefined
}

/**
 *
 * @param value 打包件数
 * @description 归一打包件数到合法范围
 */
export function normalizeOrderEditPackagingCount(value: unknown) {
  const count = Number(value)

  if (!Number.isFinite(count) || count <= 0) {
    return 0
  }

  return Math.min(ORDER_EDIT_PACKAGING_MAX_COUNT, Math.max(ORDER_EDIT_PACKAGING_MIN_COUNT, Math.trunc(count)))
}

/**
 *
 * @param value 件数输入文本
 * @description 清洗打包件数输入，仅保留数字
 */
export function normalizeOrderEditPackagingCountInput(value: string) {
  return value
    .replace(/\D/g, '')
    .replace(/^0+(?=\d)/, '')
    .slice(0, String(ORDER_EDIT_PACKAGING_MAX_COUNT).length)
}

/**
 *
 * @param detail 订单详情
 * @description 从订单详情创建打包服务草稿
 */
export function createOrderEditPackagingDraft(detail: OrderDetail): OrderEditPackagingDraft {
  return {
    count: normalizeOrderEditPackagingCount(getOrderExtendFieldValue(detail, ORDER_EDIT_PACKAGING_EXTEND_KEY))
  }
}

/**
 *
 * @param packaging 打包服务草稿
 * @param value 新的件数
 * @description 更新打包服务件数
 */
export function updateOrderEditPackagingCount(packaging: OrderEditPackagingDraft, value: unknown): OrderEditPackagingDraft {
  const count = normalizeOrderEditPackagingCount(value)

  return count === packaging.count ? packaging : { count }
}

/**
 *
 * @param packaging 打包服务草稿
 * @description 生成打包件数校验提示
 */
export function validateOrderEditPackaging(packaging: OrderEditPackagingDraft) {
  const count = packaging.count

  if (!Number.isFinite(count) || !Number.isInteger(count) || count < 0 || count > ORDER_EDIT_PACKAGING_MAX_COUNT) {
    return [`打包服务件数须为 0 到 ${ORDER_EDIT_PACKAGING_MAX_COUNT} 的整数`]
  }

  return []
}

/**
 *
 * @param packaging 打包服务草稿
 * @description 计算打包服务总费用
 */
export function getOrderEditPackagingFee(packaging: OrderEditPackagingDraft) {
  return normalizeOrderEditPackagingCount(packaging.count) * ORDER_EDIT_PACKAGING_UNIT_FEE
}

/**
 *
 * @param packaging 当前草稿
 * @param origin 原始草稿
 * @description 判断打包件数是否发生变化
 */
export function isOrderEditPackagingChanged(packaging: OrderEditPackagingDraft, origin: OrderEditPackagingDraft) {
  return normalizeOrderEditPackagingCount(packaging.count) !== normalizeOrderEditPackagingCount(origin.count)
}

/**
 *
 * @param packaging 打包服务草稿
 * @description 生成订单修改接口的打包字段
 */
export function createOrderEditPackagingRequestFields(packaging: OrderEditPackagingDraft): Pick<OrderModifyRequest, 'orderExtendFields'> {
  return {
    orderExtendFields: [
      {
        key: ORDER_EDIT_PACKAGING_EXTEND_KEY,
        value: String(normalizeOrderEditPackagingCount(packaging.count))
      }
    ]
  }
}
