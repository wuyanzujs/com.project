import { Text, View } from '@tarojs/components'
import { useLoad, useRouter } from '@tarojs/taro'

import { useMemo, useState } from 'react'

import { getOrderIdentityText, orderService } from '../../../services/order'
import { navigateToAppRoute } from '../../../shared/navigation/appNavigation'
import { APP_ROUTES } from '../../../shared/navigation/routes'
import { createAppRouteUrl } from '../../../shared/navigation/routeUrl'

import type { OrderDetail } from '../../../services/order'

import './index.scss'

function parseParams(params: Record<string, string | undefined>) {
  return {
    orderNumber: params.orderNumber || params.orderNo || '',
    waybillNumber: params.waybillNumber || params.waybillNo || ''
  }
}

const ExpressSuccessPage = () => {
  const router = useRouter()
  const routeParams = useMemo(
    () => parseParams(router.params as Record<string, string | undefined>),
    [router.params]
  )
  const [detail, setDetail] = useState<OrderDetail | null>(null)

  useLoad(async () => {
    if (!routeParams.orderNumber && !routeParams.waybillNumber) {
      return
    }

    const response = await orderService.queryDetail(routeParams)

    if (response.status && response.result) {
      setDetail(response.result)
    }
  })

  const handleViewDetail = () => {
    navigateToAppRoute(createAppRouteUrl(APP_ROUTES.orderDetail, routeParams))
  }

  const handleContinue = () => {
    navigateToAppRoute(APP_ROUTES.express)
  }

  const handleOrderList = () => {
    navigateToAppRoute(APP_ROUTES.orderList)
  }

  return (
    <View className='express-success-page'>
      <View className='express-success-hero'>
        <Text className='express-success-hero__icon'>✓</Text>
        <Text className='express-success-hero__title'>预约成功</Text>
        <Text className='express-success-hero__summary'>
          {detail
            ? getOrderIdentityText(detail)
            : getOrderIdentityText(routeParams)}
        </Text>
      </View>

      <View className='express-success-section'>
        <Text className='express-success-section__title'>结果信息</Text>
        <View className='express-success-row'>
          <Text className='express-success-row__label'>订单号</Text>
          <Text className='express-success-row__value'>
            {routeParams.orderNumber || detail?.orderNumber || '--'}
          </Text>
        </View>
        <View className='express-success-row'>
          <Text className='express-success-row__label'>运单号</Text>
          <Text className='express-success-row__value'>
            {routeParams.waybillNumber || detail?.waybillNumber || '待生成'}
          </Text>
        </View>
        <View className='express-success-row'>
          <Text className='express-success-row__label'>当前状态</Text>
          <Text className='express-success-row__value'>
            {detail?.orderClassName || '已提交'}
          </Text>
        </View>
      </View>

      <View className='express-success-actions'>
        <View className='express-success-secondary' onClick={handleContinue}>
          <Text className='express-success-secondary__text'>继续寄件</Text>
        </View>
        <View className='express-success-primary' onClick={handleViewDetail}>
          <Text className='express-success-primary__text'>查看详情</Text>
        </View>
      </View>

      <View className='express-success-link' onClick={handleOrderList}>
        <Text className='express-success-link__text'>进入订单列表</Text>
      </View>
    </View>
  )
}

export default ExpressSuccessPage
