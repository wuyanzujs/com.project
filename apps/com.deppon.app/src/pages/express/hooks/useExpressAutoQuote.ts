import { useEffect, useRef } from 'react'

import { createExpressQuoteRequestKey } from '@/services/express'
import type { ExpressDraft, ExpressProductQuote } from '@/services/express'

type QuoteStatus = 'idle' | 'loading' | 'done' | 'error'

interface UseExpressAutoQuoteOptions {
  draft: ExpressDraft
  quotes: ExpressProductQuote[]
  quoteStatus: QuoteStatus
  onQuote: () => void
}

/**
 * 寄件页自动报价触发器：收寄地址和货物完整后自动试算，也兜底处理物品、优惠券或保价变化
 * 导致的报价失效，并用 requestKey 避免同一份草稿重复请求。
 */
export function useExpressAutoQuote({ draft, quotes, quoteStatus, onQuote }: UseExpressAutoQuoteOptions) {
  const lastQuoteKeyRef = useRef('')

  useEffect(() => {
    const requestKey = createExpressQuoteRequestKey(draft)

    if (
      !draft.sender?.address ||
      !draft.consignee?.address ||
      !draft.goods.name.trim() ||
      draft.goods.weight <= 0 ||
      quoteStatus === 'loading' ||
      lastQuoteKeyRef.current === requestKey ||
      (quotes.length > 0 && !draft.quoteStaleReason)
    ) {
      return
    }

    lastQuoteKeyRef.current = requestKey
    onQuote()
  }, [draft, onQuote, quoteStatus, quotes])
}
