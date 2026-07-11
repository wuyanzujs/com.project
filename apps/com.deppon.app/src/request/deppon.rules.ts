const HTTP_STATUS = {
  unauthorized: 401,
  tooManyRequests: 429
} as const

const OWS_STATUS = {
  logout: '901',
  success: 'success'
} as const

export function isDepponSuccessStatus(status: unknown) {
  return (
    status === true ||
    status === '1' ||
    status === 0 ||
    status === OWS_STATUS.success
  )
}

export function shouldAcceptDepponHttpStatus(statusCode: number) {
  return (
    (statusCode >= 200 && statusCode < 300) ||
    statusCode === HTTP_STATUS.unauthorized ||
    statusCode === HTTP_STATUS.tooManyRequests
  )
}

export function shouldEmitRateLimitedEvent(
  statusCode: number,
  dataStatus: unknown
) {
  return (
    statusCode === HTTP_STATUS.tooManyRequests ||
    dataStatus === HTTP_STATUS.tooManyRequests
  )
}

export function shouldEmitAuthExpiredEvent(
  loginRequired: boolean,
  statusCode: number,
  dataStatus: unknown
) {
  return (
    loginRequired &&
    (statusCode === HTTP_STATUS.unauthorized ||
      dataStatus === OWS_STATUS.logout)
  )
}

export function isResponseForCurrentSession(
  requestCookie: string,
  currentCookie: string
) {
  return requestCookie === currentCookie
}
