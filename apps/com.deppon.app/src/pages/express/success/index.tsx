import { Text, View } from '@tarojs/components'
import { useLoad, useRouter } from '@tarojs/taro'

import { useEffect, useMemo, useState } from 'react'

import { expressDraftBridge } from '@/services/express/draftBridge'
import { getOrderIdentityText, orderService } from '@/services/order'
import type { OrderDetail } from '@/services/order'
import { AppPressable } from '@/shared/components'
import { navigateToAppRoute } from '@/shared/navigation/appNavigation'
import { APP_ROUTES } from '@/shared/navigation/routes'
import { createAppRouteUrl } from '@/shared/navigation/routeUrl'

import { CourierCard } from './CourierCard'

import './index.scss'
import './content.scss'

// 下单成功页：标题「下单成功」，信息区「寄件信息」，
// 底部「继续寄件 / 查看订单」，并有「N秒后自动返回首页」倒计时。
const RETURN_HOME_SECONDS = 60

function parseParams(params: Record<string, string | undefined>) {
  return {
    orderNumber: params.orderNumber || params.orderNo || '',
    waybillNumber: params.waybillNumber || params.waybillNo || ''
  }
}

const ExpressSuccessPage = () => {
  const router = useRouter()
  const routeParams = useMemo(() => parseParams(router.params as Record<string, string | undefined>), [router.params])
  const [detail, setDetail] = useState<OrderDetail | null>(null)
  const [countDown, setCountDown] = useState(RETURN_HOME_SECONDS)

  useEffect(() => {
    if (countDown <= 0) {
      navigateToAppRoute(APP_ROUTES.express, {
        replace: true
      })
      return undefined
    }

    const timer = setTimeout(() => {
      setCountDown(current => Math.max(current - 1, 0))
    }, 1000)

    return () => clearTimeout(timer)
  }, [countDown])

  useLoad(async () => {
    if (!routeParams.orderNumber && !routeParams.waybillNumber) {
      return
    }

    try {
      const response = await orderService.queryDetail(routeParams)

      if (response.status && response.result) {
        setDetail(response.result)
      }
    } catch {
      // 详情补充信息失败不影响下单成功和继续寄件。
    }
  })

  const handleViewOrder = () => {
    navigateToAppRoute(createAppRouteUrl(APP_ROUTES.orderDetail, routeParams))
  }

  const handleContinue = () => {
    expressDraftBridge.carryFreshSend()
    navigateToAppRoute(APP_ROUTES.express)
  }

  return (
    <View className='express-success-page'>
      <View className='express-success-hero'>
        <Text className='express-success-hero__icon'>✓</Text>
        <Text className='express-success-hero__title'>下单成功</Text>
        <Text className='express-success-hero__summary'>{detail ? getOrderIdentityText(detail) : getOrderIdentityText(routeParams)}</Text>
      </View>

      <View className='express-success-section'>
        <Text className='express-success-section__title'>寄件信息</Text>
        <View className='express-success-row'>
          <Text className='express-success-row__label'>订单号</Text>
          <Text className='express-success-row__value'>{routeParams.orderNumber || detail?.orderNumber || '--'}</Text>
        </View>
        <View className='express-success-row'>
          <Text className='express-success-row__label'>运单号</Text>
          <Text className='express-success-row__value'>{routeParams.waybillNumber || detail?.waybillNumber || '--'}</Text>
        </View>
      </View>

      {(routeParams.orderNumber || detail?.orderNumber) && <CourierCard orderNumber={routeParams.orderNumber || detail?.orderNumber || ''} />}

      <Text className='express-success-countdown'>{countDown}秒后自动返回首页</Text>

      <View className='express-success-actions'>
        <AppPressable className='express-success-secondary' onPress={handleContinue}>
          <Text className='express-success-secondary__text'>继续寄件</Text>
        </AppPressable>
        <AppPressable flex className='express-success-primary' onPress={handleViewOrder}>
          <Text className='express-success-primary__text'>查看订单</Text>
        </AppPressable>
      </View>
    </View>
  )
}

export default ExpressSuccessPage
