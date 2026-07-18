import type { AppRoutePath } from './routes'

export type RouteQueryValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Array<string | number | boolean | null | undefined>

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

export function appendRouteQuery<TUrl extends string>(
  url: TUrl,
  params: RouteQueryParams
) {
  const query = createRouteQuery(params)

  if (!query) {
    return url
  }

  return `${url}${url.includes('?') ? '&' : '?'}${query}`
}

export function createAppRouteUrl(
  route: AppRoutePath,
  params: RouteQueryParams
): AppRouteUrl {
  return appendRouteQuery(route, params) as AppRouteUrl
}
