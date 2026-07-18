import type {
  OrderEditPickupDraft,
  OrderEditPickupNightCapability,
  OrderEditPickupOpeningDate,
  OrderEditPickupOpeningItem,
  OrderEditPickupOpeningType,
  OrderEditPickupTimeResponse,
  OrderEditPickupTimeType
} from './order.edit.types'

const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

export interface OrderEditPickupTimeSelection {
  date: string
  time: string
  text: string
  type: OrderEditPickupOpeningType
}

export interface OrderEditPickupTimeOption
  extends OrderEditPickupTimeSelection {
  label: string
  disabled: boolean
  night: boolean
}

export interface OrderEditPickupDateOption {
  value: string
  label: string
  weekday: string
  timeOptions: OrderEditPickupTimeOption[]
}

function normalizeText(value?: string | null) {
  return (value ?? '').trim()
}

function isAvailablePickupType(
  value: OrderEditPickupOpeningType
): value is OrderEditPickupTimeType {
  return value === 'NORMAL' || value === 'NIGHT'
}

function appendOpeningList(
  target: Map<string, Map<string, OrderEditPickupOpeningItem>>,
  openingList: OrderEditPickupOpeningDate[] | undefined,
  type: OrderEditPickupOpeningType
) {
  for (const opening of openingList ?? []) {
    const date = normalizeText(opening.date)

    if (!date) {
      continue
    }

    const timeMap = target.get(date) ?? new Map()

    for (const item of opening.dateList ?? []) {
      const time = normalizeText(item.time)
      const text = normalizeText(item.text)

      if (!time || !text) {
        continue
      }

      timeMap.set(`${time}|${type}`, { time, text, type })
    }

    target.set(date, timeMap)
  }
}

export function normalizeOrderEditPickupTimeResponse(
  response: OrderEditPickupTimeResponse,
  nightCapability?: OrderEditPickupNightCapability
): OrderEditPickupTimeResponse {
  const openingByDate = new Map<
    string,
    Map<string, OrderEditPickupOpeningItem>
  >()

  appendOpeningList(openingByDate, response.openingList, 'NORMAL')
  appendOpeningList(openingByDate, response.nightOpeningList, 'NIGHT')
  appendOpeningList(openingByDate, response.blankOpeningList, 'DISABLE')

  const openingList = Array.from(openingByDate.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, timeMap]) => {
      const dateList = Array.from(timeMap.values()).sort((left, right) =>
        left.time.localeCompare(right.time)
      )
      const hasNightQuickPickup = dateList.some(
        item => item.type === 'NIGHT' && item.text.includes('小时')
      )

      return {
        date,
        dateList: hasNightQuickPickup
          ? dateList.filter(
              item =>
                item.type !== 'NORMAL' || !item.text.includes('小时')
            )
          : dateList
      }
    })
    .filter(opening =>
      opening.dateList.some(item => isAvailablePickupType(item.type))
    )

  return {
    ...response,
    openingList,
    nightCapability
  }
}

function parseDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)

  if (!match) {
    return null
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))

  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
    ? date
    : null
}

export function createOrderEditPickupDateOptions(
  response?: OrderEditPickupTimeResponse | null
): OrderEditPickupDateOption[] {
  return (response?.openingList ?? []).map(opening => {
    const date = parseDate(opening.date)

    return {
      value: opening.date,
      label: date
        ? `${date.getUTCMonth() + 1}月${date.getUTCDate()}日`
        : opening.date,
      weekday: date ? WEEKDAY_LABELS[date.getUTCDay()] : '',
      timeOptions: opening.dateList.map(item => ({
        date: opening.date,
        time: item.time,
        text: item.text,
        type: item.type,
        label: item.text === '现在发货' ? '一小时内' : item.text,
        disabled: item.type === 'DISABLE',
        night: item.type === 'NIGHT'
      }))
    }
  })
}

export function createOrderEditPickupDateTime(date: string, time: string) {
  const normalizedTime = normalizeText(time)

  return /^\d{4}-\d{2}-\d{2}/.test(normalizedTime)
    ? normalizedTime
    : `${normalizeText(date)} ${normalizedTime}`.trim()
}

export function getFirstOrderEditPickupTimeSelection(
  response: OrderEditPickupTimeResponse
): OrderEditPickupTimeSelection | null {
  for (const opening of response.openingList ?? []) {
    const item = opening.dateList.find(time => time.type === 'NORMAL')

    if (item) {
      return { date: opening.date, ...item }
    }
  }

  return null
}

export function findOrderEditPickupTimeSelection(
  response: OrderEditPickupTimeResponse,
  pickup: Pick<OrderEditPickupDraft, 'time' | 'type'>
): OrderEditPickupTimeSelection | null {
  for (const opening of response.openingList ?? []) {
    const item = opening.dateList.find(
      candidate =>
        isAvailablePickupType(candidate.type) &&
        candidate.type === pickup.type &&
        createOrderEditPickupDateTime(opening.date, candidate.time) ===
          pickup.time
    )

    if (item) {
      return { date: opening.date, ...item }
    }
  }

  return null
}

export function getOrderEditPickupTimeSelection(
  response: OrderEditPickupTimeResponse | null,
  date: string,
  time: string
): OrderEditPickupTimeSelection | null {
  const opening = response?.openingList?.find(item => item.date === date)

  if (!opening) {
    return null
  }

  const item = opening.dateList.find(
    candidate =>
      candidate.time === time && isAvailablePickupType(candidate.type)
  )

  return item ? { date, ...item } : null
}

export function getOrderEditPickupDate(value: string) {
  return value.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? ''
}
