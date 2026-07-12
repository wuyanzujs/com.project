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
import { AppPage, AppPressable } from '../../shared/components'
import { AppIcon } from '../../shared/components/AppIcon'
import AppTabBar from '../../shared/components/AppTabBar'
import { navigateToAppRoute } from '../../shared/navigation/appNavigation'
import { APP_ROUTES } from '../../shared/navigation/routes'
import { createAppRouteUrl } from '../../shared/navigation/routeUrl'
import { getNativeCapabilityErrorMessage } from '../../shared/platform/capabilities'
import { dialPhone } from '../../shared/platform/phone'
import { scanAppCode } from '../../shared/platform/scan'
import { APP_STYLE_COLORS } from '../../styles/nativeTokens'

import type { HomeQuickAction } from './home.data'
import type { AppRoutePath } from '../../shared/navigation/routes'

import './index.scss'
import './content.scss'

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
    <AppPage
      className='home-page-shell'
      footer={<AppTabBar active='home' />}
      safeArea='top'
      statusBar='dark'
    >
      <ScrollView className='home-page' scrollY>
        <Banner onPress={() => handleNavigate(APP_ROUTES.express)} />

        <View className='home-primary-actions'>
          <AppPressable flex
            accessibilityLabel='寄快递'
            block
            className='home-primary-action'
            onPress={() => handleNavigate(APP_ROUTES.express)}
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
          </AppPressable>
          <View className='home-primary-actions__divider' />
          <AppPressable flex
            accessibilityLabel='发物流'
            block
            className='home-primary-action'
            onPress={() => handleNavigate(APP_ROUTES.express)}
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
          </AppPressable>
        </View>

        <Menu actions={HOME_QUICK_ACTIONS} onSelect={handleQuickAction} />

        <View className='home-support-bar'>
          <AppPressable flex
            accessibilityLabel='拨打 95353'
            className='home-support-bar__item'
            onPress={handleServicePhone}
          >
            <AppIcon color={APP_STYLE_COLORS.text.heading} name='phone' size={24} />
            <Text className='home-support-bar__text'>95353</Text>
          </AppPressable>
          <View className='home-support-bar__divider' />
          <AppPressable flex
            accessibilityLabel='在线客服'
            className='home-support-bar__item'
            onPress={() => handleNavigate(APP_ROUTES.supportCenter)}
          >
            <AppIcon color={APP_STYLE_COLORS.text.heading} name='headphones' size={24} />
            <Text className='home-support-bar__text'>在线客服</Text>
          </AppPressable>
          <View className='home-support-bar__divider' />
          <AppPressable flex
            accessibilityLabel='企业服务'
            className='home-support-bar__item'
            onPress={() => handleNavigate(APP_ROUTES.customerCenter)}
          >
            <AppIcon color={APP_STYLE_COLORS.text.heading} name='contact' size={24} />
            <Text className='home-support-bar__text'>企业服务</Text>
          </AppPressable>
        </View>

        <View className='home-query-bar'>
          <AppPressable flex
            accessibilityLabel='服务查询'
            block
            className='home-query-bar__main'
            onPress={() => handleNavigate(APP_ROUTES.dispatchQuery)}
          >
            <Text className='home-query-bar__title'>服务查询</Text>
            <Text className='home-query-bar__summary'>
              网点/派送范围/收寄标准
            </Text>
          </AppPressable>
          <AppPressable
            accessibilityLabel='查价格查时效'
            className='home-query-bar__price'
            onPress={() => handleNavigate(APP_ROUTES.priceQuery)}
          >
            <Text className='home-query-bar__price-text'>查价格/查时效</Text>
          </AppPressable>
        </View>
      </ScrollView>
    </AppPage>
  )
}

export default HomePage
