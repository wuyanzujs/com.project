import type { DepponResponse } from '@/request/deppon'

import type { Contact, ContactAddressCheckRequest } from './types'

export type ContactAddressIntegrityKind =
  'pass' | 'review' | 'unavailable' | 'blocked'

export interface ContactAddressIntegrityOutcome {
  kind: ContactAddressIntegrityKind
  message: string
}

type ContactAddressParts = Pick<
  Contact,
  'province' | 'city' | 'county' | 'address'
>

/**
 *
 * @param contact 地址字段
 * @description 组装地址完整性校验请求参数
 */
export function createContactAddressCheckRequest(
  contact: ContactAddressParts
): ContactAddressCheckRequest {
  return {
    province: contact.province.trim(),
    city: contact.city.trim(),
    county: contact.county.trim(),
    address: contact.address.trim()
  }
}

/**
 *
 * @param response 校验接口响应
 * @description 归一地址完整性校验结果
 */
export function resolveContactAddressIntegrity(
  response: Pick<
    DepponResponse<unknown>,
    'status' | 'message' | 'transportFailure' | 'authExpired'
  >
): ContactAddressIntegrityOutcome {
  const message = response.message?.trim() || ''

  if (response.authExpired) {
    return {
      kind: 'blocked',
      message: message || '登录状态已失效，请重新登录'
    }
  }

  if (response.status) {
    return {
      kind: 'pass',
      message: ''
    }
  }

  if (response.transportFailure) {
    return {
      kind: 'unavailable',
      message: message || '地址完整性校验暂不可用'
    }
  }

  if (message) {
    return {
      kind: 'review',
      message
    }
  }

  return {
    kind: 'review',
    message: '地址可能不完整，请确认是否继续使用'
  }
}
