import { getExpressInsuranceProductPolicy } from './insurance.product'

import type {
  ExpressDraft,
  ExpressFreightRequest,
  ExpressGoodsLabel,
  ExpressInsuranceCapability,
  ExpressInsuranceDraft,
  ExpressInsurancePriceSubtype,
  ExpressInsuranceType,
  ExpressOrderExtendField,
  ExpressProductCode
} from '../core/types'

export const EXPRESS_INSURANCE_DEFAULT_LIMIT = 1_000_000
export const EXPRESS_INSURANCE_REQUIRED_LIMIT = 9_990_000
export const EXPRESS_INSURANCE_SXB_LIMIT = 500
export const EXPRESS_INSURANCE_FREE_AMOUNT = 2_000

interface ExpressInsuranceMutation {
  amount?: number
  type?: ExpressInsuranceType
}

/**
 *
 * @param value 待处理文本，可为空
 * @description 归一文本，去除首尾空格
 */
function normalizeText(value?: string | null) {
  return (value ?? '').trim()
}

/**
 *
 * @param value 待校验数值
 * @description 转成正数，非法值返回 0
 */
function normalizePositiveNumber(value: unknown) {
  const number = Number(value)

  return Number.isFinite(number) && number > 0 ? number : 0
}

/**
 *
 * @param value 保价金额
 * @description 归一保价金额为整数，非法值返回 0
 */
export function normalizeExpressInsuranceAmount(value: unknown) {
  const number = Number(value)

  return Number.isFinite(number) && number > 0 ? Math.trunc(number) : 0
}

/**
 *
 * @param draft 寄件草稿
 * @description 取草稿的产品 code，优先已选产品
 */
function getExpressInsuranceProductCode(draft: ExpressDraft) {
  return draft.selectedProduct?.omsProductCode || draft.service.transportMode
}

/**
 *
 * @param draft 寄件草稿
 * @description 按货物与收寄地址生成能力标识 key
 */
export function createExpressInsuranceCapabilityKey(draft: ExpressDraft) {
  return [
    normalizeText(draft.goods.name),
    normalizeText(draft.sender?.province),
    normalizeText(draft.sender?.city),
    normalizeText(draft.sender?.county),
    normalizeText(draft.consignee?.province),
    normalizeText(draft.consignee?.city),
    normalizeText(draft.consignee?.county)
  ].join('|')
}

/**
 *
 * @param draft 寄件草稿
 * @param labels 货物标签列表
 * @description 依据货物标签生成保价能力
 */
export function createExpressInsuranceCapability(draft: ExpressDraft, labels: ExpressGoodsLabel[] = []): ExpressInsuranceCapability {
  return {
    inputKey: createExpressInsuranceCapabilityKey(draft),
    fragile: labels.some(label => label.goodsRemarkCode === 'fragile_articles'),
    worryFree: labels.some(label => label.goodsRemarkCode === 'worry_free_protection'),
    disabled: labels.some(label => label.goodsRemarkCode === 'limitation_insure')
  }
}

/**
 *
 * @param value 保价能力，可为空
 * @description 归一保价能力的各字段
 */
function normalizeExpressInsuranceCapability(value?: Partial<ExpressInsuranceCapability> | null): ExpressInsuranceCapability {
  return {
    inputKey: normalizeText(value?.inputKey),
    fragile: value?.fragile === true,
    worryFree: value?.worryFree === true,
    disabled: value?.disabled === true
  }
}

/**
 *
 * @description 创建默认保价草稿
 */
export function createExpressInsuranceDraft(): ExpressInsuranceDraft {
  return {
    type: 'NORMAL',
    limit: 0,
    capability: normalizeExpressInsuranceCapability()
  }
}

/**
 *
 * @param value 保价类型，可为空
 * @param productCode 产品 code
 * @param capability 保价能力，可为空
 * @description 归一保价类型，不支持时回落基础保
 */
