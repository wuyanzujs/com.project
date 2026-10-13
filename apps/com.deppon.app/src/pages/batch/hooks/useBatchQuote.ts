import { useCallback, useRef, useState } from 'react'

import { applyBatchQuoteResults, batchService } from '@/services/batch'
import type { BatchDraft } from '@/services/batch'

interface UseBatchQuoteParams {
  draft: BatchDraft
  setDraft: React.Dispatch<React.SetStateAction<BatchDraft>>
  validation: { valid: boolean; message: string }
  showToast: (title: string) => void
}

interface UseBatchQuoteResult {
  quoteLoading: boolean
  quoteMessage: string
  setQuoteMessage: (next: string) => void
  quoteRequestVersion: React.MutableRefObject<number>
  handleQuote: () => Promise<void>
}

export function useBatchQuote({
  draft,
  setDraft,
  validation,
  showToast
}: UseBatchQuoteParams): UseBatchQuoteResult {
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [quoteMessage, setQuoteMessage] = useState('')
  const quoteRequestVersion = useRef(0)

  const handleQuote = useCallback(async () => {
    if (quoteLoading) {
      return
    }

    if (!validation.valid) {
      showToast(validation.message)
      return
    }

    const requestVersion = quoteRequestVersion.current + 1

    quoteRequestVersion.current = requestVersion
    setQuoteLoading(true)
    setQuoteMessage('')

    try {
      const response = await batchService.quoteDraft(draft)

      if (quoteRequestVersion.current !== requestVersion) {
        return
      }

      if (!response.status || !response.result) {
        const message = response.message || '批量价格获取失败，请稍后重试'

        setQuoteMessage(message)
        showToast(message)
        return
      }

      setDraft(current =>
        applyBatchQuoteResults(current, response.result ?? [])
      )
      setQuoteMessage(`已获取 ${response.result.length} 票产品价格`)
    } finally {
      setQuoteLoading(false)
    }
  }, [
    draft,
    quoteLoading,
    setDraft,
    showToast,
    validation.message,
    validation.valid
  ])

  return {
    quoteLoading,
    quoteMessage,
    setQuoteMessage,
    quoteRequestVersion,
    handleQuote
  }
}
