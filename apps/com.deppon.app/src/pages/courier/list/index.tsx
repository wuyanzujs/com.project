import { Image, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'

import { useCallback, useState } from 'react'

import { courierService } from '../../../services/courier'
import { navigateToAppRoute } from '../../../shared/navigation/appNavigation'
import { ensureAuthenticated } from '../../../shared/navigation/authGuard'
import { APP_ROUTES } from '../../../shared/navigation/routes'
import { createAppRouteUrl } from '../../../shared/navigation/routeUrl'
import { getNativeCapabilityErrorMessage } from '../../../shared/platform/capabilities'
import { PhoneNumberError, dialPhone } from '../../../shared/platform/phone'
import { scanAppCode } from '../../../shared/platform/scan'

import type { CourierView } from '../../../services/courier'

import './index.scss'

const COURIER_AVATAR = 'https://ca.deppon.com.cn/ows/assets/postman/1.png'

function createCourierDetailUrl(courierNo: string) {
  return createAppRouteUrl(APP_ROUTES.courierDetail, {
    id: courierNo
  })
}

const CourierListPage = () => {
  const [couriers, setCouriers] = useState<CourierView[]>([])
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const loadCouriers = useCallback(async () => {
    if (loading) {
      return
    }

    setLoading(true)
    setErrorMessage('')

    try {
      const response = await courierService.queryList()

      if (!response.status || !response.result) {
        setCouriers([])
        setErrorMessage(response.message || '暂未获取到专属快递员')
        return
      }

      setCouriers(response.result)
    } finally {
      setLoading(false)
    }
  }, [loading])

  useDidShow(() => {
    if (
      ensureAuthenticated({
        redirectUrl: APP_ROUTES.courierList,
        replace: true
      })
    ) {
      loadCouriers()
    }
  })

  const handleOpenDetail = (courier: CourierView) => {
    navigateToAppRoute(createCourierDetailUrl(courier.id), {
      login: true
    })
  }

  const handleExpress = (courier: CourierView) => {
    if (!courierService.prepareExpress(courier.id)) {
      Taro.showToast({
        title: '缺少快递员工号',
        icon: 'none'
      })
      return
    }

    navigateToAppRoute(APP_ROUTES.express, {
      login: true
    })
  }

  const handleDial = async (courier: CourierView) => {
    try {
      await dialPhone(courier.mobile || '95353')
    } catch (error) {
      Taro.showToast({
        title:
          error instanceof PhoneNumberError
            ? error.message
            : getNativeCapabilityErrorMessage(error),
        icon: 'none'
      })
    }
  }

  const handleScan = async () => {
    try {
      const result = await scanAppCode('COURIER_LIST')

      if (
        result.kind !== 'unsupported' ||
        result.reason !== 'sendQrCode' ||
        result.role !== 'pickupManId' ||
        !result.value
      ) {
        Taro.showToast({
          title: '请扫描有效的快递员二维码',
          icon: 'none'
        })
        return
      }

      const response = await courierService.bind(result.value)

      if (!response.status) {
        Taro.showToast({
          title: response.message || '关注失败，请稍后再试',
          icon: 'none'
        })
        return
      }

      navigateToAppRoute(createCourierDetailUrl(result.value), {
        login: true
      })
    } catch (error) {
      Taro.showToast({
        title: getNativeCapabilityErrorMessage(error),
        icon: 'none'
      })
    }
  }

  return (
    <ScrollView className='courier-list-page' scrollY>
      <View className='courier-list-header'>
        <Text className='courier-list-header__label'>Courier</Text>
        <Text className='courier-list-header__title'>专属快递员</Text>
        <Text className='courier-list-header__summary'>
          {couriers.length
            ? `已关注 ${couriers.length} 位快递员`
            : '当前账号暂无已关注快递员'}
        </Text>
      </View>

      <View className='courier-list-actions'>
        <View
          className='courier-list-action courier-list-action--quiet'
          onClick={loadCouriers}
        >
          <Text className='courier-list-action__text courier-list-action__text--quiet'>
            {loading ? '同步中' : '刷新'}
          </Text>
        </View>
        <View className='courier-list-action' onClick={handleScan}>
          <Text className='courier-list-action__text'>扫描快递员码</Text>
        </View>
      </View>

      <View className='courier-list-content'>
        {couriers.map(courier => (
          <View className='courier-card' key={courier.id}>
            <View className='courier-card__main'>
              <Image className='courier-card__avatar' src={COURIER_AVATAR} />
              <View className='courier-card__body'>
                <View className='courier-card__title-row'>
                  <Text className='courier-card__name'>{courier.name}</Text>
                  <Text className='courier-card__rating'>
                    {courier.ratingText}
                  </Text>
                </View>
                <Text className='courier-card__department'>
                  {courier.departmentName || '德邦快递'}
                </Text>
                <Text className='courier-card__meta'>
                  {courier.signedCount
                    ? `累计服务 ${courier.signedCount} 单`
                    : `工号 ${courier.id}`}
                </Text>
              </View>
            </View>

            <View className='courier-card__actions'>
              <View
                className='courier-card__button courier-card__button--quiet'
                onClick={() => handleDial(courier)}
              >
                <Text className='courier-card__button-text courier-card__button-text--quiet'>
                  联系
                </Text>
              </View>
              <View
                className='courier-card__button courier-card__button--quiet'
                onClick={() => handleOpenDetail(courier)}
              >
                <Text className='courier-card__button-text courier-card__button-text--quiet'>
                  详情
                </Text>
              </View>
              <View
                className='courier-card__button'
                onClick={() => handleExpress(courier)}
              >
                <Text className='courier-card__button-text'>找他寄件</Text>
              </View>
            </View>
          </View>
        ))}

        {!couriers.length && !loading && (
          <View className='courier-list-empty'>
            <Image className='courier-list-empty__image' src={COURIER_AVATAR} />
            <Text className='courier-list-empty__title'>
              {errorMessage || '暂无已关注快递员'}
            </Text>
          </View>
        )}
      </View>

      {loading && (
        <Text className='courier-list-loading'>正在同步快递员信息...</Text>
      )}
    </ScrollView>
  )
}

export default CourierListPage
