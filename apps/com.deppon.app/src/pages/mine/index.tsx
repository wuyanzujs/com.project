import { ScrollView } from '@tarojs/components'
import { useDidShow } from '@tarojs/taro'

import { useState } from 'react'

import { authService, maskMobile } from '@/services/auth'
import type { AppUser } from '@/services/auth'
import { contactSelection } from '@/services/contact'
import { couponService } from '@/services/coupon'
import { ecardService } from '@/services/ecard'
import { memberService } from '@/services/member'
import type { MemberOverviewView } from '@/services/member'
import { messageService } from '@/services/message'
import { AppPage } from '@/shared/components'
import AppTabBar from '@/shared/components/AppTabBar'
import { navigateToAppRoute } from '@/shared/navigation/appNavigation'
import { hasValidSession, navigateToLogin } from '@/shared/navigation/authGuard'
import { APP_ROUTES } from '@/shared/navigation/routes'
import { createAppRouteUrl } from '@/shared/navigation/routeUrl'
import { shareWithApp } from '@/shared/platform'
import { createAppWebUrl } from '@/shared/webview/appWeb'

import { MineEntryGrids } from './components/MineEntryGrids'
import { MineHero } from './components/MineHero'
import { MineMemberCard } from './components/MineMemberCard'
import { MineOrderShortcuts } from './components/MineOrderShortcuts'
import { EMPTY_ORDER_COUNTS, QUICK_ENTRIES, queryMineOrderCounts } from './mine.model'

import type { MineEntry, MineOrderCounts, MineOrderShortcut } from './mine.model'

import './index.scss'

const MinePage = () => {
  const [user, setUser] = useState<AppUser | null>(() => authService.getCachedUser())
  const [member, setMember] = useState<MemberOverviewView | null>(null)
  const [orderCounts, setOrderCounts] = useState<MineOrderCounts>(EMPTY_ORDER_COUNTS)
  const [couponCount, setCouponCount] = useState(0)
  // 储值卡数量：null 表示未知（未加载或查询失败），此时 UI 不显示数字
  const [storedCardCount, setStoredCardCount] = useState<number | null>(null)
  // 消息未读数：null 表示未知（未登录或查询失败），此时保持常驻红点占位
  const [unreadCount, setUnreadCount] = useState<number | null>(null)

  const refreshUser = async () => {
    if (!hasValidSession()) {
      setUser(null)
      setMember(null)
      setOrderCounts(EMPTY_ORDER_COUNTS)
      setCouponCount(0)
      setStoredCardCount(null)
      setUnreadCount(null)
      return
    }

    const [nextUser, memberResponse, nextOrderCounts, couponResponse, storedCardResponse, unreadResponse] = await Promise.all([
      authService.bootstrapUser(),
      memberService.queryOverview(),
      queryMineOrderCounts(),
      couponService.queryUserCoupons('USABLE'),
      ecardService.queryStoredCardCount(),
      messageService.queryUnreadCount()
    ])

    setUser(nextUser ?? authService.getCachedUser())
    setMember(memberResponse.result ?? null)
    setOrderCounts(nextOrderCounts)
    setCouponCount(couponResponse.result?.totalRows ?? 0)
    setStoredCardCount(storedCardResponse.status ? (storedCardResponse.result ?? null) : null)
    setUnreadCount(unreadResponse.status && typeof unreadResponse.result === 'number' ? unreadResponse.result : null)
  }

  useDidShow(() => {
    setUser(authService.getCachedUser())
    void refreshUser()
  })

  const handleLogin = () => {
    navigateToLogin({
      redirectUrl: APP_ROUTES.mine,
      message: false
    })
  }

  const handleAccountSettings = () => {
    navigateToAppRoute(APP_ROUTES.accountSettings, {
      login: true
    })
  }

  const handleShare = () => {
    void shareWithApp({
      source: 'MINE',
      title: '德邦快递',
      description: '德邦快递服务'
    }).catch(() => undefined)
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

  const handleOrderShortcut = (entry: MineOrderShortcut) => {
    navigateToAppRoute(entry.route)
  }

  const profileName = user?.mobile ? maskMobile(user.mobile) : '点击注册/登录'
  const levelCode = member?.levelCode ?? 0

  return (
    <AppPage className='mine-page-shell' footer={<AppTabBar active='mine' />} safeArea='none' statusBar='dark'>
      <ScrollView className='mine-page' scrollY>
        <MineHero
          authenticated={Boolean(user)}
          profileName={profileName}
          unreadCount={unreadCount}
          onOpenProfile={user ? handleAccountSettings : handleLogin}
          onOpenSettings={user ? handleAccountSettings : handleLogin}
          onOpenShare={handleShare}
          onOpenMessage={() => navigateToAppRoute(APP_ROUTES.messageCenter, { login: true })}
        />

        {user && (
          <MineMemberCard
            couponCount={couponCount}
            levelCode={levelCode}
            member={member}
            onOpen={() => navigateToAppRoute(APP_ROUTES.memberCenter)}
            storedCardCount={storedCardCount}
          />
        )}

        <MineOrderShortcuts authenticated={Boolean(user)} orderCounts={orderCounts} onSelect={handleOrderShortcut} />

        <MineEntryGrids quickEntries={QUICK_ENTRIES} onSelect={handleEntry} />
      </ScrollView>
    </AppPage>
  )
}

export default MinePage
