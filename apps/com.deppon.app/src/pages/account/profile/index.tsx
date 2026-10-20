import { Image, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'

import { useState } from 'react'

import { accountService } from '@/services/account'
import type { AccountOverviewView } from '@/services/account'
import { authService } from '@/services/auth'
import { AppPage, AppPressable } from '@/shared/components'
import { navigateToAppRoute } from '@/shared/navigation/appNavigation'
import { hasValidSession, navigateToLogin } from '@/shared/navigation/authGuard'
import { APP_ROUTES } from '@/shared/navigation/routes'

import './content.scss'

// 「个人设置」页：头像 + 掩码手机号在上，退出登录与注销账号入口贴底。
// 退出登录不弹确认，退出后回到「我的」。
const AccountProfilePage = () => {
  const [overview, setOverview] = useState<AccountOverviewView>(() => accountService.getOverview())
  const [logouting, setLogouting] = useState(false)

  useDidShow(() => {
    if (!hasValidSession()) {
      navigateToLogin({
        redirectUrl: APP_ROUTES.accountProfile,
        replace: true,
        message: false
      })
      return
    }

    setOverview(accountService.getOverview())
  })

  const showToast = (title: string) => {
    Taro.showToast({
      title,
      icon: 'none'
    })
  }

  const handleLogout = async () => {
    if (logouting) {
      return
    }

    setLogouting(true)

    try {
      await authService.logout()
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

  const handleCancelAccount = () => {
    navigateToAppRoute(APP_ROUTES.accountCancel, {
      login: true
    })
  }

  return (
    <AppPage safeArea='bottom' statusBar='dark' surface='card'>
      <View className='account-profile-page'>
        <View className='account-profile-hero'>
          <Image className='account-profile-hero__avatar' mode='aspectFit' src='https://ca.deppon.com.cn/ows/assets/center2412/38.png' />
          <Text className='account-profile-hero__name'>{overview.maskedMobile || '--'}</Text>
        </View>

        <View className='account-profile-actions'>
          <AppPressable accessibilityLabel='退出登录' className='account-profile-logout' disabled={logouting} onPress={handleLogout}>
            <Text className='account-profile-logout__text'>{logouting ? '退出中' : '退出登录'}</Text>
          </AppPressable>

          <AppPressable accessibilityLabel='注销账号' className='account-profile-cancel' onPress={handleCancelAccount}>
            <Text className='account-profile-cancel__link'>注销账号</Text>
            <Text className='account-profile-cancel__text'>，注销后无法恢复，请谨慎操作！</Text>
          </AppPressable>
        </View>
      </View>
    </AppPage>
  )
}

export default AccountProfilePage
