import {
  createExpressDeliveryPointDraft
} from './deliveryPoint.rules'
import {
  createExpressDeliveryAvailabilityKey,
  createExpressDeliveryPreferenceDraft
} from './deliveryPreference.rules'
import {
  normalizeExpressInsuranceDraft,
  resetExpressInsuranceCapability
} from './insurance.rules'
import {
  findExpressPickupTimeSelection,
  getFirstExpressPickupTimeSelection
} from './pickupTime.options'
import { selectExpressPickupTime } from './pickupTime.rules'
import { normalizeExpressReturnBillDraft } from './valueAdded'
import { resetExpressWarehouseInput } from './warehouse.rules'

import type {
  ExpressContact,
  ExpressContactTarget,
  ExpressDraft,
  ExpressPickupTimeResponse,
  ExpressProductQuote,
  ExpressScanContext,
  ExpressServiceOptions
} from './types'

const SCAN_CONTEXT_STALE_REASON = '扫码寄件信息变化，请重新获取价格'
const SCAN_CONTEXT_CLEAR_REASON = '扫码寄件信息已移除，请重新获取价格'

function trimValue(value: string | undefined) {
  return (value ?? '').trim()
}

function clearPickupSelection(
  pickup: ExpressDraft['pickup'],
  clearNightCapability = false
) {
  return {
    ...pickup,
    time: '',
    endTime: undefined,
    timeSlot: undefined,
    type: 'NORMAL' as const,
    stationCode: '',
    stationName: '',
    pickPeriodTime: undefined,
    nightCapability: clearNightCapability
      ? undefined
      : pickup.nightCapability,
    nightNoticeAccepted: false
  }
}

function clearPickupSchedule(pickup: ExpressDraft['pickup']) {
  return clearPickupSelection(pickup, true)
}

export function resetSenderDependencies(draft: ExpressDraft): ExpressDraft {
  return {
    ...draft,
    insurance: resetExpressInsuranceCapability(draft).insurance,
    pickup: clearPickupSchedule(draft.pickup),
    warehouse: resetExpressWarehouseInput(draft.warehouse),
    selectedProduct: null,
    quoteStaleReason: '寄件地址变化，请重新获取价格'
  }
}

export function resetConsigneeDependencies(draft: ExpressDraft): ExpressDraft {
  return {
    ...draft,
    insurance: resetExpressInsuranceCapability(draft).insurance,
    deliveryPreference: createExpressDeliveryPreferenceDraft(),
    deliveryPoint: createExpressDeliveryPointDraft(),
    warehouse: resetExpressWarehouseInput(draft.warehouse, {
      clearService: true
    }),
    selectedProduct: null,
    quoteStaleReason: '收件地址变化，请重新获取价格'
  }
}

export function markExpressQuoteStale(
  draft: ExpressDraft,
  reason: string
): ExpressDraft {
  return {
    ...draft,
    selectedProduct: null,
    quoteStaleReason: reason
  }
}

export function updateExpressGoods(
  draft: ExpressDraft,
  patch: Partial<ExpressDraft['goods']>,
  reason = '货物信息变化，请重新获取价格'
): ExpressDraft {
  const warehouseInputChanged =
    (patch.name !== undefined && patch.name !== draft.goods.name) ||
    (patch.weight !== undefined && patch.weight !== draft.goods.weight)
  const insuranceInputChanged =
    patch.name !== undefined && patch.name !== draft.goods.name
  const nextDraft: ExpressDraft = {
    ...draft,
    goods: {
      ...draft.goods,
      ...patch
    },
    pickup: clearPickupSelection(draft.pickup),
    warehouse: warehouseInputChanged
      ? resetExpressWarehouseInput(draft.warehouse)
      : draft.warehouse,
    deliveryPreference:
      draft.deliveryPreference.type === 'SCHEDULED'
        ? createExpressDeliveryPreferenceDraft()
        : draft.deliveryPreference
  }

  return markExpressQuoteStale(
    insuranceInputChanged
      ? resetExpressInsuranceCapability(nextDraft)
      : nextDraft,
    reason
  )
}

