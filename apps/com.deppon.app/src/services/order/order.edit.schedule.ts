import { APP_RUNTIME_CONFIG } from '../../shared/config/runtime'

import type {
  OrderDetail,
  OrderEditDeliveryMode,
  OrderEditDraft,
  OrderEditPickupNightCapability,
  OrderEditPickupNightRequest,
  OrderEditPickupNightResponse,
  OrderEditPickupTimeRequest,
  OrderEditPickupTimeType,
  OrderEditScheduleDraft,
  OrderModifyRequest
} from './types'

export const ORDER_EDIT_NIGHT_PICKUP_CACHE_MS = 2 * 60 * 60 * 1000
export const ORDER_EDIT_NIGHT_PICKUP_NOTICE =
  '夜间揽收服务费标准为 50 元/票，最终费用以后端核价为准。'

export const ORDER_EDIT_DELIVERY_OPTIONS: Array<{
  value: Exclude<OrderEditDeliveryMode, ''>
  label: string
  summary: string
}> = [
  {
    value: 'PICKNOTUPSTAIRS',
    label: '送货不上楼',
    summary: '送至收件地址楼下或一楼'
  },
  {
    value: 'PICKUPSTAIRS',
    label: '送货上楼',
    summary: '超重货物可能产生上楼费'
  },
  {
    value: 'PICKSELF',
    label: '网点自提',
    summary: '收件人前往到达网点自提'
  }
]

const BIG_PACKAGE_PRODUCT_CODES = new Set(['NZBRH', 'ZBTH'])

interface OrderEditScheduleInput {
  sender: OrderEditDraft['sender']
  goodsNumber: number
  totalWeight: number
  totalVolume: number
}

export interface OrderEditScheduleRequestDiff {
  changedFields: string[]
  request: Partial<OrderModifyRequest>
}

function normalizeText(value: unknown) {
  return value === null || value === undefined ? '' : String(value).trim()
}

function normalizeNumber(value: unknown) {
  const number = Number(value)

  return Number.isFinite(number) ? number : 0
}

function normalizeProductCode(value: unknown) {
  return normalizeText(value).toUpperCase()
}

function getExtendFieldValue(detail: OrderDetail, key: string) {
  const fields = Array.isArray(detail.orderExtendFields)
    ? detail.orderExtendFields
    : []

  return normalizeText(
    fields.find(item => normalizeText(item?.key) === key)?.value
  )
}

export function normalizeOrderEditDeliveryMode(
  value: unknown
): OrderEditDeliveryMode {
  const mode = normalizeProductCode(value)

  return mode === 'PICKNOTUPSTAIRS' ||
    mode === 'PICKUPSTAIRS' ||
    mode === 'PICKSELF'
    ? mode
    : ''
}

function createScheduleInputKey(
  input: OrderEditScheduleInput,
  productCode: string
) {
  return [
    input.sender.province,
    input.sender.city,
    input.sender.county,
    input.sender.town,
    input.sender.address,
    input.goodsNumber,
    input.totalWeight,
    input.totalVolume,
    productCode
  ]
    .map(normalizeText)
    .join('|')
}

export function createOrderEditScheduleQueryKey(draft: OrderEditDraft) {
  return createScheduleInputKey(draft, draft.schedule.productCode)
}

function createPickupAddressKey(draft: OrderEditDraft) {
  return [
    draft.sender.province,
    draft.sender.city,
    draft.sender.county,
    draft.sender.town,
    draft.sender.address
  ]
    .map(normalizeText)
    .join('|')
}

