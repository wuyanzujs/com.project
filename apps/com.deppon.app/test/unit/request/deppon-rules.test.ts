import { describe, expect, it } from 'vitest'

import {
  isDepponSuccessStatus,
  isResponseForCurrentSession,
  shouldAcceptDepponHttpStatus,
  shouldEmitAuthExpiredEvent,
  shouldEmitRateLimitedEvent
} from '@/request/deppon.rules'

describe('isDepponSuccessStatus', () => {
  it('accepts every status shape the backend uses for success', () => {
    expect(isDepponSuccessStatus(true)).toBe(true)
    expect(isDepponSuccessStatus('1')).toBe(true)
    expect(isDepponSuccessStatus(0)).toBe(true)
    expect(isDepponSuccessStatus('success')).toBe(true)
  })

  it('rejects failure shapes', () => {
    expect(isDepponSuccessStatus(false)).toBe(false)
    expect(isDepponSuccessStatus('0')).toBe(false)
    expect(isDepponSuccessStatus(1)).toBe(false)
    expect(isDepponSuccessStatus(null)).toBe(false)
    expect(isDepponSuccessStatus(undefined)).toBe(false)
  })
})

describe('shouldAcceptDepponHttpStatus', () => {
  it('accepts 2xx and the two handled error statuses', () => {
    expect(shouldAcceptDepponHttpStatus(200)).toBe(true)
    expect(shouldAcceptDepponHttpStatus(299)).toBe(true)
    expect(shouldAcceptDepponHttpStatus(401)).toBe(true)
    expect(shouldAcceptDepponHttpStatus(429)).toBe(true)
  })

  it('rejects redirects and server errors', () => {
    expect(shouldAcceptDepponHttpStatus(300)).toBe(false)
    expect(shouldAcceptDepponHttpStatus(403)).toBe(false)
    expect(shouldAcceptDepponHttpStatus(500)).toBe(false)
  })
})

describe('shouldEmitRateLimitedEvent', () => {
  it('triggers on http 429 or a 429 payload status', () => {
    expect(shouldEmitRateLimitedEvent(429, undefined)).toBe(true)
    expect(shouldEmitRateLimitedEvent(200, 429)).toBe(true)
  })

  it('stays quiet otherwise', () => {
    expect(shouldEmitRateLimitedEvent(200, 0)).toBe(false)
    expect(shouldEmitRateLimitedEvent(401, '901')).toBe(false)
  })
})

describe('shouldEmitAuthExpiredEvent', () => {
  it('requires a protected request plus 401 or the OWS logout status', () => {
    expect(shouldEmitAuthExpiredEvent(true, 401, undefined)).toBe(true)
    expect(shouldEmitAuthExpiredEvent(true, 200, '901')).toBe(true)
  })

  it('never fires for anonymous requests', () => {
    expect(shouldEmitAuthExpiredEvent(false, 401, '901')).toBe(false)
    expect(shouldEmitAuthExpiredEvent(true, 200, '0')).toBe(false)
  })
})

describe('isResponseForCurrentSession', () => {
  it('drops responses from a previous session', () => {
    expect(isResponseForCurrentSession('ECO_TOKEN=1', 'ECO_TOKEN=1')).toBe(true)
    expect(isResponseForCurrentSession('ECO_TOKEN=1', 'ECO_TOKEN=2')).toBe(false)
    expect(isResponseForCurrentSession('', 'ECO_TOKEN=2')).toBe(false)
  })
})