function normalizeExpressInsuranceType(value: unknown, productCode: ExpressProductCode, capability?: ExpressInsuranceCapability | null): ExpressInsuranceType {
  const type = value === 'QEB' || value === 'SXB' ? value : 'NORMAL'
  const policy = getExpressInsuranceProductPolicy(productCode)

  if (capability?.disabled || capability?.fragile) {
    return 'NORMAL'
  }

  if (type === 'QEB' && !policy.supportsFullCoverage) {
    return 'NORMAL'
  }

  if (type === 'SXB' && !policy.supportsSxb) {
    return 'NORMAL'
  }

  return type
}

/**
 *
 * @param value 保价草稿，可为空
 * @param productCode 产品 code
 * @description 归一保价草稿的类型、额度与能力
 */
export function normalizeExpressInsuranceDraft(value?: Partial<ExpressInsuranceDraft> | null, productCode: ExpressProductCode = ''): ExpressInsuranceDraft {
  const capability = normalizeExpressInsuranceCapability(value?.capability)

  return {
    type: normalizeExpressInsuranceType(value?.type, productCode, capability),
    limit: normalizePositiveNumber(value?.limit),
    capability
  }
}

/**
 *
 * @param draft 寄件草稿
 * @param override 覆盖的保价能力
 * @description 取与当前草稿匹配的保价能力，过期返回 null
 */
export function getFreshExpressInsuranceCapability(draft: ExpressDraft, override?: ExpressInsuranceCapability | null) {
  const capability = override ?? draft.insurance.capability

  return capability.inputKey === createExpressInsuranceCapabilityKey(draft) ? capability : null
}

/**
 *
 * @param draft 寄件草稿
 * @param capability 待校验的保价能力
 * @description 判断保价能力是否与当前草稿一致
 */
export function isExpressInsuranceCapabilityCurrent(draft: ExpressDraft, capability: ExpressInsuranceCapability) {
  const current = getFreshExpressInsuranceCapability(draft)
  const next = normalizeExpressInsuranceCapability(capability)

  return Boolean(
    current &&
    current.inputKey === next.inputKey &&
    current.fragile === next.fragile &&
    current.worryFree === next.worryFree &&
    current.disabled === next.disabled
  )
}

/**
 *
 * @param draft 寄件草稿
 * @param capability 保价能力，可为空
 * @description 取保价额度，含省心保与必保上限
 */
export function getExpressInsuranceLimit(draft: ExpressDraft, capability?: ExpressInsuranceCapability | null) {
  const productCode = getExpressInsuranceProductCode(draft)
  const policy = getExpressInsuranceProductPolicy(productCode)
  const type = normalizeExpressInsuranceType(draft.insurance.type, productCode, getFreshExpressInsuranceCapability(draft, capability))

  if (type === 'SXB' && policy.supportsSxb) {
    return EXPRESS_INSURANCE_SXB_LIMIT
  }

  if (policy.required) {
    return EXPRESS_INSURANCE_REQUIRED_LIMIT
  }

  return draft.insurance.limit || EXPRESS_INSURANCE_DEFAULT_LIMIT
}

/**
 *
 * @param draft 寄件草稿
 * @param capability 保价能力，可为空
 * @description 取当前生效的保价类型
 */
export function getExpressInsuranceType(draft: ExpressDraft, capability?: ExpressInsuranceCapability | null) {
  const productCode = getExpressInsuranceProductCode(draft)

  return normalizeExpressInsuranceType(draft.insurance.type, productCode, getFreshExpressInsuranceCapability(draft, capability))
}

/**
 *
 * @param draft 寄件草稿
 * @param capability 保价能力，可为空
 * @description 取生效保价金额，含赠送基础保障
 */
