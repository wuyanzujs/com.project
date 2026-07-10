import type {
  CourierLabelRaw,
  CourierLabelView,
  CourierRaw,
  CourierView
} from './types'

function normalizeText(value?: string | null) {
  return (value ?? '').trim()
}

function toNonNegativeNumber(value?: number | null) {
  const number = Number(value)

  return Number.isFinite(number) && number > 0 ? number : 0
}

function normalizeRating(value?: number | null) {
  const rating = Number(value)

  if (!Number.isFinite(rating)) {
    return 0
  }

  return Math.min(5, Math.max(0, rating))
}

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

function normalizeLabels(raw: CourierRaw) {
  const labels = raw.labels?.length ? raw.labels : (raw.evaluateLabels ?? [])

  return labels
    .map(normalizeLabel)
    .filter((item): item is CourierLabelView => !!item)
    .sort((left, right) => right.count - left.count)
}

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

export function isAlreadyBoundCourierMessage(message?: string | null) {
  return normalizeText(message).includes('已绑定该快递员')
}
