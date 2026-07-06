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
