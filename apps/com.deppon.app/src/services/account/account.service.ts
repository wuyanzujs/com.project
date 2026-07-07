import { accountApi } from './account.api'
import { APP_RUNTIME_CONFIG } from '../../shared/config/runtime'
import {
  authService,
  clearAppSession,
  getUserDisplayName,
  isValidSmsCode,
  maskMobile
} from '../auth'

import type { AccountOverviewView } from './types'
import type { DepponResponse } from '../../request/deppon'

function createFailure<TResult>(message: string): DepponResponse<TResult> {
  return {
    status: false,
    message,
    result: null
  }
}

function getSystemCode() {
  return APP_RUNTIME_CONFIG.systemCode
}

function getUserMobile() {
  return authService.getCachedUser()?.mobile?.trim() || ''
}

export const accountService = {
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

  async refreshOverview(): Promise<AccountOverviewView> {
    await authService.bootstrapUser()

    return accountService.getOverview()
  },

  async sendCancelSms(): Promise<DepponResponse<unknown>> {
    const mobile = getUserMobile()

    if (!mobile) {
      return createFailure('请先登录后再注销账号')
    }

    return accountApi.sendCancelSms({
      mobile,
      sysCode: getSystemCode(),
      messageType: 'canceluser'
    })
  },

  async cancelAccount(code: string): Promise<DepponResponse<boolean>> {
    const mobile = getUserMobile()
    const verifyCode = code.trim()

    if (!mobile) {
      return createFailure('请先登录后再注销账号')
    }

    if (!isValidSmsCode(verifyCode)) {
      return createFailure('请输入 6 位数字验证码')
    }

    const response = await accountApi.cancelAccount({
      code: verifyCode,
      mobile,
      password: '',
      sysCode: getSystemCode(),
      validType: 1
    })

    if (response.status) {
      clearAppSession()
    }

    return response
  }
}
