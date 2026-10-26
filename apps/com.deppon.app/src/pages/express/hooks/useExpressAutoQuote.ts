import { useEffect } from 'react'

import { createExpressQuoteRequestKey, validateExpressDraft } from '@/services/express'
import type { ExpressDraft, ExpressProductQuote } from '@/services/express'

type QuoteStatus = 'idle' | 'loading' | 'done' | 'error'

interface UseExpressAutoQuoteOptions {
  draft: ExpressDraft
  quotedKey: string
  quotes: ExpressProductQuote[]
  quoteStatus: QuoteStatus
  onQuote: () => void
}

/**
 * 寄件页自动报价触发器：收寄地址和货物完整后自动试算，也兜底处理物品、优惠券或保价变化
 * 导致的报价失效。报价控制器负责请求去重、条件变化后的失效和失败状态，失败时等待重试或条件变化。
 */
export function useExpressAutoQuote({ draft, quotedKey, quotes, quoteStatus, onQuote }: UseExpressAutoQuoteOptions) {
  const requestKey = createExpressQuoteRequestKey(draft)

  useEffect(() => {
    if (quoteStatus === 'loading' || quoteStatus === 'error' || !validateExpressDraft(draft).valid) {
      return
    }

    if (quotes.length > 0 && requestKey === quotedKey) {
      return
    }

    onQuote()
  }, [draft, onQuote, quoteStatus, quotedKey, quotes, requestKey])
}
