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
} from './types'

export const EXPRESS_INSURANCE_DEFAULT_LIMIT = 1_000_000
export const EXPRESS_INSURANCE_REQUIRED_LIMIT = 9_990_000
export const EXPRESS_INSURANCE_SXB_LIMIT = 500
export const EXPRESS_INSURANCE_FREE_AMOUNT = 2_000

interface ExpressInsuranceMutation {
  amount?: number
  type?: ExpressInsuranceType
}

function normalizeText(value?: string | null) {
  return (value ?? '').trim()
}

function normalizePositiveNumber(value: unknown) {
  const number = Number(value)

  return Number.isFinite(number) && number > 0 ? number : 0
}

export function normalizeExpressInsuranceAmount(value: unknown) {
  const number = Number(value)

  return Number.isFinite(number) && number > 0 ? Math.trunc(number) : 0
}

function getExpressInsuranceProductCode(draft: ExpressDraft) {
  return draft.selectedProduct?.omsProductCode || draft.service.transportMode
}

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

export function createExpressInsuranceCapability(
  draft: ExpressDraft,
  labels: ExpressGoodsLabel[] = []
): ExpressInsuranceCapability {
  return {
    inputKey: createExpressInsuranceCapabilityKey(draft),
    fragile: labels.some(
      label => label.goodsRemarkCode === 'fragile_articles'
    ),
    worryFree: labels.some(
      label => label.goodsRemarkCode === 'worry_free_protection'
    ),
    disabled: labels.some(
      label => label.goodsRemarkCode === 'limitation_insure'
    )
  }
}

function normalizeExpressInsuranceCapability(
  value?: Partial<ExpressInsuranceCapability> | null
): ExpressInsuranceCapability {
  return {
    inputKey: normalizeText(value?.inputKey),
    fragile: value?.fragile === true,
    worryFree: value?.worryFree === true,
    disabled: value?.disabled === true
  }
}

export function createExpressInsuranceDraft(): ExpressInsuranceDraft {
  return {
    type: 'NORMAL',
    limit: 0,
    capability: normalizeExpressInsuranceCapability()
  }
}

