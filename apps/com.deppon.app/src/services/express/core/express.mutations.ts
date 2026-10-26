import { isExpressLtlGoods } from './express.goodsType'
import { getExpressCouponDiscount } from '../billing/couponOrder.rules'
import { createExpressDeliveryPointDraft } from '../delivery/deliveryPoint.rules'
import { createExpressDeliveryAvailabilityKey, createExpressDeliveryPreferenceDraft } from '../delivery/deliveryPreference.rules'
import { normalizeExpressInsuranceDraft, resetExpressInsuranceCapability } from '../insurance/insurance.rules'
import { findExpressPickupTimeByHour, findExpressPickupTimeSelection, getFirstExpressPickupTimeSelection } from '../pickup/pickupTime.options'
import { selectExpressPickupTime } from '../pickup/pickupTime.rules'
import { normalizeExpressReturnBillDraft } from '../value-added/valueAdded'
import { resetExpressWarehouseInput } from '../warehouse/warehouse.rules'

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
const SCAN_LTL_WEIGHT = 61

/**
 *
 * @param value 待处理的文本
 * @description 去除文本首尾空白
 */
function trimValue(value: string | undefined) {
  return (value ?? '').trim()
}

/**
 *
 * @param pickup 取件信息
 * @param clearNightCapability 是否清空夜间取件能力
 * @description 清空取件时间与驿站选择
 */
function clearPickupSelection(pickup: ExpressDraft['pickup'], clearNightCapability = false) {
  return {
    ...pickup,
    time: '',
    endTime: undefined,
    timeSlot: undefined,
    type: 'NORMAL' as const,
    stationCode: '',
    stationName: '',
    stationDetail: undefined,
    pickPeriodTime: undefined,
    nightCapability: clearNightCapability ? undefined : pickup.nightCapability,
    nightNoticeAccepted: false
  }
}

/**
 *
 * @param pickup 取件信息
 * @description 清空取件时间并重置夜间能力
 */
function clearPickupSchedule(pickup: ExpressDraft['pickup']) {
  return clearPickupSelection(pickup, true)
}

/**
 *
 * @param draft 寄件草稿
 * @description 寄件人变化后重置相关草稿字段
 */
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

/**
 *
 * @param draft 寄件草稿
 * @description 收件人变化后重置相关草稿字段
 */
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

/**
 *
 * @param draft 寄件草稿
 * @param reason 报价过期提示文案
 * @description 清空选品并标记报价过期
 */
export function markExpressQuoteStale(draft: ExpressDraft, reason: string): ExpressDraft {
  return {
    ...draft,
    selectedProduct: null,
    quoteStaleReason: reason
  }
}

/**
 *
 * @param draft 寄件草稿
 * @param patch 待更新的货物字段
 * @param reason 报价过期提示文案
 * @description 更新货物信息并联动重置相关依赖
 */
export function updateExpressGoods(draft: ExpressDraft, patch: Partial<ExpressDraft['goods']>, reason = '货物信息变化，请重新获取价格'): ExpressDraft {
  const warehouseInputChanged =
    (patch.name !== undefined && patch.name !== draft.goods.name) || (patch.weight !== undefined && patch.weight !== draft.goods.weight)
  const insuranceInputChanged = patch.name !== undefined && patch.name !== draft.goods.name
  const nextGoods = {
    ...draft.goods,
    ...patch
  }
  const wasLtl = isExpressLtlGoods(draft.goods)
  const isLtl = isExpressLtlGoods(nextGoods)
  const enteringLtl = isLtl && !wasLtl
  const returningExpress = !isLtl
  const nextDraft: ExpressDraft = {
    ...draft,
    goods: nextGoods,
    service: returningExpress
      ? { ...draft.service, deliveryMode: 'PICKUPSTAIRS' }
      : enteringLtl
        ? { ...draft.service, deliveryMode: 'PICKNOTUPSTAIRS' }
        : draft.service,
    pickup: returningExpress
      ? {
          ...draft.pickup,
          dispatch: 'Y',
          stationCode: '',
          stationName: '',
          stationDetail: undefined
        }
      : enteringLtl
        ? {
            ...draft.pickup,
            stationCode: '',
            stationName: '',
            stationDetail: undefined
          }
        : draft.pickup,
    deliveryPoint: returningExpress || enteringLtl ? createExpressDeliveryPointDraft() : draft.deliveryPoint,
    warehouse: warehouseInputChanged ? resetExpressWarehouseInput(draft.warehouse) : draft.warehouse,
    deliveryPreference: draft.deliveryPreference.type === 'SCHEDULED' ? createExpressDeliveryPreferenceDraft() : draft.deliveryPreference
  }

  return markExpressQuoteStale(insuranceInputChanged ? resetExpressInsuranceCapability(nextDraft) : nextDraft, reason)
}

