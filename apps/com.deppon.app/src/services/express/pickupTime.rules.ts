import { createExpressPickupDateTime } from './pickupTime.options'

import type { ExpressPickupTimeSelection } from './pickupTime.options'
import type {
  ExpressDraft,
  ExpressOrderExtendField,
  ExpressPickup,
  ExpressPickupNightCapability,
  ExpressPickupNightRequest,
  ExpressPickupNightResponse,
  ExpressPickupTimeOpeningType,
  ExpressPickupTimeType
} from './types'

export const EXPRESS_NIGHT_PICKUP_CACHE_MS = 2 * 60 * 60 * 1000
export const EXPRESS_NIGHT_PICKUP_NOTICE =
  '夜间揽收服务费标准为 50 元/票，最终以重新报价明细为准。'

function normalizeText(value?: string | null) {
  return (value ?? '').trim()
}

function isAvailablePickupType(
  value: ExpressPickupTimeOpeningType
): value is ExpressPickupTimeType {
  return value === 'NORMAL' || value === 'NIGHT'
}

function normalizePickupTimeType(value: unknown): ExpressPickupTimeType {
  if (value === 'NIGHT') {
    return value
  }

  return 'NORMAL'
}

function createPickupAddressKey(draft: Pick<ExpressDraft, 'sender'>) {
  const sender = draft.sender

  if (!sender) {
    return ''
  }

  return [
    sender.province,
    sender.city,
    sender.county,
    sender.town,
    sender.address
  ]
    .map(normalizeText)
    .join('|')
}

function normalizeNightCapability(
  value?: Partial<ExpressPickupNightCapability> | null
) {
  const addressKey = normalizeText(value?.addressKey)
  const checkedAt = Number(value?.checkedAt)

  if (!addressKey || !Number.isFinite(checkedAt) || checkedAt <= 0) {
    return undefined
  }

  const startTime = normalizeText(value?.startTime)
  const endTime = normalizeText(value?.endTime)
  const enabled = value?.enabled === true && !!startTime && !!endTime

  return {
    addressKey,
    enabled,
    startTime: enabled ? startTime : '',
    endTime: enabled ? endTime : '',
    checkedAt
  } satisfies ExpressPickupNightCapability
}

export function normalizeExpressPickup(
  value?: Partial<ExpressPickup> | null
): ExpressPickup {
  const type = normalizePickupTimeType(value?.type)

  return {
    dispatch: value?.dispatch === 'N' ? 'N' : 'Y',
    time: normalizeText(value?.time),
    endTime: normalizeText(value?.endTime) || undefined,
    timeSlot: normalizeText(value?.timeSlot) || undefined,
    type,
    stationCode: normalizeText(value?.stationCode),
    stationName: normalizeText(value?.stationName),
    pickPeriodTime: Number.isFinite(value?.pickPeriodTime)
      ? value?.pickPeriodTime
      : undefined,
    nightCapability: normalizeNightCapability(value?.nightCapability),
    nightNoticeAccepted:
      type === 'NIGHT' && value?.nightNoticeAccepted === true
  }
}

export function buildExpressPickupNightRequest(
  draft: ExpressDraft
): ExpressPickupNightRequest {
  if (!draft.sender) {
    throw new Error('请先填写寄件地址')
  }

  return {
    province: normalizeText(draft.sender.province),
    city: normalizeText(draft.sender.city),
    county: normalizeText(draft.sender.county),
    address: normalizeText(draft.sender.address)
  }
}

export function createExpressPickupNightCapability(
  draft: ExpressDraft,
  response?: ExpressPickupNightResponse | null,
  checkedAt = Date.now()
): ExpressPickupNightCapability {
  const startTime = normalizeText(response?.startTime)
  const endTime = normalizeText(response?.endTime)
  const enabled =
    response?.nightPickUpEnable === true && !!startTime && !!endTime

  return {
    addressKey: createPickupAddressKey(draft),
    enabled,
    startTime: enabled ? startTime : '',
    endTime: enabled ? endTime : '',
    checkedAt
  }
}

