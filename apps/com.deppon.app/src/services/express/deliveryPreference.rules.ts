import {
  isExpressDeliveryDateTextValid,
  isExpressNightDeliveryWindow,
  isExpressScheduledDeliveryWindow,
  validateExpressScheduledDeliveryRange,
  validateExpressUnavailableDeliveryDates
} from './deliveryPreference.options'

import type {
  ExpressDeliveryAppointmentRequest,
  ExpressDeliveryPreferenceDraft,
  ExpressDeliveryPreferenceType,
  ExpressDraft,
  ExpressOrderExtendField
} from './types'

export interface ExpressDeliveryPreferenceOption {
  value: ExpressDeliveryPreferenceType
  label: string
  summary: string
}

export interface ExpressDeliveryOrderFields {
  appointmentDeliveryTime: string
  orderExtendFields: ExpressOrderExtendField[]
  newOrderExtendFields: ExpressOrderExtendField[]
}

export const EXPRESS_DELIVERY_PREFERENCE_OPTIONS:
  ExpressDeliveryPreferenceOption[] = [
  {
    value: '',
    label: '常规派送',
    summary: '按运输产品预计时效安排派送。'
  },
  {
    value: 'SCHEDULED',
    label: '定时派送',
    summary: '在预计到达后的 7 天内选择派送时间段。'
  },
  {
    value: 'NOTIFY_SENDER',
    label: '等寄件人通知',
    summary: '快件到达派送网点后，等待寄件人通知再派送。'
  },
  {
    value: 'NOTIFY_RECEIVER',
    label: '等收件人通知',
    summary: '等待收件人通知再派送，可标记未来 30 天不可收货日期。'
  }
]

function normalizeText(value?: string | null) {
  return (value ?? '').trim()
}

export function createExpressDeliveryPreferenceDraft():
  ExpressDeliveryPreferenceDraft {
  return {
    type: '',
    scheduledWindow: '',
    unavailableDates: [],
    availabilityKey: ''
  }
}

export function normalizeExpressDeliveryPreferenceDraft(
  value?: Partial<ExpressDeliveryPreferenceDraft> | null
): ExpressDeliveryPreferenceDraft {
  const type: ExpressDeliveryPreferenceType =
    value?.type === 'SCHEDULED' ||
    value?.type === 'NOTIFY_SENDER' ||
    value?.type === 'NOTIFY_RECEIVER'
      ? value.type
      : ''
  const unavailableDates = Array.from(
    new Set(
      (value?.unavailableDates ?? [])
        .map(normalizeText)
        .filter(isExpressDeliveryDateTextValid)
    )
  ).slice(0, 30)

  return {
    type,
    scheduledWindow:
      type === 'SCHEDULED' ? normalizeText(value?.scheduledWindow) : '',
    unavailableDates: type === 'NOTIFY_RECEIVER' ? unavailableDates : [],
    availabilityKey:
      type === 'SCHEDULED' ? normalizeText(value?.availabilityKey) : ''
  }
}

export function isExpressScheduledDeliveryProductSupported(
  productCode?: string | null
) {
  const code = normalizeText(productCode).toUpperCase()

  return !!code && code !== 'DCZP' && code !== 'TKDR'
}

export function createExpressDeliveryAvailabilityKey(draft: ExpressDraft) {
  const consignee = draft.consignee
  const product = draft.selectedProduct

  if (!consignee || !product) {
    return ''
  }

  return [
    consignee.province,
    consignee.city,
    consignee.county,
    consignee.town,
    consignee.address,
    draft.goods.weight,
    draft.goods.volume,
    product.omsProductCode,
    product.arriveDate,
    draft.service.deliveryMode
  ]
    .map(value => normalizeText(String(value ?? '')))
    .join('|')
}

export function getExpressDeliveryPreferenceOption(
  type: ExpressDeliveryPreferenceType
) {
  return (
    EXPRESS_DELIVERY_PREFERENCE_OPTIONS.find(option => option.value === type) ??
    EXPRESS_DELIVERY_PREFERENCE_OPTIONS[0]
  )
}

export function getExpressDeliveryPreferenceSummary(
  preference: ExpressDeliveryPreferenceDraft
) {
  const normalized = normalizeExpressDeliveryPreferenceDraft(preference)

  if (normalized.type === 'SCHEDULED') {
    return normalized.scheduledWindow || '请选择定时派送时间'
  }

  if (normalized.type === 'NOTIFY_RECEIVER') {
    const count = normalized.unavailableDates.length

    return count ? `等收件人通知 · 已避开 ${count} 天` : '等收件人通知'
  }

  return getExpressDeliveryPreferenceOption(normalized.type).label
}

export function buildExpressDeliveryAppointmentRequest(
  draft: ExpressDraft
): ExpressDeliveryAppointmentRequest {
  if (!draft.consignee) {
    throw new Error('请先填写收件地址')
  }

  return {
    goodsWeight: Number.isFinite(draft.goods.weight) ? draft.goods.weight : 0,
    goodsVolume: Number.isFinite(draft.goods.volume) ? draft.goods.volume : 0,
    provinceName: draft.consignee.province,
    cityName: draft.consignee.city,
    areaName: draft.consignee.county,
    address: draft.consignee.address
  }
}

