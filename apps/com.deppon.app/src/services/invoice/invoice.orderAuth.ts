import { CACHE_KEYS, DPCacheExpireType, dpCache } from '../../cache'

import type { InvoiceOrderAuthChallenge } from './types'

export const INVOICE_ORDER_AUTH_CODE_SECONDS = 60

interface CachedInvoiceOrderAuth {
  id: string
  value: string
}

export function getCachedInvoiceOrderAuthValue(waybillNumber: string) {
  const normalizedWaybill = waybillNumber.trim()
  const list =
    dpCache.get<CachedInvoiceOrderAuth[]>(CACHE_KEYS.invoiceOrderAuth) ?? []

  return list.find(item => item.id === normalizedWaybill)?.value.trim() ?? ''
}

export function rememberInvoiceOrderAuthValue(
  waybillNumber: string,
  value: string
) {
  const normalizedWaybill = waybillNumber.trim()
  const normalizedValue = value.trim()

  if (!normalizedWaybill || !normalizedValue) {
    return
  }

  const list =
    dpCache.get<CachedInvoiceOrderAuth[]>(CACHE_KEYS.invoiceOrderAuth) ?? []
  const nextList = list.filter(item => item.id !== normalizedWaybill)

  nextList.push({ id: normalizedWaybill, value: normalizedValue })
  dpCache.set(CACHE_KEYS.invoiceOrderAuth, {
    data: nextList,
    expire: {
      type: DPCacheExpireType.TODAY
    }
  })
}

export function calculateInvoiceOrderAuthCountdown(
  sentAt: number | null | undefined,
  now = Date.now()
) {
  if (!sentAt) {
    return 0
  }

  const remaining = Math.ceil(
    INVOICE_ORDER_AUTH_CODE_SECONDS - (now - sentAt) / 1000
  )

  return Math.min(INVOICE_ORDER_AUTH_CODE_SECONDS, Math.max(0, remaining))
}

export function getInvoiceOrderAuthCodeCountdown(now = Date.now()) {
  const sentAt = dpCache.get<number>(CACHE_KEYS.invoiceOrderAuthCodeSend)

  return calculateInvoiceOrderAuthCountdown(sentAt, now)
}

export function markInvoiceOrderAuthCodeSent(sentAt = Date.now()) {
  dpCache.set(CACHE_KEYS.invoiceOrderAuthCodeSend, {
    data: sentAt,
    expire: {
      type: DPCacheExpireType.MINUTES,
      value: 1
    }
  })
}

export function getInvoiceOrderAuthValidationMessage(
  auth: InvoiceOrderAuthChallenge,
  value: string
) {
  const normalizedValue = value.trim()

  if (!normalizedValue) {
    return '请按提示输入验证信息'
  }

  if (auth.authType === '02' && !/^\d{4}$/.test(normalizedValue)) {
    return '请输入付款人手机号后四位'
  }

  if (auth.authType === '03' && normalizedValue.length <= 6) {
    return '请输入付款人完整的联系方式'
  }

  if (auth.authType === '04' && !/^\d{6}$/.test(normalizedValue)) {
    return '请输入正确的短信验证码'
  }

  return ''
}

export const invoiceOrderAuth = {
  codeSeconds: INVOICE_ORDER_AUTH_CODE_SECONDS,
  getCachedValue: getCachedInvoiceOrderAuthValue,
  rememberValue: rememberInvoiceOrderAuthValue,
  getCodeCountdown: getInvoiceOrderAuthCodeCountdown,
  markCodeSent: markInvoiceOrderAuthCodeSent,
  validateValue: getInvoiceOrderAuthValidationMessage
}
