import type {
  OrderDetail,
  OrderEditInsuranceDraft,
  OrderEditInsuranceLockedType,
  OrderModifyRequest
} from './types'

export const ORDER_EDIT_INSURANCE_MAX_AMOUNT = 1000000
export const ORDER_EDIT_INSURANCE_REQUIRED_MAX_AMOUNT = 9990000
export const ORDER_EDIT_INSURANCE_FREE_AMOUNT = 2000

const REQUIRED_PRODUCT_CODES = new Set([
  'DJBK',
  'DJTH',
  'JZZH',
  'NJZZH',
  'YTY',
  'YTYDS',
  'NZBRH'
])

const FREE_COVERAGE_PRODUCT_CODES = new Set(['NFLF', 'NLRF'])

/**
 *
 * @param value 原始值
 * @description 转为去除首尾空格的文本
 */
function normalizeText(value: unknown) {
  if (value === null || value === undefined) {
    return ''
  }

  return String(value).trim()
}

/**
 *
 * @param value 产品 code
 * @description 归一产品 code 为大写
 */
function normalizeProductCode(value: unknown) {
  return normalizeText(value).toUpperCase()
}

/**
 *
 * @param value 保价金额
 * @description 归一保价金额为两位小数
 */
function normalizeAmount(value: unknown) {
  const amount = Number(value)

  if (!Number.isFinite(amount) || amount < 0) {
    return 0
  }

  return Math.round(amount * 100) / 100
}

/**
 *
 * @param detail 订单详情
 * @param key 扩展字段 key
 * @description 读取订单扩展字段的文本值
 */
function getOrderExtendFieldValue(detail: OrderDetail, key: string) {
  const fields = Array.isArray(detail.orderExtendFields)
    ? detail.orderExtendFields
    : []
  const field = fields.find(item => normalizeText(item?.key) === key)

  return field ? normalizeText(field.value) : ''
}

/**
 *
 * @param detail 订单详情
 * @description 解析订单的保价锁定类型
 */
function getLockedType(detail: OrderDetail): OrderEditInsuranceLockedType {
  const value = getOrderExtendFieldValue(detail, 'bjlx')

  if (!value) {
    return ''
  }

  if (value === '0') {
    return 'QEB'
  }

  return value === '1' ? 'SXB' : 'SPECIAL'
}

/**
 *
 * @param detail 订单详情
 * @description 从订单详情创建保价草稿
 */
export function createOrderEditInsuranceDraft(
  detail: OrderDetail
): OrderEditInsuranceDraft {
  const productCode = normalizeProductCode(detail.transportMode)
  const required = REQUIRED_PRODUCT_CODES.has(productCode)
  const freeCoverage = FREE_COVERAGE_PRODUCT_CODES.has(productCode)
  const lockedType = getLockedType(detail)
  const rawAmount = normalizeAmount(detail.insuredAmount)
  const source = getOrderExtendFieldValue(detail, 'insuranceSource')

  return {
    amount:
      freeCoverage && rawAmount <= 0
        ? ORDER_EDIT_INSURANCE_FREE_AMOUNT
        : rawAmount,
    defaultPending: freeCoverage && rawAmount <= 0,
    editable: !lockedType,
    freeCoverage,
    lockedType,
    maxAmount: required
      ? ORDER_EDIT_INSURANCE_REQUIRED_MAX_AMOUNT
      : ORDER_EDIT_INSURANCE_MAX_AMOUNT,
    productCode,
    required,
    source: source || (freeCoverage ? 'DEFAULT' : '')
  }
}

/**
 *
 * @param value 金额输入文本
 * @description 清洗保价金额输入，限制位数
 */
export function normalizeOrderEditInsuranceAmountInput(value: string) {
  const sanitized = value.replace(/[^\d.]/g, '')
  const hasDecimalPoint = sanitized.includes('.')
  const [integerPart = '', ...decimalParts] = sanitized.split('.')
  const normalizedInteger = integerPart.replace(/^0+(?=\d)/, '')

  if (!hasDecimalPoint) {
    return normalizedInteger.slice(0, 7)
  }

  const integer = (normalizedInteger || '0').slice(0, 7)
  const decimal = decimalParts.join('').slice(0, 2)

  return integer + '.' + decimal
}