export function createExpressDeliveryQuoteFields(
  preference: ExpressDeliveryPreferenceDraft
) {
  const normalized = normalizeExpressDeliveryPreferenceDraft(preference)

  return {
    nightDelivery:
      normalized.type === 'SCHEDULED' &&
      isExpressNightDeliveryWindow(normalized.scheduledWindow)
        ? ('Y' as const)
        : ('' as const),
    appointmentDelivery:
      normalized.type === 'SCHEDULED' &&
      !isExpressNightDeliveryWindow(normalized.scheduledWindow)
        ? ('Y' as const)
        : ('' as const),
    notifyIsDeliver:
      normalized.type === 'NOTIFY_SENDER' ? ('N' as const) : undefined
  }
}

export function createExpressDeliveryOrderFields(
  preference: ExpressDeliveryPreferenceDraft
): ExpressDeliveryOrderFields {
  const normalized = normalizeExpressDeliveryPreferenceDraft(preference)
  const orderExtendFields: ExpressOrderExtendField[] = []
  const newOrderExtendFields: ExpressOrderExtendField[] = []

  if (normalized.type === 'SCHEDULED') {
    orderExtendFields.push({
      key: isExpressNightDeliveryWindow(normalized.scheduledWindow)
        ? 'nightDelivery'
        : 'isAppointmentDeliver',
      value: 'Y'
    })
  } else if (normalized.type === 'NOTIFY_SENDER') {
    orderExtendFields.push({ key: 'notifyIsDeliver', value: 'N' })
  } else if (normalized.type === 'NOTIFY_RECEIVER') {
    newOrderExtendFields.push(
      { key: 'waitReceiveNotifyDeliver', value: 'Y' },
      {
        key: 'waitReceiveNotifyNotDeliverTime',
        value: normalized.unavailableDates.join(',')
      }
    )
  }

  return {
    appointmentDeliveryTime:
      normalized.type === 'SCHEDULED' ? normalized.scheduledWindow : '',
    orderExtendFields,
    newOrderExtendFields
  }
}

export function validateExpressDeliveryPreference(
  draft: ExpressDraft,
  options: { requireProduct?: boolean; now?: Date } = {}
) {
  const preference = normalizeExpressDeliveryPreferenceDraft(
    draft.deliveryPreference
  )

  if (!preference.type) {
    return []
  }

  if (draft.service.deliveryMode === 'PICKSELF') {
    return ['自提订单不能选择预约或通知派送']
  }

  if (preference.type === 'NOTIFY_RECEIVER') {
    return validateExpressUnavailableDeliveryDates(
      draft.deliveryPreference.unavailableDates,
      options.now
    )
  }

  if (preference.type !== 'SCHEDULED') {
    return []
  }

  if (!isExpressScheduledDeliveryWindow(preference.scheduledWindow)) {
    return ['请选择定时派送时间']
  }

  if (!options.requireProduct) {
    return []
  }

  if (
    !isExpressScheduledDeliveryProductSupported(
      draft.selectedProduct?.omsProductCode
    )
  ) {
    return ['当前产品暂不支持定时派送']
  }

  if (
    !preference.availabilityKey ||
    preference.availabilityKey !== createExpressDeliveryAvailabilityKey(draft)
  ) {
    return ['定时派送范围已失效，请重新校验']
  }

  return validateExpressScheduledDeliveryRange(
    draft.selectedProduct?.arriveDate,
    preference.scheduledWindow
  )
}

function isSamePreference(
  left: ExpressDeliveryPreferenceDraft,
  right: ExpressDeliveryPreferenceDraft
) {
  return (
    left.type === right.type &&
    left.scheduledWindow === right.scheduledWindow &&
    left.unavailableDates.join(',') === right.unavailableDates.join(',') &&
    left.availabilityKey === right.availabilityKey
  )
}

export function updateExpressDeliveryPreference(
  draft: ExpressDraft,
  patch: Partial<ExpressDeliveryPreferenceDraft>
): ExpressDraft {
  const current = normalizeExpressDeliveryPreferenceDraft(
    draft.deliveryPreference
  )
  const next = normalizeExpressDeliveryPreferenceDraft({
    ...current,
    ...patch
  })

  if (isSamePreference(current, next)) {
    return draft
  }

  return {
    ...draft,
    deliveryPreference: next,
    selectedProduct: null,
    quoteStaleReason: '派送偏好变化，请重新获取价格'
  }
}

export function clearExpressDeliveryPreference(draft: ExpressDraft) {
  return updateExpressDeliveryPreference(
    draft,
    createExpressDeliveryPreferenceDraft()
  )
}

export {
  EXPRESS_DELIVERY_TIME_WINDOWS,
  createExpressScheduledDateOptions,
  createExpressScheduledWindow,
  createExpressUnavailableDateOptions,
  getExpressScheduledDate,
  getExpressScheduledTimeWindow
} from './deliveryPreference.options'
export type {
  ExpressDeliveryDateOption,
  ExpressDeliveryTimeWindowOption
} from './deliveryPreference.options'