/**
 *
 * @param draft 寄件草稿
 * @param patch 待更新的服务字段
 * @param reason 报价过期提示文案
 * @description 更新服务方式并归一关联字段
 */
export function updateExpressService(draft: ExpressDraft, patch: Partial<ExpressServiceOptions>, reason = '服务方式变化，请重新获取价格'): ExpressDraft {
  const warehouseInputChanged =
    (patch.transportMode !== undefined && patch.transportMode !== draft.service.transportMode) ||
    (patch.deliveryMode !== undefined && patch.deliveryMode !== draft.service.deliveryMode)
  const nextTransportMode = patch.transportMode ?? draft.service.transportMode
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
      insurance: normalizeExpressInsuranceDraft(draft.insurance, nextTransportMode),
      deliveryPoint: nextService.deliveryMode === 'PICKSELF' ? draft.deliveryPoint : createExpressDeliveryPointDraft(),
      deliveryPreference: patch.deliveryMode === 'PICKSELF' ? createExpressDeliveryPreferenceDraft() : draft.deliveryPreference,
      warehouse: warehouseInputChanged
        ? resetExpressWarehouseInput(draft.warehouse, {
            clearService: patch.deliveryMode === 'PICKSELF'
          })
        : draft.warehouse
    },
    reason
  )
}

/**
 *
 * @param draft 寄件草稿
 * @param patch 待更新的取件字段
 * @param reason 报价过期提示文案
 * @description 更新取件方式与时间信息
 */
export function updateExpressPickup(draft: ExpressDraft, patch: Partial<ExpressDraft['pickup']>, reason = '取件方式变化，请重新获取价格'): ExpressDraft {
  const modeChanged = patch.dispatch !== undefined && patch.dispatch !== draft.pickup.dispatch
  const nextPickup = modeChanged
    ? {
        ...clearPickupSchedule(draft.pickup),
        dispatch: patch.dispatch ?? draft.pickup.dispatch
      }
    : {
        ...draft.pickup,
        ...patch,
        nightNoticeAccepted: patch.type && patch.type !== draft.pickup.type ? false : draft.pickup.nightNoticeAccepted
      }

  return markExpressQuoteStale(
    {
      ...draft,
      pickup: nextPickup
    },
    reason
  )
}

/**
 *
 * @param draft 寄件草稿
 * @param value 优惠券号
 * @description 更新并归一优惠券号
 */
export function updateExpressCouponNumber(draft: ExpressDraft, value: string): ExpressDraft {
  return markExpressQuoteStale(
    {
      ...draft,
      couponNumber: value.replace(/\s+/g, '').toUpperCase()
    },
    '优惠券变化，请重新获取价格'
  )
}

/**
 *
 * @param draft 寄件草稿
 * @param value 隐私面单开关值
 * @description 设置隐私面单开关
 */
export function setExpressPrivacyProtection(draft: ExpressDraft, value: ExpressDraft['service']['privacyProtection']): ExpressDraft {
  return {
    ...draft,
    service: {
      ...draft.service,
      privacyProtection: value
    }
  }
}

/**
 *
 * @param draft 寄件草稿
 * @param product 选中的报价产品
 * @description 选择报价产品并同步服务与保价
 */
export function selectExpressProduct(draft: ExpressDraft, product: ExpressProductQuote | null): ExpressDraft {
  const currentProductCode = draft.selectedProduct?.omsProductCode || draft.service.transportMode
  const nextProductCode = product?.omsProductCode || draft.service.transportMode
  const nextPaymentType = product?.omsProductCode === 'DCZP' && draft.service.paymentType === 'PAY_ARIIVE' ? 'MP' : draft.service.paymentType
  const nextService = product
    ? {
        ...draft.service,
        transportMode: product.omsProductCode,
        paymentType: nextPaymentType,
        returnBill: normalizeExpressReturnBillDraft(draft.service.returnBill, product.omsProductCode)
      }
    : {
        ...draft.service,
        returnBill: normalizeExpressReturnBillDraft(draft.service.returnBill, nextProductCode)
      }
  const nextDraft: ExpressDraft = {
    ...draft,
    selectedProduct: product,
    service: nextService,
    couponNumber: product && getExpressCouponDiscount(product) <= 0 ? '' : draft.couponNumber,
    insurance: normalizeExpressInsuranceDraft(draft.insurance, nextProductCode),
    warehouse: currentProductCode === nextProductCode ? draft.warehouse : resetExpressWarehouseInput(draft.warehouse),
    quoteStaleReason: ''
  }
  const keepDeliveryPreference =
    draft.deliveryPreference.type !== 'SCHEDULED' || draft.deliveryPreference.availabilityKey === createExpressDeliveryAvailabilityKey(nextDraft)

  return keepDeliveryPreference
    ? nextDraft
    : {
        ...nextDraft,
        deliveryPreference: createExpressDeliveryPreferenceDraft()
      }
}

