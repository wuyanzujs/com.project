import Taro, { useDidShow } from '@tarojs/taro'

import { useCallback, useState } from 'react'


import { couponService } from '@/services/coupon'
import type { CouponDetailView, CouponStatus } from '@/services/coupon'
import {
  createExpressDraft,
  expressDraftBridge,
  expressDraftStorage,
  markExpressQuoteStale
} from '@/services/express'
import { navigateToAppRoute } from '@/shared/navigation/appNavigation'
import { ensureAuthenticated } from '@/shared/navigation/authGuard'
import { APP_ROUTES } from '@/shared/navigation/routes'
import { createAppRouteUrl } from '@/shared/navigation/routeUrl'

interface UseCouponDetailParams {
  couponCode: string
  routeStatus: CouponStatus
  canUse: boolean
  routeUrl: string
}

interface UseCouponDetailResult {
  detail: CouponDetailView | null
  loading: boolean
  message: string
  loadedCode: string
  handleUseCoupon: () => void
}

export function useCouponDetail({
  couponCode,
  routeStatus,
  canUse,
  routeUrl
}: UseCouponDetailParams): UseCouponDetailResult {
  const [detail, setDetail] = useState<CouponDetailView | null>(null)
  const [loadedCode, setLoadedCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const loadDetail = useCallback(async () => {
    if (!couponCode || loading) {
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const response = await couponService.queryCouponDetail(couponCode)

      if (!response.status || !response.result) {
        setDetail(null)
        setMessage(response.message || '暂未获取到优惠券详情')
        return
      }

      setDetail(response.result)
      setLoadedCode(couponCode)
    } finally {
      setLoading(false)
    }
  }, [couponCode, loading])

  useDidShow(() => {
    if (
      !ensureAuthenticated({
        redirectUrl: routeUrl,
        replace: true
      })
    ) {
      return
    }

    if (couponCode && loadedCode !== couponCode) {
      loadDetail()
    }
  })

  const handleUseCoupon = useCallback(() => {
    if (!canUse) {
      const STATUS_TEXT: Record<CouponStatus, string> = {
        AVAILABLE: '可使用',
        UN_AVAILABLE: '不可用',
        USABLE: '可使用',
        USED: '已使用',
        EXPIRED: '已过期'
      }
      Taro.showToast({
        title: STATUS_TEXT[routeStatus],
        icon: 'none'
      })
      return
    }

    const currentDraft = expressDraftStorage.restore() ?? createExpressDraft()
    const displayCode = detail?.code || couponCode
    const nextDraft = markExpressQuoteStale(
      {
        ...currentDraft,
        couponNumber: displayCode
      },
      '优惠券变化，请重新获取价格'
    )

    expressDraftBridge.carryFromCoupon(nextDraft)
    navigateToAppRoute(APP_ROUTES.express, {
      login: true
    })
  }, [canUse, couponCode, detail, routeStatus])

  return { detail, loading, message, loadedCode, handleUseCoupon }
}
