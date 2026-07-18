import { createExpressDeliveryPreferenceDraft } from './deliveryPreference.rules'

import type {
  ExpressDraft,
  ExpressFilterResponse,
  ExpressWarehouseDraft,
  ExpressWarehouseScreening,
  ExpressWarehouseScreeningType,
  ExpressWarehouseType,
  ExpressWarehouseWay
} from './types'

const AUTO_SELECT_WEIGHT = 100
const LEGACY_LTL_PRODUCT_CODES = new Set(['JZKH', 'JZQY_LONG'])

type WarehouseDraftInput = Omit<
  Partial<ExpressWarehouseDraft>,
  'screening'
> & {
  screening?: Partial<ExpressWarehouseScreening> | null
}

type WarehouseScreeningInput = {
  inputKey?: unknown
  type?: unknown
  reason?: unknown
  depotType?: unknown
  autoSelected?: unknown
  acknowledged?: unknown
}

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeNumber(value: unknown, fallback = 0) {
  const result = Number(value)
  return Number.isFinite(result) ? result : fallback
}

export function normalizeExpressWarehouseType(
  value: unknown
): ExpressWarehouseType {
  const normalized = normalizeText(value)
  return /^[1-6]$/.test(normalized)
    ? (normalized as ExpressWarehouseType)
    : ''
}

export function normalizeExpressWarehouseWay(
  value: unknown
): ExpressWarehouseWay {
  return value === 'APSF' || value === 'AGXSF' ? value : ''
}

export function normalizeExpressWarehouseScreeningType(
  value: unknown
): ExpressWarehouseScreeningType {
  const normalized = Number(value)
  return Number.isInteger(normalized) && normalized >= 0 && normalized <= 4
    ? (normalized as ExpressWarehouseScreeningType)
    : 0
}

export function createExpressWarehouseScreeningDraft():
  ExpressWarehouseScreening {
  return {
    inputKey: '',
    type: 0,
    reason: '',
    depotType: '',
    autoSelected: false,
    acknowledged: false
  }
}

export function normalizeExpressWarehouseScreening(
  value?: WarehouseScreeningInput | null
): ExpressWarehouseScreening {
  return {
    inputKey: normalizeText(value?.inputKey),
    type: normalizeExpressWarehouseScreeningType(value?.type),
    reason: normalizeText(value?.reason),
    depotType: normalizeExpressWarehouseType(value?.depotType),
    autoSelected: value?.autoSelected === true,
    acknowledged: value?.acknowledged === true
  }
}

export function createExpressWarehouseDraft(): ExpressWarehouseDraft {
  return {
    enabled: false,
    warehouseNo: '',
    warehouseTime: '',
    fileList: [],
    warehouseType: '',
    deliverWarehouseWay: '',
    warehouseProcess: '',
    warehouseCode: '',
    warehouseRemark: '',
    screening: createExpressWarehouseScreeningDraft()
  }
}

export function normalizeExpressWarehouseDraft(
  value?: WarehouseDraftInput | null
): ExpressWarehouseDraft {
  const way = normalizeExpressWarehouseWay(value?.deliverWarehouseWay)
  const fileList = Array.isArray(value?.fileList)
    ? value.fileList
        .map(file => ({ previewPath: normalizeText(file?.previewPath) }))
        .filter(file => !!file.previewPath)
    : []

  return {
    enabled: value?.enabled === true,
    warehouseNo: normalizeText(value?.warehouseNo),
    warehouseTime: normalizeText(value?.warehouseTime),
    fileList,
    warehouseType: normalizeExpressWarehouseType(value?.warehouseType),
    deliverWarehouseWay: way,
    warehouseProcess:
      way === 'AGXSF' ? normalizeText(value?.warehouseProcess) : '',
    warehouseCode: normalizeText(value?.warehouseCode),
    warehouseRemark: normalizeText(value?.warehouseRemark),
    screening: normalizeExpressWarehouseScreening(value?.screening)
  }
}

function getContactInput(contact: ExpressDraft['sender']) {
  if (!contact) {
    return null
  }

  return {
    name: normalizeText(contact.name),
    mobile: normalizeText(contact.mobile),
    province: normalizeText(contact.province),
    city: normalizeText(contact.city),
    county: normalizeText(contact.county),
    town: normalizeText(contact.town),
    address: normalizeText(contact.address)
  }
}

function getProductCode(draft: ExpressDraft) {
  return draft.selectedProduct?.omsProductCode || draft.service.transportMode
}