/**
 *
 * @param insurance 保价草稿
 * @param value 新的保价金额
 * @description 更新保价金额并清除来源标记
 */
export function updateOrderEditInsuranceAmount(
  insurance: OrderEditInsuranceDraft,
  value: unknown
) {
  if (!insurance.editable) {
    return insurance
  }

  return {
    ...insurance,
    amount: normalizeAmount(value),
    source: ''
  }
}

/**
 *
 * @param insurance 保价草稿
 * @description 生成保价金额校验提示
 */
export function validateOrderEditInsurance(insurance: OrderEditInsuranceDraft) {
  if (!insurance.editable) {
    return []
  }

  const amount = Number(insurance.amount)

  if (!Number.isFinite(amount) || amount < 0) {
    return ['请填写正确的保价金额']
  }

  if (amount > insurance.maxAmount) {
    return ['保价金额最高为 ' + insurance.maxAmount + ' 元']
  }

  if (amount <= 0 && insurance.required) {
    return ['当前产品必须填写保价金额']
  }

  if (amount <= 0 && insurance.freeCoverage) {
    return ['当前产品包含基础保障，保价金额不能清空']
  }

  return []
}

/**
 *
 * @param insurance 当前草稿
 * @param origin 原始草稿
 * @description 判断保价金额是否发生变化
 */
export function isOrderEditInsuranceChanged(
  insurance: OrderEditInsuranceDraft,
  origin: OrderEditInsuranceDraft
) {
  return (
    insurance.editable &&
    origin.editable &&
    (origin.defaultPending ||
      normalizeAmount(insurance.amount) !== normalizeAmount(origin.amount))
  )
}

export type OrderEditInsuranceRequestFields = Required<
  Pick<OrderModifyRequest, 'insuredAmount' | 'orderExtendFields'>
>

/**
 *
 * @param insurance 保价草稿
 * @description 生成订单修改接口的保价字段
 */
export function createOrderEditInsuranceRequestFields(
  insurance: OrderEditInsuranceDraft
): OrderEditInsuranceRequestFields {
  const useDefaultCoverage =
    insurance.defaultPending &&
    insurance.freeCoverage &&
    normalizeAmount(insurance.amount) === ORDER_EDIT_INSURANCE_FREE_AMOUNT

  return {
    insuredAmount: normalizeAmount(insurance.amount),
    orderExtendFields: [
      {
        key: 'insuranceSource',
        value: useDefaultCoverage ? 'DEFAULT' : ''
      }
    ]
  }
}

/**
 *
 * @param insurance 保价草稿
 * @description 生成保价变更项名称
 */
export function getOrderEditInsuranceChangedLabel(
  insurance: OrderEditInsuranceDraft
) {
  return insurance.defaultPending &&
    insurance.freeCoverage &&
    normalizeAmount(insurance.amount) === ORDER_EDIT_INSURANCE_FREE_AMOUNT
    ? '免费基础保障'
    : '保价金额'
}

/**
 *
 * @param insurance 保价草稿
 * @description 生成保价说明文案
 */
export function getOrderEditInsuranceSummary(
  insurance: OrderEditInsuranceDraft
) {
  if (insurance.lockedType === 'QEB') {
    return '全额保订单暂不支持修改保价'
  }

  if (insurance.lockedType === 'SXB') {
    return '省心保订单暂不支持修改保价'
  }

  if (insurance.lockedType === 'SPECIAL') {
    return '当前特殊保价类型暂不支持修改'
  }

  if (insurance.freeCoverage) {
    return '当前产品赠送 2000 元基础保障'
  }

  if (insurance.required) {
    return '当前产品必须填写保价金额'
  }

  return '声明货物价值，最终保费和赔付以后端审核为准'
}
