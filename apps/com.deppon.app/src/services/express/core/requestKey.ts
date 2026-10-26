import type { ExpressDraft } from './types'

/**
 *
 * @param draft 寄件草稿
 * @description 生成报价请求 key
 */
export function createExpressQuoteRequestKey(draft: ExpressDraft) {
  // 报价结果、失效文案、协议和备注不属于计价条件，不能触发重复请求或丢弃正在返回的价格。
  // 选中产品后 transportMode 只是产品 code 的冗余副本，切产品不应触发重新计价。
  const transportMode = draft.selectedProduct ? '' : draft.service.transportMode

  return JSON.stringify({
    ...draft,
    selectedProduct: null,
    service: { ...draft.service, transportMode },
    quoteStaleReason: '',
    agreementAccepted: false,
    remark: ''
  })
}
