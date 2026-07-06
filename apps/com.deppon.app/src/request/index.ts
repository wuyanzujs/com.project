import Taro from '@tarojs/taro'
import { RequestError } from './error'
import type {
  HttpResponse,
  RequestHeaders,
  RequestMethod,
  RequestOptions,
  RequestRuntimeConfig,
  RequestShortcutOptions,
  TokenGetter
} from './types'

const DEFAULT_TIMEOUT = 15000
const DEFAULT_AUTH_HEADER = 'Authorization'

let runtimeBaseURL = ''
let runtimeTimeout = DEFAULT_TIMEOUT
let runtimeTokenGetter: TokenGetter | undefined
let runtimeAuthHeaderName = DEFAULT_AUTH_HEADER

export function configureRequest(config: RequestRuntimeConfig) {
  if (config.baseURL !== undefined) {
    runtimeBaseURL = config.baseURL
  }

  if (config.timeout !== undefined) {
    runtimeTimeout = config.timeout
  }

  if (config.getToken !== undefined) {
    runtimeTokenGetter = config.getToken
  }

  if (config.authHeaderName !== undefined) {
    runtimeAuthHeaderName = config.authHeaderName
  }
}

export function setRequestBaseURL(baseURL: string) {
  runtimeBaseURL = baseURL
}

export function setRequestTokenGetter(getToken: TokenGetter) {
  runtimeTokenGetter = getToken
}

function isAbsoluteURL(url: string) {
  return /^https?:\/\//i.test(url)
}

function joinURL(baseURL: string, url: string) {
  if (!baseURL || isAbsoluteURL(url)) {
    return url
  }

  return `${baseURL.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`
}

function normalizeToken(token: string) {
  return /^Bearer\s+/i.test(token) ? token : `Bearer ${token}`
}

async function createHeaders(options: RequestOptions): Promise<RequestHeaders> {
  const headers: RequestHeaders = {
    'content-type': 'application/json',
    ...options.headers
  }

  if (!options.skipAuth && runtimeTokenGetter) {
    const token = await runtimeTokenGetter()

    if (token) {
      headers[runtimeAuthHeaderName] = normalizeToken(token)
    }
  }

  return headers
}

function defaultValidateStatus(statusCode: number) {
  return statusCode >= 200 && statusCode < 300
}

function normalizeResponse(
  response: Taro.request.SuccessCallbackResult<any>,
  url: string,
  method: RequestMethod
): HttpResponse<unknown> {
  return {
    data: response.data,
    statusCode: response.statusCode,
    headers: response.header ?? {},
    cookies: response.cookies,
    url,
    method
  }
}

export async function request<TResult = unknown, TData = unknown>(
  options: RequestOptions<TData, TResult>
): Promise<TResult> {
  const method = options.method ?? 'GET'
  const url = joinURL(options.baseURL ?? runtimeBaseURL, options.url)
  const headers = await createHeaders(options)

  let response: HttpResponse<unknown>

  try {
    const taroResponse = await Taro.request<unknown, any>({
      url,
      method,
      data: options.data as any,
      header: headers,
      timeout: options.timeout ?? runtimeTimeout,
      dataType: options.dataType,
      responseType: options.responseType
    })

    response = normalizeResponse(taroResponse, url, method)
  } catch (cause) {
    throw new RequestError({
      type: 'NETWORK_ERROR',
      message: '网络请求失败',
      url,
      method,
      cause
    })
  }

  const validateStatus = options.validateStatus ?? defaultValidateStatus

  if (!validateStatus(response.statusCode)) {
    throw new RequestError({
      type: 'HTTP_ERROR',
      message: `HTTP 请求失败：${response.statusCode}`,
      url,
      method,
      statusCode: response.statusCode,
      response
    })
  }

  if (options.transformResponse) {
    return options.transformResponse(response)
  }

  return response.data as TResult
}

export const http = {
  request,

  get<TResult = unknown>(url: string, options?: RequestShortcutOptions<TResult>) {
    return request<TResult>({
      ...options,
      url,
      method: 'GET'
    })
  },

  post<TResult = unknown, TData = unknown>(
    url: string,
    data?: TData,
    options?: RequestShortcutOptions<TResult>
  ) {
    return request<TResult, TData>({
      ...options,
      url,
      data,
      method: 'POST'
    })
  },

  put<TResult = unknown, TData = unknown>(
    url: string,
    data?: TData,
    options?: RequestShortcutOptions<TResult>
  ) {
    return request<TResult, TData>({
      ...options,
      url,
      data,
      method: 'PUT'
    })
  },

  patch<TResult = unknown, TData = unknown>(
    url: string,
    data?: TData,
    options?: RequestShortcutOptions<TResult>
  ) {
    return request<TResult, TData>({
      ...options,
      url,
      data,
      method: 'PATCH'
    })
  },

  delete<TResult = unknown>(url: string, options?: RequestShortcutOptions<TResult>) {
    return request<TResult>({
      ...options,
      url,
      method: 'DELETE'
    })
  }
}

export { RequestError }
export type {
  HttpResponse,
  RequestHeaders,
  RequestMethod,
  RequestOptions,
  RequestRuntimeConfig,
  RequestShortcutOptions,
  TokenGetter
}