export function getFreshExpressPickupNightCapability(
  draft: ExpressDraft,
  now = Date.now()
) {
  const capability = normalizeNightCapability(draft.pickup.nightCapability)

  if (
    !capability ||
    capability.addressKey !== createPickupAddressKey(draft) ||
    capability.checkedAt > now ||
    now - capability.checkedAt >= EXPRESS_NIGHT_PICKUP_CACHE_MS
  ) {
    return undefined
  }

  return capability
}

export function selectExpressPickupTime(
  draft: ExpressDraft,
  selection: ExpressPickupTimeSelection
): ExpressDraft {
  if (!isAvailablePickupType(selection.type)) {
    return draft
  }

  const type: ExpressPickupTimeType =
    selection.type === 'NIGHT' ? 'NIGHT' : 'NORMAL'
  const time = createExpressPickupDateTime(selection.date, selection.time)
  const text = normalizeText(selection.text)
  const sameSelection =
    draft.pickup.time === time &&
    draft.pickup.timeSlot === text &&
    draft.pickup.type === type

  if (sameSelection) {
    return draft
  }

  return {
    ...draft,
    pickup: {
      ...draft.pickup,
      time,
      timeSlot: text,
      type,
      nightNoticeAccepted: false
    },
    selectedProduct: null,
    quoteStaleReason: '取件时间变化，请重新获取价格'
  }
}

export function acceptExpressNightPickupNotice(draft: ExpressDraft) {
  if (
    draft.pickup.type !== 'NIGHT' ||
    draft.pickup.nightNoticeAccepted
  ) {
    return draft
  }

  return {
    ...draft,
    pickup: {
      ...draft.pickup,
      nightNoticeAccepted: true
    }
  }
}

function parsePickupDateTime(value: string) {
  const match = normalizeText(value).match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/
  )

  if (!match) {
    return null
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const hour = Number(match[4])
  const minute = Number(match[5])
  const timestamp = Date.UTC(year, month - 1, day, hour, minute)
  const date = new Date(timestamp)

  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    date.getUTCHours() === hour &&
    date.getUTCMinutes() === minute
    ? timestamp
    : null
}

export function isExpressNightPickupTimeValid(
  pickupTime: string,
  now = new Date()
) {
  const selected = parsePickupDateTime(pickupTime)

  if (!selected) {
    return false
  }

  const beijingNow = new Date(now.getTime() + 8 * 60 * 60 * 1000)

  if (beijingNow.getUTCHours() < 18) {
    return true
  }

  const nextMorning = Date.UTC(
    beijingNow.getUTCFullYear(),
    beijingNow.getUTCMonth(),
    beijingNow.getUTCDate() + 1,
    6
  )

  return selected >= nextMorning
}

export function validateExpressPickupTime(
  draft: ExpressDraft,
  options: { now?: Date } = {}
) {
  if (draft.pickup.dispatch !== 'Y') {
    return draft.pickup.type === 'NIGHT'
      ? ['自送服务点不能选择夜间揽收']
      : []
  }

  if (draft.pickup.type !== 'NIGHT') {
    return []
  }

  if (!draft.pickup.time) {
    return ['请选择夜间取件时段']
  }

  const now = options.now ?? new Date()
  const capability = getFreshExpressPickupNightCapability(
    draft,
    now.getTime()
  )

  if (!capability?.enabled) {
    return ['夜间揽收能力已失效，请重新获取取件时间']
  }

  if (!isExpressNightPickupTimeValid(draft.pickup.time, now)) {
    return ['当前夜间取件时段已无法预约，请重新选择']
  }

  if (!draft.pickup.nightNoticeAccepted) {
    return ['请先确认夜间揽收费用提示']
  }

  return []
}

export function createExpressPickupQuoteFields(draft: ExpressDraft) {
  return {
    nightAccept:
      draft.pickup.dispatch === 'Y' && draft.pickup.type === 'NIGHT'
        ? ('Y' as const)
        : ('N' as const)
  }
}

export function createExpressPickupOrderFields(
  draft: ExpressDraft
): ExpressOrderExtendField[] {
  if (draft.pickup.dispatch !== 'Y') {
    return []
  }

  const night = draft.pickup.type === 'NIGHT'
  const fields: ExpressOrderExtendField[] = [
    { key: 'nightAccept', value: night ? 'Y' : 'N' }
  ]

  if (night) {
    fields.push({ key: 'nightAcceptStatus', value: -1 })
  }

  return fields
}
