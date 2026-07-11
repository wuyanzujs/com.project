export const CACHE_KEYS = {
  accountCacheOwner: 'DEPPON_ACCOUNT_CACHE_OWNER',
  cookie: 'DEPPON_COOKIE',
  expressDraft: 'DEPPON_EXPRESS_DRAFT',
  expressPrivacyConfirm: 'DEPPON_EXPRESS_PRIVACY_CONFIRM',
  goodsQueryHistory: 'DEPPON_GOODS_QUERY_HISTORY',
  invoiceOrderAuth: 'DEPPON_INVOICE_ORDER_AUTH',
  invoiceOrderAuthCodeSend: 'DEPPON_INVOICE_ORDER_AUTH_CODE_SEND',
  invoiceEmail: 'DEPPON_INVOICE_EMAIL',
  userSession: 'DEPPON_USER_SESSION',
  userInfo: 'DEPPON_USER_INFO'
} as const

export type CacheKey = (typeof CACHE_KEYS)[keyof typeof CACHE_KEYS]

export const CACHE_PREFIX = 'DP_CACHE_'

export function createCacheStorageKey(key: string) {
  return `${CACHE_PREFIX}${key}`
}

export const ACCOUNT_SCOPED_CACHE_KEYS = [
  CACHE_KEYS.expressDraft,
  CACHE_KEYS.goodsQueryHistory,
  CACHE_KEYS.invoiceOrderAuth,
  CACHE_KEYS.invoiceOrderAuthCodeSend,
  CACHE_KEYS.invoiceEmail
] as const

export const ACCOUNT_SCOPED_STORAGE_KEYS = Array.from(
  new Set(
    ACCOUNT_SCOPED_CACHE_KEYS.flatMap((key) => [
      key,
      createCacheStorageKey(key)
    ])
  )
)

export const APP_STORAGE_KEYS = Array.from(
  new Set([
    ...Object.values(CACHE_KEYS),
    ...Object.values(CACHE_KEYS).map(createCacheStorageKey)
  ])
)
