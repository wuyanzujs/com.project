import { CACHE_KEYS, DPCacheExpireType, dpCache } from '@/cache'

const REAL_PRICE_HISTORY_LIMIT = 4

function normalizeHistory(values: unknown): string[] {
  if (!Array.isArray(values)) {
    return []
  }

  return Array.from(
    new Set(
      values
        .filter((value): value is string => typeof value === 'string')
        .map(value => value.trim())
        .filter(Boolean)
    )
  ).slice(0, REAL_PRICE_HISTORY_LIMIT)
}

/** 物品价值历史金额，供保价弹层「最近使用」回填，最多保留 4 条。 */
export const expressRealPriceHistory = {
  get() {
    return normalizeHistory(dpCache.get<unknown>(CACHE_KEYS.expressRealPriceHistory))
  },

  save(value: number) {
    if (!Number.isInteger(value) || value <= 0) {
      return Promise.resolve(false)
    }

    return dpCache.set(CACHE_KEYS.expressRealPriceHistory, {
      data: normalizeHistory([value.toString(), ...expressRealPriceHistory.get()]),
      expire: { type: DPCacheExpireType.INFINITY }
    })
  }
}