function getCustomerCode(draft: ExpressDraft) {
  return draft.scanContext?.role === 'shipperNumber'
    ? normalizeText(draft.scanContext.value)
    : ''
}

export function createExpressWarehouseInputKey(draft: ExpressDraft) {
  const customerCode = getCustomerCode(draft)

  return JSON.stringify({
    sender: getContactInput(draft.sender),
    consignee: getContactInput(draft.consignee),
    goodsName: normalizeText(draft.goods.name),
    totalWeight: normalizeNumber(draft.goods.weight, 1),
    transportMode: getProductCode(draft),
    deliveryMode: draft.service.deliveryMode,
    customerCode,
    limitCust:
      !!customerCode || draft.service.paymentType === 'MONTH_PAY' ? 1 : 0
  })
}

export function isSameExpressWarehouseScreeningProof(
  current: ExpressWarehouseScreening,
  next: ExpressWarehouseScreening
) {
  return (
    current.inputKey === next.inputKey &&
    current.type === next.type &&
    current.reason === next.reason &&
    current.depotType === next.depotType
  )
}

export function shouldAutoSelectExpressWarehouse(
  draft: ExpressDraft,
  screening: Pick<ExpressWarehouseScreening, 'type'>
) {
  const warehouse = normalizeExpressWarehouseDraft(draft.warehouse)
  const productCode = getProductCode(draft)

  return (
    screening.type === 3 &&
    !warehouse.enabled &&
    !warehouse.screening.autoSelected &&
    normalizeNumber(draft.goods.weight) >= AUTO_SELECT_WEIGHT &&
    !LEGACY_LTL_PRODUCT_CODES.has(productCode)
  )
}

export function createExpressWarehouseScreening(
  draft: ExpressDraft,
  response?: ExpressFilterResponse | null
): ExpressWarehouseScreening {
  const warehouse = normalizeExpressWarehouseDraft(draft.warehouse)
  const base = normalizeExpressWarehouseScreening({
    inputKey: createExpressWarehouseInputKey(draft),
    type: response?.type,
    reason: response?.reason,
    depotType: response?.depotType
  })
  const sameProof = isSameExpressWarehouseScreeningProof(
    warehouse.screening,
    base
  )
  const newlyAutoSelected = shouldAutoSelectExpressWarehouse(draft, base)
  const requiresAcknowledgement = base.type >= 2

  return {
    ...base,
    autoSelected: newlyAutoSelected,
    acknowledged:
      newlyAutoSelected ||
      !requiresAcknowledgement ||
      (sameProof && warehouse.screening.acknowledged)
  }
}

export function isExpressWarehouseScreeningCurrent(draft: ExpressDraft) {
  const screening = normalizeExpressWarehouseDraft(draft.warehouse).screening
  return (
    !!screening.inputKey &&
    screening.inputKey === createExpressWarehouseInputKey(draft)
  )
}

export function validateExpressWarehouseScreeningForSubmit(
  draft: ExpressDraft,
  latest: ExpressWarehouseScreening
) {
  const warehouse = normalizeExpressWarehouseDraft(draft.warehouse)
  const normalizedLatest = normalizeExpressWarehouseScreening(latest)

  if (normalizedLatest.inputKey !== createExpressWarehouseInputKey(draft)) {
    return ['送货进仓筛单结果已失效，请重新确认']
  }

  const sameProof = isSameExpressWarehouseScreeningProof(
    warehouse.screening,
    normalizedLatest
  )

  if (warehouse.enabled && !sameProof) {
    return ['送货进仓筛单结果已更新，请重新确认']
  }

  if (
    normalizedLatest.type >= 2 &&
    (!sameProof || !warehouse.screening.acknowledged)
  ) {
    return [normalizedLatest.reason || '请确认是否需要送货进仓']
  }

  return []
}

export function validateExpressWarehouse(
  draft: ExpressDraft,
  options: { requireScreening?: boolean } = {}
) {
  const warehouse = normalizeExpressWarehouseDraft(draft.warehouse)
  const screeningCurrent = isExpressWarehouseScreeningCurrent(draft)
  const messages: string[] = []

  if (warehouse.enabled && draft.service.deliveryMode === 'PICKSELF') {
    messages.push('自提订单不能选择送货进仓')
  }

  if (warehouse.enabled && draft.deliveryPreference.type) {
    messages.push('送货进仓和派送偏好不能同时选择')
  }

  if (
    warehouse.enabled &&
    warehouse.deliverWarehouseWay === 'AGXSF' &&
    !warehouse.warehouseProcess
  ) {
    messages.push('请选择进仓工序')
  }

  if (options.requireScreening && warehouse.enabled && !screeningCurrent) {
    messages.push('送货进仓筛单结果已失效，请重新确认')
  }

  if (
    options.requireScreening &&
    screeningCurrent &&
    warehouse.screening.type >= 2 &&
    !warehouse.screening.acknowledged
  ) {
    messages.push(warehouse.screening.reason || '请确认是否需要送货进仓')
  }

  return messages
}

