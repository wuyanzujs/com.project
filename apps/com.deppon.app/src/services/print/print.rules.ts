import type { DepponResponse } from '@/request/deppon'

import type {
  PrintDateRangeKey,
  PrintDateRangeOption,
  PrintListCounts,
  PrintListResponse,
  PrintOrderListItem,
  PrintSearchType
} from './types'

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

/**
 *
 * @param value 数字
 * @description 补零为两位数字字符串
 */
function pad(value: number) {
  return String(value).padStart(2, '0')
}

/**
 *
 * @param date 日期
 * @param time 起始或结束标记
 * @description 格式化为接口需要的时间串
 */
function formatDateTime(date: Date, time: 'start' | 'end') {
  const timeText = time === 'start' ? '00:00:00' : '23:59:59'

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )} ${timeText}`
}

/**
 *
 * @param date 日期
 * @description 格式化为月日展示文案
 */
function formatDateLabel(date: Date) {
  return `${pad(date.getMonth() + 1)}月${pad(date.getDate())}日`
}

/**
 *
 * @param now 当前时间
 * @description 生成打印日期范围选项列表
 */
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

/**
 *
 * @param rangeKey 日期范围 key
 * @param now 当前时间
 * @description 按 key 取日期范围，缺失用默认值
 */
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

/**
 *
 * @param response 打印列表响应
 * @description 取响应中的订单总数，无值返回 null
 */
function getResponseCount(response?: DepponResponse<PrintListResponse> | null) {
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

/**
 *
 * @param waitingResponse 待打印响应
 * @param printedResponse 已打印响应
 * @description 汇总待打印与已打印数量及失败项
 */
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

/**
 *
 * @param current 已有列表
 * @param incoming 新增列表
 * @param replace 是否整表替换
 * @description 合并订单分页并按 key 去重
 */
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
