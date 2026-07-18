import { ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'

import { useState } from 'react'

import { accountService } from '../../../services/account'
import { authService } from '../../../services/auth'
import { AppPressable } from '../../../shared/components'
import { navigateToAppRoute } from '../../../shared/navigation/appNavigation'
import {
  hasValidSession,
  navigateToLogin
} from '../../../shared/navigation/authGuard'
import { APP_ROUTES } from '../../../shared/navigation/routes'
import { createAppWebUrl } from '../../../shared/webview/appWeb'
import { APP_STYLE_COLORS } from '../../../styles/nativeTokens'

import type { AccountOverviewView } from '../../../services/account'
import type { AppRoutePath } from '../../../shared/navigation/routes'
import type { AppWebSource } from '../../../shared/webview/appWeb'


import './index.scss'
import './content.scss'

interface AccountEntry {
  title: string
  summary: string
  route?: AppRoutePath
  webSource?: AppWebSource
  login?: boolean
}

const ACCOUNT_ENTRIES: AccountEntry[] = [
  {
    title: '偏好设置',
    summary: '收件偏好、账号偏好和中心设置由 H5 承接',
    webSource: 'ACCOUNT_PREFERENCES',
    login: true
  },
  {
    title: '隐私设置',
    summary: '查看协议、个人信息清单和权限调用清单',
    route: APP_ROUTES.privacySettings,
    login: true
  },
  {
    title: '实名认证',
    summary: '登记或核验实名收寄身份信息',
    route: APP_ROUTES.realNameCenter,
    login: true
  },
  {
    title: '签收码',
    summary: '管理实名签收姓名和签收授权',
    route: APP_ROUTES.signCode,
    login: true
  },
  {
    title: '地址簿',
    summary: '管理常用寄收件地址',
    route: APP_ROUTES.contactList,
    login: true
  }
]

const AccountSettingsPage = () => {
  const [overview, setOverview] = useState<AccountOverviewView>(() =>
    accountService.getOverview()
  )
  const [refreshing, setRefreshing] = useState(false)
  const [logouting, setLogouting] = useState(false)

  const showToast = (title: string) => {
    Taro.showToast({
      title,
      icon: 'none'
    })
  }

  const refreshOverview = async () => {
    if (!hasValidSession()) {
      setOverview(accountService.getOverview())
      return
    }

    setRefreshing(true)

    try {
      setOverview(await accountService.refreshOverview())
    } finally {
      setRefreshing(false)
    }
  }

  useDidShow(() => {
    refreshOverview()
  })

  const handleLogin = () => {
    navigateToLogin({
      redirectUrl: APP_ROUTES.accountSettings,
      message: false
    })
  }

  const handleEntry = (entry: AccountEntry) => {
    if (entry.webSource) {
      navigateToAppRoute(createAppWebUrl({ source: entry.webSource }), {
        login: entry.login
      })
      return
    }

    if (!entry.route) {
      return
    }

    navigateToAppRoute(entry.route, {
      login: entry.login
    })
  }

  const handleLogout = () => {
    if (logouting) {
      return
    }

    Taro.showModal({
      title: '退出登录',
      content: '退出后，本机将清除当前登录态，但不会注销账号。',
      confirmText: '退出',
      confirmColor: APP_STYLE_COLORS.status.dangerTextStrong,
      success: async (res) => {
        if (!res.confirm) {
          return
        }

        setLogouting(true)

        try {
          await authService.logout()
          setOverview(accountService.getOverview())
          showToast('已退出登录')
          navigateToAppRoute(APP_ROUTES.mine, {
            replace: true
          })
        } finally {
          setLogouting(false)
        }
      }
    })
  }

  return (
    <ScrollView className='account-settings-page' scrollY>
      <View className='account-settings-card'>
        <View className='account-settings-profile'>
          <View className='account-settings-profile__avatar'>
            <Text className='account-settings-profile__avatar-text'>
              {overview.loggedIn ? overview.displayName.slice(0, 1) : '德'}
            </Text>
          </View>
          <View className='account-settings-profile__content'>
            <Text className='account-settings-profile__name'>
              {overview.displayName}
            </Text>
            <Text className='account-settings-profile__summary'>
              {overview.loggedIn
                ? overview.maskedMobile || '已登录'
                : '登录后可管理账号与安全设置'}
            </Text>
          </View>
          <Text className='account-settings-profile__status'>
            {refreshing ? '同步中' : overview.loggedIn ? '已登录' : '未登录'}
          </Text>
        </View>

        {!overview.loggedIn && (
          <AppPressable className='account-settings-login' onPress={handleLogin}>
            <Text className='account-settings-login__text'>去登录</Text>
          </AppPressable>
        )}
      </View>

      <View className='account-settings-section'>
        <Text className='account-settings-section__title'>账号资料</Text>
        <View className='account-settings-field'>
          <Text className='account-settings-field__label'>绑定手机号</Text>
          <Text className='account-settings-field__value'>
            {overview.maskedMobile || '--'}
          </Text>
        </View>
        <View className='account-settings-field'>
          <Text className='account-settings-field__label'>客户编码</Text>
          <Text className='account-settings-field__value'>
            {overview.user?.customerCode || '--'}
          </Text>
        </View>
      </View>

      <View className='account-settings-section'>
        <Text className='account-settings-section__title'>安全与隐私</Text>
        {ACCOUNT_ENTRIES.map((entry) => (
          <AppPressable
            className='account-settings-entry'
            key={entry.title}
            onPress={() => handleEntry(entry)}
          >
            <View className='account-settings-entry__content'>
              <Text className='account-settings-entry__title'>
                {entry.title}
              </Text>
              <Text className='account-settings-entry__summary'>
                {entry.summary}
              </Text>
            </View>
            <Text className='account-settings-entry__arrow'>›</Text>
          </AppPressable>
        ))}
      </View>

      {overview.loggedIn && (
        <View className='account-settings-section'>
          <Text className='account-settings-section__title'>账号操作</Text>
          <AppPressable className='account-settings-danger' onPress={handleLogout}>
            <Text className='account-settings-danger__title'>
              {logouting ? '退出中' : '退出登录'}
            </Text>
            <Text className='account-settings-danger__summary'>
              清除当前设备登录态，账号和数据仍会保留。
            </Text>
          </AppPressable>
          <AppPressable
            className='account-settings-danger account-settings-danger--strong'
            onPress={() =>
              navigateToAppRoute(APP_ROUTES.accountCancel, {
                login: true
              })
            }
          >
            <Text className='account-settings-danger__title account-settings-danger__title--strong'>
              注销账号
            </Text>
            <Text className='account-settings-danger__summary'>
              注销后账号信息将无法恢复，请谨慎操作。
            </Text>
          </AppPressable>
        </View>
      )}
    </ScrollView>
  )
}

export default AccountSettingsPage
