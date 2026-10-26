import type { ExpressPriceDetail, ExpressProductQuote } from './types'

export interface ExpressQuoteFeeRow {
  key: string
  name: string
  amount: number
}

export interface ExpressQuoteTimeSegments {
  /** 时效「前」段文案，如「明天」「22号」。 */
  start: string
  /** 时效中的时刻文案，如「18:00」，产品卡加粗显示。 */
  time: string
  /** 时效「后」段文案，如「前」。 */
  end: string
}

export interface ExpressQuoteDiscountRow {
  key: string
  name: string
  amount: number
}

export interface ExpressProductQuoteView {
  key: string
  name: string
  /** 产品名超过 4 个字，产品卡标题带需要加宽，避免折行被裁切。 */
  longName: boolean
  priceText: string
  priceWithSuffixText: string
  /** 基础费用只取 FRT，不能用包含增值费用的整票 totalfee。 */
  baseFeeText: string
  addedFeeText: string
  /** 产品卡「¥X起」的运费口径金额；不可见时为 null（卡片显示 --）。 */
  freightAmount: number | null
  timeText: string
  /** 时效按「前」字拆分的三段文案，无法拆分时三段为空。 */
  timeSegments: ExpressQuoteTimeSegments
  /** 线路限时优惠金额（discount.marketCode = XLYHF），无优惠时为 0。 */
  timeLimit: number
  billWeightText: string
  /** 完整费用明细，保留给查价页等已有消费者。 */
  feeRows: ExpressQuoteFeeRow[]
  /** 寄件明细的增值分区，排除已经单列展示的基础运费 FRT。 */
  addedFeeRows: ExpressQuoteFeeRow[]
  discountTotal: number
  discountRows: ExpressQuoteDiscountRow[]
  billType: string
}

const EXPRESS_FEE_NAMES: Record<string, string> = {
  BZ: '包装服务-纸箱',
  CBF: '包装服务-拆包装'
}

// 运费明细的 priceEntryCode，产品卡上「¥X起」取的是 FRT 口径而非总价。
const EXPRESS_FREIGHT_ENTRY_CODE = 'FRT'

// 保价费的明细口径，保价面板选中行展示保费。
const EXPRESS_INSURANCE_ENTRY_CODE = 'BF'

// 线路限时优惠（产品卡「惊喜优惠¥X」角标）的优惠类型。
const EXPRESS_TIME_LIMIT_MARKET_CODE = 'XLYHF'

// 产品名超过 4 个字时，产品卡标题带需要按加宽形态渲染。
const EXPRESS_QUOTE_LONG_NAME_LENGTH = 4

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
  return JSON.stringify({
    identity: getExpressQuoteIdentity(product),
    totalfee: product.totalfee ?? null
  })
}

/** 产品码相同的线路/时效产品仍是不同卡片；价格变化不应改变当前选中身份。 */
export function getExpressQuoteIdentity(product: ExpressProductQuote) {
  return {
    productCode: product.omsProductCode || product.productName,
    mainRoutePref: product.mainRoutePref ?? '',
    shortDistance: product.shortDistance ?? '',
    deliveryNature: product.deliveryNature ?? '',
    timeProducts: (product.timeProducts ?? []).map(item => item.timeProductsCode).sort()
  }
}

export function isSameExpressQuote(left: ExpressProductQuote | null | undefined, right: ExpressProductQuote | null | undefined) {
  if (!left || !right) return false
  return JSON.stringify(getExpressQuoteIdentity(left)) === JSON.stringify(getExpressQuoteIdentity(right))
}

/**
 *
 * @param product 报价产品
 * @param suffix 金额后缀文案
 * @description 生成报价价格展示文本
 */
export function getExpressQuotePriceText(product: ExpressProductQuote | null | undefined, suffix = '') {
  const amount = getQuoteAmount(product)

  if (amount === null) {
    return '--'
  }

  if (amount <= 0) {
    return '¥--'
  }

  return `¥${amount}${suffix}`
}

// 时间产品别名优先于产品名。
export function getExpressQuoteTimeProduct(product: ExpressProductQuote) {
  const first = product.timeProducts?.[0]

  return {
    name: first?.timeProductsName || product.productName || product.omsProductCode || '德邦快递',
    code: first?.timeProductsCode || product.omsProductCode
  }
}

/**
 *
 * @param product 报价产品
 * @description 取运费口径的明细金额
 */
export function getExpressQuoteFreight(product: ExpressProductQuote) {
  const freight = product.detail?.find(item => item.priceEntryCode.trim().toUpperCase() === EXPRESS_FREIGHT_ENTRY_CODE)

  return toFiniteAmount(freight?.caculateFee)
}

/**
 *
 * @param product 报价产品
 * @description 取报价明细里的保价费，未含保价项返回 null
 */
