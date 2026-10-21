/**
 *
 * @param parts 地址片段列表
 * @description 过滤空值并拼接完整地址
 */
export function getFullAddress(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join('')
}

/**
 *
 * @param value 待判断值
 * @description 判断值是否可展示
 */
export function hasDisplayText(value: unknown) {
  return (typeof value === 'string' && value.trim() !== '') || typeof value === 'number'
}

/**
 *
 * @param value 待转换值
 * @param fallback 兜底文案
 * @description 转为展示文案，空值取兜底值
 */
export function toDisplayText(value: unknown, fallback = '--') {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : fallback
  }

  if (typeof value === 'string') {
    const text = value.trim()

    return text || fallback
  }

  return fallback
}

/**
 *
 * @param value 数值
 * @param unit 单位
 * @description 格式化数值与单位，非法值返回 --
 */
export function formatMeasure(value: unknown, unit: string) {
  const numberValue = Number(value)

  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    return '--'
  }

  return `${numberValue}${unit}`
}

/**
 *
 * @param value 金额数值
 * @description 格式化为 ¥ 金额，非法值返回空
 */
export function formatAmount(value: unknown) {
  const numberValue = Number(value)

  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    return ''
  }

  return `¥${numberValue.toFixed(2)}`
}

/**
 *
 * @param value 手机号
 * @description 按长度对手机号做脱敏
 */
export function maskMobile(value: string | null | undefined) {
  if (!value) {
    return '--'
  }

  const text = value.trim()

  if (!text || text.includes('*')) {
    return text || '--'
  }

  const digits = text.replace(/\D/g, '')

  if (digits.length >= 11) {
    return text.replace(digits, `${digits.slice(0, 3)}****${digits.slice(-4)}`)
  }

  if (digits.length >= 7) {
    return text.replace(digits, `${digits.slice(0, 2)}***${digits.slice(-2)}`)
  }

  return text
}

/**
 *
 * @param value 待判断文本
 * @description 判断文本是否已脱敏加密
 */
export function isEncryptedText(value: string | null | undefined) {
  return !!value && value.includes('*')
}
