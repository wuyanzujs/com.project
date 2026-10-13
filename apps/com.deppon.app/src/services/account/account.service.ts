import type { DepponResponse } from '@/request/deppon'
import { APP_RUNTIME_CONFIG } from '@/shared/config/runtime'

import { accountApi } from './account.api'
import {
  authService,
  clearAppSession,
  getUserDisplayName,
  isValidSmsCode,
  maskMobile
} from '../auth'
import { createServiceFailure } from '../serviceResponse'

import type { AccountOverviewView } from './types'

/**
 *
 * @description 取运行时系统编码
 */
function getSystemCode() {
  return APP_RUNTIME_CONFIG.systemCode
}

/**
 *
 * @description 取当前用户手机号
 */
function getUserMobile() {
  return authService.getCachedUser()?.mobile?.trim() || ''
}

export const accountService = {
  /**
   *
   * @description 组装账号概览展示数据
   */
  getOverview(): AccountOverviewView {
    const user = authService.getCachedUser()
    const mobile = user?.mobile?.trim() || ''

    return {
      user,
      displayName: getUserDisplayName(user),
      mobile,
      maskedMobile: maskMobile(mobile),
      loggedIn: !!mobile
    }
  },

  /**
   *
   * @description 刷新用户信息后返回账号概览
   */
  async refreshOverview(): Promise<AccountOverviewView> {
    await authService.bootstrapUser()

    return accountService.getOverview()
  },

  /**
   *
   * @description 发送注销账号验证码
   */
  async sendCancelSms(): Promise<DepponResponse<unknown>> {
    const mobile = getUserMobile()

    if (!mobile) {
      return createServiceFailure('请先登录后再注销账号')
    }

    return accountApi.sendCancelSms({
      mobile,
      sysCode: getSystemCode(),
      messageType: 'canceluser'
    })
  },

  /**
   *
   * @param code 短信验证码
   * @description 校验验证码后注销账号并清理会话
   */
  async cancelAccount(code: string): Promise<DepponResponse<boolean>> {
    const mobile = getUserMobile()
    const verifyCode = code.trim()

    if (!mobile) {
      return createServiceFailure('请先登录后再注销账号')
    }

    if (!isValidSmsCode(verifyCode)) {
      return createServiceFailure('请输入 6 位数字验证码')
    }

    const response = await accountApi.cancelAccount({
      code: verifyCode,
      mobile,
      password: '',
      sysCode: getSystemCode(),
      validType: 1
    })

    if (response.status) {
      await clearAppSession()
    }

    return response
  }
}
