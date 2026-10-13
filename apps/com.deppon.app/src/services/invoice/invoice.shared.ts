/**
 *
 * @param value 待处理的文本或数字
 * @description 转成去掉首尾空格的字符串
 */
export function normalizeText(value?: string | number | null) {
  return String(value ?? '').trim()
}

/**
 *
 * @param value 待转换的值
 * @description 转成有限数字，非法值返回 0
 */
export function toFiniteNumber(value: unknown) {
  const numberValue = Number(value)

  return Number.isFinite(numberValue) ? numberValue : 0
}

/**
 *
 * @param value 文本
 * @description 按中文占两字符计算文本长度
 */
export function getFieldLength(value: string) {
  return value
    .split('')
    .reduce((total, char) => total + (char.charCodeAt(0) > 255 ? 2 : 1), 0)
}

/**
 *
 * @param value 数字值
 * @description 数字补零为两位字符串
 */
function pad(value: number) {
  return String(value).padStart(2, '0')
}

/**
 *
 * @param date 日期对象
 * @description 格式化为日期时间字符串
 */
export function formatDateTime(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
    date.getSeconds()
  )}`
}

/**
 *
 * @param value 文本
 * @param maxLength 最大长度
 * @description 超长文本截断并加省略号
 */
export function truncateText(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value
}
