export function normalizeText(value?: string | number | null) {
  return String(value ?? '').trim()
}

export function toFiniteNumber(value: unknown) {
  const numberValue = Number(value)

  return Number.isFinite(numberValue) ? numberValue : 0
}

export function getFieldLength(value: string) {
  return value.split('').reduce(
    (total, char) => total + (char.charCodeAt(0) > 255 ? 2 : 1),
    0
  )
}

function pad(value: number) {
  return String(value).padStart(2, '0')
}

export function formatDateTime(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
    date.getSeconds()
  )}`
}

export function truncateText(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value
}

