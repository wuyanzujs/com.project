import {
  clearSessionCookie,
  getSessionCookie,
  saveSessionCookieFromResponse
} from './cookieJar'
import {
  isDepponSuccessStatus,
  shouldAcceptDepponHttpStatus,
  shouldEmitAuthExpiredEvent,
  shouldEmitRateLimitedEvent
} from './deppon.rules'
import { emitRequestEvent } from './events'
import { http } from './index'

import type {
  HttpResponse,
  RequestHeaders,
  RequestMethod,
  RequestShortcutOptions
} from './types'

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

export interface DepponRequestOptions<
  TData = unknown,
  TResult = unknown
> extends RequestShortcutOptions<DepponResponse<TResult>> {
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
  void saveSessionCookieFromResponse(response)

  const data = response.data

  if (!isRecord(data)) {
    return createFallbackResponse<TResult>()
  }

  const rawStatus = data.status
  const normalized: DepponResponse<TResult> = {
    ...(data as unknown as DepponResponse<TResult>),
    status: isDepponSuccessStatus(rawStatus)
  }

  if (shouldEmitRateLimitedEvent(response.statusCode, data.status)) {
    emitRequestEvent('rateLimited', {
      url: response.url,
      statusCode: response.statusCode,
      message: normalized.message
    })
  }

  if (
    shouldEmitAuthExpiredEvent(loginRequired, response.statusCode, data.status)
  ) {
    void clearSessionCookie()
    emitRequestEvent('authExpired', {
      url: response.url,
      statusCode: response.statusCode,
      message: normalized.message
    })
  }

  return normalized
}

function validateDepponStatus(statusCode: number) {
  return shouldAcceptDepponHttpStatus(statusCode)
}

export function depponRequest<TResult = unknown, TData = unknown>(
  options: DepponRequestOptions<TData, TResult>
): Promise<DepponResponse<TResult>> {
  return http.request<DepponResponse<TResult>, TData>({
    ...options,
    headers: createRequestHeaders(options),
    validateStatus: options.validateStatus ?? validateDepponStatus,
    transformResponse: response =>
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
    options?: Omit<
      DepponRequestOptions<TData, TResult>,
      'url' | 'method' | 'data'
    >
  ) {
    return depponRequest<TResult, TData>({
      ...options,
      url,
      data,
      method: 'POST'
    })
  }
}
