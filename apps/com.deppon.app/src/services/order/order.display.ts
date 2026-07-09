export function getFullAddress(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join('')
}

export function hasDisplayText(value: unknown) {
  return (
    (typeof value === 'string' && value.trim() !== '') ||
    typeof value === 'number'
  )
}

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

export function formatMeasure(value: unknown, unit: string) {
  const numberValue = Number(value)

  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    return '--'
  }

  return `${numberValue}${unit}`
}

export function formatAmount(value: unknown) {
  const numberValue = Number(value)

  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    return ''
  }

  return `¥${numberValue.toFixed(2)}`
}

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

export function isEncryptedText(value: string | null | undefined) {
  return !!value && value.includes('*')
}
