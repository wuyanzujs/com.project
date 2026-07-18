import Taro from '@tarojs/taro'

import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react'

import {
  applyExpressInsuranceCapability,
  createExpressQuoteRequestKey,
  expressService,
  selectDefaultExpressQuote,
  selectExpressProduct
} from '../../../services/express'
import { useLatestRequestRunner } from '../../../shared/async/useLatestRequest'

import type {
  ExpressDraft,
  ExpressProductQuote
} from '../../../services/express'

interface UseExpressQuoteOptions {
  draft: ExpressDraft
  setDraft: Dispatch<SetStateAction<ExpressDraft>>
  onProductChange: () => void
}

export function useExpressQuote({
  draft,
  setDraft,
  onProductChange
}: UseExpressQuoteOptions) {
  const [quotes, setQuotes] = useState<ExpressProductQuote[]>([])
  const [status, setStatus] = useState<
    'idle' | 'loading' | 'done' | 'error'
  >('idle')
  const requestKey = createExpressQuoteRequestKey(draft)
  const latestDraft = useRef(draft)
  const latestRequestKey = useRef(requestKey)
  const startRequest = useCallback(() => setStatus('loading'), [])
  const finishRequest = useCallback(
    () => setStatus(current => (current === 'loading' ? 'idle' : current)),
    []
  )
  const { invalidateLatestRequest, runLatestRequest } = useLatestRequestRunner(
    startRequest,
    finishRequest
  )

  latestDraft.current = draft
  latestRequestKey.current = requestKey

  useEffect(() => {
    invalidateLatestRequest()
  }, [invalidateLatestRequest, requestKey])

  const handleQuery = useCallback(async () => {
    await runLatestRequest(
      requestKey,
      () => expressService.quote(draft),
      response => {
        if (latestRequestKey.current !== requestKey) {
          return
        }

        const products = response.result?.products ?? []
        const availability = response.result?.availability
        const currentDraft = latestDraft.current

        if (createExpressQuoteRequestKey(currentDraft) !== requestKey) {
          return
        }

        const availableDraft = availability
          ? applyExpressInsuranceCapability(
              currentDraft,
              availability.insuranceCapability,
              availability.customer.insuranceLimit
            )
          : currentDraft

        if (!response.status || !products.length) {
          setQuotes([])
          latestDraft.current = availableDraft
          setDraft(availableDraft)
          onProductChange()
          setStatus('error')
          Taro.showToast({
            title: response.message || '暂未获取到产品价格',
            icon: 'none'
          })
          return
        }

        const defaultProduct = selectDefaultExpressQuote(
          products,
          availability?.recommendDczp === true
        )
        const nextDraft = selectExpressProduct(availableDraft, defaultProduct)

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
      setDraft(current => selectExpressProduct(current, product))
    },
    [onProductChange, setDraft]
  )

  const restore = useCallback((nextQuotes: ExpressProductQuote[]) => {
    setQuotes(nextQuotes)
    setStatus(nextQuotes.length ? 'done' : 'idle')
  }, [])

  return {
    onQuery: handleQuery,
    onSelectProduct: handleSelectProduct,
    quotes,
    restore,
    status
  }
}

export type ExpressQuoteController = ReturnType<typeof useExpressQuote>
