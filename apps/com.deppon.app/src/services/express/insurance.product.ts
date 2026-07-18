import type { ExpressProductCode } from './types'

const REQUIRED_PRODUCTS = new Set<ExpressProductCode>([
  'DJBK',
  'DJTH',
  'JZZH',
  'NJZZH',
  'YTY',
  'YTYDS',
  'NZBRH'
])

const FREE_PRODUCTS = new Set<ExpressProductCode>(['NFLF', 'NLRF'])
const LOGISTICS_PRODUCTS = new Set<ExpressProductCode>([
  'JZKH',
  'JZQY_LONG'
])
const SXB_BLOCKED_PRODUCTS = new Set<ExpressProductCode>([
  ...REQUIRED_PRODUCTS,
  ...FREE_PRODUCTS,
  ...LOGISTICS_PRODUCTS
])

export function getExpressInsuranceProductPolicy(
  productCode: ExpressProductCode
) {
  const required = REQUIRED_PRODUCTS.has(productCode)
  const free = FREE_PRODUCTS.has(productCode)

  return {
    required,
    free,
    cancel: !required && !free,
    supportsFullCoverage: !LOGISTICS_PRODUCTS.has(productCode),
    supportsSxb:
      Boolean(productCode) && !SXB_BLOCKED_PRODUCTS.has(productCode)
  }
}
