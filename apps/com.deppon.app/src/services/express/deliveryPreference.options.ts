const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const SCHEDULED_WINDOW_PATTERN =
  /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}-\d{2}:\d{2})$/
const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

export interface ExpressDeliveryDateOption {
  value: string
  label: string
  weekday: string
}

export interface ExpressDeliveryTimeWindowOption {
  value: string
  label: string
  feeText: string
  night: boolean
}

export const EXPRESS_DELIVERY_TIME_WINDOWS:
  ExpressDeliveryTimeWindowOption[] = [
  { value: '09:00-12:00', label: '09:00-12:00', feeText: '预计 ¥5', night: false },
  { value: '12:00-14:00', label: '12:00-14:00', feeText: '预计 ¥5', night: false },
  { value: '14:00-16:00', label: '14:00-16:00', feeText: '预计 ¥5', night: false },
  { value: '16:00-18:00', label: '16:00-18:00', feeText: '预计 ¥5', night: false },
  { value: '18:00-21:00', label: '18:00-21:00', feeText: '预计 ¥5', night: false },
  { value: '21:00-23:59', label: '21:00-23:59', feeText: '预计 ¥150', night: true }
]

function normalizeText(value?: string | null) {
  return (value ?? '').trim()
}

export function parseExpressDeliveryDate(value?: string | null) {
  const text = normalizeText(value)
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/)

  if (!match) {
    return null
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }

  return date
}

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function formatDate(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function addExpressDeliveryDays(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount)
}

function createDateOption(date: Date): ExpressDeliveryDateOption {
  return {
    value: formatDate(date),
    label: `${date.getMonth() + 1}月${date.getDate()}日`,
    weekday: WEEKDAY_LABELS[date.getDay()]
  }
}

export function isExpressDeliveryDateTextValid(value: string) {
  return DATE_PATTERN.test(value) && Boolean(parseExpressDeliveryDate(value))
}

export function isExpressScheduledDeliveryWindow(value: string) {
  const match = value.match(SCHEDULED_WINDOW_PATTERN)

  return Boolean(
    match &&
      isExpressDeliveryDateTextValid(match[1]) &&
      EXPRESS_DELIVERY_TIME_WINDOWS.some(option => option.value === match[2])
  )
}

export function isExpressNightDeliveryWindow(value: string) {
  return value.endsWith('21:00-23:59')
}

export function getExpressScheduledDate(value: string) {
  return value.match(SCHEDULED_WINDOW_PATTERN)?.[1] ?? ''
}

export function getExpressScheduledTimeWindow(value: string) {
  return value.match(SCHEDULED_WINDOW_PATTERN)?.[2] ?? ''
}

export function createExpressScheduledWindow(date: string, timeWindow: string) {
  const value = `${date} ${timeWindow}`

  return isExpressScheduledDeliveryWindow(value) ? value : ''
}

export function createExpressScheduledDateOptions(
  arriveDate?: string | null,
  selectedWindow = '',
  now = new Date()
) {
  const anchor = parseExpressDeliveryDate(arriveDate) ?? now
  const options = Array.from({ length: 7 }, (_, index) =>
    createDateOption(addExpressDeliveryDays(anchor, index + 1))
  )
  const selectedDate = getExpressScheduledDate(selectedWindow)

  if (selectedDate && !options.some(option => option.value === selectedDate)) {
    const date = parseExpressDeliveryDate(selectedDate)

    if (date) {
      options.unshift(createDateOption(date))
    }
  }

  return options
}

export function createExpressUnavailableDateOptions(now = new Date()) {
  return Array.from({ length: 30 }, (_, index) =>
    createDateOption(addExpressDeliveryDays(now, index + 1))
  )
}

export function validateExpressUnavailableDeliveryDates(
  rawDates: string[],
  now?: Date
) {
  if (rawDates.length > 30) {
    return ['不可收货日期不能超过 30 天']
  }

  if (rawDates.some(date => !isExpressDeliveryDateTextValid(date))) {
    return ['不可收货日期格式不正确']
  }

  const availableDates = new Set(
    createExpressUnavailableDateOptions(now).map(item => item.value)
  )

  if (rawDates.some(date => !availableDates.has(date))) {
    return ['不可收货日期需在未来 30 天内']
  }

  return []
}

export function validateExpressScheduledDeliveryRange(
  arriveDateValue: string | null | undefined,
  scheduledWindow: string
) {
  const arriveDate = parseExpressDeliveryDate(arriveDateValue)
  const scheduledDate = parseExpressDeliveryDate(
    getExpressScheduledDate(scheduledWindow)
  )

  if (!arriveDate) {
    return ['当前产品缺少预计到达时间，请重新获取价格']
  }

  if (
    !scheduledDate ||
    scheduledDate <= arriveDate ||
    scheduledDate > addExpressDeliveryDays(arriveDate, 7)
  ) {
    return ['定时派送时间需在预计到达后的 7 天内']
  }

  return []
}
