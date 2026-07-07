import { CACHE_KEYS, DPCacheExpireType, dpCache } from '../../cache'

interface ExpressPrivacyConfirmCache {
  confirmedAt: number
}

export const expressPrivacyStorage = {
  hasConfirmed() {
    return dpCache.has(CACHE_KEYS.expressPrivacyConfirm)
  },

  confirm() {
    return dpCache.set<ExpressPrivacyConfirmCache>(
      CACHE_KEYS.expressPrivacyConfirm,
      {
        data: {
          confirmedAt: Date.now()
        },
        expire: {
          type: DPCacheExpireType.INFINITY
        }
      }
    )
  }
}
