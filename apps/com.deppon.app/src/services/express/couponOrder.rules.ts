import { APP_RUNTIME_CONFIG } from '../../shared/config/runtime'

import type {
  ExpressCouponFee,
  ExpressCouponFeeType,
  ExpressCouponQueryRequest
} from '../coupon'
import type { ExpressDraft, ExpressProductQuote } from './types'

const COUPON_DETAIL_CODES: Record<ExpressCouponFeeType, string> = {
  FRT: 'FRT',
  BF: 'BF',
  AD: 'AD',
  NMBZ: 'BZ'
}

const COUPON_MARKET_CODES = new Set(['YHJ', 'YHQ'])
const ROUTE_DISCOUNT_MARKET_CODE = 'XLYHF'

export const EXPRESS_COUPON_AUTO_QUERY_DELAY_MS = 300

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function toAmount(value: unknown) {
  const amount = Number(value)

  return Number.isFinite(amount) ? Math.max(0, amount) : 0
}

function getDetailFee(
  product: ExpressProductQuote,
  feeType: ExpressCouponFeeType
) {
  const detailCode = COUPON_DETAIL_CODES[feeType]
  const detail = product.detail?.find(
    item => normalizeText(item.priceEntryCode).toUpperCase() === detailCode
  )

  return toAmount(detail?.caculateFee)
}

function getDiscountFee(
  product: ExpressProductQuote,
  predicate: (marketCode: string) => boolean
) {
  const discount = product.discount?.find(item =>
    predicate(normalizeText(item.marketCode).toUpperCase())
  )

  return toAmount(discount?.reduceFee)
}

function normalizeCouponRankType(value?: string) {
  const type = normalizeText(value).toUpperCase()

  return type === 'BZ' ? 'NMBZ' : type
}

export function getExpressCouponOriginalFee(
  product: ExpressProductQuote,
  feeType: ExpressCouponFeeType
) {
  const couponDiscount = getDiscountFee(product, marketCode =>
    COUPON_MARKET_CODES.has(marketCode)
  )
  const couponRankType = normalizeCouponRankType(product.couponRankType)
  const routeDiscount =
    feeType === 'FRT'
      ? getDiscountFee(
          product,
          marketCode => marketCode === ROUTE_DISCOUNT_MARKET_CODE
        )
      : 0
  const shouldRestoreCouponDiscount =
    couponDiscount > 0 && (!couponRankType || couponRankType === feeType)

  return (
    getDetailFee(product, feeType) +
    routeDiscount +
    (shouldRestoreCouponDiscount ? couponDiscount : 0)
  )
}

function createCouponFeeList(product: ExpressProductQuote) {
  return (Object.keys(COUPON_DETAIL_CODES) as ExpressCouponFeeType[])
    .map<ExpressCouponFee>(feeType => ({
      feeType,
      freight: getExpressCouponOriginalFee(product, feeType)
    }))
    .filter(item => item.freight > 0)
}

function createAddress(parts: string[]) {
  const normalized = parts.map(normalizeText)

  return normalized.every(Boolean) ? normalized.join('-') : ''
}

export function createExpressCouponQueryRequest(
  draft: ExpressDraft
): ExpressCouponQueryRequest | null {
  const sender = draft.sender
  const consignee = draft.consignee
  const product = draft.selectedProduct
  const productCode = normalizeText(product?.producteCode)

  if (!sender || !consignee || !product || !productCode) {
    return null
  }

  const mobile = normalizeText(sender.mobile)
  const arriveProvinceName = normalizeText(consignee.province)
  const sendAnAddress = createAddress([
    sender.province,
    sender.city,
    sender.county
  ])
  const receivesAnAddress = createAddress([
    consignee.province,
    consignee.city,
    consignee.county
  ])

  if (
    !mobile ||
    !arriveProvinceName ||
    !sendAnAddress ||
    !receivesAnAddress
  ) {
    return null
  }

  const couponFeeList = createCouponFeeList(product)
  const freight =
    couponFeeList.find(item => item.feeType === 'FRT')?.freight ?? 0

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

export function createExpressCouponRequestKey(draft: ExpressDraft) {
  const request = createExpressCouponQueryRequest(draft)

  return request ? JSON.stringify(request) : ''
}
