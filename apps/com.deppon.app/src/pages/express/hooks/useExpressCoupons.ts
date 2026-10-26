import Taro from '@tarojs/taro'

import { type Dispatch, type SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { expressCouponService } from '@/services/coupon'
import type { CouponCardView } from '@/services/coupon'
import {
  EXPRESS_COUPON_AUTO_QUERY_DELAY_MS,
  canAutoApplyExpressCoupon,
  createExpressCouponInputKey,
  createExpressCouponQueryRequest,
  createExpressCouponRequestKey,
  expressDraftStorage,
  shouldShowExpressCouponRow,
  updateExpressCouponNumber,
  updateExpressService
} from '@/services/express'
import type { ExpressDraft } from '@/services/express'
import { useLatestRequestRunner } from '@/shared/async/useLatestRequest'
import { ensureAuthenticated, hasValidSession } from '@/shared/navigation/authGuard'
import { APP_ROUTES } from '@/shared/navigation/routes'

interface UseExpressCouponsOptions {
  draft: ExpressDraft
  setDraft: Dispatch<SetStateAction<ExpressDraft>>
  onInvalidateQuote: () => void
  contractEnabled?: boolean
  monthlyEnabled?: boolean | null
}

function createCouponRecommendKey(draft: ExpressDraft) {
  return JSON.stringify([draft.goods.weight, draft.goods.volume, draft.selectedProduct?.omsProductCode ?? '', draft.selectedProduct?.mainRoutePref ?? ''])
}

/** 寄件页的优惠券匹配：草稿变化后自动查询可用券，并在选券后让报价重新计算。 */
export function useExpressCoupons({ draft, setDraft, onInvalidateQuote, contractEnabled = false, monthlyEnabled = null }: UseExpressCouponsOptions) {
  const [available, setAvailable] = useState<CouponCardView[]>([])
  const [unavailable, setUnavailable] = useState<CouponCardView[]>([])
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const request = useMemo(() => createExpressCouponQueryRequest(draft), [draft])
  const requestKey = createExpressCouponRequestKey(draft)
  const mountedRef = useRef(true)
  const autoQueryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestDraft = useRef(draft)
  const latestRequest = useRef(request)
  const latestRequestKey = useRef(requestKey)
  const recommendKey = useRef('')
  const autoCouponCode = useRef('')
  const couponInputKey = createExpressCouponInputKey(draft)
  const lastCouponInputKey = useRef('')
  const hadCouponProduct = useRef(false)
  const startRequest = useCallback(() => {
    if (!mountedRef.current) {
      return
    }

    setStatus('loading')
    setMessage('')
  }, [])
  const finishRequest = useCallback(() => {
    if (!mountedRef.current) {
      return
    }

    setStatus(current => (current === 'loading' ? 'idle' : current))
  }, [])
  const { invalidateLatestRequest, runLatestRequest } = useLatestRequestRunner(startRequest, finishRequest)

  latestDraft.current = draft
  latestRequest.current = request
  latestRequestKey.current = requestKey

  const clearAutoQueryTimer = useCallback(() => {
    if (autoQueryTimerRef.current) {
      clearTimeout(autoQueryTimerRef.current)
      autoQueryTimerRef.current = null
    }
  }, [])

  const applyCouponCode = useCallback(
    (couponCode: string) => {
      const current = latestDraft.current
      const code = couponCode.replace(/\s+/g, '').toUpperCase()

      if (code === current.couponNumber) {
        return
      }

      const cancelMonthly = Boolean(code) && current.service.paymentType === 'MONTH_PAY'

      onInvalidateQuote()
      setDraft(currentDraft => {
        const nextDraft = updateExpressCouponNumber(currentDraft, code)

        return cancelMonthly ? updateExpressService(nextDraft, { paymentType: 'MP' }) : nextDraft
      })

      if (cancelMonthly) {
        Taro.showToast({ title: '已取消月结支付', icon: 'none' })
      }
    },
    [onInvalidateQuote, setDraft]
  )

  const handleQuery = useCallback(async () => {
    clearAutoQueryTimer()

    const currentRequest = latestRequest.current
    const currentKey = latestRequestKey.current

    if (!hasValidSession()) {
      setStatus('idle')
      setMessage('登录后可匹配当前订单优惠券')
      return
    }

    if (!currentRequest || !currentKey) {
      setStatus('idle')
      setMessage('计价完成后自动匹配优惠券')
      return
    }

    try {
      await runLatestRequest(
        currentKey,
        () => expressCouponService.queryOrderCoupons(currentRequest),
        response => {
          if (!mountedRef.current || latestRequestKey.current !== currentKey) {
            return
          }

          if (!response.status || !response.result) {
            setAvailable([])
            setUnavailable([])
            setStatus('error')
            setMessage(response.message || '可用优惠券查询失败，请重试')

            if (latestDraft.current.couponNumber) {
              autoCouponCode.current = ''
              applyCouponCode('')
            }

            return
          }

          const availableCoupons = response.result.available
          const unavailableCoupons = response.result.unavailable
          const current = latestDraft.current
          const bestCoupon = availableCoupons[0]
          const nextRecommendKey = createCouponRecommendKey(current)

          setAvailable(availableCoupons)
          setUnavailable(unavailableCoupons)
          setStatus('done')
          setMessage(availableCoupons.length ? '' : '当前订单暂无可用优惠券')

          if (bestCoupon && canAutoApplyExpressCoupon(current, { contractEnabled, monthlyEnabled }) && recommendKey.current !== nextRecommendKey) {
            recommendKey.current = nextRecommendKey

            const autoOwned = !current.couponNumber || current.couponNumber === autoCouponCode.current

            if (autoOwned && bestCoupon.code !== current.couponNumber) {
              autoCouponCode.current = bestCoupon.code
              applyCouponCode(bestCoupon.code)
              return
            }
          }

          if (!availableCoupons.length && !unavailableCoupons.length && current.couponNumber) {
            applyCouponCode('')
          }
        }
      )
    } catch {
      if (mountedRef.current && latestRequestKey.current === currentKey) {
        setAvailable([])
        setUnavailable([])
        setStatus('error')
        setMessage('可用优惠券查询失败，请检查网络后重试')

        if (latestDraft.current.couponNumber) {
          autoCouponCode.current = ''
          applyCouponCode('')
        }
      }
    }
  }, [applyCouponCode, clearAutoQueryTimer, contractEnabled, monthlyEnabled, runLatestRequest])

  useEffect(() => {
    if (!requestKey || !hasValidSession()) {
      hadCouponProduct.current = false
      lastCouponInputKey.current = ''
      invalidateLatestRequest()
      clearAutoQueryTimer()
      setAvailable([])
      setUnavailable([])
      handleQuery()
      return undefined
    }

    if (hadCouponProduct.current && lastCouponInputKey.current === couponInputKey) {
      return undefined
    }

    lastCouponInputKey.current = couponInputKey
    hadCouponProduct.current = true
    invalidateLatestRequest()
    clearAutoQueryTimer()
    setMessage('')

    const timer = setTimeout(() => {
      if (autoQueryTimerRef.current === timer) {
        autoQueryTimerRef.current = null
      }

      handleQuery()
    }, EXPRESS_COUPON_AUTO_QUERY_DELAY_MS)

    autoQueryTimerRef.current = timer

    return () => {
      clearTimeout(timer)

      if (autoQueryTimerRef.current === timer) {
        autoQueryTimerRef.current = null
      }
    }
  }, [clearAutoQueryTimer, couponInputKey, handleQuery, invalidateLatestRequest, requestKey])

  useEffect(
    () => () => {
      mountedRef.current = false
      clearAutoQueryTimer()
      invalidateLatestRequest()
    },
    [clearAutoQueryTimer, invalidateLatestRequest]
  )

  const applyCoupon = useCallback((couponCode: string) => applyCouponCode(couponCode), [applyCouponCode])

  const handleLogin = useCallback(async () => {
    await expressDraftStorage.preserveForLogin(latestDraft.current)
    ensureAuthenticated({
      redirectUrl: APP_ROUTES.express,
      replace: true,
      message: '请先登录后使用优惠券'
    })
  }, [])

  const showRow = shouldShowExpressCouponRow({
    available: available.length,
    unavailable: unavailable.length,
    requestReady: Boolean(requestKey),
    selected: Boolean(draft.couponNumber),
    status
  })

  return {
    available,
    loginRequired: !hasValidSession(),
    message,
    requestReady: Boolean(requestKey),
    showRow,
    status,
    unavailable,
    onApplyCode: applyCoupon,
    onClear: () => applyCoupon(''),
    onLogin: handleLogin,
    onRefresh: handleQuery,
    onSelect: (coupon: CouponCardView) => applyCoupon(coupon.code)
  }
}

export type ExpressCouponController = ReturnType<typeof useExpressCoupons>
