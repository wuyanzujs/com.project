import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'

import { applyExpressInsuranceCapability, expressService, selectExpressProduct } from '@/services/express'
import type { ExpressDraft } from '@/services/express'
import { findExpressValueAddedProduct } from '@/services/express/value-added/valueAdded.quoteView'

export function createValueAddedRequestKey(draft: ExpressDraft) {
  return JSON.stringify({ ...draft, selectedProduct: null, quoteStaleReason: '', agreementAccepted: false, remark: '' })
}

/** 独立页暂存草稿；选择变化后防抖询价，旧响应和错误不继续展示旧服务费。 */
export function useValueAddedQuote(draft: ExpressDraft, setDraft: Dispatch<SetStateAction<ExpressDraft>>, blockedMessage = '') {
  const key = createValueAddedRequestKey(draft)
  const originalProduct = useRef(draft.selectedProduct).current
  const latest = useRef({ draft, key })
  latest.current = { draft, key }
  const [revision, setRevision] = useState(0)
  const freshKey = useRef(draft.selectedProduct && !draft.quoteStaleReason ? `0:${key}` : '')
  const [result, setResult] = useState(
    () =>
      ({
        key,
        status: draft.selectedProduct && !draft.quoteStaleReason ? ('done' as const) : ('idle' as const),
        message: ''
      }) as { key: string; status: 'idle' | 'loading' | 'done' | 'error'; message: string }
  )

  useEffect(() => {
    if (blockedMessage) {
      freshKey.current = ''
      setResult({ key, status: 'error', message: blockedMessage })
      setDraft(current => (current.selectedProduct ? { ...current, selectedProduct: null, quoteStaleReason: blockedMessage } : current))
      return
    }
    if (`${revision}:${key}` === freshKey.current) return
    let active = true
    setResult({ key, status: 'loading', message: '正在计算服务费' })
    const timer = setTimeout(async () => {
      const currentDraft = latest.current.draft
      try {
        const response = await expressService.quote(currentDraft)
        if (!active || latest.current.key !== key) return
        const product = response.status
          ? findExpressValueAddedProduct(response.result?.products ?? [], originalProduct, currentDraft.service.transportMode)
          : null
        if (!product) {
          const message = response.message || '当前产品暂未获取到服务费，请重试'
          setDraft(current => (createValueAddedRequestKey(current) === key ? { ...current, selectedProduct: null, quoteStaleReason: message } : current))
          setResult({ key, status: 'error', message })
          return
        }
        const availability = response.result?.availability
        const latestDraft = latest.current.draft
        const availableDraft = availability
          ? applyExpressInsuranceCapability(latestDraft, availability.insuranceCapability, availability.customer.insuranceLimit)
          : latestDraft
        const nextDraft = selectExpressProduct(availableDraft, product)
        // 该报价已经包含后端本次返回的保价能力；把归一后的 key 标记为新鲜，避免响应回填反复触发请求。
        const nextKey = createValueAddedRequestKey(nextDraft)
        freshKey.current = `${revision}:${nextKey}`
        setDraft(current => (createValueAddedRequestKey(current) === key ? nextDraft : current))
        setResult({ key: nextKey, status: 'done', message: '' })
      } catch {
        if (!active || latest.current.key !== key) return
        const message = '服务费计算失败，请重试'
        setDraft(current => (createValueAddedRequestKey(current) === key ? { ...current, selectedProduct: null, quoteStaleReason: message } : current))
        setResult({ key, status: 'error', message })
      }
    }, 350)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [blockedMessage, key, originalProduct, revision, setDraft])

  const status = blockedMessage ? 'error' : result.key === key ? result.status : 'loading'
  return {
    status,
    message: blockedMessage || (result.key === key ? result.message : '正在计算服务费'),
    product: status === 'done' && !draft.quoteStaleReason ? draft.selectedProduct : null,
    retry: useCallback(() => setRevision(current => current + 1), [])
  }
}
