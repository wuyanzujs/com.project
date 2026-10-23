import { APP_RUNTIME_CONFIG } from '@/shared/config/runtime'

import type { ExpressCouponFee, ExpressCouponFeeType, ExpressCouponQueryRequest } from '../../coupon'
import type { ExpressDraft, ExpressProductQuote } from '../core/types'

const COUPON_DETAIL_CODES: Record<ExpressCouponFeeType, string> = {
  FRT: 'FRT',
  BF: 'BF',
  AD: 'AD',
  NMBZ: 'BZ'
}

const COUPON_MARKET_CODES = new Set(['YHJ', 'YHQ'])
const ROUTE_DISCOUNT_MARKET_CODE = 'XLYHF'

export const EXPRESS_COUPON_AUTO_QUERY_DELAY_MS = 300

/**
 *
 * @param value 原始值
 * @description 转字符串并去除首尾空白
 */
function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

/**
 *
 * @param value 金额原始值
 * @description 转金额，非法或负数视为 0
 */
function toAmount(value: unknown) {
  const amount = Number(value)

  return Number.isFinite(amount) ? Math.max(0, amount) : 0
}

/**
 *
 * @param product 报价产品信息
 * @param feeType 费用类型
 * @description 按费用类型从报价明细中取费用
 */
function getDetailFee(product: ExpressProductQuote, feeType: ExpressCouponFeeType) {
  const detailCode = COUPON_DETAIL_CODES[feeType]
  const detail = product.detail?.find(item => normalizeText(item.priceEntryCode).toUpperCase() === detailCode)

  return toAmount(detail?.caculateFee)
}

/**
 *
 * @param product 报价产品信息
 * @param predicate 市场 code 匹配函数
 * @description 按条件取市场折扣金额
 */
function getDiscountFee(product: ExpressProductQuote, predicate: (marketCode: string) => boolean) {
  const discount = product.discount?.find(item => predicate(normalizeText(item.marketCode).toUpperCase()))

  return toAmount(discount?.reduceFee)
}

/**
 *
 * @param value 优惠类型 code
 * @description 归一优惠类型，BZ 转为 NMBZ
 */
function normalizeCouponRankType(value?: string) {
  const type = normalizeText(value).toUpperCase()

  return type === 'BZ' ? 'NMBZ' : type
}

/**
 *
 * @param product 报价产品信息
 * @param feeType 费用类型
 * @description 还原券前原始费用，含线路折扣
 */
export function getExpressCouponOriginalFee(product: ExpressProductQuote, feeType: ExpressCouponFeeType) {
  const couponDiscount = getDiscountFee(product, marketCode => COUPON_MARKET_CODES.has(marketCode))
  const couponRankType = normalizeCouponRankType(product.couponRankType)
  const routeDiscount = feeType === 'FRT' ? getDiscountFee(product, marketCode => marketCode === ROUTE_DISCOUNT_MARKET_CODE) : 0
  const shouldRestoreCouponDiscount = couponDiscount > 0 && (!couponRankType || couponRankType === feeType)

  return getDetailFee(product, feeType) + routeDiscount + (shouldRestoreCouponDiscount ? couponDiscount : 0)
}

/**
 *
 * @param product 报价产品信息
 * @description 生成各费用类型的券前费用列表
 */
function createCouponFeeList(product: ExpressProductQuote) {
  return (Object.keys(COUPON_DETAIL_CODES) as ExpressCouponFeeType[])
    .map<ExpressCouponFee>(feeType => ({
      feeType,
      freight: getExpressCouponOriginalFee(product, feeType)
    }))
    .filter(item => item.freight > 0)
}

/**
 *
 * @param parts 地址分段
 * @description 拼接地址各段，缺项返回空串
 */
function createAddress(parts: string[]) {
  const normalized = parts.map(normalizeText)

  return normalized.every(Boolean) ? normalized.join('-') : ''
}

/**
 *
 * @param draft 寄件草稿
 * @description 构建优惠券查询请求，缺关键信息返回 null
 */
export function createExpressCouponQueryRequest(draft: ExpressDraft): ExpressCouponQueryRequest | null {
  const sender = draft.sender
  const consignee = draft.consignee
  const product = draft.selectedProduct
  const productCode = normalizeText(product?.producteCode)

  if (!sender || !consignee || !product || !productCode) {
    return null
  }

  const mobile = normalizeText(sender.mobile)
  const arriveProvinceName = normalizeText(consignee.province)
  const sendAnAddress = createAddress([sender.province, sender.city, sender.county])
  const receivesAnAddress = createAddress([consignee.province, consignee.city, consignee.county])

  if (!mobile || !arriveProvinceName || !sendAnAddress || !receivesAnAddress) {
    return null
  }

  const couponFeeList = createCouponFeeList(product)
  const freight = couponFeeList.find(item => item.feeType === 'FRT')?.freight ?? 0

  return {
    freight,
    productCode,
    couponFeeList,
    arriveProvinceName,
    channel: APP_RUNTIME_CONFIG.omsChannel,
    mobile,
    sendAnAddress,
    receivesAnAddress
  }
}

/**
 *
 * @param draft 寄件草稿
 * @description 生成优惠券请求 key，用于请求去重
 */
export function createExpressCouponRequestKey(draft: ExpressDraft) {
  const request = createExpressCouponQueryRequest(draft)

  return request ? JSON.stringify(request) : ''
}

/**
 *
 * @param state 优惠券行状态
 * @description 有券、已选券或报价查询开始后才展示优惠券行
 */
export function shouldShowExpressCouponRow(state: {
  available: number
  unavailable: number
  requestReady: boolean
  selected: boolean
  status: 'idle' | 'loading' | 'done' | 'error'
}) {
  if (state.selected || state.available > 0 || state.unavailable > 0) {
    return true
  }

  return state.requestReady && state.status !== 'idle'
}
