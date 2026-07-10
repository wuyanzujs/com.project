import Taro from '@tarojs/taro'

import { useCallback, useMemo, useState } from 'react'

import {
  createOrderSubscriptionAction,
  orderSubscriptionService
} from '../../../../services/order'

export function useOrderSubscription() {
  const [subscribed, setSubscribed] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)
  const action = useMemo(
    () => createOrderSubscriptionAction(subscribed, loading),
    [loading, subscribed]
  )

  const reset = useCallback(() => {
    setSubscribed(null)
  }, [])

  const loadStatus = useCallback(async (waybillNumber?: string | null) => {
    const response = await orderSubscriptionService.queryStatus(waybillNumber)

    setSubscribed(
      response.status && typeof response.result === 'boolean'
        ? response.result
        : null
    )

    return response
  }, [])

  const toggle = useCallback(
    async (waybillNumber?: string | null) => {
      if (!waybillNumber || subscribed === null || loading) {
        return
      }

      if (subscribed) {
        const confirm = await Taro.showModal({
          title: '取消关注',
          content: `确定取消关注运单 ${waybillNumber} 吗？`,
          cancelText: '暂不取消',
          confirmText: '确认取消'
        })

        if (!confirm.confirm) {
          return
        }
      }

      setLoading(true)

      try {
        const nextSubscribed = !subscribed
        const response = await orderSubscriptionService.setSubscribed(
          waybillNumber,
          nextSubscribed
        )

        Taro.showToast({
          title: response.status
            ? nextSubscribed
              ? '关注成功'
              : '已取消关注'
            : response.message || '操作失败，请稍后再试',
          icon: 'none'
        })

        if (response.status) {
          setSubscribed(nextSubscribed)
        }
      } finally {
        setLoading(false)
      }
    },
    [loading, subscribed]
  )

  return {
    action,
    loadStatus,
    reset,
    toggle
  }
}
