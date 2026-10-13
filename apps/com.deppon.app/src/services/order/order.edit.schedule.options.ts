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

type PickupTimeSelection = OrderEditPickupTimeSelection

export interface OrderEditPickupTimeOption extends PickupTimeSelection {
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

/**
 *
 * @param value 原始文本
 * @description 转为去除首尾空格的文本
 */
function normalizeText(value?: string | null) {
  return (value ?? '').trim()
}

/**
 *
 * @param value 时段类型
 * @description 判断是否为可选的时段类型
 */
function isAvailablePickupType(
  value: OrderEditPickupOpeningType
): value is OrderEditPickupTimeType {
  return value === 'NORMAL' || value === 'NIGHT'
}

/**
 *
 * @param target 按日期聚合的时段映射
 * @param openingList 可预约日期列表
 * @param type 时段类型
 * @description 将可预约时段合并进日期映射
 */
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

/**
 *
 * @param response 上门时间响应
 * @param nightCapability 夜间揽收能力
 * @description 归并排序上门时间数据
 */
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
              item => item.type !== 'NORMAL' || !item.text.includes('小时')
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

/**
 *
 * @param value 日期文本
 * @description 解析并校验日期
 */
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

/**
 *
 * @param response 上门时间响应
 * @description 生成上门日期与时段选项
 */
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

/**
 *
 * @param date 日期
 * @param time 时段
 * @description 拼接完整的上门时间
 */
export function createOrderEditPickupDateTime(date: string, time: string) {
  const normalizedTime = normalizeText(time)

  return /^\d{4}-\d{2}-\d{2}/.test(normalizedTime)
    ? normalizedTime
    : `${normalizeText(date)} ${normalizedTime}`.trim()
}

/**
 *
 * @param response 上门时间响应
 * @description 取首个可用的上门时段
 */
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

/**
 *
 * @param response 上门时间响应
 * @param pickup 当前上门时间草稿
 * @description 匹配草稿中已选的上门时段
 */
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

/**
 *
 * @param response 上门时间响应
 * @param date 日期
 * @param time 时段
 * @description 取指定日期时段的选中项
 */
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

/**
 *
 * @param value 时间文本
 * @description 提取时间文本中的日期
 */
export function getOrderEditPickupDate(value: string) {
  return value.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? ''
}
