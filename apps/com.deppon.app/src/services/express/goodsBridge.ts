import type { ExpressGoods } from './types'

export interface ExpressGoodsBridgePayload {
  goods: ExpressGoods
  /** 货物信息页同时维护「给快递员捎话」，随货物一起回传给寄件页。 */
  remark: string
  savedAt: number
}

// 使用一次性桥传递物品信息；寄件页在 onShow 时消费回传货物并重算价格。
let pendingPayload: ExpressGoodsBridgePayload | null = null

export const expressGoodsBridge = {
  save(goods: ExpressGoods, remark: string) {
    pendingPayload = { goods: { ...goods }, remark, savedAt: Date.now() }
  },

  consume() {
    const payload = pendingPayload

    pendingPayload = null

    return payload
  }
}
