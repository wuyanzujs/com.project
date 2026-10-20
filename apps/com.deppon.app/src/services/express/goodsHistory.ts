import { CACHE_KEYS, DPCacheExpireType, dpCache } from '@/cache'

const HISTORY_LIMIT = 8

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
  ).slice(0, HISTORY_LIMIT)
}

/** 寄件常用品名与违禁品查询历史分别保存，避免把查询过的禁寄品推荐给用户。 */
export const expressGoodsHistory = {
  get() {
    return normalizeHistory(dpCache.get<unknown>(CACHE_KEYS.expressGoodsHistory))
  },

  save(name: string) {
    const goodsName = name.trim()

    if (!goodsName) {
      return Promise.resolve(false)
    }

    return dpCache.set(CACHE_KEYS.expressGoodsHistory, {
      data: normalizeHistory([goodsName, ...expressGoodsHistory.get()]),
      expire: { type: DPCacheExpireType.INFINITY }
    })
  },

  clear() {
    return dpCache.remove(CACHE_KEYS.expressGoodsHistory)
  }
}
