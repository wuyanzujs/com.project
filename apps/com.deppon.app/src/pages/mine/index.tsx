import { Image, ScrollView, Text, View } from '@tarojs/components'
import { useDidShow } from '@tarojs/taro'

import { useState } from 'react'

import {
  EMPTY_ORDER_COUNTS,
  ORDER_SHORTCUTS,
  QUICK_ENTRIES,
  SERVICE_ENTRIES,
  getMemberLevelAsset,
  getMemberRightsCount,
  queryMineOrderCounts
} from './mine.model'
import { authService, maskMobile } from '../../services/auth'
import { contactSelection } from '../../services/contact'
import { memberService } from '../../services/member'
import AppTabBar from '../../shared/components/AppTabBar'
import { AppSafeAreaView, AppStatusBar } from '../../shared/native'
import { navigateToAppRoute } from '../../shared/navigation/appNavigation'
import {
  createLoginRedirectUrl,
  hasValidSession
} from '../../shared/navigation/authGuard'
import { APP_ROUTES } from '../../shared/navigation/routes'
import { createAppRouteUrl } from '../../shared/navigation/routeUrl'
import { createAppWebUrl } from '../../shared/webview/appWeb'

import type { MineEntry, MineOrderCounts } from './mine.model'
import type { AppUser } from '../../services/auth'
import type { MemberOverviewView } from '../../services/member'

import './index.scss'

