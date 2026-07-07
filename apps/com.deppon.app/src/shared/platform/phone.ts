import { Linking } from 'react-native'

import { ensureNativeCapability } from './capabilities'

export class PhoneNumberError extends Error {
  constructor(message = '请输入正确的电话号码') {
    super(message)
    this.name = 'PhoneNumberError'
    Object.setPrototypeOf(this, PhoneNumberError.prototype)
  }
}

function normalizePhoneNumber(value: string) {
  return value.replace(/[^\d+]/g, '')
}

function isValidPhoneNumber(value: string) {
  return /^\+?\d{5,20}$/.test(value)
}

export async function dialPhone(rawPhoneNumber?: string | null) {
  ensureNativeCapability('phone')

  const phoneNumber = normalizePhoneNumber(rawPhoneNumber ?? '')

  if (!isValidPhoneNumber(phoneNumber)) {
    throw new PhoneNumberError()
  }

  const url = `tel:${phoneNumber}`
  const supported = await Linking.canOpenURL(url)

  if (!supported) {
    throw new PhoneNumberError('当前设备暂不支持拨打电话')
  }

  await Linking.openURL(url)

  return phoneNumber
}
