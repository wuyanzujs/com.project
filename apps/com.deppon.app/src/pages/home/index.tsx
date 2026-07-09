import { ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'

import { useCallback, useRef } from 'react'

import Banner from './components/banner'
import Menu from './components/menu'
import Navibar from './components/navibar'
import Search from './components/search'
import { HOME_QUICK_ACTIONS, HOME_SERVICE_CARDS } from './home.data'
import { privacyService } from '../../services/privacy'
import AppTabBar from '../../shared/components/AppTabBar'
import { navigateToAppRoute } from '../../shared/navigation/appNavigation'
import { APP_ROUTES } from '../../shared/navigation/routes'

import type { AppRoutePath } from '../../shared/navigation/routes'

import './index.scss'

const HomePage = () => {
  const privacyPromptingRef = useRef(false)

  const handleNavigate = (url: AppRoutePath) => {
    navigateToAppRoute(url)
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
    <>
      <ScrollView className='home-page' scrollY>
        <Navibar />
        <Banner />
        <Search />
        <Menu actions={HOME_QUICK_ACTIONS} onSelect={handleNavigate} />
        <View className='home-section'>
          <View className='home-section__header'>
            <Text className='home-section__title'>常用服务</Text>
            <Text className='home-section__hint'>App 首期</Text>
          </View>
          {HOME_SERVICE_CARDS.map((item) => (
            <View
              className='home-service'
              key={item.key}
              onClick={() => handleNavigate(item.route)}
            >
              <Text className='home-service__title'>{item.title}</Text>
              <Text className='home-service__summary'>{item.summary}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
      <AppTabBar active='home' />
    </>
  )
}

export default HomePage
