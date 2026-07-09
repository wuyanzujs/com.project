import { ScrollView, Text, View } from '@tarojs/components'
import { useDidShow } from '@tarojs/taro'

import { useState } from 'react'

import {
  authService,
  getUserDisplayName,
  maskMobile
} from '../../services/auth'
import { contactSelection } from '../../services/contact'
import AppTabBar from '../../shared/components/AppTabBar'
import { navigateToAppRoute } from '../../shared/navigation/appNavigation'
import {
  createLoginRedirectUrl,
  hasValidSession
} from '../../shared/navigation/authGuard'
import { APP_ROUTES } from '../../shared/navigation/routes'
import { createAppRouteUrl } from '../../shared/navigation/routeUrl'

import type { AppUser } from '../../services/auth'
import type { AppRoutePath } from '../../shared/navigation/routes'

import './index.scss'

interface MineEntry {
  title: string
  summary: string
  route: AppRoutePath
}

const QUICK_ENTRIES: MineEntry[] = [
  {
    title: '寄快递',
    summary: '预约上门取件',
    route: APP_ROUTES.express
  },
  {
    title: '订单列表',
    summary: '查看寄件和收件',
    route: APP_ROUTES.orderList
  },
  {
    title: '待支付',
    summary: '查看未支付运费',
    route: APP_ROUTES.paymentList
  },
  {
    title: '面单打印',
    summary: '打印入口与设备能力边界',
    route: APP_ROUTES.printCenter
  },
  {
    title: '优惠券',
    summary: '查看可用权益',
    route: APP_ROUTES.couponList
  },
  {
    title: '地址簿',
    summary: '管理常用地址',
    route: APP_ROUTES.contactList
  }
]

const SERVICE_ENTRIES: MineEntry[] = [
  {
    title: '账号设置',
    summary: '登录状态、账号安全和注销',
    route: APP_ROUTES.accountSettings
  },
  {
    title: '收派范围',
    summary: '查询快递与零担覆盖',
    route: APP_ROUTES.dispatchQuery
  },
  {
    title: '网点查询',
    summary: '查找营业部电话和地址',
    route: APP_ROUTES.stationQuery
  },
  {
    title: '客服中心',
    summary: '在线客服、热线和售后',
    route: APP_ROUTES.supportCenter
  },
  {
    title: '客户中心',
    summary: '客户编码与月结入口',
    route: APP_ROUTES.customerCenter
  },
  {
    title: '实名认证',
    summary: '实名收寄身份核验',
    route: APP_ROUTES.realNameCenter
  },
  {
    title: '签收码',
    summary: '实名签收与签收授权',
    route: APP_ROUTES.signCode
  },
  {
    title: '德邦 E 卡',
    summary: '余额、充值和账单',
    route: APP_ROUTES.ecardCenter
  },
  {
    title: '会员权益',
    summary: '等级、积分和福利中心',
    route: APP_ROUTES.memberCenter
  },
  {
    title: '发票',
    summary: '开票记录与抬头',
    route: APP_ROUTES.invoiceCenter
  },
  {
    title: '隐私设置',
    summary: '协议与权限清单',
    route: APP_ROUTES.privacySettings
  }
]

const MinePage = () => {
  const [user, setUser] = useState<AppUser | null>(() =>
    authService.getCachedUser()
  )
  const [refreshing, setRefreshing] = useState(false)

  const refreshUser = async () => {
    if (!hasValidSession()) {
      setUser(null)
      return
    }

    setRefreshing(true)

    try {
      const nextUser = await authService.bootstrapUser()

      setUser(nextUser ?? authService.getCachedUser())
    } finally {
      setRefreshing(false)
    }
  }

  useDidShow(() => {
    setUser(authService.getCachedUser())
    refreshUser()
  })

  const handleLogin = () => {
    navigateToAppRoute(createLoginRedirectUrl(APP_ROUTES.mine))
  }

  const handleAccountSettings = () => {
    navigateToAppRoute(APP_ROUTES.accountSettings, {
      login: true
    })
  }

  const handleEntry = (route: AppRoutePath) => {
    if (route === APP_ROUTES.contactList) {
      handleManageContacts()
      return
    }

    navigateToAppRoute(route)
  }

  const handleManageContacts = () => {
    const params = contactSelection.createParams('sender', 'manage')
    const url = createAppRouteUrl(APP_ROUTES.contactList, params)

    navigateToAppRoute(url, {
      login: true
    })
  }

  return (
    <>
      <ScrollView className='mine-page' scrollY>
        <View className='mine-profile'>
          <View className='mine-profile__avatar'>
            <Text className='mine-profile__avatar-text'>
              {user ? getUserDisplayName(user).slice(0, 1) : '德'}
            </Text>
          </View>
          <View className='mine-profile__content'>
            <Text className='mine-profile__name'>{getUserDisplayName(user)}</Text>
            <Text className='mine-profile__summary'>
              {user?.mobile ? maskMobile(user.mobile) : '登录后同步订单和地址簿'}
            </Text>
          </View>
          <View
            className={
              user
                ? 'mine-profile__button mine-profile__button--quiet'
                : 'mine-profile__button'
            }
            onClick={user ? handleAccountSettings : handleLogin}
          >
            <Text
              className={
                user
                  ? 'mine-profile__button-text mine-profile__button-text--quiet'
                  : 'mine-profile__button-text'
              }
            >
              {user ? '设置' : '登录'}
            </Text>
          </View>
        </View>

        <View className='mine-stats'>
          <View className='mine-stat mine-stat--right'>
            <Text className='mine-stat__value'>{user ? '已登录' : '未登录'}</Text>
            <Text className='mine-stat__label'>会话状态</Text>
          </View>
          <View className='mine-stat'>
            <Text className='mine-stat__value'>
              {refreshing ? '同步中' : '已就绪'}
            </Text>
            <Text className='mine-stat__label'>用户信息</Text>
          </View>
        </View>

        <View className='mine-section'>
          <Text className='mine-section__title'>常用服务</Text>
          {QUICK_ENTRIES.map((entry) => (
            <View
              className='mine-entry'
              key={entry.title}
              onClick={() =>
                entry.route === APP_ROUTES.contactList
                  ? handleManageContacts()
                  : handleEntry(entry.route)
              }
            >
              <View>
                <Text className='mine-entry__title'>{entry.title}</Text>
                <Text className='mine-entry__summary'>{entry.summary}</Text>
              </View>
              <Text className='mine-entry__arrow'>›</Text>
            </View>
          ))}
        </View>

        <View className='mine-section'>
          <Text className='mine-section__title'>更多能力</Text>
          {SERVICE_ENTRIES.map((entry) => (
            <View
              className='mine-entry'
              key={entry.title}
              onClick={() => handleEntry(entry.route)}
            >
              <View>
                <Text className='mine-entry__title'>{entry.title}</Text>
                <Text className='mine-entry__summary'>{entry.summary}</Text>
              </View>
              <Text className='mine-entry__arrow'>›</Text>
            </View>
          ))}
        </View>
      </ScrollView>
      <AppTabBar active='mine' />
    </>
  )
}

export default MinePage
