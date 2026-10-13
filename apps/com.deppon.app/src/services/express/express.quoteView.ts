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
  /** 产品卡「¥X起」的运费口径金额；不可见时为 null（卡片显示 --）。 */
  freightAmount: number | null
  timeText: string
  timeValue: string
  billWeightText: string
  feeRows: ExpressQuoteFeeRow[]
}

const EXPRESS_FEE_NAMES: Record<string, string> = {
  BZ: '包装服务-纸箱',
  CBF: '包装服务-拆包装'
}

// 运费明细的 priceEntryCode，产品卡上「¥X起」取的是 FRT 口径而非总价。
const EXPRESS_FREIGHT_ENTRY_CODE = 'FRT'

/**
 *
 * @param value 金额原始值
 * @description 转为有限金额，无效时返回 null
 */
function toFiniteAmount(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const amount = Number(value)

  return Number.isFinite(amount) ? amount : null
}

/**
 *
 * @param product 报价产品
 * @description 取报价产品的总费用金额
 */
function getQuoteAmount(product: ExpressProductQuote | null | undefined) {
  return toFiniteAmount(product?.totalfee)
}

/**
 *
 * @param product 报价产品
 * @description 生成报价产品唯一 key
 */
export function getExpressQuoteKey(product: ExpressProductQuote) {
  return `${product.omsProductCode || product.productName}-${product.totalfee ?? ''}`
}

/**
 *
 * @param product 报价产品
 * @param suffix 金额后缀文案
 * @description 生成报价价格展示文本
 */
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

// 生产端 GetTimeProduct：时间产品别名（如「小件标快隔日」）优先于产品名。
export function getExpressQuoteTimeProduct(product: ExpressProductQuote) {
  const first = product.timeProducts?.[0]

  return {
    name:
      first?.timeProductsName ||
      product.productName ||
      product.omsProductCode ||
      '德邦快递',
    code: first?.timeProductsCode || product.omsProductCode
  }
}

/**
 *
 * @param product 报价产品
 * @description 取运费口径的明细金额
 */
export function getExpressQuoteFreight(product: ExpressProductQuote) {
  const freight = product.detail?.find(
    item =>
      item.priceEntryCode.trim().toUpperCase() === EXPRESS_FREIGHT_ENTRY_CODE
  )

  return toFiniteAmount(freight?.caculateFee)
}

// 生产端 ExistsProductPrice：totalfee 有值直接可见；总价为 0 时若运费
// 恰好被优惠券全额抵扣，也视为有价格可展示（0 元起）。
export function existsExpressQuotePrice(product: ExpressProductQuote) {
  const totalfee = getQuoteAmount(product)

  if (totalfee !== null && totalfee > 0) {
    return { free: false, visible: true }
  }

  if (product.detail?.length && product.discount?.length) {
    const freight = product.detail.find(
      item =>
        item.priceEntryCode.trim().toUpperCase() === EXPRESS_FREIGHT_ENTRY_CODE
    )
    const coupon = product.discount.find(
      item => item.marketCode === 'YHJ' || item.marketCode === 'YHQ'
    )

    if (
      freight &&
      coupon &&
      freight.discountFee &&
      coupon.reduceFee &&
      freight.discountFee === coupon.reduceFee.toString()
    ) {
      return { free: true, visible: true }
    }
  }

  return { free: false, visible: false }
}

/**
 *
 * @param product 报价产品
 * @description 取产品时效展示文案
 */
export function getExpressQuoteTimeText(product: ExpressProductQuote) {
  return (
    product.daysFormat || product.days || product.arriveDate || '时效待确认'
  )
}

/**
 *
 * @param product 报价产品
 * @description 生成计费重量展示文案
 */
export function getExpressQuoteBillWeightText(product: ExpressProductQuote) {
  if (product.billWeight === null || product.billWeight === undefined) {
    return ''
  }

  return `计费重量 ${product.billWeight}kg`
}

/**
 *
 * @param detail 费用明细项
 * @description 单条费用明细转展示行
 */
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

/**
 *
 * @param product 报价产品
 * @description 组装费用明细展示行列表
 */
export function createExpressQuoteFeeRows(
  product: ExpressProductQuote
): ExpressQuoteFeeRow[] {
  return (product.detail ?? [])
    .map(createFeeRow)
    .filter((row): row is ExpressQuoteFeeRow => Boolean(row))
}

/**
 *
 * @param product 报价产品
 * @description 组装报价产品展示模型
 */
export function createExpressProductQuoteView(
  product: ExpressProductQuote
): ExpressProductQuoteView {
  const freight = getExpressQuoteFreight(product)

  return {
    key: getExpressQuoteKey(product),
    name: getExpressQuoteTimeProduct(product).name,
    priceText: getExpressQuotePriceText(product),
    priceWithSuffixText: getExpressQuotePriceText(product, '起'),
    freightAmount: existsExpressQuotePrice(product).visible ? freight : null,
    timeText: getExpressQuoteTimeText(product),
    // 生产端产品卡时效行口径：无天数时整行显示「运输时效：暂无」。
    timeValue: (product.days ?? '').trim() || '暂无',
    billWeightText: getExpressQuoteBillWeightText(product),
    feeRows: createExpressQuoteFeeRows(product)
  }
}