export function updateExpressService(
  draft: ExpressDraft,
  patch: Partial<ExpressServiceOptions>,
  reason = '服务方式变化，请重新获取价格'
): ExpressDraft {
  const warehouseInputChanged =
    (patch.transportMode !== undefined &&
      patch.transportMode !== draft.service.transportMode) ||
      (patch.deliveryMode !== undefined &&
      patch.deliveryMode !== draft.service.deliveryMode)
  const nextTransportMode =
    patch.transportMode ?? draft.service.transportMode
  const nextService = {
    ...draft.service,
    ...patch,
    returnBill: normalizeExpressReturnBillDraft(
      {
        ...draft.service.returnBill,
        ...patch.returnBill
      },
      nextTransportMode
    )
  }

  return markExpressQuoteStale(
    {
      ...draft,
      service: nextService,
      insurance: normalizeExpressInsuranceDraft(
        draft.insurance,
        nextTransportMode
      ),
      deliveryPoint:
        nextService.deliveryMode === 'PICKSELF'
          ? draft.deliveryPoint
          : createExpressDeliveryPointDraft(),
      deliveryPreference:
        patch.deliveryMode === 'PICKSELF'
          ? createExpressDeliveryPreferenceDraft()
          : draft.deliveryPreference,
      warehouse: warehouseInputChanged
        ? resetExpressWarehouseInput(draft.warehouse, {
            clearService: patch.deliveryMode === 'PICKSELF'
          })
        : draft.warehouse
    },
    reason
  )
}

export function updateExpressPickup(
  draft: ExpressDraft,
  patch: Partial<ExpressDraft['pickup']>,
  reason = '取件方式变化，请重新获取价格'
): ExpressDraft {
  const modeChanged =
    patch.dispatch !== undefined && patch.dispatch !== draft.pickup.dispatch
  const nextPickup = modeChanged
    ? {
        ...clearPickupSchedule(draft.pickup),
        dispatch: patch.dispatch ?? draft.pickup.dispatch
      }
    : {
        ...draft.pickup,
        ...patch,
        nightNoticeAccepted:
          patch.type && patch.type !== draft.pickup.type
            ? false
            : draft.pickup.nightNoticeAccepted
      }

  return markExpressQuoteStale(
    {
      ...draft,
      pickup: nextPickup
    },
    reason
  )
}

export function updateExpressCouponNumber(
  draft: ExpressDraft,
  value: string
): ExpressDraft {
  return markExpressQuoteStale(
    {
      ...draft,
      couponNumber: value.replace(/\s+/g, '').toUpperCase()
    },
    '优惠券变化，请重新获取价格'
  )
}

export function setExpressPrivacyProtection(
  draft: ExpressDraft,
  value: ExpressDraft['service']['privacyProtection']
): ExpressDraft {
  return {
    ...draft,
    service: {
      ...draft.service,
      privacyProtection: value
    }
  }
}

export function selectExpressProduct(
  draft: ExpressDraft,
  product: ExpressProductQuote | null
): ExpressDraft {
  const currentProductCode =
    draft.selectedProduct?.omsProductCode || draft.service.transportMode
  const nextProductCode = product?.omsProductCode || draft.service.transportMode
  const nextService = product
    ? {
        ...draft.service,
        transportMode: product.omsProductCode,
        returnBill: normalizeExpressReturnBillDraft(
          draft.service.returnBill,
          product.omsProductCode
        )
      }
    : {
        ...draft.service,
        returnBill: normalizeExpressReturnBillDraft(
          draft.service.returnBill,
          nextProductCode
        )
      }
  const nextDraft: ExpressDraft = {
    ...draft,
    selectedProduct: product,
    service: nextService,
    insurance: normalizeExpressInsuranceDraft(
      draft.insurance,
      nextProductCode
    ),
    warehouse:
      currentProductCode === nextProductCode
        ? draft.warehouse
        : resetExpressWarehouseInput(draft.warehouse),
    quoteStaleReason: ''
  }
  const keepDeliveryPreference =
    draft.deliveryPreference.type !== 'SCHEDULED' ||
    draft.deliveryPreference.availabilityKey ===
      createExpressDeliveryAvailabilityKey(nextDraft)

  return keepDeliveryPreference
    ? nextDraft
    : {
        ...nextDraft,
        deliveryPreference: createExpressDeliveryPreferenceDraft()
      }
}

