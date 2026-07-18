import { normalizeExpressCollectionDraft } from './collection.rules'
import { normalizeExpressDeliveryPointDraft } from './deliveryPoint.rules'
import { normalizeExpressDeliveryPreferenceDraft } from './deliveryPreference.rules'
import { createExpressDraft } from './express.draft'
import { normalizeExpressInsuranceDraft } from './insurance.rules'
import { normalizeExpressPackagingDraft } from './packaging.rules'
import { normalizeExpressPickup } from './pickupTime.rules'
import { normalizeExpressReturnBillDraft } from './valueAdded'
import { normalizeExpressWarehouseDraft } from './warehouse.rules'
import { preserveAccountScopedCacheForLogin } from '../../cache/accountScope'
import { DPCacheExpireType, dpCache } from '../../cache/dpCache'
import { CACHE_KEYS } from '../../cache/keys'

import type {
  ExpressDraft,
  ExpressWarehouseDraft,
  ExpressWarehouseScreening
} from './types'

const EXPRESS_DRAFT_EXPIRE_HOURS = 2

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

function normalizeDraft(draft: ExpressDraft): ExpressDraft {
  const defaultDraft = createExpressDraft()
  const legacyDraft = draft as ExpressDraft & {
    goods: ExpressDraft['goods'] & { reviceMoneyAmount?: number }
    service: ExpressDraft['service'] & {
      reciveLoanType?: ExpressDraft['collection']['type']
      returnBillType?: ExpressDraft['service']['returnBill']['type']
      returnRequirement?: string | string[]
      customReturnRequirement?: string
      returnFile?: string
    }
    collection?: Partial<ExpressDraft['collection']>
    insurance?: Partial<ExpressDraft['insurance']>
    deliveryPoint?: Partial<ExpressDraft['deliveryPoint']>
    deliveryPreference?: Partial<ExpressDraft['deliveryPreference']>
    packaging?: Partial<ExpressDraft['packaging']>
    warehouse?: Omit<Partial<ExpressWarehouseDraft>, 'screening'> & {
      screening?: Partial<ExpressWarehouseScreening> | null
    }
  }
  const collection = normalizeExpressCollectionDraft(
    legacyDraft.collection ?? {
      type: legacyDraft.service?.reciveLoanType,
      amount: legacyDraft.goods?.reviceMoneyAmount
    }
  )
  const legacyReturnBill = legacyDraft.service?.returnBill ?? {
    returnBillType: legacyDraft.service?.returnBillType,
    returnRequirement: legacyDraft.service?.returnRequirement,
    customReturnRequirement: legacyDraft.service?.customReturnRequirement,
    returnFile: legacyDraft.service?.returnFile
  }

  return {
    ...defaultDraft,
    ...draft,
    sender: draft.sender ? { ...draft.sender } : null,
    consignee: draft.consignee ? { ...draft.consignee } : null,
    goods: {
      ...defaultDraft.goods,
      ...draft.goods
    },
    insurance: normalizeExpressInsuranceDraft(
      legacyDraft.insurance,
      draft.selectedProduct?.omsProductCode || draft.service?.transportMode
    ),
    packaging: normalizeExpressPackagingDraft(legacyDraft.packaging),
    service: {
      ...defaultDraft.service,
      ...draft.service,
      returnBill: normalizeExpressReturnBillDraft(legacyReturnBill)
    },
    collection,
    deliveryPreference: normalizeExpressDeliveryPreferenceDraft(
      legacyDraft.deliveryPreference
    ),
    deliveryPoint: normalizeExpressDeliveryPointDraft(
      legacyDraft.deliveryPoint,
      legacyDraft.service?.deliveryMode
    ),
    warehouse: normalizeExpressWarehouseDraft(legacyDraft.warehouse),
    pickup: normalizeExpressPickup({
      ...defaultDraft.pickup,
      ...draft.pickup
    }),
    selectedProduct: draft.selectedProduct
      ? { ...draft.selectedProduct }
      : null,
    scanContext: draft.scanContext ? { ...draft.scanContext } : undefined
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
    draft.insurance.type !== defaultDraft.insurance.type ||
    !!draft.packaging.cartonCode ||
    draft.packaging.woodenCodes.length > 0 ||
    draft.packaging.unpackingCodes.length > 0 ||
    draft.collection.amount > 0 ||
    draft.service.deliveryMode !== defaultDraft.service.deliveryMode ||
    draft.service.paymentType !== defaultDraft.service.paymentType ||
    draft.service.returnBill.type !== defaultDraft.service.returnBill.type ||
    draft.service.returnBill.requirements.length > 0 ||
    !!draft.service.returnBill.customRequirement ||
    !!draft.service.returnBill.fileCode ||
    draft.collection.type !== defaultDraft.collection.type ||
    !!draft.collection.account ||
    draft.collection.agreementAccepted ||
    !!draft.deliveryPreference.type ||
    !!draft.deliveryPoint.code ||
    draft.warehouse.enabled ||
    !!draft.warehouse.warehouseNo ||
    !!draft.warehouse.warehouseTime ||
    draft.warehouse.fileList.length > 0 ||
    !!draft.warehouse.warehouseType ||
    !!draft.warehouse.deliverWarehouseWay ||
    !!draft.warehouse.warehouseProcess ||
    !!draft.warehouse.warehouseCode ||
    !!draft.warehouse.warehouseRemark ||
    !!draft.warehouse.screening.inputKey ||
    draft.service.passwordSigning !== defaultDraft.service.passwordSigning ||
    draft.service.needContact !== defaultDraft.service.needContact ||
    draft.service.privacyProtection !==
      defaultDraft.service.privacyProtection ||
    !!draft.pickup.time ||
    !!draft.couponNumber ||
    !!draft.remark ||
    draft.agreementAccepted ||
    !!draft.scanContext
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

  async preserveForLogin(draft: ExpressDraft) {
    const saved = await expressDraftStorage.save(draft)

    if (saved) {
      preserveAccountScopedCacheForLogin(CACHE_KEYS.expressDraft)
    }

    return saved
  },

  clear() {
    return dpCache.remove(CACHE_KEYS.expressDraft)
  }
}
