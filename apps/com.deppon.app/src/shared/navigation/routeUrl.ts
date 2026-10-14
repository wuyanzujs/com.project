import type { AppRoutePath } from './routes'

export type RouteQueryValue = string | number | boolean | null | undefined | Array<string | number | boolean | null | undefined>

export type RouteQueryParams = Record<string, unknown>
export type AppRouteUrl = AppRoutePath | `${AppRoutePath}?${string}`

export function normalizeAppRouteUrlParam(value?: string) {
  if (!value) {
    return ''
  }

  if (value.startsWith('/pages/')) {
    return value
  }

  if (!/^%2Fpages%2F/i.test(value)) {
    return ''
  }

  try {
    const decoded = decodeURIComponent(value)

    return decoded.startsWith('/pages/') ? decoded : ''
  } catch {
    return ''
  }
}

function stringifyRouteValue(value: unknown): string {
  if (Array.isArray(value)) {
    return stringifyRouteValue(value[0])
  }

  if (value === null || value === undefined) {
    return ''
  }

  return String(value)
}

export function createRouteQuery(params: RouteQueryParams) {
  return Object.entries(params)
    .map(([key, value]) => [key, stringifyRouteValue(value)] as const)
    .filter(([, value]) => value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&')
}

function decodeQueryPart(value: string) {
  const normalized = value.replace(/\+/g, ' ')

  try {
    return decodeURIComponent(normalized)
  } catch {
    // 外部来源携带非法转义时保留原值，避免阻断整个页面跳转。
    return normalized
  }
}

/** RN 0.73 的 URLSearchParams 不支持 entries 或字符串解析，路由统一在这里解析。 */
export function parseRouteQuery(query: string): Record<string, string> {
  return Object.fromEntries(
    query
      .split('&')
      .filter(Boolean)
      .map(part => {
        const separator = part.indexOf('=')
        const key = separator < 0 ? part : part.slice(0, separator)
        const value = separator < 0 ? '' : part.slice(separator + 1)

        return [decodeQueryPart(key), decodeQueryPart(value)]
      })
  )
}

export function appendRouteQuery<TUrl extends string>(url: TUrl, params: RouteQueryParams) {
  const query = createRouteQuery(params)

  if (!query) {
    return url
  }

  return `${url}${url.includes('?') ? '&' : '?'}${query}`
}

export function createAppRouteUrl(route: AppRoutePath, params: RouteQueryParams): AppRouteUrl {
  return appendRouteQuery(route, params) as AppRouteUrl
}
