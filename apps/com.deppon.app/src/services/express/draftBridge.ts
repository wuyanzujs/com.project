import type { ExpressDraft, ExpressProductQuote } from './types'

export type ExpressDraftBridgeSource =
  | 'QUERY_PRICE'
  | 'ORDER_RESEND'
  | 'COUPON_LIST'
  | 'GOODS_QUERY'

export interface ExpressDraftBridgePayload {
  source: ExpressDraftBridgeSource
  draft: ExpressDraft
  quotes: ExpressProductQuote[]
  carriedAt: number
}

let pendingDraft: ExpressDraftBridgePayload | null = null

function cloneDraft(draft: ExpressDraft): ExpressDraft {
  return {
    ...draft,
    sender: draft.sender ? { ...draft.sender } : null,
    consignee: draft.consignee ? { ...draft.consignee } : null,
    goods: { ...draft.goods },
    service: { ...draft.service },
    pickup: { ...draft.pickup },
    selectedProduct: draft.selectedProduct ? { ...draft.selectedProduct } : null
  }
}

export const expressDraftBridge = {
  carryFromQueryPrice(draft: ExpressDraft, product: ExpressProductQuote) {
    const nextDraft = cloneDraft({
      ...draft,
      selectedProduct: product,
      agreementAccepted: false,
      quoteStaleReason: ''
    })

    pendingDraft = {
      source: 'QUERY_PRICE',
      draft: nextDraft,
      quotes: [product],
      carriedAt: Date.now()
    }
  },

  carryFromOrderResend(draft: ExpressDraft) {
    const nextDraft = cloneDraft({
      ...draft,
      selectedProduct: null,
      agreementAccepted: false,
      quoteStaleReason: draft.quoteStaleReason || '再来一单，请重新获取价格'
    })

    pendingDraft = {
      source: 'ORDER_RESEND',
      draft: nextDraft,
      quotes: [],
      carriedAt: Date.now()
    }
  },

  carryFromCoupon(draft: ExpressDraft) {
    const nextDraft = cloneDraft({
      ...draft,
      selectedProduct: null,
      agreementAccepted: false,
      quoteStaleReason: draft.quoteStaleReason || '优惠券变化，请重新获取价格'
    })

    pendingDraft = {
      source: 'COUPON_LIST',
      draft: nextDraft,
      quotes: [],
      carriedAt: Date.now()
    }
  },

  carryFromGoodsQuery(draft: ExpressDraft) {
    const nextDraft = cloneDraft({
      ...draft,
      selectedProduct: null,
      agreementAccepted: false,
      quoteStaleReason: draft.quoteStaleReason || '货物名称变化，请重新获取价格'
    })

    pendingDraft = {
      source: 'GOODS_QUERY',
      draft: nextDraft,
      quotes: [],
      carriedAt: Date.now()
    }
  },

  consume() {
    const nextDraft = pendingDraft

    pendingDraft = null

    return nextDraft
  }
}
