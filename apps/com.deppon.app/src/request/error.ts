import type { HttpResponse, RequestMethod } from './types'

export type RequestErrorType = 'NETWORK_ERROR' | 'HTTP_ERROR'

export interface RequestErrorOptions {
  type: RequestErrorType
  message: string
  url: string
  method: RequestMethod
  statusCode?: number
  response?: HttpResponse
  cause?: unknown
}

export class RequestError extends Error {
  readonly type: RequestErrorType
  readonly url: string
  readonly method: RequestMethod
  readonly statusCode?: number
  readonly response?: HttpResponse
  readonly cause?: unknown

  constructor(options: RequestErrorOptions) {
    super(options.message)
    this.name = 'RequestError'
    this.type = options.type
    this.url = options.url
    this.method = options.method
    this.statusCode = options.statusCode
    this.response = options.response
    this.cause = options.cause
    Object.setPrototypeOf(this, RequestError.prototype)
  }
}

function getCauseMessage(cause: unknown) {
  if (cause instanceof Error) {
    return cause.message
  }

  if (cause && typeof cause === 'object' && 'errMsg' in cause) {
    return String(cause.errMsg)
  }

  return typeof cause === 'string' ? cause : ''
}

export function getRequestFailureMessage(error: unknown) {
  if (!(error instanceof RequestError)) {
    return null
  }

  if (
    error.statusCode === 408 ||
    /timeout|timed out|超时/i.test(getCauseMessage(error.cause))
  ) {
    return '请求超时，请稍后重试'
  }

  if (error.type === 'NETWORK_ERROR') {
    return '网络连接失败，请检查网络后重试'
  }

  if (error.statusCode && error.statusCode >= 500) {
    return '服务暂时不可用，请稍后重试'
  }

  return null
}