function normalizeExpressInsuranceType(
  value: unknown,
  productCode: ExpressProductCode,
  capability?: ExpressInsuranceCapability | null
): ExpressInsuranceType {
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

export function normalizeExpressInsuranceDraft(
  value?: Partial<ExpressInsuranceDraft> | null,
  productCode: ExpressProductCode = ''
): ExpressInsuranceDraft {
  const capability = normalizeExpressInsuranceCapability(value?.capability)

  return {
    type: normalizeExpressInsuranceType(value?.type, productCode, capability),
    limit: normalizePositiveNumber(value?.limit),
    capability
  }
}

export function getFreshExpressInsuranceCapability(
  draft: ExpressDraft,
  override?: ExpressInsuranceCapability | null
) {
  const capability = override ?? draft.insurance.capability

  return capability.inputKey === createExpressInsuranceCapabilityKey(draft)
    ? capability
    : null
}

export function isExpressInsuranceCapabilityCurrent(
  draft: ExpressDraft,
  capability: ExpressInsuranceCapability
) {
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

export function getExpressInsuranceLimit(
  draft: ExpressDraft,
  capability?: ExpressInsuranceCapability | null
) {
  const productCode = getExpressInsuranceProductCode(draft)
  const policy = getExpressInsuranceProductPolicy(productCode)
  const type = normalizeExpressInsuranceType(
    draft.insurance.type,
    productCode,
    getFreshExpressInsuranceCapability(draft, capability)
  )

  if (type === 'SXB' && policy.supportsSxb) {
    return EXPRESS_INSURANCE_SXB_LIMIT
  }

  if (policy.required) {
    return EXPRESS_INSURANCE_REQUIRED_LIMIT
  }

  return draft.insurance.limit || EXPRESS_INSURANCE_DEFAULT_LIMIT
}

export function getExpressInsuranceType(
  draft: ExpressDraft,
  capability?: ExpressInsuranceCapability | null
) {
  const productCode = getExpressInsuranceProductCode(draft)

  return normalizeExpressInsuranceType(
    draft.insurance.type,
    productCode,
    getFreshExpressInsuranceCapability(draft, capability)
  )
}

export function getExpressInsuranceEffectiveAmount(
  draft: ExpressDraft,
  capability?: ExpressInsuranceCapability | null
) {
  const freshCapability = getFreshExpressInsuranceCapability(draft, capability)

  if (freshCapability?.disabled) {
    return 0
  }

  const amount = normalizeExpressInsuranceAmount(draft.goods.insuredAmount)

  if (amount > 0) {
    return amount
  }

  const policy = getExpressInsuranceProductPolicy(
    getExpressInsuranceProductCode(draft)
  )

  return policy.free ? EXPRESS_INSURANCE_FREE_AMOUNT : 0
}

export function validateExpressInsurance(
  draft: ExpressDraft,
  capability?: ExpressInsuranceCapability | null
) {
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
    messages.push(
      type === 'SXB'
        ? `省心保最高保价${limit}元`
        : `保价金额最高为${limit}元`
    )
  }

  return messages
}

export function getExpressInsurancePriceSubtype(
  draft: ExpressDraft,
  capability?: ExpressInsuranceCapability | null
): ExpressInsurancePriceSubtype {
  const freshCapability = getFreshExpressInsuranceCapability(draft, capability)
  const policy = getExpressInsuranceProductPolicy(
    getExpressInsuranceProductCode(draft)
  )

  if (freshCapability?.fragile) {
    return 'YSB'
  }

  if (draft.insurance.type === 'SXB' && policy.supportsSxb) {
    return 'SXB'
  }

  return 'QEB'
}

export function createExpressInsuranceQuoteFields(
  draft: ExpressDraft,
  capability?: ExpressInsuranceCapability | null
): Pick<
  ExpressFreightRequest,
  'insuredAmount' | 'sxb' | 'fullCoverage' | 'isFragileArticles'
> {
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
  const policy = getExpressInsuranceProductPolicy(
    getExpressInsuranceProductCode(draft)
  )
  let insuranceType = 3

  if (freshCapability?.fragile) {
    insuranceType = 4
  } else if (draft.insurance.type === 'SXB' && policy.supportsSxb) {
    insuranceType = 1
  } else if (
    draft.insurance.type === 'QEB' &&
    policy.supportsFullCoverage
  ) {
    insuranceType = 0
  }

  const orderExtendFields: ExpressOrderExtendField[] = [
    { key: 'bjlx', value: insuranceType }
  ]

  if (
    policy.free &&
    normalizeExpressInsuranceAmount(draft.goods.insuredAmount) === 0
  ) {
    orderExtendFields.unshift({ key: 'insuranceSource', value: 'DEFAULT' })
  }

  return { insuredAmount, orderExtendFields }
}

export function applyExpressInsuranceCapability(
  draft: ExpressDraft,
  capability: ExpressInsuranceCapability,
  limit?: number | null
): ExpressDraft {
  const productCode = getExpressInsuranceProductCode(draft)
  const normalizedCapability = normalizeExpressInsuranceCapability(capability)
  const type = normalizeExpressInsuranceType(
    draft.insurance.type,
    productCode,
    normalizedCapability
  )
  const nextAmount = normalizedCapability.disabled
    ? 0
    : draft.goods.insuredAmount
  const nextLimit =
    limit === undefined
      ? draft.insurance.limit
      : normalizePositiveNumber(limit)

  return {
    ...draft,
    goods:
      nextAmount === draft.goods.insuredAmount
        ? draft.goods
        : { ...draft.goods, insuredAmount: nextAmount },
    insurance: {
      type,
      limit: nextLimit,
      capability: normalizedCapability
    }
  }
}

export function resetExpressInsuranceCapability(
  draft: ExpressDraft,
  options: { clearLimit?: boolean } = {}
): ExpressDraft {
  return {
    ...draft,
    insurance: {
      ...draft.insurance,
      limit: options.clearLimit ? 0 : draft.insurance.limit,
      capability: normalizeExpressInsuranceCapability()
    }
  }
}

export function updateExpressInsurance(
  draft: ExpressDraft,
  patch: ExpressInsuranceMutation,
  reason = '保价信息变化，请重新获取价格'
): ExpressDraft {
  const capability = getFreshExpressInsuranceCapability(draft)
  const productCode = getExpressInsuranceProductCode(draft)
  const type = normalizeExpressInsuranceType(
    patch.type ?? draft.insurance.type,
    productCode,
    capability
  )
  const amount =
    patch.amount === undefined
      ? draft.goods.insuredAmount
      : normalizeExpressInsuranceAmount(patch.amount)

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