const MinePage = () => {
  const [user, setUser] = useState<AppUser | null>(() =>
    authService.getCachedUser()
  )
  const [member, setMember] = useState<MemberOverviewView | null>(null)
  const [orderCounts, setOrderCounts] =
    useState<MineOrderCounts>(EMPTY_ORDER_COUNTS)

  const refreshUser = async () => {
    if (!hasValidSession()) {
      setUser(null)
      setMember(null)
      setOrderCounts(EMPTY_ORDER_COUNTS)
      return
    }

    const [nextUser, memberResponse, nextOrderCounts] = await Promise.all([
      authService.bootstrapUser(),
      memberService.queryOverview(),
      queryMineOrderCounts()
    ])

    setUser(nextUser ?? authService.getCachedUser())
    setMember(memberResponse.result ?? null)
    setOrderCounts(nextOrderCounts)
  }

  useDidShow(() => {
    setUser(authService.getCachedUser())
    void refreshUser()
  })

  const handleLogin = () => {
    navigateToAppRoute(createLoginRedirectUrl(APP_ROUTES.mine))
  }

  const handleAccountSettings = () => {
    navigateToAppRoute(APP_ROUTES.accountSettings, {
      login: true
    })
  }

  const handleManageContacts = () => {
    const params = contactSelection.createParams('sender', 'manage')
    const url = createAppRouteUrl(APP_ROUTES.contactList, params)

    navigateToAppRoute(url, {
      login: true
    })
  }

  const handleEntry = (entry: MineEntry) => {
    if (entry.webSource) {
      navigateToAppRoute(createAppWebUrl({ source: entry.webSource }), {
        login: entry.login
      })
      return
    }

    if (!entry.route) {
      return
    }

    if (entry.route === APP_ROUTES.contactList) {
      handleManageContacts()
      return
    }

    navigateToAppRoute(entry.route, {
      login: entry.login
    })
  }

  const profileName = user?.mobile ? maskMobile(user.mobile) : '点击注册/登录'
  const levelCode = member?.levelCode ?? 0

  return (
    <AppSafeAreaView backgroundColor='#f4f6f8' edges={[]}>
      <AppStatusBar />
      <ScrollView className='mine-page' scrollY>
        <AppSafeAreaView
          backgroundColor='#eef6ff'
          edges={['top']}
          fill={false}
        >
          <View className='mine-hero'>
            <Image
              className='mine-hero__background'
              mode='scaleToFill'
              src='https://ca.deppon.com.cn/ows/assets/center2412/14.png'
            />
            <View
              className='mine-profile'
              onClick={user ? handleAccountSettings : handleLogin}
            >
              <Image
                className='mine-profile__avatar'
                mode='aspectFit'
                src={
                  user
                    ? 'https://ca.deppon.com.cn/ows/assets/center2412/38.png'
                    : 'https://ca.deppon.com.cn/ows/assets/center2412/37.png'
                }
              />
              <View className='mine-profile__content'>
                <Text className='mine-profile__name'>{profileName}</Text>
                <Text className='mine-profile__summary'>个人设置 ›</Text>
              </View>
            </View>
            <View
              className='mine-hero__message'
              onClick={() => navigateToAppRoute(APP_ROUTES.supportCenter)}
            >
              <Image
                className='mine-hero__message-image'
                mode='aspectFit'
                src='https://ca.deppon.com.cn/ows/assets/center/23.png'
              />
            </View>
          </View>
        </AppSafeAreaView>

        <View
          className='mine-member-card'
          onClick={() => navigateToAppRoute(APP_ROUTES.memberCenter)}
        >
          <View className='mine-member-card__body'>
            <Image
              className='mine-member-card__background'
              mode='scaleToFill'
              src={getMemberLevelAsset(levelCode)}
            />
            <View className='mine-member-card__top'>
              <View>
                <View className='mine-member-card__level-row'>
                  <Text className='mine-member-card__level'>
                    {member?.levelName || '普通会员'}
                  </Text>
                  <Text className='mine-member-card__rights'>
                    {getMemberRightsCount(levelCode)}项权益 ›
                  </Text>
                </View>
                <Text className='mine-member-card__growth'>
                  当前成长值 {member?.growthValue ?? 0}/
                  {member?.maxGrowthValue || '--'}
                </Text>
              </View>
            </View>
            <View className='mine-member-card__benefits'>
              <View className='mine-member-card__benefit'>
                <Image
                  className='mine-member-card__benefit-icon'
                  mode='aspectFit'
                  src='https://ca.deppon.com.cn/ows/assets/center2412/40.png'
                />
                <Text className='mine-member-card__benefit-text'>优惠券</Text>
              </View>
              <View className='mine-member-card__benefit'>
                <Image
                  className='mine-member-card__benefit-icon'
                  mode='aspectFit'
                  src='https://ca.deppon.com.cn/ows/assets/center2412/39.png'
                />
                <Text className='mine-member-card__benefit-text'>储值卡</Text>
              </View>
              <View className='mine-member-card__benefit'>
                <Text className='mine-member-card__benefit-text'>
                  我的积分 {member?.points ?? 0}
                </Text>
              </View>
            </View>
          </View>
          <View className='mine-member-card__svip'>
            <Image
              className='mine-member-card__svip-background'
              mode='scaleToFill'
              src='https://ca.deppon.com.cn/ows/assets/center2412/6.png'
            />
            <Image
              className='mine-member-card__svip-logo'
              mode='aspectFit'
              src='https://ca.deppon.com.cn/ows/assets/center2412/50.png'
            />
            <Text className='mine-member-card__svip-text'>
              {member?.svipMessage || 'SVIP 专属权益'}
            </Text>
            <View className='mine-member-card__svip-button'>
              <Text className='mine-member-card__svip-button-text'>
                {member?.svipButtonText || '立即开通'}
              </Text>
            </View>
          </View>
        </View>

        <View className='mine-shortcuts'>
          {ORDER_SHORTCUTS.map(entry => (
            <View
              className='mine-shortcut'
              key={entry.title}
              onClick={() => navigateToAppRoute(entry.route)}
            >
              <Text className='mine-shortcut__count'>
                {user ? (orderCounts[entry.countKey] ?? '--') : '--'}
              </Text>
              <Text className='mine-shortcut__title'>{entry.title}</Text>
            </View>
          ))}
        </View>

        <View className='mine-quick-grid'>
          {QUICK_ENTRIES.map(entry => (
            <View
              className='mine-quick-grid__item'
              key={entry.title}
              onClick={() => handleEntry(entry)}
            >
              <Image
                className='mine-quick-grid__image'
                mode='aspectFit'
                src={entry.image}
              />
              <Text className='mine-quick-grid__title'>{entry.title}</Text>
            </View>
          ))}
        </View>

        <View className='mine-service-grid'>
          {SERVICE_ENTRIES.map(entry => (
            <View
              className='mine-service-grid__item'
              key={entry.title}
              onClick={() => handleEntry(entry)}
            >
              <Image
                className='mine-service-grid__image'
                mode='aspectFit'
                src={entry.image}
              />
              <Text className='mine-service-grid__title'>{entry.title}</Text>
              {entry.badge && (
                <View className='mine-service-grid__badge'>
                  <Text className='mine-service-grid__badge-text'>
                    {entry.badge}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
      <AppTabBar active='mine' />
    </AppSafeAreaView>
  )
}

export default MinePage