export function createOrderEditScheduleDraft(
  detail: OrderDetail,
  input: OrderEditScheduleInput
): OrderEditScheduleDraft {
  const productCode = normalizeProductCode(detail.transportMode)
  const pickupType: OrderEditPickupTimeType =
    getExtendFieldValue(detail, 'nightAccept') === 'Y' ? 'NIGHT' : 'NORMAL'
  const pickPeriodTime = normalizeNumber(detail.pickPeriodTime)

  return {
    deliveryMode: normalizeOrderEditDeliveryMode(detail.deliveryType),
    initialInputKey: createScheduleInputKey(input, productCode),
    orderChannel: normalizeText(
      detail.channelType ?? detail.orderChannelType
    ),
    productCode,
    tableType: normalizeText(detail.tableType),
    waybillNumber: normalizeText(detail.waybillNumber),
    pickup: {
      time: normalizeText(detail.beginAcceptTime),
      endTime: normalizeText(detail.endAcceptTime),
      timeSlot: '',
      type: pickupType,
      pickPeriodTime: pickPeriodTime > 0 ? pickPeriodTime : undefined,
      nightNoticeAccepted: pickupType === 'NIGHT',
      selectionKey: ''
    }
  }
}

function isLogisticsOrder(schedule: OrderEditScheduleDraft) {
  const tableType = normalizeProductCode(schedule.tableType)

  if (tableType) {
    return tableType !== '2' && tableType !== 'EXPRESS'
  }

  const waybillNumber = normalizeProductCode(schedule.waybillNumber)

  if (!waybillNumber || waybillNumber.startsWith('DPK')) {
    return false
  }

  if (waybillNumber.startsWith('DPL')) {
    return true
  }

  return !(
    /^(5|6|7|8|9|0)/.test(waybillNumber) &&
    (waybillNumber.length === 10 || waybillNumber.length === 14)
  )
}

export function isOrderEditDeliveryModeVisible(draft: OrderEditDraft) {
  if (BIG_PACKAGE_PRODUCT_CODES.has(draft.schedule.productCode)) {
    return false
  }

  return (
    isLogisticsOrder(draft.schedule) ||
    draft.totalWeight > 60 ||
    draft.totalVolume > 0.36
  )
}

export function buildOrderEditPickupNightRequest(
  draft: OrderEditDraft
): OrderEditPickupNightRequest | null {
  const province = normalizeText(draft.sender.province)
  const city = normalizeText(draft.sender.city)
  const county = normalizeText(draft.sender.county)
  const address = normalizeText(draft.sender.address)

  return province && city && county && address
    ? { province, city, county, address }
    : null
}

export function createOrderEditPickupNightCapability(
  draft: OrderEditDraft,
  response?: OrderEditPickupNightResponse | null,
  checkedAt = Date.now()
): OrderEditPickupNightCapability {
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

export function getFreshOrderEditPickupNightCapability(
  draft: OrderEditDraft,
  now = Date.now()
) {
  const capability = draft.schedule.pickup.nightCapability

  if (
    !capability ||
    capability.addressKey !== createPickupAddressKey(draft) ||
    !Number.isFinite(capability.checkedAt) ||
    capability.checkedAt <= 0 ||
    capability.checkedAt > now ||
    now - capability.checkedAt >= ORDER_EDIT_NIGHT_PICKUP_CACHE_MS
  ) {
    return undefined
  }

  return capability
}

export function buildOrderEditPickupTimeRequest(
  draft: OrderEditDraft,
  capability?: OrderEditPickupNightCapability
): OrderEditPickupTimeRequest | null {
  const address = buildOrderEditPickupNightRequest(draft)

  if (!address) {
    return null
  }

  return {
    sysCode: APP_RUNTIME_CONFIG.systemCode,
    provinceName: address.province,
    cityName: address.city,
    countyName: address.county,
    townName: normalizeText(draft.sender.town) || undefined,
    address: address.address,
    weight: Math.max(0, normalizeNumber(draft.totalWeight)),
    volume: Math.max(0, normalizeNumber(draft.totalVolume)),
    goodsNumber: Math.max(1, normalizeNumber(draft.goodsNumber)),
    priceTimeProductCode: draft.schedule.productCode || undefined,
    source: 0,
    nightOpening: capability?.enabled ? 'Y' : 'N',
    nightStartTime: capability?.enabled ? capability.startTime : '',
    nightEndTime: capability?.enabled ? capability.endTime : ''
  }
}

function parsePickupDateTime(value: string) {
  const match = normalizeText(value).match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/
  )

  if (!match) {
    return null
  }

  const values = match.slice(1).map(Number)
  const timestamp = Date.UTC(
    values[0],
    values[1] - 1,
    values[2],
    values[3],
    values[4]
  )
  const date = new Date(timestamp)

  return date.getUTCFullYear() === values[0] &&
    date.getUTCMonth() === values[1] - 1 &&
    date.getUTCDate() === values[2] &&
    date.getUTCHours() === values[3] &&
    date.getUTCMinutes() === values[4]
    ? timestamp
    : null
}