export function getExpressInsuranceEffectiveAmount(draft: ExpressDraft, capability?: ExpressInsuranceCapability | null) {
  const freshCapability = getFreshExpressInsuranceCapability(draft, capability)

  if (freshCapability?.disabled) {
    return 0
  }

  const amount = normalizeExpressInsuranceAmount(draft.goods.insuredAmount)

  if (amount > 0) {
    return amount
  }

  const policy = getExpressInsuranceProductPolicy(getExpressInsuranceProductCode(draft))

  return policy.free ? EXPRESS_INSURANCE_FREE_AMOUNT : 0
}

/**
 *
 * @param draft 寄件草稿
 * @param capability 保价能力，可为空
 * @description 校验保价金额与类型，返回提示语
 */
export function validateExpressInsurance(draft: ExpressDraft, capability?: ExpressInsuranceCapability | null) {
  const messages: string[] = []
  const productCode = getExpressInsuranceProductCode(draft)
  const policy = getExpressInsuranceProductPolicy(productCode)
  const freshCapability = getFreshExpressInsuranceCapability(draft, capability)
  const rawAmount = Number(draft.goods.insuredAmount)
  const amount = normalizeExpressInsuranceAmount(rawAmount)
  const type = draft.insurance.type

  if (!Number.isFinite(rawAmount) || rawAmount < 0) {
    messages.push('保价金额不能小于0')
  } else if (rawAmount > 0 && !Number.isInteger(rawAmount)) {
    messages.push('保价金额需填写整数')
  }

  if (freshCapability?.disabled && amount > 0) {
    messages.push('当前货物暂不支持保价，请清空保价金额')
  }

  if (type === 'QEB' && !policy.supportsFullCoverage) {
    messages.push('当前产品暂不支持全额保')
  }

  if (type === 'SXB' && !policy.supportsSxb) {
    messages.push('当前产品暂不支持省心保')
  }

  if ((type === 'QEB' || type === 'SXB' || policy.required) && amount <= 0) {
    messages.push(policy.required ? '当前产品必须填写保价金额' : '请填写保价金额')
  }

  const limit = getExpressInsuranceLimit(draft, capability)

  if (amount > limit) {
    messages.push(type === 'SXB' ? `省心保最高保价${limit}元` : `保价金额最高为${limit}元`)
  }

  return messages
}

/**
 *
 * @param draft 寄件草稿
 * @param capability 保价能力，可为空
 * @description 取报价用的保价子类型
 */
export function getExpressInsurancePriceSubtype(draft: ExpressDraft, capability?: ExpressInsuranceCapability | null): ExpressInsurancePriceSubtype {
  const freshCapability = getFreshExpressInsuranceCapability(draft, capability)
  const policy = getExpressInsuranceProductPolicy(getExpressInsuranceProductCode(draft))

  if (freshCapability?.fragile) {
    return 'YSB'
  }

  if (draft.insurance.type === 'SXB' && policy.supportsSxb) {
    return 'SXB'
  }

  return 'QEB'
}

/**
 *
 * @param draft 寄件草稿
 * @param capability 保价能力，可为空
 * @description 组装报价接口的保价字段
 */
export function createExpressInsuranceQuoteFields(
  draft: ExpressDraft,
  capability?: ExpressInsuranceCapability | null
): Pick<ExpressFreightRequest, 'insuredAmount' | 'sxb' | 'fullCoverage' | 'isFragileArticles'> {
  const insuredAmount = getExpressInsuranceEffectiveAmount(draft, capability)
  const subType = getExpressInsurancePriceSubtype(draft, capability)
  const fields: {
    insuredAmount: number
    sxb?: 'Y'
    fullCoverage?: 'Y'
    isFragileArticles?: 'Y'
  } = { insuredAmount }

  if (subType === 'YSB') {
    fields.isFragileArticles = 'Y'
    return fields
  }

  if (insuredAmount <= 0) {
    return fields
  }

  if (subType === 'SXB') {
    fields.sxb = 'Y'
  } else if (draft.insurance.type === 'QEB') {
    fields.fullCoverage = 'Y'
  }

  return fields
}

/**
 *
 * @param draft 寄件草稿
 * @param capability 保价能力，可为空
 * @description 组装下单接口的保价金额与扩展字段
 */
