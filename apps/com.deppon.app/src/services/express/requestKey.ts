import type { ExpressDraft } from './types'

export function createExpressQuoteRequestKey(draft: ExpressDraft) {
  return JSON.stringify(draft)
}
