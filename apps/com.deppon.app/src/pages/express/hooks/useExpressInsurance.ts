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
  expressInsuranceRules,
  expressService,
  normalizeExpressInsuranceAmount,
  updateExpressInsurance
} from '../../../services/express'
import { navigateToAppRoute } from '../../../shared/navigation/appNavigation'

import type {
  ExpressDraft,
  ExpressInsuranceQuote,
  ExpressInsuranceType
} from '../../../services/express'

interface UseExpressInsuranceOptions {
  draft: ExpressDraft
  setDraft: Dispatch<SetStateAction<ExpressDraft>>
}

function createInsurancePriceKey(draft: ExpressDraft) {
  return JSON.stringify([
    draft.goods.insuredAmount,
    draft.goods.weight,
    draft.goods.volume,
    draft.insurance.type,
    draft.insurance.capability,
    draft.selectedProduct?.omsProductCode,
    draft.service.transportMode
  ])
}

export function useExpressInsurance({
  draft,
  setDraft
}: UseExpressInsuranceOptions) {
  const [quote, setQuote] = useState<ExpressInsuranceQuote | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const requestKey = createInsurancePriceKey(draft)
  const latestRequestKey = useRef(requestKey)
  const previousRequestKey = useRef(requestKey)
  const requestVersion = useRef(0)

  latestRequestKey.current = requestKey

  const invalidate = useCallback(() => {
    requestVersion.current += 1
    setQuote(null)
    setMessage('')
    setLoading(false)
  }, [])

  useEffect(() => {
    if (previousRequestKey.current === requestKey) {
      return
    }

    previousRequestKey.current = requestKey
    invalidate()
  }, [invalidate, requestKey])

  const handleAmountChange = useCallback(
    (value: string) => {
      setDraft(current =>
        updateExpressInsurance(current, {
          amount: normalizeExpressInsuranceAmount(value)
        })
      )
    },
    [setDraft]
  )

  const handleTypeChange = useCallback(
    (type: ExpressInsuranceType) => {
      setDraft(current => updateExpressInsurance(current, { type }))
    },
    [setDraft]
  )

  const handleOpenRules = useCallback((type: ExpressInsuranceType) => {
    navigateToAppRoute(expressInsuranceRules.createRuleRoute(type))
  }, [])

  const handleQuery = useCallback(async () => {
    if (loading) {
      return
    }

    const version = requestVersion.current + 1

    requestVersion.current = version
    setLoading(true)
    setMessage('')

    try {
      const response = await expressService.queryInsurancePrice(draft)

      if (
        requestVersion.current !== version ||
        latestRequestKey.current !== requestKey
      ) {
        return
      }

      if (!response.status || !response.result) {
        const nextMessage = response.message || '暂未获取到保价费用'

        setQuote(null)
        setMessage(nextMessage)
        Taro.showToast({ title: nextMessage, icon: 'none' })
        return
      }

      setQuote(response.result)
    } finally {
      if (requestVersion.current === version) {
        setLoading(false)
      }
    }
  }, [draft, loading, requestKey])

  return {
    loading,
    message,
    quote,
    onAmountChange: handleAmountChange,
    onInvalidate: invalidate,
    onOpenRules: handleOpenRules,
    onQuery: handleQuery,
    onTypeChange: handleTypeChange
  }
}

export type ExpressInsuranceController = ReturnType<
  typeof useExpressInsurance
>
