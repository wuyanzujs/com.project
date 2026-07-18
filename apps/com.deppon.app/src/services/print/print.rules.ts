import type {
  PrintDateRangeKey,
  PrintDateRangeOption,
  PrintListCounts,
  PrintListResponse,
  PrintOrderListItem,
  PrintSearchType
} from './types'
import type { DepponResponse } from '../../request/deppon'

const PRINT_DATE_RANGE_DEFINITIONS: ReadonlyArray<{
  key: PrintDateRangeKey
  label: string
  days: number
}> = [
  { key: 'today', label: '今天', days: 1 },
  { key: 'threeDays', label: '近3天', days: 3 },
  { key: 'oneWeek', label: '近一周', days: 7 },
  { key: 'oneMonth', label: '近一个月', days: 30 },
  { key: 'threeMonths', label: '近三个月', days: 90 }
]

export const DEFAULT_PRINT_DATE_RANGE_KEY: PrintDateRangeKey = 'threeDays'

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function formatDateTime(date: Date, time: 'start' | 'end') {
  const timeText = time === 'start' ? '00:00:00' : '23:59:59'

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )} ${timeText}`
}

function formatDateLabel(date: Date) {
  return `${pad(date.getMonth() + 1)}月${pad(date.getDate())}日`
}

export function createPrintDateRangeOptions(
  now = new Date()
): PrintDateRangeOption[] {
  const endDate = new Date(now)

  return PRINT_DATE_RANGE_DEFINITIONS.map(definition => {
    const startDate = new Date(endDate)

    startDate.setDate(startDate.getDate() - (definition.days - 1))

    return {
      key: definition.key,
      label: definition.label,
      summary:
        definition.days === 1
          ? formatDateLabel(startDate)
          : `${formatDateLabel(startDate)} 至今`,
      startTime: formatDateTime(startDate, 'start'),
      endTime: formatDateTime(endDate, 'end')
    }
  })
}

export function getPrintDateRange(
  rangeKey: PrintDateRangeKey = DEFAULT_PRINT_DATE_RANGE_KEY,
  now = new Date()
) {
  const options = createPrintDateRangeOptions(now)

  return (
    options.find(option => option.key === rangeKey) ??
    options.find(option => option.key === DEFAULT_PRINT_DATE_RANGE_KEY) ??
    options[0]
  )
}

function getResponseCount(
  response?: DepponResponse<PrintListResponse> | null
) {
  if (!response?.status || !response.result) {
    return null
  }

  if (
    response.result.totalRows === null ||
    response.result.totalRows === undefined
  ) {
    return response.result.list?.length ?? 0
  }

  const totalRows = Number(response.result.totalRows)

  if (!Number.isFinite(totalRows) || totalRows < 0) {
    return response.result.list?.length ?? 0
  }

  return Math.floor(totalRows)
}

export function resolvePrintListCounts(
  waitingResponse?: DepponResponse<PrintListResponse> | null,
  printedResponse?: DepponResponse<PrintListResponse> | null
): PrintListCounts {
  const waiting = getResponseCount(waitingResponse)
  const printed = getResponseCount(printedResponse)
  const failedSearchTypes: PrintSearchType[] = []

  if (waiting === null) {
    failedSearchTypes.push('1')
  }

  if (printed === null) {
    failedSearchTypes.push('2')
  }

  return {
    waiting,
    printed,
    failedSearchTypes
  }
}

export function mergePrintOrderPages(
  current: PrintOrderListItem[],
  incoming: PrintOrderListItem[],
  replace = false
) {
  const merged = replace ? incoming : [...current, ...incoming]
  const seen = new Set<string>()

  return merged.filter(item => {
    if (seen.has(item.key)) {
      return false
    }

    seen.add(item.key)
    return true
  })
}
