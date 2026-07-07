import { signApi } from './sign.api'

import type { SignCodeView, UserSignCodeRaw } from './types'
import type { DepponResponse } from '../../request/deppon'

function createFailure<TResult>(message: string): DepponResponse<TResult> {
  return {
    status: false,
    message,
    result: null
  }
}

function normalizeText(value?: string | null) {
  return (value ?? '').trim()
}

function validateRealName(realName: string) {
  const value = normalizeText(realName)

  if (value.length < 2 || value.length > 20) {
    return {
      status: false,
      message: '请输入 2-20 个字符的签收人姓名',
      value
    }
  }

  if (/[<>]/.test(value)) {
    return {
      status: false,
      message: '签收人姓名包含非法字符',
      value
    }
  }

  return {
    status: true,
    message: '',
    value
  }
}

function toSignCodeView(
  raw?: UserSignCodeRaw | null,
  hasRealName = true
): SignCodeView {
  const signCode = normalizeText(raw?.signCode)
  const realName = normalizeText(raw?.realName)

  return {
    hasRealName,
    signCode,
    realName,
    statusText: signCode ? '已生成签收码' : '待生成签收码',
    summary: signCode
      ? '请在确认货物状态无异常后，再向派送人员出示签收码。'
      : '完成实名登记后可生成签收码。',
    expiresText: signCode ? '有效 2 分钟，请按需刷新' : ''
  }
}

export const signService = {
  validateRealName,

  async querySignCode(): Promise<DepponResponse<SignCodeView>> {
    const existsResponse = await signApi.existsUserRealName()

    if (!existsResponse.status) {
      return createFailure(existsResponse.message || '暂未获取到实名状态')
    }

    if (!existsResponse.result) {
      return {
        ...existsResponse,
        result: toSignCodeView(null, false)
      }
    }

    const signResponse = await signApi.queryUserSignCode()

    if (!signResponse.status || !signResponse.result) {
      return createFailure(signResponse.message || '获取签收码失败')
    }

    return {
      ...signResponse,
      result: toSignCodeView(signResponse.result, true)
    }
  },

  async saveRealName(realName: string): Promise<DepponResponse<boolean>> {
    const validation = validateRealName(realName)

    if (!validation.status) {
      return createFailure(validation.message)
    }

    const response = await signApi.saveUserRealName(validation.value)

    if (!response.status) {
      return createFailure(response.message || '保存实名信息失败')
    }

    return response
  }
}
