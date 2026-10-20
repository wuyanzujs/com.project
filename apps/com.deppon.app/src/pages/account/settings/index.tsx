import { ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'

import { useState } from 'react'

import { accountSettingsService } from '@/services/account'
import { authService } from '@/services/auth'
import { AppPressable, AppSwitch } from '@/shared/components'
import { navigateToAppRoute } from '@/shared/navigation/appNavigation'
import { hasValidSession, navigateToLogin } from '@/shared/navigation/authGuard'
import { APP_ROUTES } from '@/shared/navigation/routes'
import { createAppWebUrl } from '@/shared/webview/appWeb'

import './index.scss'
import './content.scss'

// 「设置」页：清除缓存 / 协议说明 / 个性化推荐功能 / 版本信息 + 退出登录。
// 点击退出登录不弹二次确认。
const AccountSettingsPage = () => {
  const [cacheSizeText, setCacheSizeText] = useState(() => accountSettingsService.getCacheSizeText())
  const [personalized, setPersonalized] = useState(() => accountSettingsService.isPersonalizedRecommendEnabled())
  const [versionText] = useState(() => accountSettingsService.getVersionText())
  const [loggedIn, setLoggedIn] = useState(() => hasValidSession())
  const [clearing, setClearing] = useState(false)
  const [logouting, setLogouting] = useState(false)

  useDidShow(() => {
    setLoggedIn(hasValidSession())
    setCacheSizeText(accountSettingsService.getCacheSizeText())
    setPersonalized(accountSettingsService.isPersonalizedRecommendEnabled())
  })

  const showToast = (title: string) => {
    Taro.showToast({
      title,
      icon: 'none'
    })
  }

  const handleClearCache = async () => {
    if (clearing) {
      return
    }

    setClearing(true)

    try {
      setCacheSizeText(await accountSettingsService.clearCache())
    } finally {
      setClearing(false)
    }
  }

  const handleAgreement = () => {
    navigateToAppRoute(
      createAppWebUrl({
        source: 'PROTOCOL_RECORD'
      }),
      {
        login: true
      }
    )
  }

  const handlePersonalizedChange = async (nextValue: boolean) => {
    const previous = personalized

    setPersonalized(nextValue)

    const saved = await accountSettingsService.setPersonalizedRecommendEnabled(nextValue)

    if (!saved) {
      setPersonalized(previous)
      showToast('设置保存失败，请重试')
    }
  }

  const handleLogout = async () => {
    if (logouting) {
      return
    }

    setLogouting(true)

    try {
      await authService.logout()
      setLoggedIn(false)
      showToast('已退出登录')
      navigateToAppRoute(APP_ROUTES.mine, {
        replace: true
      })
    } catch (error) {
      showToast(error instanceof Error ? error.message : '退出失败，请重试')
    } finally {
      setLogouting(false)
    }
  }

  const handleLogin = () => {
    navigateToLogin({
      redirectUrl: APP_ROUTES.accountSettings,
      message: false
    })
  }

  return (
    <ScrollView className='account-settings-page' scrollY>
      <View className='account-settings-card'>
        <AppPressable accessibilityLabel='清除缓存' className='account-settings-row' onPress={handleClearCache}>
          <Text className='account-settings-row__label'>清除缓存</Text>
          <View className='account-settings-row__value-group'>
            <Text className='account-settings-row__value'>{clearing ? '清理中' : cacheSizeText}</Text>
            <Text className='account-settings-row__arrow'>›</Text>
          </View>
        </AppPressable>

        <AppPressable accessibilityLabel='协议说明' className='account-settings-row' onPress={handleAgreement}>
          <Text className='account-settings-row__label'>协议说明</Text>
          <Text className='account-settings-row__arrow'>›</Text>
        </AppPressable>

        <View className='account-settings-row'>
          <Text className='account-settings-row__label'>个性化推荐功能</Text>
          <AppSwitch
            accessibilityLabel={personalized ? '关闭个性化推荐功能' : '开启个性化推荐功能'}
            checked={personalized}
            onChange={handlePersonalizedChange}
          />
        </View>

        <View className='account-settings-row'>
          <Text className='account-settings-row__label'>版本信息</Text>
          <Text className='account-settings-row__value'>{versionText}</Text>
        </View>
      </View>

      <AppPressable
        accessibilityLabel={loggedIn ? '退出登录' : '去登录'}
        className='account-settings-logout'
        disabled={logouting}
        onPress={loggedIn ? handleLogout : handleLogin}
      >
        <Text className='account-settings-logout__text'>{loggedIn ? (logouting ? '退出中' : '退出登录') : '去登录'}</Text>
      </AppPressable>
    </ScrollView>
  )
}

export default AccountSettingsPage
