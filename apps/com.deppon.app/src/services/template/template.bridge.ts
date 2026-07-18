import { normalizeExpressDeliveryPointDraft } from '../express/deliveryPoint.rules'
import { normalizeExpressInsuranceDraft } from '../express/insurance.rules'
import { normalizeExpressPackagingDraft } from '../express/packaging.rules'
import { normalizeExpressReturnBillDraft } from '../express/valueAdded'
import { normalizeExpressWarehouseDraft } from '../express/warehouse.rules'

import type { ExpressDraft } from '../express'

let stagedDraft: ExpressDraft | null = null

function cloneDraft(draft: ExpressDraft): ExpressDraft {
  return {
    ...draft,
    sender: draft.sender ? { ...draft.sender } : null,
    consignee: draft.consignee ? { ...draft.consignee } : null,
    goods: { ...draft.goods },
    insurance: normalizeExpressInsuranceDraft(
      draft.insurance,
      draft.selectedProduct?.omsProductCode || draft.service.transportMode
    ),
    packaging: normalizeExpressPackagingDraft(draft.packaging),
    service: {
      ...draft.service,
      returnBill: normalizeExpressReturnBillDraft(draft.service.returnBill)
    },
    collection: { ...draft.collection },
    deliveryPreference: {
      ...draft.deliveryPreference,
      unavailableDates: [...draft.deliveryPreference.unavailableDates]
    },
    deliveryPoint: normalizeExpressDeliveryPointDraft(
      draft.deliveryPoint,
      draft.service.deliveryMode
    ),
    warehouse: normalizeExpressWarehouseDraft(draft.warehouse),
    pickup: {
      ...draft.pickup,
      nightCapability: draft.pickup.nightCapability
        ? { ...draft.pickup.nightCapability }
        : undefined
    },
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
