import type { ExpressDraft } from './types'

/**
 *
 * @param draft 寄件草稿
 * @description 生成报价请求 key
 */
export function createExpressQuoteRequestKey(draft: ExpressDraft) {
  return JSON.stringify(draft)
}
