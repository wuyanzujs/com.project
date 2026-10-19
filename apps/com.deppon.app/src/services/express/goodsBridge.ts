import type { ExpressGoods } from './types'

export interface ExpressGoodsBridgePayload {
  goods: ExpressGoods
  savedAt: number
}

// 使用一次性桥传递物品信息；寄件页在 onShow 时消费回传货物并重算价格。
let pendingPayload: ExpressGoodsBridgePayload | null = null

export const expressGoodsBridge = {
  save(goods: ExpressGoods) {
    pendingPayload = { goods: { ...goods }, savedAt: Date.now() }
  },

  consume() {
    const payload = pendingPayload

    pendingPayload = null

    return payload
  }
}
