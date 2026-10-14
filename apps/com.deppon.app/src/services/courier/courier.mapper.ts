import type { CourierLabelRaw, CourierLabelView, CourierRaw, CourierView } from './types'

/**
 *
 * @param value 待处理文本，可为空
 * @description 归一文本，去首尾空白
 */
function normalizeText(value?: string | null) {
  return (value ?? '').trim()
}

/**
 *
 * @param value 待转换数值，可为空
 * @description 转非负数，非法值返回 0
 */
function toNonNegativeNumber(value?: number | null) {
  const number = Number(value)

  return Number.isFinite(number) && number > 0 ? number : 0
}

/**
 *
 * @param value 评分原始值，可为空
 * @description 归一评分到 0 至 5 区间
 */
function normalizeRating(value?: number | null) {
  const rating = Number(value)

  if (!Number.isFinite(rating)) {
    return 0
  }

  return Math.min(5, Math.max(0, rating))
}

/**
 *
 * @param item 标签原始数据
 * @description 归一单个标签，无名称时返回 null
 */
function normalizeLabel(item: CourierLabelRaw): CourierLabelView | null {
  const name = normalizeText(item.labelName || item.evaluateValue)

  if (!name) {
    return null
  }

  return {
    name,
    count: toNonNegativeNumber(item.labelCount ?? item.evaluateAmount)
  }
}

/**
 *
 * @param raw 快递员原始数据
 * @description 归一标签列表，按数量倒序
 */
function normalizeLabels(raw: CourierRaw) {
  const labels = raw.labels?.length ? raw.labels : (raw.evaluateLabels ?? [])

  return labels
    .map(normalizeLabel)
    .filter((item): item is CourierLabelView => !!item)
    .sort((left, right) => right.count - left.count)
}

/**
 *
 * @param raw 快递员原始数据
 * @description 转快递员展示数据
 */
export function normalizeCourier(raw: CourierRaw): CourierView {
  const rating = normalizeRating(raw.avgStart)

  return {
    id: normalizeText(raw.courierNo),
    name: normalizeText(raw.courierName) || '德邦快递员',
    mobile: normalizeText(raw.courierMobile),
    departmentName: normalizeText(raw.deptName),
    departmentCode: normalizeText(raw.deptCode),
    rating,
    ratingText: rating ? rating.toFixed(1) : '暂无评分',
    signedCount: toNonNegativeNumber(raw.signedCount),
    rewardTimes: toNonNegativeNumber(raw.rewardTimes),
    labels: normalizeLabels(raw)
  }
}

/**
 *
 * @param message 接口返回消息，可为空
 * @description 判断是否为已绑定快递员提示
 */
export function isAlreadyBoundCourierMessage(message?: string | null) {
  return normalizeText(message).includes('已绑定该快递员')
}
