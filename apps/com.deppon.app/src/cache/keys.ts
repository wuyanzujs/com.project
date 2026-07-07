export const CACHE_KEYS = {
  cookie: 'DEPPON_COOKIE',
  expressDraft: 'DEPPON_EXPRESS_DRAFT',
  expressPrivacyConfirm: 'DEPPON_EXPRESS_PRIVACY_CONFIRM',
  goodsQueryHistory: 'DEPPON_GOODS_QUERY_HISTORY',
  invoiceEmail: 'DEPPON_INVOICE_EMAIL',
  userSession: 'DEPPON_USER_SESSION',
  userInfo: 'DEPPON_USER_INFO'
} as const

export type CacheKey = (typeof CACHE_KEYS)[keyof typeof CACHE_KEYS]