function hasQuoteFieldChanged(
  current: ExpressWarehouseDraft,
  next: ExpressWarehouseDraft
) {
  if (current.enabled !== next.enabled) {
    return true
  }

  if (!current.enabled) {
    return false
  }

  return (
    current.warehouseType !== next.warehouseType ||
    current.deliverWarehouseWay !== next.deliverWarehouseWay ||
    current.warehouseProcess !== next.warehouseProcess ||
    current.warehouseCode !== next.warehouseCode
  )
}

export function updateExpressWarehouse(
  draft: ExpressDraft,
  patch: Partial<ExpressWarehouseDraft>,
  options: { acknowledge?: boolean } = {}
): ExpressDraft {
  const current = normalizeExpressWarehouseDraft(draft.warehouse)
  const explicitlyDecided = options.acknowledge === true
  let next = normalizeExpressWarehouseDraft({ ...current, ...patch })

  if (!next.enabled) {
    next = {
      ...createExpressWarehouseDraft(),
      screening: {
        ...current.screening,
        acknowledged:
          explicitlyDecided &&
          current.screening.type >= 2 &&
          isExpressWarehouseScreeningCurrent(draft)
            ? true
            : current.screening.acknowledged
      }
    }
  } else if (patch.enabled === true && next.screening.type >= 2) {
    next.screening.acknowledged = true
  }

  const quoteChanged = hasQuoteFieldChanged(current, next)

  return {
    ...draft,
    warehouse: next,
    deliveryPreference: next.enabled
      ? createExpressDeliveryPreferenceDraft()
      : draft.deliveryPreference,
    selectedProduct: quoteChanged ? null : draft.selectedProduct,
    quoteStaleReason: quoteChanged
      ? '送货进仓信息变化，请重新获取价格'
      : draft.quoteStaleReason
  }
}

export function clearExpressWarehouse(draft: ExpressDraft) {
  return updateExpressWarehouse(draft, { enabled: false })
}

export function applyExpressWarehouseScreening(
  draft: ExpressDraft,
  value: ExpressWarehouseScreening
): ExpressDraft {
  const current = normalizeExpressWarehouseDraft(draft.warehouse)
  const screening = normalizeExpressWarehouseScreening(value)

  if (screening.inputKey !== createExpressWarehouseInputKey(draft)) {
    return draft
  }

  screening.autoSelected =
    current.screening.autoSelected || screening.autoSelected
  const newlyAutoSelected =
    screening.autoSelected && !current.screening.autoSelected
  const depotChanged = current.warehouseType !== screening.depotType
  const next: ExpressWarehouseDraft = {
    ...current,
    enabled: newlyAutoSelected ? true : current.enabled,
    warehouseType: screening.depotType,
    deliverWarehouseWay: depotChanged ? '' : current.deliverWarehouseWay,
    warehouseProcess: depotChanged ? '' : current.warehouseProcess,
    warehouseCode: depotChanged ? '' : current.warehouseCode,
    screening
  }
  const quoteChanged = hasQuoteFieldChanged(current, next)

  return {
    ...draft,
    warehouse: next,
    deliveryPreference: next.enabled
      ? createExpressDeliveryPreferenceDraft()
      : draft.deliveryPreference,
    selectedProduct: quoteChanged ? null : draft.selectedProduct,
    quoteStaleReason: quoteChanged
      ? '送货进仓筛单结果已更新，请重新获取价格'
      : draft.quoteStaleReason
  }
}

export function resetExpressWarehouseInput(
  value: ExpressWarehouseDraft,
  options: { clearService?: boolean } = {}
): ExpressWarehouseDraft {
  const current = normalizeExpressWarehouseDraft(value)
  const screening = {
    ...createExpressWarehouseScreeningDraft(),
    autoSelected: current.screening.autoSelected
  }

  if (options.clearService) {
    return {
      ...createExpressWarehouseDraft(),
      screening
    }
  }

  return {
    ...current,
    warehouseType: '',
    deliverWarehouseWay: '',
    warehouseProcess: '',
    warehouseCode: '',
    screening
  }
}
