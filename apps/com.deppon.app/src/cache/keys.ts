export const CACHE_KEYS = {
  accountCacheOwner: 'DEPPON_ACCOUNT_CACHE_OWNER',
  batchDraft: 'DEPPON_BATCH_DRAFT',
  cookie: 'DEPPON_COOKIE',
  expressDraft: 'DEPPON_EXPRESS_DRAFT',
  expressAgreementConfirm: 'DEPPON_EXPRESS_AGREEMENT_CONFIRM',
  expressGoodsHistory: 'DEPPON_EXPRESS_GOODS_HISTORY',
  expressPrivacyConfirm: 'DEPPON_EXPRESS_PRIVACY_CONFIRM',
  goodsQueryHistory: 'DEPPON_GOODS_QUERY_HISTORY',
  invoiceOrderAuth: 'DEPPON_INVOICE_ORDER_AUTH',
  invoiceOrderAuthCodeSend: 'DEPPON_INVOICE_ORDER_AUTH_CODE_SEND',
  invoiceEmail: 'DEPPON_INVOICE_EMAIL',
  personalizedRecommend: 'DEPPON_PERSONALIZED_RECOMMEND',
  sessionInvalidated: 'DEPPON_SESSION_INVALIDATED',
  userSession: 'DEPPON_USER_SESSION',
  userInfo: 'DEPPON_USER_INFO'
} as const

export type CacheKey = (typeof CACHE_KEYS)[keyof typeof CACHE_KEYS]

export const CACHE_PREFIX = 'DP_CACHE_'

export function createCacheStorageKey(key: string) {
  return `${CACHE_PREFIX}${key}`
}

export const ACCOUNT_SCOPED_CACHE_KEYS = [
  CACHE_KEYS.batchDraft,
  CACHE_KEYS.expressDraft,
  CACHE_KEYS.expressGoodsHistory,
  CACHE_KEYS.goodsQueryHistory,
  CACHE_KEYS.invoiceOrderAuth,
  CACHE_KEYS.invoiceOrderAuthCodeSend,
  CACHE_KEYS.invoiceEmail
] as const

export const ACCOUNT_SCOPED_STORAGE_KEYS = Array.from(new Set(ACCOUNT_SCOPED_CACHE_KEYS.flatMap(key => [key, createCacheStorageKey(key)])))

/**
 *
 * @description 「设置」页清除缓存时保留的键：登录态、cookie、账号隔离标记和个性化推荐偏好不属于可清理缓存
 */
export const CACHE_MAINTENANCE_PRESERVED_KEYS = [
  CACHE_KEYS.accountCacheOwner,
  CACHE_KEYS.cookie,
  CACHE_KEYS.personalizedRecommend,
  CACHE_KEYS.sessionInvalidated,
  CACHE_KEYS.userInfo,
  CACHE_KEYS.userSession
] as const

export const CACHE_MAINTENANCE_CLEARABLE_KEYS: string[] = Object.values(CACHE_KEYS).filter(
  key => !(CACHE_MAINTENANCE_PRESERVED_KEYS as readonly string[]).includes(key)
)

export const APP_STORAGE_KEYS = Array.from(new Set([...Object.values(CACHE_KEYS), ...Object.values(CACHE_KEYS).map(createCacheStorageKey)]))
