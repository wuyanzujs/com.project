import { createBatchConsigneeDraft, createBatchDraft } from './batch.draft'
import { preserveAccountScopedCacheForLogin } from '../../cache/accountScope'
import { DPCacheExpireType, dpCache } from '../../cache/dpCache'
import { CACHE_KEYS } from '../../cache/keys'

import type { BatchDraft } from './types'

const BATCH_DRAFT_EXPIRE_HOURS = 2

function cloneDraft(draft: BatchDraft): BatchDraft {
  return {
    ...draft,
    sender: draft.sender ? { ...draft.sender } : null,
    consignees: draft.consignees.map(item => ({
      ...item,
      contact: item.contact ? { ...item.contact } : null,
      goods: { ...item.goods },
      service: { ...item.service }
    })),
    pickup: { ...draft.pickup },
    scanContext: draft.scanContext ? { ...draft.scanContext } : undefined
  }
}

function normalizeDraft(draft: BatchDraft): BatchDraft {
  const defaultDraft = createBatchDraft()

  return {
    ...defaultDraft,
    ...draft,
    sender: draft.sender ? { ...draft.sender } : null,
    consignees: (draft.consignees ?? []).map(item => {
      const defaultItem = createBatchConsigneeDraft()

      return {
        ...defaultItem,
        ...item,
        contact: item.contact ? { ...item.contact } : null,
        goods: {
          ...defaultItem.goods,
          ...item.goods
        },
        service: {
          ...defaultItem.service,
          ...item.service
        }
      }
    }),
    pickup: {
      ...defaultDraft.pickup,
      ...draft.pickup
    },
    scanContext: draft.scanContext ? { ...draft.scanContext } : undefined
  }
}

export const batchDraftStorage = {
  save(draft: BatchDraft) {
    return dpCache.set<BatchDraft>(CACHE_KEYS.batchDraft, {
      data: cloneDraft(draft),
      expire: {
        type: DPCacheExpireType.HOURS,
        value: BATCH_DRAFT_EXPIRE_HOURS
      }
    })
  },

  restore() {
    const draft = dpCache.get<BatchDraft>(CACHE_KEYS.batchDraft)

    return draft ? normalizeDraft(draft) : null
  },

  async preserveForLogin(draft: BatchDraft) {
    const saved = await batchDraftStorage.save(draft)

    if (saved) {
      preserveAccountScopedCacheForLogin(CACHE_KEYS.batchDraft)
    }

    return saved
  },

  clear() {
    return dpCache.remove(CACHE_KEYS.batchDraft)
  }
}
