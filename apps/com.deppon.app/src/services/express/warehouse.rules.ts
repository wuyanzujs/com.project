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

type WarehouseScreening = ExpressWarehouseScreening

type WarehouseDraftInput = Omit<Partial<ExpressWarehouseDraft>, 'screening'> & {
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

/**
 *
 * @param value 待处理的文本
 * @description 归一文本，非字符串返回空
 */
function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

/**
 *
 * @param value 待转换的值
 * @param fallback 兜底值
 * @description 归一数字，非法返回兜底值
 */
function normalizeNumber(value: unknown, fallback = 0) {
  const result = Number(value)
  return Number.isFinite(result) ? result : fallback
}

/**
 *
 * @param value 仓型
 * @description 归一仓型，非法返回空字符串
 */
export function normalizeExpressWarehouseType(value: unknown): ExpressWarehouseType {
  const normalized = normalizeText(value)
  return /^[1-6]$/.test(normalized) ? (normalized as ExpressWarehouseType) : ''
}

/**
 *
 * @param value 进仓方式
 * @description 归一进仓方式，非法返回空字符串
 */
export function normalizeExpressWarehouseWay(value: unknown): ExpressWarehouseWay {
  return value === 'APSF' || value === 'AGXSF' ? value : ''
}

/**
 *
 * @param value 筛单类型
 * @description 归一筛单类型，非法返回 0
 */
export function normalizeExpressWarehouseScreeningType(value: unknown): ExpressWarehouseScreeningType {
  const normalized = Number(value)
  return Number.isInteger(normalized) && normalized >= 0 && normalized <= 4 ? (normalized as ExpressWarehouseScreeningType) : 0
}

/**
 *
 * @description 创建空的筛单草稿
 */
export function createExpressWarehouseScreeningDraft(): WarehouseScreening {
  return {
    inputKey: '',
    type: 0,
    reason: '',
    depotType: '',
    autoSelected: false,
    acknowledged: false
  }
}

/**
 *
 * @param value 筛单信息，可为空
 * @description 归一筛单信息
 */
export function normalizeExpressWarehouseScreening(value?: WarehouseScreeningInput | null): ExpressWarehouseScreening {
  return {
    inputKey: normalizeText(value?.inputKey),
    type: normalizeExpressWarehouseScreeningType(value?.type),
    reason: normalizeText(value?.reason),
    depotType: normalizeExpressWarehouseType(value?.depotType),
    autoSelected: value?.autoSelected === true,
    acknowledged: value?.acknowledged === true
  }
}

/**
 *
 * @description 创建空的送货进仓草稿
 */
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

/**
 *
 * @param value 送货进仓草稿，可为空
 * @description 归一送货进仓草稿
 */
export function normalizeExpressWarehouseDraft(value?: WarehouseDraftInput | null): ExpressWarehouseDraft {
  const way = normalizeExpressWarehouseWay(value?.deliverWarehouseWay)
  const fileList = Array.isArray(value?.fileList)
    ? value.fileList.map(file => ({ previewPath: normalizeText(file?.previewPath) })).filter(file => !!file.previewPath)
    : []

  return {
    enabled: value?.enabled === true,
    warehouseNo: normalizeText(value?.warehouseNo),
    warehouseTime: normalizeText(value?.warehouseTime),
    fileList,
    warehouseType: normalizeExpressWarehouseType(value?.warehouseType),
    deliverWarehouseWay: way,
    warehouseProcess: way === 'AGXSF' ? normalizeText(value?.warehouseProcess) : '',
    warehouseCode: normalizeText(value?.warehouseCode),
    warehouseRemark: normalizeText(value?.warehouseRemark),
    screening: normalizeExpressWarehouseScreening(value?.screening)
  }
}

/**
 *
 * @param contact 联系人信息
 * @description 归一联系人信息为筛单入参
 */
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

/**
 *
 * @param draft 寄件草稿
 * @description 取当前产品 code
 */
function getProductCode(draft: ExpressDraft) {
  return draft.selectedProduct?.omsProductCode || draft.service.transportMode
}

/**
 *
 * @param draft 寄件草稿
 * @description 取扫码带入的客户 code
 */
function getCustomerCode(draft: ExpressDraft) {
  return draft.scanContext?.role === 'shipperNumber' ? normalizeText(draft.scanContext.value) : ''
}

/**
 *
 * @param draft 寄件草稿
 * @description 生成筛单输入 key
 */
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
    limitCust: !!customerCode || draft.service.paymentType === 'MONTH_PAY' ? 1 : 0
  })
}

