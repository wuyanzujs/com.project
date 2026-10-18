import { APP_RUNTIME_CONFIG } from '@/shared/config/runtime'

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

/**
 *
 * @param redirectUrl 返回页面地址
 * @description 归一返回页面路径，非法路径返回空
 */
function normalizeRegisterPage(redirectUrl?: string) {
  const pathname = (redirectUrl ?? '').split('?')[0].trim()

  return pathname.startsWith('/pages/') ? pathname.slice(1) : ''
}

/**
 * OWS 登录接口仍要求旧版 registerRecord 结构。App 端无法采集小程序的营销/设备
 * 字段，因此这些字段保持为空，只填安全的返回页面和系统编码。
 */
export function createAppLoginRegisterRecord(redirectUrl?: string): LoginRegisterRecord {
  return {
    ...EMPTY_REGISTER_RECORD,
    registerPage: normalizeRegisterPage(redirectUrl),
    sysCode: APP_RUNTIME_CONFIG.systemCode
  }
}

/**
 *
 * @param mobile 手机号
 * @param smsCode 短信验证码
 * @param redirectUrl 返回页面地址，可选
 * @param captchaVerification 点选验证码凭证,频控场景可选
 * @description 组装 App 短信登录请求参数
 */
export function createAppSmsLoginRequest(mobile: string, smsCode: string, redirectUrl?: string, captchaVerification?: string): LoginRequest {
  return {
    account: mobile.trim(),
    verifyCode: smsCode.trim(),
    loginType: APP_RUNTIME_CONFIG.mobileLoginType,
    sysCode: APP_RUNTIME_CONFIG.systemCode,
    registerRecord: createAppLoginRegisterRecord(redirectUrl),
    ...(captchaVerification ? { captchaVerification } : {})
  }
}
