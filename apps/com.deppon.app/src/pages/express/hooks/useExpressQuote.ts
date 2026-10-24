import Taro from '@tarojs/taro'

import { type Dispatch, type SetStateAction, useCallback, useEffect, useRef, useState } from 'react'

import {
  applyExpressInsuranceCapability,
  createExpressQuoteRequestKey,
  expressService,
  selectDefaultExpressQuote,
  selectExpressProduct,
  sortExpressQuotes
} from '@/services/express'
import type { ExpressDraft, ExpressProductQuote } from '@/services/express'
import { useLatestRequestRunner } from '@/shared/async/useLatestRequest'

interface UseExpressQuoteOptions {
  draft: ExpressDraft
  setDraft: Dispatch<SetStateAction<ExpressDraft>>
  onProductChange: () => void
}

/** 寄件产品报价：根据当前草稿获取产品价格，自动选择推荐产品，并在草稿变化时丢弃旧报价。 */
export function useExpressQuote({ draft, setDraft, onProductChange }: UseExpressQuoteOptions) {
  const [quotes, setQuotes] = useState<ExpressProductQuote[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const requestKey = createExpressQuoteRequestKey(draft)
  const quoteRequestKey = useRef(requestKey)
  const latestDraft = useRef(draft)
  const latestRequestKey = useRef(requestKey)
  const startRequest = useCallback(() => setStatus('loading'), [])
  const finishRequest = useCallback(() => setStatus(current => (current === 'loading' ? 'idle' : current)), [])
  const { invalidateLatestRequest, runLatestRequest } = useLatestRequestRunner(startRequest, finishRequest)

  latestDraft.current = draft
  latestRequestKey.current = requestKey
  // 条件变化的首帧就隐藏旧报价，后续 effect 清理请求并启动自动重算。
  const currentQuote = quoteRequestKey.current === requestKey

  useEffect(() => {
    if (quoteRequestKey.current === requestKey) {
      return
    }

    invalidateLatestRequest()
    quoteRequestKey.current = requestKey
    setQuotes([])
    setStatus('idle')
  }, [invalidateLatestRequest, requestKey])

  const handleQuery = useCallback(async () => {
    await runLatestRequest(
      requestKey,
      async () => {
        try {
          return await expressService.quote(draft)
        } catch {
          return { status: false, message: '暂未获取到产品价格，请稍后重试', result: null }
        }
      },
      response => {
        if (latestRequestKey.current !== requestKey) {
          return
        }

        const products = sortExpressQuotes(response.result?.products ?? [])
        const availability = response.result?.availability
        const currentDraft = latestDraft.current

        if (createExpressQuoteRequestKey(currentDraft) !== requestKey) {
          return
        }

        const availableDraft = availability
          ? applyExpressInsuranceCapability(currentDraft, availability.insuranceCapability, availability.customer.insuranceLimit)
          : currentDraft

        if (!response.status || !products.length) {
          const failedDraft = { ...availableDraft, selectedProduct: null }

          quoteRequestKey.current = createExpressQuoteRequestKey(failedDraft)
          setQuotes([])
          latestDraft.current = failedDraft
          setDraft(failedDraft)
          onProductChange()
          setStatus('error')
          Taro.showToast({
            title: response.message || '暂未获取到产品价格',
            icon: 'none'
          })
          return
        }

        const defaultProduct = selectDefaultExpressQuote(products, availability?.recommendDczp === true)
        const nextDraft = selectExpressProduct(availableDraft, defaultProduct)

        // 产品、保价能力等由本次报价回填，记录回填后的条件，避免把结果当作新的输入再次计价。
        quoteRequestKey.current = createExpressQuoteRequestKey(nextDraft)
        setQuotes(products)
        latestDraft.current = nextDraft
        setDraft(nextDraft)
        onProductChange()
        setStatus('done')
      }
    )
  }, [draft, onProductChange, requestKey, runLatestRequest, setDraft])

  const handleSelectProduct = useCallback(
    (product: ExpressProductQuote) => {
      onProductChange()
      setDraft(current => {
        const nextDraft = selectExpressProduct(current, product)

        quoteRequestKey.current = createExpressQuoteRequestKey(nextDraft)
        latestDraft.current = nextDraft
        return nextDraft
      })
    },
    [onProductChange, setDraft]
  )

  const restore = useCallback(
    (nextQuotes: ExpressProductQuote[], restoredDraft = latestDraft.current) => {
      invalidateLatestRequest()
      quoteRequestKey.current = createExpressQuoteRequestKey(restoredDraft)
      latestDraft.current = restoredDraft
      setQuotes(nextQuotes)
      setStatus(nextQuotes.length ? 'done' : 'idle')
    },
    [invalidateLatestRequest]
  )

  return {
    onQuery: handleQuery,
    onSelectProduct: handleSelectProduct,
    quotes: currentQuote ? quotes : [],
    restore,
    status: currentQuote ? status : ('idle' as const)
  }
}

export type ExpressQuoteController = ReturnType<typeof useExpressQuote>
