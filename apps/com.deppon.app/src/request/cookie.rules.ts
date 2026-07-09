const ECO_TOKEN_NAME = 'ECO_TOKEN'

function normalizeHeaderValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.join(';')
  }

  return typeof value === 'string' ? value : ''
}

export function getSetCookieFromHeaders(headers: Record<string, unknown>) {
  const headerKey = Object.keys(headers).find(
    (key) => key.toLowerCase() === 'set-cookie'
  )

  if (!headerKey) {
    return ''
  }

  return normalizeHeaderValue(headers[headerKey])
}

export function normalizeCookieList(cookies?: string[]) {
  if (!cookies?.length) {
    return ''
  }

  return cookies.join(';')
}

export function extractEcoToken(cookie: string) {
  const match = cookie.match(/(?:^|;\s*)ECO_TOKEN=([^;]+)/)

  return match?.[1] ?? ''
}

export function createEcoSessionCookie(cookie: string) {
  const ecoToken = extractEcoToken(cookie)

  return ecoToken ? `${ECO_TOKEN_NAME}=${ecoToken};` : ''
}
