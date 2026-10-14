import { APP_RUNTIME_CONFIG } from '@/shared/config/runtime'

import { authApi } from './auth.api'
import { createAppSmsLoginRequest } from './login.rules'
import { clearAppSession, getCurrentEcoToken, getCurrentUser, recoverCurrentEcoToken, saveCurrentUser } from './session'

import type { AppUser } from './types'

export interface AuthResult {
  status: boolean
  message: string
  user: AppUser | null
}

/**
 *
 * @description 取运行时系统编码
 */
function getSystemCode() {
  return APP_RUNTIME_CONFIG.systemCode
}

/**
 *
 * @param mobile 手机号
 * @description 校验是否为合法手机号
 */
export function isValidMobile(mobile: string) {
  return /^1[3-9]\d{9}$/.test(mobile.trim())
}

/**
 *
 * @param smsCode 短信验证码
 * @description 校验是否为 6 位数字验证码
 */
export function isValidSmsCode(smsCode: string) {
  return /^\d{6}$/.test(smsCode.trim())
}

/**
 *
 * @param mobile 手机号
 * @description 手机号中间四位用星号打码
 */
export function maskMobile(mobile = '') {
  const value = mobile.trim()

  if (!/^1\d{10}$/.test(value)) {
    return value
  }

  return `${value.slice(0, 3)}****${value.slice(7)}`
}

/**
 *
 * @param user 当前用户，可为空
 * @description 取用户展示名称，缺省为未登录
 */
export function getUserDisplayName(user: AppUser | null) {
  if (!user) {
    return '未登录'
  }

  return user.nickName || user.userName || maskMobile(user.mobile) || user.customerCode || '德邦用户'
}

export const authService = {
  /**
   *
   * @description 取本地缓存的用户信息
   */
  getCachedUser() {
    return getCurrentUser()
  },

  /**
   *
   * @description 拉取并保存用户信息，失败返回空
   */
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

  /**
   *
   * @param mobile 手机号
   * @description 校验手机号后发送登录验证码
   */
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

  /**
   *
   * @param mobile 手机号
   * @param smsCode 短信验证码
   * @param redirectUrl 登录后返回页面，可选
   * @description 短信验证码登录并保存登录态
   */
  async loginWithSms(mobile: string, smsCode: string, redirectUrl?: string): Promise<AuthResult> {
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

    const response = await authApi.login(createAppSmsLoginRequest(mobile, smsCode, redirectUrl))

    if (response.status && response.result) {
      const sessionReady = (response.sessionCookieSaved && getCurrentEcoToken()) || (!getCurrentEcoToken() && (await recoverCurrentEcoToken()))

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

  /**
   *
   * @description 退出登录并清理本机会话数据
   */
  async logout() {
    try {
      await authApi.logout(getSystemCode())
    } finally {
      if (!(await clearAppSession())) {
        throw new Error('登录状态已停用，但本机数据清理失败，请重试')
      }
    }
  },

  /**
   *
   * @param source 来源标识
   * @description 生成临时 token，失败返回空串
   */
  async generateTmpToken(source: string) {
    const response = await authApi.generateTmpToken({ source }, false)

    return response.status && response.result ? response.result : ''
  }
}
