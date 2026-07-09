import { privacyApi } from './privacy.api'
import { APP_RUNTIME_CONFIG } from '../../shared/config/runtime'
import { getCurrentEcoToken } from '../auth'
import { createServiceFailure } from '../serviceResponse'

import type {
  PrivacyBehaviorRequest,
  PrivacyHomePromptView,
  PrivacyStatusView,
  PrivacyVersionResponse
} from './types'
import type { DepponResponse } from '../../request/deppon'

function createPrivacyBehaviorRequest(): PrivacyBehaviorRequest {
  return {
    sysCode: APP_RUNTIME_CONFIG.systemCode,
    childSysCode: APP_RUNTIME_CONFIG.systemCode
  }
}

function normalizeVersion(value?: string | null) {
  return (value ?? '').trim()
}

let dismissedHomePromptKey = ''

function createHomePromptKey(status: PrivacyStatusView) {
  return `${status.latestVersion || 'latest-empty'}:${
    status.agreedVersion || 'agreed-empty'
  }`
}

function createHomePrivacyPrompt(
  status: PrivacyStatusView
): PrivacyHomePromptView | null {
  if (status.agreedLatest || !status.latestVersion) {
    return null
  }

  const key = createHomePromptKey(status)

  if (dismissedHomePromptKey === key) {
    return null
  }

  const versionText = status.agreedVersion
    ? `当前已确认版本：${status.agreedVersion}，最新版本：${status.latestVersion}。`
    : `当前尚未记录已确认版本，最新版本：${status.latestVersion}。`

  return {
    key,
    title: status.agreedVersion ? '隐私政策有更新' : '请确认隐私政策',
    content: `${versionText}\n请前往隐私设置阅读隐私政策、个人信息清单和权限调用清单后确认。`,
    confirmText: '去查看',
    cancelText: '稍后'
  }
}

function toPrivacyStatusView(
  response: PrivacyVersionResponse
): PrivacyStatusView {
  const latestVersion = normalizeVersion(response.versionNumber)
  const agreedVersion = normalizeVersion(response.lastVersionNumber)
  const agreedLatest = !!latestVersion && latestVersion === agreedVersion
  const hasAgreedVersion = !!agreedVersion

  if (agreedLatest) {
    return {
      latestVersion,
      agreedVersion,
      agreedLatest,
      statusText: '已同意最新版本',
      summary: '当前账号已确认最新隐私政策和相关协议。'
    }
  }

  if (hasAgreedVersion) {
    return {
      latestVersion,
      agreedVersion,
      agreedLatest,
      statusText: '有新版本待确认',
      summary: '隐私政策版本发生变化，建议重新阅读并确认。'
    }
  }

  return {
    latestVersion,
    agreedVersion,
    agreedLatest,
    statusText: '尚未记录同意',
    summary: '当前账号暂未查询到已同意版本，可阅读后确认。'
  }
}

export const privacyService = {
  async queryPrivacyStatus(): Promise<DepponResponse<PrivacyStatusView>> {
    const response = await privacyApi.queryPrivacyVersion(false)

    if (!response.status || !response.result) {
      return createServiceFailure(response.message || '暂未获取到隐私设置')
    }

    return {
      ...response,
      result: toPrivacyStatusView(response.result)
    }
  },

  async savePrivacyAgreement() {
    const response = await privacyApi.savePrivacyVersion(
      createPrivacyBehaviorRequest()
    )

    if (!response.status) {
      return createServiceFailure(response.message || '同意条款失败，请稍后再试')
    }

    return response
  },

  async cancelPrivacyAgreement() {
    const response = await privacyApi.cancelPrivacyVersion(
      createPrivacyBehaviorRequest()
    )

    if (!response.status) {
      return createServiceFailure(response.message || '撤销失败，请稍后再试')
    }

    return response
  },

  async queryHomePrivacyPrompt(): Promise<PrivacyHomePromptView | null> {
    if (!getCurrentEcoToken()) {
      return null
    }

    const response = await privacyService.queryPrivacyStatus()

    if (!response.status || !response.result) {
      return null
    }

    return createHomePrivacyPrompt(response.result)
  },

  dismissHomePrivacyPrompt(prompt: Pick<PrivacyHomePromptView, 'key'>) {
    dismissedHomePromptKey = prompt.key
  }
}
