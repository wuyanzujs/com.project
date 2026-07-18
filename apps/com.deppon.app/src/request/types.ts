export type RequestMethod =
  | 'OPTIONS'
  | 'GET'
  | 'HEAD'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'DELETE'
  | 'TRACE'
  | 'CONNECT'

export type RequestHeaders = Record<string, string>
export type RequestCredentialsMode = 'include' | 'omit' | 'same-origin'

export interface HttpResponse<T = unknown> {
  data: T
  statusCode: number
  headers: unknown
  fallbackHeaders?: unknown
  cookies?: unknown
  url: string
  method: RequestMethod
}

export type TokenGetter = () => string | undefined | Promise<string | undefined>

export type ResponseTransformer<TResult = unknown> = (
  response: HttpResponse<unknown>
) => TResult | Promise<TResult>

export interface RequestOptions<TData = unknown, TResult = unknown> {
  url: string
  method?: RequestMethod
  data?: TData
  headers?: RequestHeaders
  timeout?: number
  baseURL?: string
  skipAuth?: boolean
  dataType?: string
  responseType?: 'text' | 'arraybuffer'
  credentials?: RequestCredentialsMode
  validateStatus?: (statusCode: number) => boolean
  transformResponse?: ResponseTransformer<TResult>
}

export type RequestShortcutOptions<TResult = unknown> = Omit<
  RequestOptions<unknown, TResult>,
  'url' | 'method' | 'data'
>

export interface RequestRuntimeConfig {
  baseURL?: string
  timeout?: number
  getToken?: TokenGetter
  authHeaderName?: string
}
