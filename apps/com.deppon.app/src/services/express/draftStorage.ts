import { createExpressDraft } from './express.draft'
import { DPCacheExpireType, dpCache } from '../../cache/dpCache'
import { CACHE_KEYS } from '../../cache/keys'

import type { ExpressDraft } from './types'

const EXPRESS_DRAFT_EXPIRE_HOURS = 2

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

function normalizeDraft(draft: ExpressDraft): ExpressDraft {
  const defaultDraft = createExpressDraft()

  return {
    ...defaultDraft,
    ...draft,
    sender: draft.sender ? { ...draft.sender } : null,
    consignee: draft.consignee ? { ...draft.consignee } : null,
    goods: {
      ...defaultDraft.goods,
      ...draft.goods
    },
    service: {
      ...defaultDraft.service,
      ...draft.service
    },
    pickup: {
      ...defaultDraft.pickup,
      ...draft.pickup
    },
    selectedProduct: draft.selectedProduct ? { ...draft.selectedProduct } : null
  }
}

function hasMeaningfulDraft(draft: ExpressDraft) {
  const defaultDraft = createExpressDraft()

  return (
    !!draft.sender ||
    !!draft.consignee ||
    !!draft.selectedProduct ||
    !!draft.goods.name ||
    draft.goods.count !== defaultDraft.goods.count ||
    draft.goods.weight !== defaultDraft.goods.weight ||
    draft.goods.volume > 0 ||
    draft.goods.insuredAmount > 0 ||
    draft.goods.reviceMoneyAmount > 0 ||
    draft.service.deliveryMode !== defaultDraft.service.deliveryMode ||
    draft.service.paymentType !== defaultDraft.service.paymentType ||
    draft.service.returnBillType !== defaultDraft.service.returnBillType ||
    draft.service.reciveLoanType !== defaultDraft.service.reciveLoanType ||
    draft.service.passwordSigning !== defaultDraft.service.passwordSigning ||
    draft.service.needContact !== defaultDraft.service.needContact ||
    draft.service.privacyProtection !==
      defaultDraft.service.privacyProtection ||
    !!draft.pickup.time ||
    !!draft.couponNumber ||
    !!draft.remark ||
    draft.agreementAccepted
  )
}

export const expressDraftStorage = {
  save(draft: ExpressDraft) {
    return dpCache.set<ExpressDraft>(CACHE_KEYS.expressDraft, {
      data: cloneDraft(draft),
      expire: {
        type: DPCacheExpireType.HOURS,
        value: EXPRESS_DRAFT_EXPIRE_HOURS
      }
    })
  },

  restore() {
    const draft = dpCache.get<ExpressDraft>(CACHE_KEYS.expressDraft)

    if (!draft) {
      return null
    }

    const normalizedDraft = normalizeDraft(draft)

    return hasMeaningfulDraft(normalizedDraft) ? normalizedDraft : null
  },

  clear() {
    return dpCache.remove(CACHE_KEYS.expressDraft)
  }
}