/**
 *
 * @param current 当前筛单信息
 * @param next 新的筛单信息
 * @description 判断两次筛单输入与结果是否一致
 */
export function isSameExpressWarehouseScreeningProof(current: ExpressWarehouseScreening, next: ExpressWarehouseScreening) {
  return current.inputKey === next.inputKey && current.type === next.type && current.reason === next.reason && current.depotType === next.depotType
}

/**
 *
 * @param draft 寄件草稿
 * @param screening 筛单信息
 * @description 判断是否满足自动选择送货进仓
 */
export function shouldAutoSelectExpressWarehouse(draft: ExpressDraft, screening: Pick<ExpressWarehouseScreening, 'type'>) {
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

/**
 *
 * @param draft 寄件草稿
 * @param response 筛单响应，可为空
 * @description 由筛单结果生成筛单信息
 */
export function createExpressWarehouseScreening(draft: ExpressDraft, response?: ExpressFilterResponse | null): ExpressWarehouseScreening {
  const warehouse = normalizeExpressWarehouseDraft(draft.warehouse)
  const base = normalizeExpressWarehouseScreening({
    inputKey: createExpressWarehouseInputKey(draft),
    type: response?.type,
    reason: response?.reason,
    depotType: response?.depotType
  })
  const sameProof = isSameExpressWarehouseScreeningProof(warehouse.screening, base)
  const newlyAutoSelected = shouldAutoSelectExpressWarehouse(draft, base)
  const requiresAcknowledgement = base.type >= 2

  return {
    ...base,
    autoSelected: newlyAutoSelected,
    acknowledged: newlyAutoSelected || !requiresAcknowledgement || (sameProof && warehouse.screening.acknowledged)
  }
}

/**
 *
 * @param draft 寄件草稿
 * @description 判断筛单结果是否仍对应当前输入
 */
export function isExpressWarehouseScreeningCurrent(draft: ExpressDraft) {
  const screening = normalizeExpressWarehouseDraft(draft.warehouse).screening
  return !!screening.inputKey && screening.inputKey === createExpressWarehouseInputKey(draft)
}

/**
 *
 * @param draft 寄件草稿
 * @param latest 最新筛单结果
 * @description 提交前校验筛单结果是否有效
 */
export function validateExpressWarehouseScreeningForSubmit(draft: ExpressDraft, latest: ExpressWarehouseScreening) {
  const warehouse = normalizeExpressWarehouseDraft(draft.warehouse)
  const normalizedLatest = normalizeExpressWarehouseScreening(latest)

  if (normalizedLatest.inputKey !== createExpressWarehouseInputKey(draft)) {
    return ['送货进仓筛单结果已失效，请重新确认']
  }

  const sameProof = isSameExpressWarehouseScreeningProof(warehouse.screening, normalizedLatest)

  if (warehouse.enabled && !sameProof) {
    return ['送货进仓筛单结果已更新，请重新确认']
  }

  if (normalizedLatest.type >= 2 && (!sameProof || !warehouse.screening.acknowledged)) {
    return [normalizedLatest.reason || '请确认是否需要送货进仓']
  }

  return []
}

/**
 *
 * @param draft 寄件草稿
 * @param options 校验选项，可要求筛单
 * @description 校验送货进仓，返回错误提示
 */
export function validateExpressWarehouse(draft: ExpressDraft, options: { requireScreening?: boolean } = {}) {
  const warehouse = normalizeExpressWarehouseDraft(draft.warehouse)
  const screeningCurrent = isExpressWarehouseScreeningCurrent(draft)
  const messages: string[] = []

  if (warehouse.enabled && draft.service.deliveryMode === 'PICKSELF') {
    messages.push('自提订单不能选择送货进仓')
  }

  if (warehouse.enabled && draft.deliveryPreference.type) {
    messages.push('送货进仓和派送偏好不能同时选择')
  }

  if (warehouse.enabled && warehouse.deliverWarehouseWay === 'AGXSF' && !warehouse.warehouseProcess) {
    messages.push('请选择进仓工序')
  }

  if (options.requireScreening && warehouse.enabled && !screeningCurrent) {
    messages.push('送货进仓筛单结果已失效，请重新确认')
  }

  if (options.requireScreening && screeningCurrent && warehouse.screening.type >= 2 && !warehouse.screening.acknowledged) {
    messages.push(warehouse.screening.reason || '请确认是否需要送货进仓')
  }

  return messages
}

/**
 *
 * @param current 当前送货进仓草稿
 * @param next 新的送货进仓草稿
 * @description 判断影响报价的字段是否变化
 */
function hasQuoteFieldChanged(current: ExpressWarehouseDraft, next: ExpressWarehouseDraft) {
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

/**
 *
 * @param draft 寄件草稿
 * @param patch 待更新的送货进仓字段
 * @param options 更新选项，可标记已确认
 * @description 更新送货进仓草稿并按需清空报价
 */
export function updateExpressWarehouse(draft: ExpressDraft, patch: Partial<ExpressWarehouseDraft>, options: { acknowledge?: boolean } = {}): ExpressDraft {
  const current = normalizeExpressWarehouseDraft(draft.warehouse)
  const explicitlyDecided = options.acknowledge === true
  let next = normalizeExpressWarehouseDraft({ ...current, ...patch })

  if (!next.enabled) {
    next = {
      ...createExpressWarehouseDraft(),
      screening: {
        ...current.screening,
        acknowledged: explicitlyDecided && current.screening.type >= 2 && isExpressWarehouseScreeningCurrent(draft) ? true : current.screening.acknowledged
      }
    }
  } else if (patch.enabled === true && next.screening.type >= 2) {
    next.screening.acknowledged = true
  }

  const quoteChanged = hasQuoteFieldChanged(current, next)

  return {
    ...draft,
    warehouse: next,
    deliveryPreference: next.enabled ? createExpressDeliveryPreferenceDraft() : draft.deliveryPreference,
    selectedProduct: quoteChanged ? null : draft.selectedProduct,
    quoteStaleReason: quoteChanged ? '送货进仓信息变化，请重新获取价格' : draft.quoteStaleReason
  }
}

/**
 *
 * @param draft 寄件草稿
 * @description 关闭送货进仓
 */
export function clearExpressWarehouse(draft: ExpressDraft) {
  return updateExpressWarehouse(draft, { enabled: false })
}

/**
 *
 * @param draft 寄件草稿
 * @param value 筛单结果
 * @description 应用筛单结果并同步草稿
 */
export function applyExpressWarehouseScreening(draft: ExpressDraft, value: ExpressWarehouseScreening): ExpressDraft {
  const current = normalizeExpressWarehouseDraft(draft.warehouse)
  const screening = normalizeExpressWarehouseScreening(value)

  if (screening.inputKey !== createExpressWarehouseInputKey(draft)) {
    return draft
  }

  screening.autoSelected = current.screening.autoSelected || screening.autoSelected
  const newlyAutoSelected = screening.autoSelected && !current.screening.autoSelected
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
    deliveryPreference: next.enabled ? createExpressDeliveryPreferenceDraft() : draft.deliveryPreference,
    selectedProduct: quoteChanged ? null : draft.selectedProduct,
    quoteStaleReason: quoteChanged ? '送货进仓筛单结果已更新，请重新获取价格' : draft.quoteStaleReason
  }
}

/**
 *
 * @param value 送货进仓草稿
 * @param options 重置选项，可清空服务信息
 * @description 重置送货进仓输入，保留筛单标记
 */
export function resetExpressWarehouseInput(value: ExpressWarehouseDraft, options: { clearService?: boolean } = {}): ExpressWarehouseDraft {
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
