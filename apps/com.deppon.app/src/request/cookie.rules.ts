const ECO_TOKEN_NAME = 'ECO_TOKEN'

interface HeadersLike {
  get?: (name: string) => unknown
  getSetCookie?: () => unknown
  map?: unknown
  raw?: () => unknown
}

interface CookieObjectLike {
  name?: unknown
  value?: unknown
}

function normalizeHeaderValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value
      .map(item => normalizeHeaderValue(item))
      .filter(Boolean)
      .join(';')
  }

  if (value && typeof value === 'object') {
    const cookie = value as CookieObjectLike

    if (typeof cookie.name === 'string' && typeof cookie.value === 'string') {
      return `${cookie.name}=${cookie.value}`
    }
  }

  return typeof value === 'string' ? value : ''
}

export function getSetCookieFromHeaders(headers: unknown): string {
  if (!headers || typeof headers !== 'object') {
    return ''
  }

  const headersLike = headers as HeadersLike

  try {
    const setCookies = headersLike.getSetCookie?.()
    const normalizedSetCookies = normalizeHeaderValue(setCookies)

    if (normalizedSetCookies) {
      return normalizedSetCookies
    }
  } catch {
    // Fall back to the standard Headers.get API or a plain object.
  }

  try {
    const setCookie = headersLike.get?.('set-cookie')
    const normalizedSetCookie = normalizeHeaderValue(setCookie)

    if (normalizedSetCookie) {
      return normalizedSetCookie
    }
  } catch {
    // Fall back to the plain response header object used by other runtimes.
  }

  try {
    const rawHeaders = headersLike.raw?.()
    const rawSetCookie =
      rawHeaders && typeof rawHeaders === 'object'
        ? Object.entries(rawHeaders as Record<string, unknown>).find(
            ([key]) => key.toLowerCase() === 'set-cookie'
          )?.[1]
        : undefined
    const normalizedRawSetCookie = normalizeHeaderValue(rawSetCookie)

    if (normalizedRawSetCookie) {
      return normalizedRawSetCookie
    }
  } catch {
    // Fall back to the plain response header object used by other runtimes.
  }

  if (headersLike.map && typeof headersLike.map === 'object') {
    const mappedHeaders = headersLike.map as Record<string, unknown>
    const mappedHeaderKey = Object.keys(mappedHeaders).find(
      key => key.toLowerCase() === 'set-cookie'
    )

    if (mappedHeaderKey) {
      const mappedSetCookie = normalizeHeaderValue(
        mappedHeaders[mappedHeaderKey]
      )

      if (mappedSetCookie) {
        return mappedSetCookie
      }
    }
  }

  const headerRecord = headers as Record<string, unknown>
  const headerKey = Object.keys(headerRecord).find(
    (key) => key.toLowerCase() === 'set-cookie'
  )

  if (!headerKey) {
    return ''
  }

  return normalizeHeaderValue(headerRecord[headerKey])
}

export function normalizeCookieList(cookies?: unknown) {
  if (!Array.isArray(cookies) || !cookies.length) {
    return ''
  }

  return normalizeHeaderValue(cookies)
}

export function extractEcoToken(cookie: string) {
  const match = cookie.match(/(?:^|[;,\r\n]\s*)ECO_TOKEN=([^;,\r\n]+)/)

  return match?.[1] ?? ''
}

export function createEcoSessionCookie(cookie: string) {
  const ecoToken = extractEcoToken(cookie)

  return ecoToken ? `${ECO_TOKEN_NAME}=${ecoToken};` : ''
}
