import { createExpressPickupDateTime } from './pickupTime.options'

import type { ExpressPickupTimeSelection } from './pickupTime.options'
import type {
  ExpressDraft,
  ExpressOrderExtendField,
  ExpressPickup,
  ExpressPickupNightCapability,
  ExpressPickupNightRequest,
  ExpressPickupNightResponse,
  ExpressPickupStationDetail,
  ExpressPickupTimeOpeningType,
  ExpressPickupTimeType
} from './types'

export const EXPRESS_NIGHT_PICKUP_CACHE_MS = 2 * 60 * 60 * 1000
export const EXPRESS_NIGHT_PICKUP_NOTICE = '夜间揽收服务费标准为 50 元/票，最终以重新报价明细为准。'

/**
 *
 * @param value 待处理的文本
 * @description 归一文本，空值返回空字符串
 */
function normalizeText(value?: string | null) {
  return (value ?? '').trim()
}

/**
 *
 * @param value 取件时段类型
 * @description 判断是否为可预约时段类型
 */
function isAvailablePickupType(value: ExpressPickupTimeOpeningType): value is ExpressPickupTimeType {
  return value === 'NORMAL' || value === 'NIGHT'
}

/**
 *
 * @param value 取件时段类型
 * @description 归一取件时段类型，默认 NORMAL
 */
function normalizePickupTimeType(value: unknown): ExpressPickupTimeType {
  if (value === 'NIGHT') {
    return value
  }

  return 'NORMAL'
}

/**
 *
 * @param draft 寄件草稿
 * @description 生成寄件地址 key，用于夜间揽收缓存
 */
function createPickupAddressKey(draft: Pick<ExpressDraft, 'sender'>) {
  const sender = draft.sender

  if (!sender) {
    return ''
  }

  return [sender.province, sender.city, sender.county, sender.town, sender.address].map(normalizeText).join('|')
}

/**
 *
 * @param value 夜间揽收能力
 * @description 归一夜间揽收能力，非法返回空
 */