/**
 *
 * @param pickup 取件信息
 * @param stationCode 接口返回的网点编码
 * @description 网点编码一致时保留展示信息，编码变化后旧地址电话不再可信
 */
function keepPickupStationDetail(pickup: ExpressDraft['pickup'], stationCode: string) {
  return pickup.stationDetail && pickup.stationCode === stationCode ? pickup.stationDetail : undefined
}

/**
 *
 * @param draft 寄件草稿
 * @param response 取件时间查询响应
 * @description 应用取件时间响应并选中时段
 */
export function applyExpressPickupTime(draft: ExpressDraft, response: ExpressPickupTimeResponse): ExpressDraft {
  const selection =
    findExpressPickupTimeSelection(response, draft.pickup) ??
    findExpressPickupTimeByHour(response, draft.pickup.time) ??
    getFirstExpressPickupTimeSelection(response)
  const stationCode = response.deptCode || ''
  const stationDetail = keepPickupStationDetail(draft.pickup, stationCode)
  const responseDraft: ExpressDraft = {
    ...draft,
    pickup: {
      ...draft.pickup,
      endTime: response.endTime,
      stationCode,
      stationName: response.deptName || '',
      stationDetail,
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
          stationCode,
          stationName: response.deptName || '',
          stationDetail,
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
      stationCode,
      stationName: response.deptName || '',
      stationDetail,
      pickPeriodTime: response.pickPeriodTime,
      nightCapability: response.nightCapability
    }
  }
}

/**
 *
 * @param context 扫码上下文
 * @description 归一扫码上下文，无效时返回空
 */
function normalizeExpressScanContext(context: ExpressScanContext): ExpressScanContext | null {
  const value = trimValue(context.value)
  const sceneId = trimValue(context.sceneId)

  if (!value || value.toLowerCase() === 'null' || value.toLowerCase() === 'undefined') {
    return null
  }

  return {
    role: context.role,
    value,
    sceneId: sceneId || undefined,
    expressRole: context.expressRole
  }
}

/**
 *
 * @param draft 寄件草稿
 * @param context 扫码上下文
 * @description 应用扫码信息并重置相关依赖
 */
export function applyExpressScanContext(draft: ExpressDraft, context: ExpressScanContext): ExpressDraft {
  const scanContext = normalizeExpressScanContext(context)

  if (!scanContext) {
    const nextDraft = {
      ...draft,
      scanContext: undefined
    }

    return resetExpressInsuranceCapability(nextDraft, { clearLimit: true })
  }

  const isLtlScan = scanContext.role === 'acceptDept' || scanContext.role === 'driverId'
  const nextDraft = {
    ...draft,
    goods: isLtlScan ? { ...draft.goods, weight: SCAN_LTL_WEIGHT } : draft.goods,
    service: isLtlScan ? { ...draft.service, deliveryMode: 'PICKNOTUPSTAIRS' as const } : draft.service,
    pickup: scanContext.role === 'businessCode' ? { ...clearPickupSchedule(draft.pickup), dispatch: 'N' as const } : draft.pickup,
    scanContext,
    warehouse: resetExpressWarehouseInput(draft.warehouse),
    selectedProduct: null,
    agreementAccepted: false,
    quoteStaleReason: SCAN_CONTEXT_STALE_REASON
  }

  return resetExpressInsuranceCapability(nextDraft, { clearLimit: true })
}

/**
 *
 * @param draft 寄件草稿
 * @param target 联系人目标，寄件人或收件人
 * @param contact 联系人信息
 * @description 设置联系人并重置对应依赖
 */
export function setExpressContact(draft: ExpressDraft, target: ExpressContactTarget, contact: ExpressContact): ExpressDraft {
  const nextDraft = {
    ...draft,
    [target]: contact
  }

  return target === 'sender' ? resetSenderDependencies(nextDraft) : resetConsigneeDependencies(nextDraft)
}

/**
 *
 * @param draft 寄件草稿
 * @description 互换收寄件联系人并重置依赖
 */
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
    quoteStaleReason: '收寄地址互换'
  }

  return resetExpressInsuranceCapability(nextDraft)
}
