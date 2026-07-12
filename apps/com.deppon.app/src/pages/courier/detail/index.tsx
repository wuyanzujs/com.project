import { Image, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow, useRouter } from '@tarojs/taro'

import { useCallback, useState } from 'react'

import { courierService } from '../../../services/courier'
import { AppPressable } from '../../../shared/components'
import { navigateToAppRoute } from '../../../shared/navigation/appNavigation'
import { ensureAuthenticated } from '../../../shared/navigation/authGuard'
import { APP_ROUTES } from '../../../shared/navigation/routes'
import { createAppRouteUrl } from '../../../shared/navigation/routeUrl'
import { getNativeCapabilityErrorMessage } from '../../../shared/platform/capabilities'
import { PhoneNumberError, dialPhone } from '../../../shared/platform/phone'
import { APP_STYLE_COLORS } from '../../../styles/nativeTokens'

import type { CourierDetailView } from '../../../services/courier'


import './index.scss'
import './content.scss'

const COURIER_AVATAR = 'https://ca.deppon.com.cn/ows/assets/postman/1.png'

function decodeParam(value?: string) {
  if (!value) {
    return ''
  }

  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

const CourierDetailPage = () => {
  const router = useRouter()
  const courierNo = decodeParam(router.params.id)
  const [detail, setDetail] = useState<CourierDetailView | null>(null)
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const loadDetail = useCallback(async () => {
    if (loading || !courierNo) {
      if (!courierNo) {
        setErrorMessage('缺少快递员工号')
      }
      return
    }

    setLoading(true)
    setErrorMessage('')

    try {
      const response = await courierService.queryDetail(courierNo)

      if (!response.status || !response.result) {
        setDetail(null)
        setErrorMessage(response.message || '未查询到快递员信息')
        return
      }

      setDetail(response.result)
    } finally {
      setLoading(false)
    }
  }, [courierNo, loading])

  useDidShow(() => {
    if (
      ensureAuthenticated({
        redirectUrl: createAppRouteUrl(APP_ROUTES.courierDetail, {
          id: courierNo
        }),
        replace: true
      })
    ) {
      loadDetail()
    }
  })

  const handleDial = async () => {
    if (!detail) {
      return
    }

    try {
      await dialPhone(detail.courier.mobile || '95353')
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

  const handleExpress = () => {
    if (!detail || !courierService.prepareExpress(detail.courier.id)) {
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

  const handleOpenDepartment = () => {
    if (!detail?.courier.departmentCode) {
      Taro.showToast({
        title: '暂无所属网点信息',
        icon: 'none'
      })
      return
    }

    navigateToAppRoute(
      createAppRouteUrl(APP_ROUTES.stationDetail, {
        code: detail.courier.departmentCode,
        source: 'COURIER_DETAIL'
      })
    )
  }

  const handleBinding = async () => {
    if (!detail || processing) {
      return
    }

    if (detail.bindingState === 'unknown') {
      loadDetail()
      return
    }

    const isBound = detail.bindingState === 'bound'
    const confirm = await Taro.showModal({
      title: isBound ? '取消关注' : '关注快递员',
      content: isBound
        ? `确定取消关注 ${detail.courier.name} 吗？`
        : `确定关注 ${detail.courier.name} 吗？`,
      confirmText: isBound ? '取消关注' : '确认关注',
      confirmColor: isBound
        ? APP_STYLE_COLORS.status.dangerTextStrong
        : APP_STYLE_COLORS.brand.default
    })

    if (!confirm.confirm) {
      return
    }

    setProcessing(true)

    try {
      const response = isBound
        ? await courierService.unbind(detail.courier.id)
        : await courierService.bind(detail.courier.id)

      if (!response.status) {
        Taro.showToast({
          title: response.message || '操作失败，请稍后再试',
          icon: 'none'
        })
        return
      }

      setDetail(current =>
        current
          ? {
              ...current,
              bindingState: isBound ? 'unbound' : 'bound'
            }
          : current
      )
      Taro.showToast({
        title: isBound ? '已取消关注' : '关注成功',
        icon: 'success'
      })
    } finally {
      setProcessing(false)
    }
  }

  return (
    <ScrollView className='courier-detail-page' scrollY>
      <View className='courier-detail-header'>
        <Image className='courier-detail-header__avatar' src={COURIER_AVATAR} />
        <View className='courier-detail-header__body'>
          <Text className='courier-detail-header__name'>
            {detail?.courier.name || '快递员详情'}
          </Text>
          <Text className='courier-detail-header__summary'>
            {detail
              ? `${detail.courier.ratingText} · 工号 ${detail.courier.id}`
              : loading
                ? '正在同步快递员信息'
                : errorMessage || '暂未获取到快递员信息'}
          </Text>
        </View>
      </View>

      {detail && (
        <>
          <View className='courier-detail-actions'>
            <AppPressable flex
              className='courier-detail-action courier-detail-action--quiet'
              onPress={handleDial}
            >
              <Text className='courier-detail-action__text courier-detail-action__text--quiet'>
                联系
              </Text>
            </AppPressable>
            <AppPressable flex
              className='courier-detail-action courier-detail-action--quiet'
              onPress={handleBinding}
            >
              <Text className='courier-detail-action__text courier-detail-action__text--quiet'>
                {processing
                  ? '处理中'
                  : detail.bindingState === 'bound'
                    ? '取消关注'
                    : detail.bindingState === 'unbound'
                      ? '关注'
                      : '重试状态'}
              </Text>
            </AppPressable>
            <AppPressable flex className='courier-detail-action' onPress={handleExpress}>
              <Text className='courier-detail-action__text'>找他寄件</Text>
            </AppPressable>
          </View>

          <View className='courier-detail-section'>
            <Text className='courier-detail-section__title'>服务信息</Text>
            <View className='courier-detail-stats'>
              <View className='courier-detail-stat courier-detail-stat--right'>
                <Text className='courier-detail-stat__value'>
                  {detail.courier.signedCount || '--'}
                </Text>
                <Text className='courier-detail-stat__label'>累计服务</Text>
              </View>
              <View className='courier-detail-stat'>
                <Text className='courier-detail-stat__value'>
                  {detail.courier.rewardTimes || '--'}
                </Text>
                <Text className='courier-detail-stat__label'>获得认可</Text>
              </View>
            </View>

            <View className='courier-detail-row'>
              <Text className='courier-detail-row__label'>联系电话</Text>
              <Text className='courier-detail-row__value'>
                {detail.courier.mobile || '95353'}
              </Text>
            </View>
            <View className='courier-detail-row'>
              <Text className='courier-detail-row__label'>所属网点</Text>
              <Text className='courier-detail-row__value'>
                {detail.courier.departmentName || '--'}
              </Text>
            </View>

            {!!detail.courier.departmentCode && (
              <AppPressable
                className='courier-detail-department'
                onPress={handleOpenDepartment}
              >
                <Text className='courier-detail-department__text'>
                  查看网点详情
                </Text>
              </AppPressable>
            )}
          </View>

          {!!detail.courier.labels.length && (
            <View className='courier-detail-section'>
              <Text className='courier-detail-section__title'>服务评价</Text>
              <View className='courier-detail-labels'>
                {detail.courier.labels.map(label => (
                  <View className='courier-detail-label' key={label.name}>
                    <Text className='courier-detail-label__text'>
                      {label.name}
                      {label.count ? ` ${label.count}` : ''}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </>
      )}

      {!detail && !loading && (
        <View className='courier-detail-empty'>
          <Text className='courier-detail-empty__title'>
            {errorMessage || '未查询到快递员信息'}
          </Text>
          <AppPressable className='courier-detail-empty__button' onPress={loadDetail}>
            <Text className='courier-detail-empty__button-text'>重新加载</Text>
          </AppPressable>
        </View>
      )}
    </ScrollView>
  )
}

export default CourierDetailPage
