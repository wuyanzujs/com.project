import type { ExpressGoods } from './types'

export interface ExpressGoodsBridgePayload {
  goods: ExpressGoods
  savedAt: number
}

// 生产端物品信息页确认后走 redux 存货 + navigateBack，寄件页在页面
// onShow 里拿到新货物并重算价格；RN 版没有全局 redux，用一次性桥
// 在两个页面间传递，语义与生产端保持一致。
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
