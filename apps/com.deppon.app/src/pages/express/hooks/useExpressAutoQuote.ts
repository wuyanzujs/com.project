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

// 生产端没有「获取价格」按钮：收寄地址与货物齐全即自动试算；物品信息页
// 保存返回、优惠券/保价等变更导致的报价失效也由这里兜底重算。requestKey
// 去重防止同一份草稿反复请求，quotes 非空且无失效原因时不再打扰。
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
