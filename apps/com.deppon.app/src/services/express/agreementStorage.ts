import { CACHE_KEYS, DPCacheExpireType, dpCache } from '@/cache'

interface ExpressAgreementConfirmCache {
  confirmedAt: number
}

/**
 * @description 电子运单服务协议的首勾确认态：确认过后再次勾选不再弹确认弹层
 */
export const expressAgreementStorage = {
  hasConfirmed() {
    return dpCache.has(CACHE_KEYS.expressAgreementConfirm)
  },

  confirm() {
    return dpCache.set<ExpressAgreementConfirmCache>(CACHE_KEYS.expressAgreementConfirm, {
      data: {
        confirmedAt: Date.now()
      },
      expire: {
        type: DPCacheExpireType.INFINITY
      }
    })
  }
}
