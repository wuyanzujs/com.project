import type {
  OrderDetail,
  OrderEditPackagingDraft,
  OrderModifyRequest
} from './types'

export const ORDER_EDIT_PACKAGING_EXTEND_KEY = 'packingService'
export const ORDER_EDIT_PACKAGING_MIN_COUNT = 1
export const ORDER_EDIT_PACKAGING_MAX_COUNT = 999
export const ORDER_EDIT_PACKAGING_UNIT_FEE = 2

function normalizeText(value: unknown) {
  if (value === null || value === undefined) {
    return ''
  }

  return String(value).trim()
}

function getOrderExtendFieldValue(detail: OrderDetail, key: string) {
  const fields = Array.isArray(detail.orderExtendFields)
    ? detail.orderExtendFields
    : []

  for (let index = fields.length - 1; index >= 0; index -= 1) {
    const field = fields[index]

    if (normalizeText(field?.key) === key) {
      return field?.value
    }
  }

  return undefined
}

export function normalizeOrderEditPackagingCount(value: unknown) {
  const count = Number(value)

  if (!Number.isFinite(count) || count <= 0) {
    return 0
  }

  return Math.min(
    ORDER_EDIT_PACKAGING_MAX_COUNT,
    Math.max(ORDER_EDIT_PACKAGING_MIN_COUNT, Math.trunc(count))
  )
}

export function normalizeOrderEditPackagingCountInput(value: string) {
  return value
    .replace(/\D/g, '')
    .replace(/^0+(?=\d)/, '')
    .slice(0, String(ORDER_EDIT_PACKAGING_MAX_COUNT).length)
}

export function createOrderEditPackagingDraft(
  detail: OrderDetail
): OrderEditPackagingDraft {
  return {
    count: normalizeOrderEditPackagingCount(
      getOrderExtendFieldValue(detail, ORDER_EDIT_PACKAGING_EXTEND_KEY)
    )
  }
}

export function updateOrderEditPackagingCount(
  packaging: OrderEditPackagingDraft,
  value: unknown
): OrderEditPackagingDraft {
  const count = normalizeOrderEditPackagingCount(value)

  return count === packaging.count ? packaging : { count }
}

export function validateOrderEditPackaging(
  packaging: OrderEditPackagingDraft
) {
  const count = packaging.count

  if (
    !Number.isFinite(count) ||
    !Number.isInteger(count) ||
    count < 0 ||
    count > ORDER_EDIT_PACKAGING_MAX_COUNT
  ) {
    return [
      `打包服务件数须为 0 到 ${ORDER_EDIT_PACKAGING_MAX_COUNT} 的整数`
    ]
  }

  return []
}

export function getOrderEditPackagingFee(
  packaging: OrderEditPackagingDraft
) {
  return (
    normalizeOrderEditPackagingCount(packaging.count) *
    ORDER_EDIT_PACKAGING_UNIT_FEE
  )
}

export function isOrderEditPackagingChanged(
  packaging: OrderEditPackagingDraft,
  origin: OrderEditPackagingDraft
) {
  return (
    normalizeOrderEditPackagingCount(packaging.count) !==
    normalizeOrderEditPackagingCount(origin.count)
  )
}

export function createOrderEditPackagingRequestFields(
  packaging: OrderEditPackagingDraft
): Pick<OrderModifyRequest, 'orderExtendFields'> {
  return {
    orderExtendFields: [
      {
        key: ORDER_EDIT_PACKAGING_EXTEND_KEY,
        value: String(normalizeOrderEditPackagingCount(packaging.count))
      }
    ]
  }
}
