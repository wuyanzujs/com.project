import { getExpressInsuranceProductPolicy } from './insurance.product'
import {
  EXPRESS_INSURANCE_DEFAULT_LIMIT,
  EXPRESS_INSURANCE_FREE_AMOUNT,
  EXPRESS_INSURANCE_REQUIRED_LIMIT,
  EXPRESS_INSURANCE_SXB_LIMIT,
  getExpressInsuranceEffectiveAmount,
  getExpressInsuranceLimit,
  getExpressInsuranceType,
  getFreshExpressInsuranceCapability,
  normalizeExpressInsuranceAmount,
  normalizePositiveNumber
} from './insurance.rules'

import type { ExpressDraft, ExpressInsuranceType } from '../core/types'

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

export interface ExpressInsurancePanelTierView {
  /** 档位对应的草稿保价类型；易碎保按基础保类型提交，由报价子类型走 YSB。 */
  type: ExpressInsuranceType
  title: string
  slogan: string
  /** 该档位的保价金额上限。 */
  limit: number
}

export interface ExpressInsurancePanelView {
  disabled: boolean
  amount: number
  effectiveAmount: number
  selectedType: ExpressInsuranceType
  free: boolean
  /** 高档横幅（全额保/省心保/易碎保），产品与货物均不支持时为 null。 */
  banner: ExpressInsurancePanelTierView | null
  basicAvailable: boolean
  basicLimit: number
}

/**
 *
 * @param draft 寄件草稿
 * @description 生成保价页面的展示模型
 */
export function createExpressInsuranceView(draft: ExpressDraft): ExpressInsuranceView {
  const capability = getFreshExpressInsuranceCapability(draft)
  const productCode = draft.selectedProduct?.omsProductCode || draft.service.transportMode
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
  let summary = capability?.inputKey ? '保价类型和额度已按当前货物、地址及产品归一。' : '获取产品价格后同步货物保价标签和客户额度。'

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

/**
 *
 * @param draft 寄件草稿
 * @description 生成寄件页保价面板的两档展示模型：高档横幅（全额保/省心保/易碎保）与基础保行。
 */
export function createExpressInsurancePanelView(draft: ExpressDraft): ExpressInsurancePanelView {
  const capability = getFreshExpressInsuranceCapability(draft)
  const productCode = draft.selectedProduct?.omsProductCode || draft.service.transportMode
  const policy = getExpressInsuranceProductPolicy(productCode)
  const disabled = capability?.disabled === true
  const fragile = capability?.fragile === true
  const worryFree = capability?.worryFree === true
  const fullSlogan = '专人受理 足额理赔 快速到账'
  const basicLimit = policy.required ? EXPRESS_INSURANCE_REQUIRED_LIMIT : normalizePositiveNumber(draft.insurance.limit) || EXPRESS_INSURANCE_DEFAULT_LIMIT

  let banner: ExpressInsurancePanelTierView | null = null

  if (!disabled) {
    if (fragile) {
      banner = { type: 'NORMAL', title: '易碎保', slogan: '保价更安心', limit: basicLimit }
    } else if (worryFree && policy.supportsSxb) {
      banner = { type: 'SXB', title: '省心保', slogan: fullSlogan, limit: EXPRESS_INSURANCE_SXB_LIMIT }
    } else if (policy.supportsFullCoverage) {
      banner = { type: 'QEB', title: '全额保', slogan: fullSlogan, limit: basicLimit }
    } else if (policy.supportsSxb) {
      banner = { type: 'SXB', title: '省心保', slogan: fullSlogan, limit: EXPRESS_INSURANCE_SXB_LIMIT }
    }
  }

  return {
    disabled,
    amount: normalizeExpressInsuranceAmount(draft.goods.insuredAmount),
    effectiveAmount: getExpressInsuranceEffectiveAmount(draft, capability),
    selectedType: getExpressInsuranceType(draft, capability),
    free: policy.free,
    banner,
    basicAvailable: !fragile,
    basicLimit
  }
}