export function isOrderEditNightPickupTimeValid(
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

  return selected >= Date.UTC(
    beijingNow.getUTCFullYear(),
    beijingNow.getUTCMonth(),
    beijingNow.getUTCDate() + 1,
    6
  )
}

export function validateOrderEditSchedule(
  draft: OrderEditDraft,
  options: { now?: Date } = {}
) {
  const messages: string[] = []
  const pickup = draft.schedule.pickup
  const queryKey = createOrderEditScheduleQueryKey(draft)

  if (!pickup.time) {
    messages.push('请选择期望上门时间')
  } else if (
    queryKey !== draft.schedule.initialInputKey &&
    pickup.selectionKey !== queryKey
  ) {
    messages.push('订单信息已变化，请重新获取并选择上门时间')
  }

  if (pickup.type === 'NIGHT') {
    const now = options.now ?? new Date()
    const capability = getFreshOrderEditPickupNightCapability(
      draft,
      now.getTime()
    )

    if (!capability?.enabled) {
      messages.push('夜间揽收能力已失效，请重新获取上门时间')
    } else if (!isOrderEditNightPickupTimeValid(pickup.time, now)) {
      messages.push('当前夜间上门时段已无法预约，请重新选择')
    } else if (!pickup.nightNoticeAccepted) {
      messages.push('请先确认夜间揽收费用提示')
    }
  }

  if (
    isOrderEditDeliveryModeVisible(draft) &&
    !draft.schedule.deliveryMode
  ) {
    messages.push('请选择送货方式')
  }

  return messages
}

export function createOrderEditScheduleRequestDiff(
  draft: OrderEditDraft,
  origin: OrderEditDraft
): OrderEditScheduleRequestDiff {
  const request: Partial<OrderModifyRequest> = {}
  const changedFields: string[] = []
  const pickupChanged =
    draft.schedule.pickup.time.trim() !==
      origin.schedule.pickup.time.trim() ||
    draft.schedule.pickup.type !== origin.schedule.pickup.type

  if (
    draft.schedule.pickup.time.trim() !==
    origin.schedule.pickup.time.trim()
  ) {
    request.beginAcceptTime = draft.schedule.pickup.time.trim()

    if (origin.schedule.orderChannel.toLowerCase() === 'servicepoint') {
      request.channelType = 'VISITING_SERVICE'
    }

    if ((draft.schedule.pickup.pickPeriodTime ?? 0) > 0) {
      request.pickPeriodTime = draft.schedule.pickup.pickPeriodTime
    }
  }

  if (draft.schedule.pickup.type !== origin.schedule.pickup.type) {
    const night = draft.schedule.pickup.type === 'NIGHT'

    request.orderExtendFields = [
      { key: 'nightAccept', value: night ? 'Y' : 'N' },
      { key: 'nightAcceptStatus', value: night ? -1 : '' }
    ]
  }

  if (pickupChanged) {
    changedFields.push('期望上门时间')
  }

  if (
    isOrderEditDeliveryModeVisible(draft) &&
    draft.schedule.deliveryMode !== origin.schedule.deliveryMode
  ) {
    request.deliveryMode = draft.schedule.deliveryMode
    changedFields.push('送货方式')
  }

  return { changedFields, request }
}
