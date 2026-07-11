import {
  clearSessionCookie,
  getSessionCookie,
  saveSessionCookieFromResponse
} from './cookieJar'
import {
  isDepponSuccessStatus,
  isResponseForCurrentSession,
  shouldAcceptDepponHttpStatus,
  shouldEmitAuthExpiredEvent,
  shouldEmitRateLimitedEvent
} from './deppon.rules'
import { getRequestFailureMessage } from './error'
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
  authExpired?: boolean
  transportFailure?: boolean
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
  message = '',
  transportFailure = false,
  authExpired = false
): DepponResponse<TResult> {
  return {
    status: false,
    message,
    result: null,
    ...(authExpired ? { authExpired: true } : {}),
    ...(transportFailure ? { transportFailure: true } : {})
  }
}

function normalizeOwsResponse<TResult>(
  response: HttpResponse<unknown>,
  loginRequired: boolean,
  requestCookie: string
): DepponResponse<TResult> {
  const data = response.data
  const dataStatus = isRecord(data) ? data.status : undefined
  const message =
    isRecord(data) && typeof data.message === 'string' ? data.message : null
  const currentSession = isResponseForCurrentSession(
    requestCookie,
    getSessionCookie()
  )
  const authExpired =
    currentSession &&
    shouldEmitAuthExpiredEvent(loginRequired, response.statusCode, dataStatus)

  if (currentSession && !authExpired) {
    void saveSessionCookieFromResponse(response)
  }

  if (
    currentSession &&
    shouldEmitRateLimitedEvent(response.statusCode, dataStatus)
  ) {
    emitRequestEvent('rateLimited', {
      url: response.url,
      statusCode: response.statusCode,
      message
    })
  }

  if (authExpired) {
    void clearSessionCookie()
    emitRequestEvent('authExpired', {
      url: response.url,
      statusCode: response.statusCode,
      message
    })
  }

  if (!isRecord(data)) {
    return createFallbackResponse<TResult>('', false, authExpired)
  }

  const rawStatus = data.status
  const normalized: DepponResponse<TResult> = {
    ...(data as unknown as DepponResponse<TResult>),
    status: isDepponSuccessStatus(rawStatus),
    ...(authExpired ? { authExpired: true } : {})
  }

  return normalized
}

function validateDepponStatus(statusCode: number) {
  return shouldAcceptDepponHttpStatus(statusCode)
}

export function depponRequest<TResult = unknown, TData = unknown>(
  options: DepponRequestOptions<TData, TResult>
): Promise<DepponResponse<TResult>> {
  const headers = createRequestHeaders(options)
  const requestCookie = headers.Cookie ?? ''

  return http
    .request<DepponResponse<TResult>, TData>({
      ...options,
      headers,
      validateStatus: options.validateStatus ?? validateDepponStatus,
      transformResponse: response =>
        normalizeOwsResponse<TResult>(
          response,
          options.login !== false,
          requestCookie
        )
    })
    .catch((error: unknown) => {
      const message = getRequestFailureMessage(error)

      if (!message) {
        throw error
      }

      return createFallbackResponse<TResult>(message, true)
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