export function createExpressInsuranceOrderFields(
  draft: ExpressDraft,
  capability?: ExpressInsuranceCapability | null
): {
  insuredAmount: number
  orderExtendFields: ExpressOrderExtendField[]
} {
  const insuredAmount = getExpressInsuranceEffectiveAmount(draft, capability)

  if (insuredAmount <= 0) {
    return { insuredAmount: 0, orderExtendFields: [] }
  }

  const freshCapability = getFreshExpressInsuranceCapability(draft, capability)
  const policy = getExpressInsuranceProductPolicy(getExpressInsuranceProductCode(draft))
  let insuranceType = 3

  if (freshCapability?.fragile) {
    insuranceType = 4
  } else if (draft.insurance.type === 'SXB' && policy.supportsSxb) {
    insuranceType = 1
  } else if (draft.insurance.type === 'QEB' && policy.supportsFullCoverage) {
    insuranceType = 0
  }

  const orderExtendFields: ExpressOrderExtendField[] = [{ key: 'bjlx', value: insuranceType }]

  if (policy.free && normalizeExpressInsuranceAmount(draft.goods.insuredAmount) === 0) {
    orderExtendFields.unshift({ key: 'insuranceSource', value: 'DEFAULT' })
  }

  return { insuredAmount, orderExtendFields }
}

/**
 *
 * @param draft 寄件草稿
 * @param capability 保价能力
 * @param limit 保价额度，可为空
 * @description 应用保价能力并归一失效的保价金额
 */
export function applyExpressInsuranceCapability(draft: ExpressDraft, capability: ExpressInsuranceCapability, limit?: number | null): ExpressDraft {
  const productCode = getExpressInsuranceProductCode(draft)
  const normalizedCapability = normalizeExpressInsuranceCapability(capability)
  const type = normalizeExpressInsuranceType(draft.insurance.type, productCode, normalizedCapability)
  const nextAmount = normalizedCapability.disabled ? 0 : draft.goods.insuredAmount
  const nextLimit = limit === undefined ? draft.insurance.limit : normalizePositiveNumber(limit)

  return {
    ...draft,
    goods: nextAmount === draft.goods.insuredAmount ? draft.goods : { ...draft.goods, insuredAmount: nextAmount },
    insurance: {
      type,
      limit: nextLimit,
      capability: normalizedCapability
    }
  }
}

/**
 *
 * @param draft 寄件草稿
 * @param options 可选配置，clearLimit 清空额度
 * @description 重置保价能力，可选清空额度
 */
export function resetExpressInsuranceCapability(draft: ExpressDraft, options: { clearLimit?: boolean } = {}): ExpressDraft {
  return {
    ...draft,
    insurance: {
      ...draft.insurance,
      limit: options.clearLimit ? 0 : draft.insurance.limit,
      capability: normalizeExpressInsuranceCapability()
    }
  }
}

/**
 *
 * @param draft 寄件草稿
 * @param patch 待更新的保价字段
 * @param reason 报价过期原因
 * @description 更新保价，有变化时清空选品并标记报价过期
 */
export function updateExpressInsurance(draft: ExpressDraft, patch: ExpressInsuranceMutation, reason = '保价信息变化，请重新获取价格'): ExpressDraft {
  const capability = getFreshExpressInsuranceCapability(draft)
  const productCode = getExpressInsuranceProductCode(draft)
  const type = normalizeExpressInsuranceType(patch.type ?? draft.insurance.type, productCode, capability)
  const amount = patch.amount === undefined ? draft.goods.insuredAmount : normalizeExpressInsuranceAmount(patch.amount)

  if (type === draft.insurance.type && amount === draft.goods.insuredAmount) {
    return draft
  }

  return {
    ...draft,
    goods: { ...draft.goods, insuredAmount: amount },
    insurance: { ...draft.insurance, type },
    selectedProduct: null,
    quoteStaleReason: reason
  }
}
