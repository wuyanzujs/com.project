import { normalizeExpressDeliveryPointDraft } from '../express/delivery/deliveryPoint.rules'
import { normalizeExpressInsuranceDraft } from '../express/insurance/insurance.rules'
import { normalizeExpressPackagingDraft } from '../express/packaging/packaging.rules'
import { normalizeExpressReturnBillDraft } from '../express/value-added/valueAdded'
import { normalizeExpressValueAddedDraft } from '../express/value-added/valueAdded.rules'
import { normalizeExpressWarehouseDraft } from '../express/warehouse/warehouse.rules'

import type { ExpressDraft } from '../express'

let stagedDraft: ExpressDraft | null = null

/**
 *
 * @param draft 寄件草稿
 * @description 深拷贝并归一寄件草稿
 */
function cloneDraft(draft: ExpressDraft): ExpressDraft {
  return {
    ...draft,
    sender: draft.sender ? { ...draft.sender } : null,
    consignee: draft.consignee ? { ...draft.consignee } : null,
    goods: { ...draft.goods },
    insurance: normalizeExpressInsuranceDraft(draft.insurance, draft.selectedProduct?.omsProductCode || draft.service.transportMode),
    packaging: normalizeExpressPackagingDraft(draft.packaging),
    service: {
      ...draft.service,
      returnBill: normalizeExpressReturnBillDraft(draft.service.returnBill)
    },
    collection: { ...draft.collection },
    valueAdded: normalizeExpressValueAddedDraft(draft.valueAdded),
    deliveryPreference: {
      ...draft.deliveryPreference,
      unavailableDates: [...draft.deliveryPreference.unavailableDates]
    },
    deliveryPoint: normalizeExpressDeliveryPointDraft(draft.deliveryPoint, draft.service.deliveryMode),
    warehouse: normalizeExpressWarehouseDraft(draft.warehouse),
    pickup: {
      ...draft.pickup,
      nightCapability: draft.pickup.nightCapability ? { ...draft.pickup.nightCapability } : undefined
    },
    selectedProduct: draft.selectedProduct ? { ...draft.selectedProduct } : null,
    scanContext: draft.scanContext ? { ...draft.scanContext } : undefined
  }
}

export const templateDraftBridge = {
  /**
   *
   * @param draft 寄件草稿
   * @description 暂存模板带入的寄件草稿
   */
  stage(draft: ExpressDraft) {
    stagedDraft = cloneDraft(draft)
  },

  /**
   *
   * @description 取出并清空暂存的寄件草稿
   */
  consume() {
    const draft = stagedDraft

    stagedDraft = null
    return draft ? cloneDraft(draft) : null
  }
}
