import type { ExpressDraft } from '../express'

let stagedDraft: ExpressDraft | null = null

function cloneDraft(draft: ExpressDraft): ExpressDraft {
  return {
    ...draft,
    sender: draft.sender ? { ...draft.sender } : null,
    consignee: draft.consignee ? { ...draft.consignee } : null,
    goods: { ...draft.goods },
    service: { ...draft.service },
    pickup: { ...draft.pickup },
    selectedProduct: draft.selectedProduct
      ? { ...draft.selectedProduct }
      : null,
    scanContext: draft.scanContext ? { ...draft.scanContext } : undefined
  }
}

export const templateDraftBridge = {
  stage(draft: ExpressDraft) {
    stagedDraft = cloneDraft(draft)
  },

  consume() {
    const draft = stagedDraft

    stagedDraft = null
    return draft ? cloneDraft(draft) : null
  }
}
