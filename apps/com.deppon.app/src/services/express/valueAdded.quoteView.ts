import type { ExpressProductQuote } from './types'

export type ExpressValueAddedServiceKey = 'collection' | 'returnBill' | 'delivery' | 'warehouse' | 'doubleDelivery' | 'packaging' | 'powerMachine' | 'photo'

// MP 的 GetProductDetails / PPC_DETAIL_TYPE 与生产包费项码交叉核对；不把运费 FRT、保价 BF 算入本页。
const SERVICE_FEES: Record<ExpressValueAddedServiceKey, Record<string, string>> = {
  collection: { HK: '代收货款' },
  returnBill: { QS: '签收单' },
  delivery: { AD: '预约派送', NDF: '等通知派送', YJPS: '夜间派送' },
  warehouse: { SH: '第三方仓库收费', SHJC: '进仓派送费' },
  doubleDelivery: { SRPS: '双人派送' },
  packaging: { BZ: '纸箱包装', MBZ: '木包装', CBF: '拆包装', DBFWF: '代打包装' },
  powerMachine: { TDYJF: '通电验机' },
  photo: { PZQS: '拍照签收', LSPZ: '揽收拍照' }
}

export interface ExpressValueAddedFeeRow {
  key: string
  name: string
  amount: number
  service: ExpressValueAddedServiceKey
}

export function createExpressValueAddedQuoteView(product: ExpressProductQuote | null | undefined) {
  const available = Boolean(product && Array.isArray(product.detail))
  let invalidFee = false
  const rows: ExpressValueAddedFeeRow[] = []
  const serviceAmounts = Object.fromEntries(Object.keys(SERVICE_FEES).map(key => [key, available ? 0 : null])) as Record<
    ExpressValueAddedServiceKey,
    number | null
  >

  for (const [service, codes] of Object.entries(SERVICE_FEES)) {
    for (const detail of product?.detail ?? []) {
      const code = typeof detail.priceEntryCode === 'string' ? detail.priceEntryCode.trim().toUpperCase() : ''
      if (!Object.hasOwn(codes, code)) continue
      const amount = Number(detail.caculateFee)
      if (detail.caculateFee === null || detail.caculateFee === undefined || !Number.isFinite(amount) || amount < 0) {
        invalidFee = true
        serviceAmounts[service as ExpressValueAddedServiceKey] = null
        continue
      }
      const previousAmount = serviceAmounts[service as ExpressValueAddedServiceKey]
      if (previousAmount !== null) serviceAmounts[service as ExpressValueAddedServiceKey] = Math.round((previousAmount + amount) * 100) / 100
      if (amount > 0) rows.push({ key: `${service}-${code}-${rows.length}`, name: codes[code], amount, service: service as ExpressValueAddedServiceKey })
    }
  }

  const total = available && !invalidFee ? Math.round(rows.reduce((sum, row) => sum + row.amount, 0) * 100) / 100 : null

  return { available: available && !invalidFee, rows, serviceAmounts, total, priceText: formatExpressValueAddedFee(total) }
}

export function formatExpressValueAddedFee(amount: number | null) {
  return amount === null ? '¥--' : `¥${Number(amount.toFixed(2))}`
}

/** 重新询价后只沿用当前产品及其时间产品，不自动切换到接口第一项。 */
export function findExpressValueAddedProduct(products: ExpressProductQuote[], previous: ExpressProductQuote | null, transportMode: string) {
  const code = previous?.omsProductCode || transportMode
  const timeCode = previous?.timeProducts?.[0]?.timeProductsCode
  return (
    products.find(
      product =>
        product.omsProductCode === code &&
        (!previous ||
          ['mainRoutePref', 'shortDistance', 'deliveryNature'].every(
            field => (product[field as keyof ExpressProductQuote] || '') === (previous[field as keyof ExpressProductQuote] || '')
          )) &&
        (!timeCode || product.timeProducts?.some(item => item.timeProductsCode === timeCode))
    ) ?? null
  )
}
