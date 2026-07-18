import { getExpressInsuranceProductPolicy } from './insurance.product'
import {
  EXPRESS_INSURANCE_FREE_AMOUNT,
  EXPRESS_INSURANCE_SXB_LIMIT,
  getExpressInsuranceEffectiveAmount,
  getExpressInsuranceLimit,
  getExpressInsuranceType,
  getFreshExpressInsuranceCapability,
  normalizeExpressInsuranceAmount
} from './insurance.rules'

import type { ExpressDraft, ExpressInsuranceType } from './types'

export interface ExpressInsuranceOptionView {
  type: ExpressInsuranceType
  label: string
  summary: string
  disabled: boolean
  recommended: boolean
}

export interface ExpressInsuranceView {
  amount: number
  effectiveAmount: number
  limit: number
  type: ExpressInsuranceType
  required: boolean
  free: boolean
  disabled: boolean
  fragile: boolean
  worryFree: boolean
  summary: string
  options: ExpressInsuranceOptionView[]
}

export function createExpressInsuranceView(
  draft: ExpressDraft
): ExpressInsuranceView {
  const capability = getFreshExpressInsuranceCapability(draft)
  const productCode =
    draft.selectedProduct?.omsProductCode || draft.service.transportMode
  const policy = getExpressInsuranceProductPolicy(productCode)
  const disabled = capability?.disabled === true
  const fragile = capability?.fragile === true
  const worryFree = capability?.worryFree === true
  const limit = getExpressInsuranceLimit(draft, capability)
  const options: ExpressInsuranceOptionView[] = [
    {
      type: 'NORMAL',
      label: fragile ? '易碎保' : '基础保',
      summary: fragile ? '后端货物标签自动匹配' : '常规货物保障',
      disabled,
      recommended: !worryFree
    },
    {
      type: 'QEB',
      label: '全额保',
      summary: '按货物实际价值足额申报',
      disabled: disabled || fragile || !policy.supportsFullCoverage,
      recommended: false
    },
    {
      type: 'SXB',
      label: '省心保',
      summary: `固定额度，最高${EXPRESS_INSURANCE_SXB_LIMIT}元`,
      disabled: disabled || fragile || !policy.supportsSxb,
      recommended: worryFree && policy.supportsSxb
    }
  ]
  let summary = capability?.inputKey
    ? '保价类型和额度已按当前货物、地址及产品归一。'
    : '获取产品价格后同步货物保价标签和客户额度。'

  if (disabled) {
    summary = '当前货物被后端标记为暂不支持保价。'
  } else if (fragile) {
    summary = '当前货物被标记为易碎品，下单将按易碎保提交。'
  } else if (policy.free && draft.goods.insuredAmount <= 0) {
    summary = `当前产品赠送${EXPRESS_INSURANCE_FREE_AMOUNT}元基础保障。`
  } else if (policy.required) {
    summary = '当前产品必须保价，未填写金额时不能提交。'
  } else if (worryFree && policy.supportsSxb) {
    summary = '当前货物支持省心保，可按固定额度选择。'
  }

  return {
    amount: normalizeExpressInsuranceAmount(draft.goods.insuredAmount),
    effectiveAmount: getExpressInsuranceEffectiveAmount(draft, capability),
    limit,
    type: getExpressInsuranceType(draft, capability),
    required: policy.required,
    free: policy.free,
    disabled,
    fragile,
    worryFree,
    summary,
    options
  }
}