export function applyExpressPickupTime(
  draft: ExpressDraft,
  response: ExpressPickupTimeResponse
): ExpressDraft {
  const selection =
    findExpressPickupTimeSelection(response, draft.pickup) ??
    getFirstExpressPickupTimeSelection(response)
  const responseDraft: ExpressDraft = {
    ...draft,
    pickup: {
      ...draft.pickup,
      endTime: response.endTime,
      stationCode: response.deptCode || '',
      stationName: response.deptName || '',
      pickPeriodTime: response.pickPeriodTime,
      nightCapability: response.nightCapability
    }
  }

  if (!selection) {
    const clearedPickup = clearPickupSelection(responseDraft.pickup)

    return markExpressQuoteStale(
      {
        ...responseDraft,
        pickup: {
          ...clearedPickup,
          stationCode: response.deptCode || '',
          stationName: response.deptName || '',
          pickPeriodTime: response.pickPeriodTime,
          nightCapability: response.nightCapability
        }
      },
      '取件时间已更新，请重新获取价格'
    )
  }

  const selectedDraft = selectExpressPickupTime(responseDraft, selection)

  return {
    ...selectedDraft,
    pickup: {
      ...selectedDraft.pickup,
      endTime: response.endTime,
      stationCode: response.deptCode || '',
      stationName: response.deptName || '',
      pickPeriodTime: response.pickPeriodTime,
      nightCapability: response.nightCapability
    }
  }
}

function normalizeExpressScanContext(
  context: ExpressScanContext
): ExpressScanContext | null {
  const value = trimValue(context.value)
  const sceneId = trimValue(context.sceneId)

  if (
    !value ||
    value.toLowerCase() === 'null' ||
    value.toLowerCase() === 'undefined'
  ) {
    return null
  }

  return {
    role: context.role,
    value,
    sceneId: sceneId || undefined,
    expressRole: context.expressRole
  }
}

export function applyExpressScanContext(
  draft: ExpressDraft,
  context: ExpressScanContext
): ExpressDraft {
  const scanContext = normalizeExpressScanContext(context)

  if (!scanContext) {
    const nextDraft = {
      ...draft,
      scanContext: undefined
    }

    return resetExpressInsuranceCapability(nextDraft, { clearLimit: true })
  }

  const nextDraft = {
    ...draft,
    scanContext,
    warehouse: resetExpressWarehouseInput(draft.warehouse),
    selectedProduct: null,
    agreementAccepted: false,
    quoteStaleReason: SCAN_CONTEXT_STALE_REASON
  }

  return resetExpressInsuranceCapability(nextDraft, { clearLimit: true })
}

export function clearExpressScanContext(draft: ExpressDraft): ExpressDraft {
  if (!draft.scanContext) {
    return draft
  }

  const nextDraft = {
    ...draft,
    scanContext: undefined,
    warehouse: resetExpressWarehouseInput(draft.warehouse),
    selectedProduct: null,
    agreementAccepted: false,
    quoteStaleReason: SCAN_CONTEXT_CLEAR_REASON
  }

  return resetExpressInsuranceCapability(nextDraft, { clearLimit: true })
}

export function setExpressContact(
  draft: ExpressDraft,
  target: ExpressContactTarget,
  contact: ExpressContact
): ExpressDraft {
  const nextDraft = {
    ...draft,
    [target]: contact
  }

  return target === 'sender'
    ? resetSenderDependencies(nextDraft)
    : resetConsigneeDependencies(nextDraft)
}

export function swapExpressContacts(draft: ExpressDraft): ExpressDraft {
  const nextDraft = {
    ...draft,
    sender: draft.consignee,
    consignee: draft.sender,
    pickup: clearPickupSchedule(draft.pickup),
    deliveryPreference: createExpressDeliveryPreferenceDraft(),
    deliveryPoint: createExpressDeliveryPointDraft(),
    warehouse: resetExpressWarehouseInput(draft.warehouse, {
      clearService: true
    }),
    selectedProduct: null,
    quoteStaleReason: '收寄地址互换，请重新获取价格'
  }

  return resetExpressInsuranceCapability(nextDraft)
}
