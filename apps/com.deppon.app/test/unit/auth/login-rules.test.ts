import { describe, expect, it } from 'vitest'

import { createAppLoginRegisterRecord, createAppSmsLoginRequest } from '@/services/auth/login.rules'

describe('createAppLoginRegisterRecord', () => {
  it('keeps only /pages/ redirects and strips the query', () => {
    const record = createAppLoginRegisterRecord('/pages/order/list?role=sender')

    expect(record.registerPage).toBe('pages/order/list')
    expect(record.sysCode).toBe('TEST_SYSTEM_CODE')
  })

  it('drops redirects that are not app pages', () => {
    expect(createAppLoginRegisterRecord('/web?source=1').registerPage).toBe('')
    expect(createAppLoginRegisterRecord(undefined).registerPage).toBe('')
  })

  it('leaves marketing fields empty and keeps the -1 benchmark sentinel', () => {
    const record = createAppLoginRegisterRecord()

    expect(record.marketScene).toBe('')
    expect(record.benchmarkLevel).toBe(-1)
    expect(record.appId).toBe('')
  })
})

describe('createAppSmsLoginRequest', () => {
  it('trims credentials and carries the runtime login type', () => {
    const request = createAppSmsLoginRequest(' 13800000000 ', ' 123456 ', '/pages/mine/index')

    expect(request.account).toBe('13800000000')
    expect(request.verifyCode).toBe('123456')
    expect(request.sysCode).toBe('TEST_SYSTEM_CODE')
    expect(request.registerRecord.registerPage).toBe('pages/mine/index')
  })

  it('only includes the captcha proof when it is provided', () => {
    expect(createAppSmsLoginRequest('1', '2')).not.toHaveProperty('captchaVerification')
    expect(createAppSmsLoginRequest('1', '2', undefined, 'proof')).toHaveProperty('captchaVerification', 'proof')
  })
})
