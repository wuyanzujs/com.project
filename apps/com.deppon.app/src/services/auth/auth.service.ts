import { authApi } from './auth.api'
import { createAppSmsLoginRequest } from './login.rules'
import {
  clearAppSession,
  getCurrentEcoToken,
  getCurrentUser,
  recoverCurrentEcoToken,
  saveCurrentUser
} from './session'
import { APP_RUNTIME_CONFIG } from '../../shared/config/runtime'

import type { AppUser } from './types'

export interface AuthResult {
  status: boolean
  message: string
  user: AppUser | null
}

function getSystemCode() {
  return APP_RUNTIME_CONFIG.systemCode
}

export function isValidMobile(mobile: string) {
  return /^1[3-9]\d{9}$/.test(mobile.trim())
}

export function isValidSmsCode(smsCode: string) {
  return /^\d{6}$/.test(smsCode.trim())
}

export function maskMobile(mobile = '') {
  const value = mobile.trim()

  if (!/^1\d{10}$/.test(value)) {
    return value
  }

  return `${value.slice(0, 3)}****${value.slice(7)}`
}

export function getUserDisplayName(user: AppUser | null) {
  if (!user) {
    return '未登录'
  }

  return (
    user.nickName ||
    user.userName ||
    maskMobile(user.mobile) ||
    user.customerCode ||
    '德邦用户'
  )
}

export const authService = {
  getCachedUser() {
    return getCurrentUser()
  },

  async bootstrapUser(): Promise<AppUser | null> {
    const response = await authApi.queryUserInfo(false, false)

    if (response.status && response.result) {
      if (await saveCurrentUser(response.result)) {
        return response.result
      }

      await clearAppSession()
    }

    return null
  },

  async sendLoginSms(mobile: string) {
    if (!isValidMobile(mobile)) {
      return Promise.resolve({
        status: false,
        message: '请填写正确的手机号',
        result: null
      })
    }

    return authApi.sendSmsMessage({
      mobile,
      sysCode: getSystemCode(),
      messageType: 'login'
    })
  },

  async loginWithSms(
    mobile: string,
    smsCode: string,
    redirectUrl?: string
  ): Promise<AuthResult> {
    if (!isValidMobile(mobile)) {
      return {
        status: false,
        message: '请填写正确的手机号',
        user: null
      }
    }

    if (!isValidSmsCode(smsCode)) {
      return {
        status: false,
        message: '请填写 6 位数字验证码',
        user: null
      }
    }

    const response = await authApi.login(
      createAppSmsLoginRequest(mobile, smsCode, redirectUrl)
    )

    if (response.status && response.result) {
      const sessionReady =
        (response.sessionCookieSaved && getCurrentEcoToken()) ||
        (!getCurrentEcoToken() && (await recoverCurrentEcoToken()))

      if (!sessionReady) {
        await clearAppSession()

        return {
          status: false,
          message: '登录凭证保存失败，请重试',
          user: null
        }
      }

      if (!(await saveCurrentUser(response.result))) {
        await clearAppSession()

        return {
          status: false,
          message: '登录信息保存失败，请重试',
          user: null
        }
      }

      return {
        status: true,
        message: '',
        user: response.result
      }
    }

    if (response.sessionCookieSaved) {
      await clearAppSession()
    }

    return {
      status: false,
      message: response.message || '登录失败，请稍后再试',
      user: null
    }
  },

  async logout() {
    try {
      await authApi.logout(getSystemCode())
    } finally {
      await clearAppSession()
    }
  },

  async generateTmpToken(source: string) {
    const response = await authApi.generateTmpToken({ source }, false)

    return response.status && response.result ? response.result : ''
  }
}
