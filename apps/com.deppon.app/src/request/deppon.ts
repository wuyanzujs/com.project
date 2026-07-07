import { clearSessionCookie, getSessionCookie, saveSessionCookieFromResponse } from './cookieJar'
import { emitRequestEvent } from './events'
import { http } from './index'

import type {
  HttpResponse,
  RequestHeaders,
  RequestMethod,
  RequestShortcutOptions
} from './types'

const HTTP_STATUS = {
  unauthorized: 401,
  tooManyRequests: 429
} as const

const OWS_STATUS = {
  logout: '901',
  success: 'success'
} as const

export interface DepponResponse<TResult = unknown> {
  status: boolean
  message?: string | null
  result?: TResult | null
  success?: boolean
  reason?: string | null
  cusCode?: string | null
  custName?: string | null
  code?: string
  locations?: Array<{ lng: number; lat: number }>
}

export interface DepponRequestOptions<TData = unknown, TResult = unknown>
  extends RequestShortcutOptions<DepponResponse<TResult>> {
  url: string
  method?: RequestMethod
  data?: TData
  contentType?: string
  login?: boolean
  loading?: boolean
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function isSuccessStatus(status: unknown) {
  return status === true || status === '1' || status === 0 || status === OWS_STATUS.success
}

function createRequestHeaders<TData, TResult>(
  options: DepponRequestOptions<TData, TResult>
): RequestHeaders {
  const headers: RequestHeaders = {
    'content-type': options.contentType ?? 'application/json; charset=UTF-8',
    ...options.headers
  }
  const cookie = getSessionCookie()

  if (cookie) {
    headers.Cookie = cookie
  }

  return headers
}

function createFallbackResponse<TResult>(
  message = ''
): DepponResponse<TResult> {
  return {
    status: false,
    message,
    result: null
  }
}

function normalizeOwsResponse<TResult>(
  response: HttpResponse<unknown>,
  loginRequired: boolean
): DepponResponse<TResult> {
  saveSessionCookieFromResponse(response)

  const data = response.data

  if (!isRecord(data)) {
    return createFallbackResponse<TResult>()
  }

  const rawStatus = data.status
  const normalized: DepponResponse<TResult> = {
    ...(data as unknown as DepponResponse<TResult>),
    status: isSuccessStatus(rawStatus)
  }

  if (
    response.statusCode === HTTP_STATUS.tooManyRequests ||
    data.status === HTTP_STATUS.tooManyRequests
  ) {
    emitRequestEvent('rateLimited', {
      url: response.url,
      statusCode: response.statusCode,
      message: normalized.message
    })
  }

  if (
    loginRequired &&
    response.statusCode === HTTP_STATUS.unauthorized &&
    data.status === OWS_STATUS.logout
  ) {
    clearSessionCookie()
    emitRequestEvent('authExpired', {
      url: response.url,
      statusCode: response.statusCode,
      message: normalized.message
    })
  }

  return normalized
}

function validateDepponStatus(statusCode: number) {
  return (
    (statusCode >= 200 && statusCode < 300) ||
    statusCode === HTTP_STATUS.unauthorized ||
    statusCode === HTTP_STATUS.tooManyRequests
  )
}

export function depponRequest<TResult = unknown, TData = unknown>(
  options: DepponRequestOptions<TData, TResult>
): Promise<DepponResponse<TResult>> {
  return http.request<DepponResponse<TResult>, TData>({
    ...options,
    headers: createRequestHeaders(options),
    validateStatus: options.validateStatus ?? validateDepponStatus,
    transformResponse: (response) =>
      normalizeOwsResponse<TResult>(response, options.login !== false)
  })
}

export const depponHttp = {
  request: depponRequest,

  get<TResult = unknown>(
    url: string,
    options?: Omit<DepponRequestOptions<unknown, TResult>, 'url' | 'method'>
  ) {
    return depponRequest<TResult>({
      ...options,
      url,
      method: 'GET'
    })
  },

  post<TResult = unknown, TData = unknown>(
    url: string,
    data?: TData,
    options?: Omit<DepponRequestOptions<TData, TResult>, 'url' | 'method' | 'data'>
  ) {
    return depponRequest<TResult, TData>({
      ...options,
      url,
      data,
      method: 'POST'
    })
  }
}
