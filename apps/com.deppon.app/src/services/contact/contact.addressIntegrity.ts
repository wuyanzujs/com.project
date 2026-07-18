import type { Contact, ContactAddressCheckRequest } from './types'
import type { DepponResponse } from '../../request/deppon'

export type ContactAddressIntegrityKind =
  | 'pass'
  | 'review'
  | 'unavailable'
  | 'blocked'

export interface ContactAddressIntegrityOutcome {
  kind: ContactAddressIntegrityKind
  message: string
}

type ContactAddressParts = Pick<
  Contact,
  'province' | 'city' | 'county' | 'address'
>

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
