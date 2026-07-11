import { ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'

import { useCallback, useRef, useState } from 'react'

import { orderSubscriptionService } from '../../../services/order'
import { navigateToAppRoute } from '../../../shared/navigation/appNavigation'
import { ensureAuthenticated } from '../../../shared/navigation/authGuard'
import { APP_ROUTES } from '../../../shared/navigation/routes'
import { createAppRouteUrl } from '../../../shared/navigation/routeUrl'

import type { WaybillSubscriptionView } from '../../../services/order'

import './index.scss'

const OrderSubscriptionsPage = () => {
  const [items, setItems] = useState<WaybillSubscriptionView[]>([])
  const [loading, setLoading] = useState(false)
  const [processingId, setProcessingId] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const loadingRef = useRef(false)

  const loadSubscriptions = useCallback(async () => {
    if (loadingRef.current) {
      return
    }

    loadingRef.current = true
    setLoading(true)
    setErrorMessage('')

    try {
      const response = await orderSubscriptionService.queryList()

      if (!response.status || !response.result) {
        setItems([])
        setErrorMessage(response.message || '暂未获取到关注运单')
        return
      }

      setItems(response.result)
    } finally {
      loadingRef.current = false
      setLoading(false)
    }
  }, [])

  useDidShow(() => {
    if (
      ensureAuthenticated({
        redirectUrl: APP_ROUTES.orderSubscriptions,
        replace: true
      })
    ) {
      loadSubscriptions()
    }
  })

  const handleOpenDetail = (item: WaybillSubscriptionView) => {
    navigateToAppRoute(
      createAppRouteUrl(APP_ROUTES.orderDetail, {
        waybillNumber: item.waybillNumber,
        role: item.role,
        source: 'ORDER_SUBSCRIPTIONS',
        view: 'secure'
      }),
      {
        login: true
      }
    )
  }

  const handleCancel = async (item: WaybillSubscriptionView) => {
    if (processingId) {
      return
    }

    const confirm = await Taro.showModal({
      title: '取消关注',
      content: `确定取消关注运单 ${item.waybillNumber} 吗？`,
      cancelText: '暂不取消',
      confirmText: '确认取消'
    })

    if (!confirm.confirm) {
      return
    }

    setProcessingId(item.id)

    try {
      const response = await orderSubscriptionService.setSubscribed(
        item.waybillNumber,
        false
      )

      Taro.showToast({
        title: response.status
          ? '已取消关注'
          : response.message || '取消关注失败，请稍后再试',
        icon: 'none'
      })

      if (response.status) {
        setItems(current =>
          current.filter(currentItem => currentItem.id !== item.id)
        )
      }
    } finally {
      setProcessingId('')
    }
  }

  return (
    <ScrollView className='subscriptions-page' scrollY>
      <View className='subscriptions-toolbar'>
        <Text className='subscriptions-toolbar__summary'>
          共 {items.length} 条
        </Text>
        <View
          className='subscriptions-toolbar__button'
          onClick={loadSubscriptions}
        >
          <Text className='subscriptions-toolbar__button-text'>
            {loading ? '刷新中' : '刷新'}
          </Text>
        </View>
      </View>

      <View className='subscriptions-content'>
        {items.map(item => (
          <View className='subscription-card' key={item.id}>
            <View
              className='subscription-card__body'
              onClick={() => handleOpenDetail(item)}
            >
              <View className='subscription-card__top'>
                <Text className='subscription-card__status'>
                  {item.statusText}
                </Text>
                <Text className='subscription-card__type'>
                  {item.isExpress ? '快递' : '零担'}
                </Text>
              </View>
              <View className='subscription-card__route'>
                <View className='subscription-card__party'>
                  <Text className='subscription-card__city'>
                    {item.senderCity || '--'}
                  </Text>
                  <Text className='subscription-card__name'>
                    {item.senderName || '--'}
                  </Text>
                </View>
                <Text className='subscription-card__arrow'>→</Text>
                <View className='subscription-card__party subscription-card__party--end'>
                  <Text className='subscription-card__city'>
                    {item.consigneeCity || '--'}
                  </Text>
                  <Text className='subscription-card__name'>
                    {item.consigneeName || '--'}
                  </Text>
                </View>
              </View>
              <View className='subscription-card__meta'>
                <Text className='subscription-card__number'>
                  运单 {item.waybillNumber}
                </Text>
                <Text className='subscription-card__time'>
                  {item.createdAt || '--'}
                </Text>
              </View>
            </View>
            <View className='subscription-card__actions'>
              <View
                className='subscription-card__button subscription-card__button--quiet'
                onClick={() => handleCancel(item)}
              >
                <Text className='subscription-card__button-text subscription-card__button-text--quiet'>
                  {processingId === item.id ? '处理中' : '取消关注'}
                </Text>
              </View>
              <View
                className='subscription-card__button'
                onClick={() => handleOpenDetail(item)}
              >
                <Text className='subscription-card__button-text'>查看详情</Text>
              </View>
            </View>
          </View>
        ))}

        {!items.length && !loading && (
          <View className='subscriptions-empty'>
            <Text className='subscriptions-empty__title'>
              {errorMessage || '暂无关注运单'}
            </Text>
            <View
              className='subscriptions-empty__button'
              onClick={loadSubscriptions}
            >
              <Text className='subscriptions-empty__button-text'>重新加载</Text>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  )
}

export default OrderSubscriptionsPage
