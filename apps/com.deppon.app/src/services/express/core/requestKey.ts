import type { ExpressDraft } from './types'

/**
 *
 * @param draft 寄件草稿
 * @description 生成报价请求 key
 */
export function createExpressQuoteRequestKey(draft: ExpressDraft) {
  // 协议勾选和给快递员的备注不参与询价，变化时不应丢弃正在返回的价格。
  return JSON.stringify({ ...draft, agreementAccepted: false, remark: '' })
}
