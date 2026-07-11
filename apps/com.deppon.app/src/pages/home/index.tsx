import { Image, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'

import { useCallback, useRef } from 'react'

import Banner from './components/banner'
import Menu from './components/menu'
import { HOME_QUICK_ACTIONS } from './home.data'
import {
  applyExpressScanContext,
  createExpressDraft,
  expressDraftBridge
} from '../../services/express'
import { privacyService } from '../../services/privacy'
import { AppIcon } from '../../shared/components/AppIcon'
import AppTabBar from '../../shared/components/AppTabBar'
import { AppSafeAreaView, AppStatusBar } from '../../shared/native'
import { navigateToAppRoute } from '../../shared/navigation/appNavigation'
import { APP_ROUTES } from '../../shared/navigation/routes'
import { createAppRouteUrl } from '../../shared/navigation/routeUrl'
import { getNativeCapabilityErrorMessage } from '../../shared/platform/capabilities'
import { dialPhone } from '../../shared/platform/phone'
import { scanAppCode } from '../../shared/platform/scan'

import type { HomeQuickAction } from './home.data'
import type { AppRoutePath } from '../../shared/navigation/routes'

import './index.scss'

const HomePage = () => {
  const privacyPromptingRef = useRef(false)

  const handleNavigate = (url: AppRoutePath) => {
    navigateToAppRoute(url)
  }

  const handleQuickAction = async (action: HomeQuickAction) => {
    if (action.behavior !== 'scan') {
      handleNavigate(action.route)
      return
    }

    try {
      const result = await scanAppCode('HOME_MENU')

      if (result.kind === 'waybill') {
        navigateToAppRoute(
          createAppRouteUrl(APP_ROUTES.orderDetail, {
            waybillNumber: result.waybillNumber,
            source: 'HOME_MENU_SCAN'
          })
        )
        return
      }

      if (result.kind === 'printCode') {
        navigateToAppRoute(
          createAppRouteUrl(APP_ROUTES.printCenter, {
            printId: result.printId,
            source: 'HOME_MENU_SCAN'
          }),
          {
            message: '请先登录后使用面单打印'
          }
        )
        return
      }

      if (
        result.reason === 'sendQrCode' &&
        result.role &&
        result.value
      ) {
        expressDraftBridge.carryFromScanQrCode(
          applyExpressScanContext(createExpressDraft(), {
            role: result.role,
            value: result.value,
            sceneId: result.sceneId,
            expressRole: result.expressRole
          })
        )
        navigateToAppRoute(APP_ROUTES.express)
        return
      }

      Taro.showToast({
        title: result.message,
        icon: 'none'
      })
    } catch (error) {
      Taro.showToast({
        title: getNativeCapabilityErrorMessage(error),
        icon: 'none'
      })
    }
  }

  const handleServicePhone = async () => {
    try {
      await dialPhone('95353')
    } catch {
      Taro.showToast({
        title: '暂无法拨打客服电话',
        icon: 'none'
      })
    }
  }

  const checkHomePrivacyPrompt = useCallback(async () => {
    if (privacyPromptingRef.current) {
      return
    }

    privacyPromptingRef.current = true

    try {
      const prompt = await privacyService.queryHomePrivacyPrompt()

      if (!prompt) {
        return
      }

      const result = await Taro.showModal({
        title: prompt.title,
        content: prompt.content,
        confirmText: prompt.confirmText,
        cancelText: prompt.cancelText
      })

      privacyService.dismissHomePrivacyPrompt(prompt)

      if (result.confirm) {
        navigateToAppRoute(APP_ROUTES.privacySettings)
      }
    } finally {
      privacyPromptingRef.current = false
    }
  }, [])

  useDidShow(() => {
    checkHomePrivacyPrompt()
  })

  return (
    <AppSafeAreaView backgroundColor='#f4f6f8' edges={[]}>
      <AppStatusBar theme='light' />
      <ScrollView className='home-page' scrollY>
        <Banner onClick={() => handleNavigate(APP_ROUTES.express)} />

        <View className='home-primary-actions'>
          <View
            className='home-primary-action'
            onClick={() => handleNavigate(APP_ROUTES.express)}
          >
            <Image
              className='home-primary-action__image'
              mode='aspectFit'
              src='https://ca.deppon.com.cn/ows/assets/home/1.png'
            />
            <View>
              <Text className='home-primary-action__title'>寄快递</Text>
              <Text className='home-primary-action__summary'>1小时取件</Text>
            </View>
          </View>
          <View className='home-primary-actions__divider' />
          <View
            className='home-primary-action'
            onClick={() => handleNavigate(APP_ROUTES.express)}
          >
            <Image
              className='home-primary-action__image'
              mode='aspectFit'
              src='https://ca.deppon.com.cn/ows/assets/home/2.png'
            />
            <View>
              <Text className='home-primary-action__title'>发物流</Text>
              <Text className='home-primary-action__summary'>
                大件/零担/整车
              </Text>
            </View>
          </View>
        </View>

        <Menu actions={HOME_QUICK_ACTIONS} onSelect={handleQuickAction} />

        <View className='home-support-bar'>
          <View className='home-support-bar__item' onClick={handleServicePhone}>
            <AppIcon color='#16181a' name='phone' size={24} />
            <Text className='home-support-bar__text'>95353</Text>
          </View>
          <View className='home-support-bar__divider' />
          <View
            className='home-support-bar__item'
            onClick={() => handleNavigate(APP_ROUTES.supportCenter)}
          >
            <AppIcon color='#16181a' name='headphones' size={24} />
            <Text className='home-support-bar__text'>在线客服</Text>
          </View>
          <View className='home-support-bar__divider' />
          <View
            className='home-support-bar__item'
            onClick={() => handleNavigate(APP_ROUTES.customerCenter)}
          >
            <AppIcon color='#16181a' name='contact' size={24} />
            <Text className='home-support-bar__text'>企业服务</Text>
          </View>
        </View>

        <View className='home-query-bar'>
          <View
            className='home-query-bar__main'
            onClick={() => handleNavigate(APP_ROUTES.dispatchQuery)}
          >
            <Text className='home-query-bar__title'>服务查询</Text>
            <Text className='home-query-bar__summary'>
              网点/派送范围/收寄标准
            </Text>
          </View>
          <View
            className='home-query-bar__price'
            onClick={() => handleNavigate(APP_ROUTES.priceQuery)}
          >
            <Text className='home-query-bar__price-text'>查价格/查时效</Text>
          </View>
        </View>
      </ScrollView>
      <AppTabBar active='home' />
    </AppSafeAreaView>
  )
}

export default HomePage