function normalizeNightCapability(value?: Partial<ExpressPickupNightCapability> | null) {
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

/**
 *
 * @param value 自送网点展示信息，可为空
 * @description 归一自送网点展示信息，全空返回空
 */
function normalizeStationDetail(value?: Partial<ExpressPickupStationDetail> | null) {
  const address = normalizeText(value?.address)
  const phone = normalizeText(value?.phone)
  const hours = normalizeText(value?.hours)
  const longitude = normalizeText(value?.longitude)
  const latitude = normalizeText(value?.latitude)

  if (!address && !phone && !hours && !longitude && !latitude) {
    return undefined
  }

  return {
    address,
    phone,
    hours,
    longitude,
    latitude
  } satisfies ExpressPickupStationDetail
}

/**
 *
 * @param value 取件信息，可为空
 * @description 归一取件信息
 */
export function normalizeExpressPickup(value?: Partial<ExpressPickup> | null): ExpressPickup {
  const type = normalizePickupTimeType(value?.type)

  return {
    dispatch: value?.dispatch === 'N' ? 'N' : 'Y',
    time: normalizeText(value?.time),
    endTime: normalizeText(value?.endTime) || undefined,
    timeSlot: normalizeText(value?.timeSlot) || undefined,
    type,
    stationCode: normalizeText(value?.stationCode),
    stationName: normalizeText(value?.stationName),
    stationDetail: normalizeStationDetail(value?.stationDetail),
    pickPeriodTime: Number.isFinite(value?.pickPeriodTime) ? value?.pickPeriodTime : undefined,
    nightCapability: normalizeNightCapability(value?.nightCapability),
    nightNoticeAccepted: type === 'NIGHT' && value?.nightNoticeAccepted === true
  }
}

/**
 *
 * @param draft 寄件草稿
 * @description 构造夜间揽收查询入参
 */
export function buildExpressPickupNightRequest(draft: ExpressDraft): ExpressPickupNightRequest {
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

/**
 *
 * @param draft 寄件草稿
 * @param response 夜间揽收查询响应，可为空
 * @param checkedAt 校验时间戳
 * @description 由接口结果生成夜间揽收能力
 */
export function createExpressPickupNightCapability(
  draft: ExpressDraft,
  response?: ExpressPickupNightResponse | null,
  checkedAt = Date.now()
): ExpressPickupNightCapability {
  const startTime = normalizeText(response?.startTime)
  const endTime = normalizeText(response?.endTime)
  const enabled = response?.nightPickUpEnable === true && !!startTime && !!endTime

  return {
    addressKey: createPickupAddressKey(draft),
    enabled,
    startTime: enabled ? startTime : '',
    endTime: enabled ? endTime : '',
    checkedAt
  }
}

/**
 *
 * @param draft 寄件草稿
 * @param now 当前时间戳
 * @description 取仍在有效期内的夜间揽收能力
 */
export function getFreshExpressPickupNightCapability(draft: ExpressDraft, now = Date.now()) {
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

/**
 *
 * @param draft 寄件草稿
 * @param selection 选中的取件时段
 * @description 选中取件时段并清空已选产品
 */
export function selectExpressPickupTime(draft: ExpressDraft, selection: ExpressPickupTimeSelection): ExpressDraft {
  if (!isAvailablePickupType(selection.type)) {
    return draft
  }

  const type: ExpressPickupTimeType = selection.type === 'NIGHT' ? 'NIGHT' : 'NORMAL'
  const time = createExpressPickupDateTime(selection.date, selection.time)
  const text = normalizeText(selection.text)
  const sameSelection = draft.pickup.time === time && draft.pickup.timeSlot === text && draft.pickup.type === type

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

/**
 *
 * @param draft 寄件草稿
 * @description 记录已确认夜间揽收费用提示
 */
export function acceptExpressNightPickupNotice(draft: ExpressDraft) {
  if (draft.pickup.type !== 'NIGHT' || draft.pickup.nightNoticeAccepted) {
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

/**
 *
 * @param value 时间字符串
 * @description 解析取件时间，非法返回 null
 */
function parsePickupDateTime(value: string) {
  const match = normalizeText(value).match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/)

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

/**
 *
 * @param pickupTime 取件时间
 * @param now 当前时间
 * @description 校验夜间取件时间是否可预约
 */
export function isExpressNightPickupTimeValid(pickupTime: string, now = new Date()) {
  const selected = parsePickupDateTime(pickupTime)

  if (!selected) {
    return false
  }

  const beijingNow = new Date(now.getTime() + 8 * 60 * 60 * 1000)

  if (beijingNow.getUTCHours() < 18) {
    return true
  }

  const nextMorning = Date.UTC(beijingNow.getUTCFullYear(), beijingNow.getUTCMonth(), beijingNow.getUTCDate() + 1, 6)

  return selected >= nextMorning
}

/**
 *
 * @param draft 寄件草稿
 * @param options 可选的当前时间
 * @description 校验取件时间，返回错误提示
 */
export function validateExpressPickupTime(draft: ExpressDraft, options: { now?: Date } = {}) {
  if (draft.pickup.dispatch !== 'Y') {
    return draft.pickup.type === 'NIGHT' ? ['自送服务点不能选择夜间揽收'] : []
  }

  if (draft.pickup.type !== 'NIGHT') {
    return []
  }

  if (!draft.pickup.time) {
    return ['请选择夜间取件时段']
  }

  const now = options.now ?? new Date()
  const capability = getFreshExpressPickupNightCapability(draft, now.getTime())

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

/**
 *
 * @param draft 寄件草稿
 * @description 生成报价用的夜间揽收字段
 */
export function createExpressPickupQuoteFields(draft: ExpressDraft) {
  return {
    nightAccept: draft.pickup.dispatch === 'Y' && draft.pickup.type === 'NIGHT' ? ('Y' as const) : ('N' as const)
  }
}

/**
 *
 * @param draft 寄件草稿
 * @description 生成下单用的取件扩展字段
 */
export function createExpressPickupOrderFields(draft: ExpressDraft): ExpressOrderExtendField[] {
  if (draft.pickup.dispatch !== 'Y') {
    return []
  }

  const night = draft.pickup.type === 'NIGHT'
  const fields: ExpressOrderExtendField[] = [{ key: 'nightAccept', value: night ? 'Y' : 'N' }]

  if (night) {
    fields.push({ key: 'nightAcceptStatus', value: -1 })
  }

  return fields
}
