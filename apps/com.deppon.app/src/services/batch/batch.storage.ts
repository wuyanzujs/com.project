import { preserveAccountScopedCacheForLogin } from '@/cache/accountScope'
import { DPCacheExpireType, dpCache } from '@/cache/dpCache'
import { CACHE_KEYS } from '@/cache/keys'

import { createBatchConsigneeDraft, createBatchDraft } from './batch.draft'

import type { BatchDraft } from './types'

const BATCH_DRAFT_EXPIRE_HOURS = 2

/**
 *
 * @param draft 批量草稿
 * @description 深拷贝草稿，隔离缓存数据
 */
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

/**
 *
 * @param draft 批量草稿
 * @description 合并默认值补齐草稿字段
 */
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
  /**
   *
   * @param draft 批量草稿
   * @description 缓存批量草稿
   */
  save(draft: BatchDraft) {
    return dpCache.set<BatchDraft>(CACHE_KEYS.batchDraft, {
      data: cloneDraft(draft),
      expire: {
        type: DPCacheExpireType.HOURS,
        value: BATCH_DRAFT_EXPIRE_HOURS
      }
    })
  },

  /**
   *
   * @description 读取并归一缓存的批量草稿
   */
  restore() {
    const draft = dpCache.get<BatchDraft>(CACHE_KEYS.batchDraft)

    return draft ? normalizeDraft(draft) : null
  },

  /**
   *
   * @param draft 批量草稿
   * @description 保存草稿并保留登录态缓存
   */
  async preserveForLogin(draft: BatchDraft) {
    const saved = await batchDraftStorage.save(draft)

    if (saved) {
      preserveAccountScopedCacheForLogin(CACHE_KEYS.batchDraft)
    }

    return saved
  },

  /**
   *
   * @description 清除批量草稿缓存
   */
  clear() {
    return dpCache.remove(CACHE_KEYS.batchDraft)
  }
}
