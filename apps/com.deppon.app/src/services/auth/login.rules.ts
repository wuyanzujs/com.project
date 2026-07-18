import { APP_RUNTIME_CONFIG } from '../../shared/config/runtime'

import type { LoginRegisterRecord, LoginRequest } from './types'

const EMPTY_REGISTER_RECORD: Omit<LoginRegisterRecord, 'registerPage' | 'sysCode'> = {
  lanuchScene: '',
  lanuchPage: '',
  marketClass: '',
  marketScene: '',
  marketPage: '',
  envVersion: '',
  platform: '',
  system: '',
  brand: '',
  model: '',
  version: '',
  sdkVersion: '',
  language: '',
  benchmarkLevel: -1,
  type: '',
  latitude: '',
  longitude: '',
  appId: ''
}

function normalizeRegisterPage(redirectUrl?: string) {
  const pathname = (redirectUrl ?? '').split('?')[0].trim()

  return pathname.startsWith('/pages/') ? pathname.slice(1) : ''
}

/**
 * The OWS login endpoint still expects the legacy registerRecord envelope.
 * App cannot collect mini-program marketing/device fields, so those fields
 * stay empty and only the safe return page/system code are supplied.
 */
export function createAppLoginRegisterRecord(
  redirectUrl?: string
): LoginRegisterRecord {
  return {
    ...EMPTY_REGISTER_RECORD,
    registerPage: normalizeRegisterPage(redirectUrl),
    sysCode: APP_RUNTIME_CONFIG.systemCode
  }
}

export function createAppSmsLoginRequest(
  mobile: string,
  smsCode: string,
  redirectUrl?: string
): LoginRequest {
  return {
    account: mobile.trim(),
    verifyCode: smsCode.trim(),
    loginType: APP_RUNTIME_CONFIG.mobileLoginType,
    sysCode: APP_RUNTIME_CONFIG.systemCode,
    registerRecord: createAppLoginRegisterRecord(redirectUrl)
  }
}
