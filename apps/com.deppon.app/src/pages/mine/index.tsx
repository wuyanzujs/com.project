import { ScrollView } from '@tarojs/components'
import { useDidShow } from '@tarojs/taro'

import { useState } from 'react'

import { authService, maskMobile } from '@/services/auth'
import type { AppUser } from '@/services/auth'
import { contactSelection } from '@/services/contact'
import { couponService } from '@/services/coupon'
import { memberService } from '@/services/member'
import type { MemberOverviewView } from '@/services/member'
import { AppPage } from '@/shared/components'
import AppTabBar from '@/shared/components/AppTabBar'
import { navigateToAppRoute } from '@/shared/navigation/appNavigation'
import { hasValidSession, navigateToLogin } from '@/shared/navigation/authGuard'
import { APP_ROUTES } from '@/shared/navigation/routes'
import { createAppRouteUrl } from '@/shared/navigation/routeUrl'
import { createAppWebUrl } from '@/shared/webview/appWeb'

import { MineEntryGrids } from './components/MineEntryGrids'
import { MineHero } from './components/MineHero'
import { MineMemberCard } from './components/MineMemberCard'
import { MineOrderShortcuts } from './components/MineOrderShortcuts'
import {
  EMPTY_ORDER_COUNTS,
  QUICK_ENTRIES,
  queryMineOrderCounts
} from './mine.model'

import type {
  MineEntry,
  MineOrderCounts,
  MineOrderShortcut
} from './mine.model'

import './index.scss'

const MinePage = () => {
  const [user, setUser] = useState<AppUser | null>(() =>
    authService.getCachedUser()
  )
  const [member, setMember] = useState<MemberOverviewView | null>(null)
  const [orderCounts, setOrderCounts] =
    useState<MineOrderCounts>(EMPTY_ORDER_COUNTS)
  const [couponExpireCount, setCouponExpireCount] = useState(0)

  const refreshUser = async () => {
    if (!hasValidSession()) {
      setUser(null)
      setMember(null)
      setOrderCounts(EMPTY_ORDER_COUNTS)
      setCouponExpireCount(0)
      return
    }

    const [nextUser, memberResponse, nextOrderCounts, expireCount] =
      await Promise.all([
        authService.bootstrapUser(),
        memberService.queryOverview(),
        queryMineOrderCounts(),
        couponService.queryExpireCount()
      ])

    setUser(nextUser ?? authService.getCachedUser())
    setMember(memberResponse.result ?? null)
    setOrderCounts(nextOrderCounts)
    setCouponExpireCount(expireCount)
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
    <AppPage
      className='mine-page-shell'
      footer={<AppTabBar active='mine' />}
      safeArea='top'
      statusBar='dark'
    >
      <ScrollView className='mine-page' scrollY>
        <MineHero
          authenticated={Boolean(user)}
          profileName={profileName}
          onOpenProfile={user ? handleAccountSettings : handleLogin}
          onOpenSupport={() => navigateToAppRoute(APP_ROUTES.supportCenter)}
        />

        {user && (
          <MineMemberCard
            couponExpireCount={couponExpireCount}
            levelCode={levelCode}
            member={member}
            onOpen={() => navigateToAppRoute(APP_ROUTES.memberCenter)}
          />
        )}

        <MineOrderShortcuts
          authenticated={Boolean(user)}
          orderCounts={orderCounts}
          onSelect={handleOrderShortcut}
        />

        <MineEntryGrids quickEntries={QUICK_ENTRIES} onSelect={handleEntry} />
      </ScrollView>
    </AppPage>
  )
}

export default MinePage
