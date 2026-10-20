/**
 *
 * @param value 文本，可为空
 * @description 去除文本首尾空白
 */
function normalizeText(value?: string | null) {
  return (value ?? '').trim()
}

/**
 *
 * @param value 联系电话文本
 * @description 提取网点主电话号码
 */
export function getStationPrimaryPhone(value?: string | null) {
  const candidates = normalizeText(value)
    .split(/[,，;；、\s/]+/)
    .map(item => item.trim())
    .filter(Boolean)

  return candidates.find(item => /^(\+?\d{5,20}|\d{3,4}-?\d{7,14})$/.test(item)) || candidates.find(item => /\d{5,}/.test(item)) || normalizeText(value)
}