export function getExpressQuoteInsurancePremium(product: ExpressProductQuote) {
  const entry = product.detail?.find(item => item.priceEntryCode.trim().toUpperCase() === EXPRESS_INSURANCE_ENTRY_CODE)

  return toFiniteAmount(entry?.caculateFee)
}

// totalfee 有值时展示价格；运费被优惠券全额抵扣时，也允许展示 0 元起。
export function existsExpressQuotePrice(product: ExpressProductQuote) {
  const totalfee = getQuoteAmount(product)

  if (totalfee !== null && totalfee > 0) {
    return { free: false, visible: true }
  }

  if (product.detail?.length && product.discount?.length) {
    const freight = product.detail.find(item => item.priceEntryCode.trim().toUpperCase() === EXPRESS_FREIGHT_ENTRY_CODE)
    const coupon = product.discount.find(item => item.marketCode === 'YHJ' || item.marketCode === 'YHQ')

    if (freight && coupon && freight.discountFee && coupon.reduceFee && freight.discountFee === coupon.reduceFee.toString()) {
      return { free: true, visible: true }
    }
  }

  return { free: false, visible: false }
}

/**
 *
 * @param product 报价产品
 * @description 取产品卡线路限时优惠金额，无优惠返回 0
 */
export function getExpressQuoteTimeLimit(product: ExpressProductQuote) {
  const discount = product.discount?.find(item => item.marketCode === EXPRESS_TIME_LIMIT_MARKET_CODE)
  const amount = toFiniteAmount(discount?.reduceFee)

  return amount !== null && amount > 0 ? amount : 0
}

/**
 *
 * @param value 时效文案
 * @description 按「天/号…前」把时效拆成前段、时刻、后段，无法识别时三段为空
 */
export function splitExpressQuoteTimeText(value: string): ExpressQuoteTimeSegments {
  if (!value) {
    return { start: '', time: '', end: '' }
  }

  const matched = value.includes('天') ? value.match(/天(.*?)前/) : value.includes('号') ? value.match(/号(.*?)前/) : null
  const time = matched?.[1] ?? ''

  if (!time) {
    return { start: '', time: '', end: '' }
  }

  const [start = '', end = ''] = value.split(time)

  return { start, time, end }
}

/**
 *
 * @param product 报价产品
 * @description 取产品时效展示文案
 */
export function getExpressQuoteTimeText(product: ExpressProductQuote) {
  return product.daysFormat || product.days || product.arriveDate || '时效待确认'
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
export function createExpressQuoteFeeRows(product: ExpressProductQuote): ExpressQuoteFeeRow[] {
  return (product.detail ?? []).map(createFeeRow).filter((row): row is ExpressQuoteFeeRow => Boolean(row))
}

export function createExpressQuoteDiscountRows(product: ExpressProductQuote): ExpressQuoteDiscountRow[] {
  return (product.discount ?? [])
    .map((item, index) => {
      const amount = toFiniteAmount(item.reduceFee)
      if (amount === null || amount <= 0) return null
      return { key: item.marketCode || `discount-${index}`, name: item.marketName || item.marketCode || '运费优惠', amount }
    })
    .filter((row): row is ExpressQuoteDiscountRow => Boolean(row))
}

/**
 *
 * @param product 报价产品
 * @description 组装报价产品展示模型
 */
export function createExpressProductQuoteView(product: ExpressProductQuote): ExpressProductQuoteView {
  const freight = getExpressQuoteFreight(product)
  const name = getExpressQuoteTimeProduct(product).name
  const timeText = getExpressQuoteTimeText(product)
  const feeRows = createExpressQuoteFeeRows(product)
  const addedFeeRows = feeRows.filter(row => row.key !== EXPRESS_FREIGHT_ENTRY_CODE)
  const addedFee = addedFeeRows.reduce((sum, row) => sum + Math.round(row.amount * 100), 0) / 100
  const discountRows = createExpressQuoteDiscountRows(product)
  const discountTotal = discountRows.reduce((sum, row) => sum + Math.round(row.amount * 100), 0) / 100
  const baseFee = freight === null ? null : Math.round((freight + discountTotal) * 100) / 100

  return {
    key: getExpressQuoteKey(product),
    name,
    longName: name.length > EXPRESS_QUOTE_LONG_NAME_LENGTH,
    priceText: getExpressQuotePriceText(product),
    priceWithSuffixText: getExpressQuotePriceText(product, '起'),
    baseFeeText: baseFee === null ? '¥--' : `¥${baseFee}`,
    addedFeeText: addedFeeRows.length ? `¥${addedFee}` : '¥--',
    freightAmount: existsExpressQuotePrice(product).visible ? freight : null,
    timeText,
    timeSegments: splitExpressQuoteTimeText(timeText),
    timeLimit: getExpressQuoteTimeLimit(product),
    billWeightText: getExpressQuoteBillWeightText(product),
    feeRows,
    addedFeeRows,
    discountTotal,
    discountRows,
    billType: product.expBillCalculateResponse?.billType || ''
  }
}
