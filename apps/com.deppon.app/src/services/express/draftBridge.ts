import { normalizeExpressDeliveryPointDraft } from './deliveryPoint.rules'
import { normalizeExpressInsuranceDraft } from './insurance.rules'
import { createExpressPackagingDraft, normalizeExpressPackagingDraft } from './packaging.rules'
import { normalizeExpressReturnBillDraft } from './valueAdded'
import { normalizeExpressWarehouseDraft, resetExpressWarehouseInput } from './warehouse.rules'

import type { ExpressDraft, ExpressProductQuote } from './types'

export type ExpressDraftBridgeSource =
  'QUERY_PRICE' | 'ORDER_RESEND' | 'COUPON_LIST' | 'GOODS_QUERY' | 'BATCH_RECOGNITION' | 'SCAN_QR_CODE' | 'DISPATCH_QUERY' | 'COURIER' | 'TEMPLATE'

export interface ExpressDraftBridgePayload {
  source: ExpressDraftBridgeSource
  draft: ExpressDraft
  quotes: ExpressProductQuote[]
  carriedAt: number
}

let pendingDraft: ExpressDraftBridgePayload | null = null

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

/**
 *
 * @param draft 寄件草稿
 * @description 重置仓库信息并清空关联服务
 */
function clearWarehouseForBridge(draft: ExpressDraft) {
  return resetExpressWarehouseInput(draft.warehouse, {
    clearService: true
  })
}

export const expressDraftBridge = {
  /**
   *
   * @param draft 寄件草稿
   * @param product 选中的报价产品
   * @description 从询价页带入草稿与报价
   */
  carryFromQueryPrice(draft: ExpressDraft, product: ExpressProductQuote) {
    const currentProductCode = draft.selectedProduct?.omsProductCode || draft.service.transportMode
    const nextDraft = cloneDraft({
      ...draft,
      warehouse: currentProductCode === product.omsProductCode ? draft.warehouse : resetExpressWarehouseInput(draft.warehouse),
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

  /**
   *
   * @param draft 寄件草稿
   * @description 从再来一单带入草稿
   */
  carryFromOrderResend(draft: ExpressDraft) {
    const nextDraft = cloneDraft({
      ...draft,
      packaging: createExpressPackagingDraft(),
      warehouse: clearWarehouseForBridge(draft),
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

  /**
   *
   * @param draft 寄件草稿
   * @description 从优惠券列表带入草稿
   */
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

  /**
   *
   * @param draft 寄件草稿
   * @description 从货物名称查询带入草稿
   */
  carryFromGoodsQuery(draft: ExpressDraft) {
    const nextDraft = cloneDraft({
      ...draft,
      warehouse: resetExpressWarehouseInput(draft.warehouse),
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

  /**
   *
   * @param draft 寄件草稿
   * @description 从批量识别带入草稿
   */
  carryFromBatchRecognition(draft: ExpressDraft) {
    const nextDraft = cloneDraft({
      ...draft,
      packaging: createExpressPackagingDraft(),
      warehouse: clearWarehouseForBridge(draft),
      selectedProduct: null,
      agreementAccepted: false,
      quoteStaleReason: draft.quoteStaleReason || '批量识别带入，请重新获取价格'
    })

    pendingDraft = {
      source: 'BATCH_RECOGNITION',
      draft: nextDraft,
      quotes: [],
      carriedAt: Date.now()
    }
  },

  /**
   *
   * @param draft 寄件草稿
   * @description 从扫码寄件带入草稿
   */
  carryFromScanQrCode(draft: ExpressDraft) {
    const nextDraft = cloneDraft({
      ...draft,
      packaging: createExpressPackagingDraft(),
      warehouse: clearWarehouseForBridge(draft),
      selectedProduct: null,
      agreementAccepted: false,
      quoteStaleReason: draft.quoteStaleReason || '扫码寄件信息变化，请重新获取价格'
    })

    pendingDraft = {
      source: 'SCAN_QR_CODE',
      draft: nextDraft,
      quotes: [],
      carriedAt: Date.now()
    }
  },

  /**
   *
   * @param draft 寄件草稿
   * @description 从收派范围查询带入草稿
   */
  carryFromDispatchQuery(draft: ExpressDraft) {
    const nextDraft = cloneDraft({
      ...draft,
      packaging: createExpressPackagingDraft(),
      warehouse: clearWarehouseForBridge(draft),
      selectedProduct: null,
      agreementAccepted: false,
      quoteStaleReason: draft.quoteStaleReason || '收派范围查询带入，请重新获取价格'
    })

    pendingDraft = {
      source: 'DISPATCH_QUERY',
      draft: nextDraft,
      quotes: [],
      carriedAt: Date.now()
    }
  },

  /**
   *
   * @param draft 寄件草稿
   * @description 从专属快递员带入草稿
   */
  carryFromCourier(draft: ExpressDraft) {
    const nextDraft = cloneDraft({
      ...draft,
      packaging: createExpressPackagingDraft(),
      warehouse: clearWarehouseForBridge(draft),
      selectedProduct: null,
      agreementAccepted: false,
      quoteStaleReason: draft.quoteStaleReason || '专属快递员已带入，请重新获取价格'
    })

    pendingDraft = {
      source: 'COURIER',
      draft: nextDraft,
      quotes: [],
      carriedAt: Date.now()
    }
  },

  /**
   *
   * @param draft 寄件草稿
   * @description 从寄件模板带入草稿
   */
  carryFromTemplate(draft: ExpressDraft) {
    const nextDraft = cloneDraft({
      ...draft,
      packaging: createExpressPackagingDraft(),
      warehouse: clearWarehouseForBridge(draft),
      selectedProduct: null,
      agreementAccepted: false,
      quoteStaleReason: draft.quoteStaleReason || '模板信息已带入，请重新获取价格'
    })

    pendingDraft = {
      source: 'TEMPLATE',
      draft: nextDraft,
      quotes: [],
      carriedAt: Date.now()
    }
  },

  /**
   *
   * @description 取出并清空待消费的草稿
   */
  consume() {
    const nextDraft = pendingDraft

    pendingDraft = null

    return nextDraft
  }
}
