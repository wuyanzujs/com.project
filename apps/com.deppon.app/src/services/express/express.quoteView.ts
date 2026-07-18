import type { ExpressPriceDetail, ExpressProductQuote } from './types'

export interface ExpressQuoteFeeRow {
  key: string
  name: string
  amount: number
}

export interface ExpressProductQuoteView {
  key: string
  name: string
  priceText: string
  priceWithSuffixText: string
  timeText: string
  billWeightText: string
  feeRows: ExpressQuoteFeeRow[]
}

const EXPRESS_FEE_NAMES: Record<string, string> = {
  BZ: '包装服务-纸箱',
  CBF: '包装服务-拆包装'
}

function toFiniteAmount(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const amount = Number(value)

  return Number.isFinite(amount) ? amount : null
}

function getQuoteAmount(product: ExpressProductQuote | null | undefined) {
  return toFiniteAmount(product?.totalfee)
}

export function getExpressQuoteKey(product: ExpressProductQuote) {
  return `${product.omsProductCode || product.productName}-${product.totalfee ?? ''}`
}

export function getExpressQuotePriceText(
  product: ExpressProductQuote | null | undefined,
  suffix = ''
) {
  const amount = getQuoteAmount(product)

  if (amount === null) {
    return '--'
  }

  if (amount <= 0) {
    return '¥--'
  }

  return `¥${amount}${suffix}`
}

export function getExpressQuoteTimeText(product: ExpressProductQuote) {
  return product.daysFormat || product.days || product.arriveDate || '时效待确认'
}

export function getExpressQuoteBillWeightText(product: ExpressProductQuote) {
  if (product.billWeight === null || product.billWeight === undefined) {
    return ''
  }

  return `计费重量 ${product.billWeight}kg`
}

function createFeeRow(detail: ExpressPriceDetail): ExpressQuoteFeeRow | null {
  const amount = toFiniteAmount(detail.caculateFee)

  if (!amount || amount <= 0) {
    return null
  }

  const code = detail.priceEntryCode.trim().toUpperCase()

  return {
    key: code || detail.priceEntryName,
    name: EXPRESS_FEE_NAMES[code] || detail.priceEntryName || code,
    amount
  }
}

export function createExpressQuoteFeeRows(
  product: ExpressProductQuote
): ExpressQuoteFeeRow[] {
  return (product.detail ?? [])
    .map(createFeeRow)
    .filter((row): row is ExpressQuoteFeeRow => Boolean(row))
}

export function createExpressProductQuoteView(
  product: ExpressProductQuote
): ExpressProductQuoteView {
  return {
    key: getExpressQuoteKey(product),
    name: product.productName || product.omsProductCode || '德邦快递',
    priceText: getExpressQuotePriceText(product),
    priceWithSuffixText: getExpressQuotePriceText(product, '起'),
    timeText: getExpressQuoteTimeText(product),
    billWeightText: getExpressQuoteBillWeightText(product),
    feeRows: createExpressQuoteFeeRows(product)
  }
}
