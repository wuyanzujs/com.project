import Taro from '@tarojs/taro'

import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import { expressCouponService } from '../../../services/coupon'
import {
  EXPRESS_COUPON_AUTO_QUERY_DELAY_MS,
  createExpressCouponQueryRequest,
  createExpressCouponRequestKey,
  expressDraftStorage,
  updateExpressCouponNumber
} from '../../../services/express'
import { useLatestRequestRunner } from '../../../shared/async/useLatestRequest'
import {
  ensureAuthenticated,
  hasValidSession
} from '../../../shared/navigation/authGuard'
import { APP_ROUTES } from '../../../shared/navigation/routes'

import type { CouponCardView } from '../../../services/coupon'
import type { ExpressDraft } from '../../../services/express'

interface UseExpressCouponsOptions {
  draft: ExpressDraft
  setDraft: Dispatch<SetStateAction<ExpressDraft>>
  onInvalidateQuote: () => void
}

export function useExpressCoupons({
  draft,
  setDraft,
  onInvalidateQuote
}: UseExpressCouponsOptions) {
  const [available, setAvailable] = useState<CouponCardView[]>([])
  const [unavailable, setUnavailable] = useState<CouponCardView[]>([])
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<
    'idle' | 'loading' | 'done' | 'error'
  >('idle')
  const request = useMemo(
    () => createExpressCouponQueryRequest(draft),
    [draft]
  )
  const requestKey = createExpressCouponRequestKey(draft)
  const mountedRef = useRef(true)
  const autoQueryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestDraft = useRef(draft)
  const latestRequest = useRef(request)
  const latestRequestKey = useRef(requestKey)
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
  const { invalidateLatestRequest, runLatestRequest } = useLatestRequestRunner(
    startRequest,
    finishRequest
  )

  latestDraft.current = draft
  latestRequest.current = request
  latestRequestKey.current = requestKey

  const clearAutoQueryTimer = useCallback(() => {
    if (autoQueryTimerRef.current) {
      clearTimeout(autoQueryTimerRef.current)
      autoQueryTimerRef.current = null
    }
  }, [])

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
      setMessage(
        latestDraft.current.couponNumber
          ? '优惠券已选择，请重新获取价格校验'
          : '获取产品价格后可匹配优惠券'
      )
      return
    }

    try {
      await runLatestRequest(
        currentKey,
        () => expressCouponService.queryOrderCoupons(currentRequest),
        response => {
          if (
            !mountedRef.current ||
            latestRequestKey.current !== currentKey
          ) {
            return
          }

          if (!response.status || !response.result) {
            setAvailable([])
            setUnavailable([])
            setStatus('error')
            setMessage(response.message || '可用优惠券查询失败，请重试')
            return
          }

          setAvailable(response.result.available)
          setUnavailable(response.result.unavailable)
          setStatus('done')
          setMessage(
            response.result.available.length
              ? ''
              : '当前订单暂无可用优惠券'
          )
        }
      )
    } catch {
      if (mountedRef.current && latestRequestKey.current === currentKey) {
        setAvailable([])
        setUnavailable([])
        setStatus('error')
        setMessage('可用优惠券查询失败，请检查网络后重试')
      }
    }
  }, [clearAutoQueryTimer, runLatestRequest])

  useEffect(() => {
    invalidateLatestRequest()
    clearAutoQueryTimer()
    setAvailable([])
    setUnavailable([])

    if (!requestKey || !hasValidSession()) {
      void handleQuery()
      return undefined
    }

    setStatus('idle')
    setMessage('')

    const timer = setTimeout(() => {
      if (autoQueryTimerRef.current === timer) {
        autoQueryTimerRef.current = null
      }

      void handleQuery()
    }, EXPRESS_COUPON_AUTO_QUERY_DELAY_MS)

    autoQueryTimerRef.current = timer

    return () => {
      clearTimeout(timer)

      if (autoQueryTimerRef.current === timer) {
        autoQueryTimerRef.current = null
      }
    }
  }, [
    clearAutoQueryTimer,
    handleQuery,
    invalidateLatestRequest,
    requestKey
  ])

  useEffect(
    () => () => {
      mountedRef.current = false
      clearAutoQueryTimer()
      invalidateLatestRequest()
    },
    [clearAutoQueryTimer, invalidateLatestRequest]
  )

  const applyCoupon = useCallback(
    (couponCode: string) => {
      const normalizedCode = couponCode.replace(/\s+/g, '').toUpperCase()

      if (normalizedCode === latestDraft.current.couponNumber) {
        return
      }

      onInvalidateQuote()
      setDraft(current => updateExpressCouponNumber(current, normalizedCode))
      Taro.showToast({
        title: normalizedCode
          ? '优惠券已选择，请重新获取价格'
          : '已取消优惠券，请重新获取价格',
        icon: 'none'
      })
    },
    [onInvalidateQuote, setDraft]
  )

  const handleLogin = useCallback(async () => {
    await expressDraftStorage.preserveForLogin(latestDraft.current)
    ensureAuthenticated({
      redirectUrl: APP_ROUTES.express,
      replace: true,
      message: '请先登录后使用优惠券'
    })
  }, [])

  return {
    available,
    loginRequired: !hasValidSession(),
    message,
    requestReady: Boolean(requestKey),
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
