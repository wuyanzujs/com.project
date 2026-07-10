import { Image, ScrollView, Text, View } from '@tarojs/components'
import { useDidShow } from '@tarojs/taro'

import { useState } from 'react'

import { authService, maskMobile } from '../../services/auth'
import { contactSelection } from '../../services/contact'
import { memberService } from '../../services/member'
import { orderService } from '../../services/order'
import { paymentService } from '../../services/payment'
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

import type { AppUser } from '../../services/auth'
import type { MemberOverviewView } from '../../services/member'
import type { AppRoutePath } from '../../shared/navigation/routes'
import type { AppWebSource } from '../../shared/webview/appWeb'

import './index.scss'

type MineOrderCountKey = 'all' | 'pickup' | 'payment' | 'transit' | 'signed'

type MineOrderCounts = Record<MineOrderCountKey, number | null>

interface MineEntry {
  title: string
  image: string
  route?: AppRoutePath
  webSource?: AppWebSource
  login?: boolean
  badge?: string
}

interface MineOrderShortcut {
  title: string
  countKey: MineOrderCountKey
  route: AppRoutePath
}

const EMPTY_ORDER_COUNTS: MineOrderCounts = {
  all: null,
  pickup: null,
  payment: null,
  transit: null,
  signed: null
}

const ORDER_SHORTCUTS: MineOrderShortcut[] = [
  { title: '全部订单', countKey: 'all', route: APP_ROUTES.orderList },
  { title: '待揽收', countKey: 'pickup', route: APP_ROUTES.orderList },
  { title: '待支付', countKey: 'payment', route: APP_ROUTES.paymentList },
  { title: '运输中', countKey: 'transit', route: APP_ROUTES.orderList },
  { title: '已签收', countKey: 'signed', route: APP_ROUTES.orderList }
]

const QUICK_ENTRIES: MineEntry[] = [
  {
    title: '地址簿',
    image: 'https://ca.deppon.com.cn/ows/assets/center2412/17.png',
    route: APP_ROUTES.contactList
  },
  {
    title: '偏好设置',
    image: 'https://ca.deppon.com.cn/ows/assets/center2412/18.png',
    webSource: 'ACCOUNT_PREFERENCES',
    login: true
  },
  {
    title: '专属快递员',
    image: 'https://ca.deppon.com.cn/ows/assets/center2412/19.png',
    route: APP_ROUTES.courierList
  },
  {
    title: '隐私设置',
    image: 'https://ca.deppon.com.cn/ows/assets/center2412/20.png',
    route: APP_ROUTES.privacySettings
  },
  {
    title: '发票申请',
    image: 'https://ca.deppon.com.cn/ows/assets/center2412/21.png',
    route: APP_ROUTES.invoiceCenter
  }
]

const SERVICE_ENTRIES: MineEntry[] = [
  {
    title: '客户中心',
    image: 'https://ca.deppon.com.cn/ows/center/1.png',
    route: APP_ROUTES.customerCenter
  },
  {
    title: '服务查询',
    image: 'https://ca.deppon.com.cn/ows/center/2.png',
    route: APP_ROUTES.dispatchQuery
  },
  {
    title: '客服中心',
    image: 'https://ca.deppon.com.cn/ows/center/3.png',
    route: APP_ROUTES.supportCenter
  },
  {
    title: '投诉',
    image: 'https://ca.deppon.com.cn/ows/center/4.png',
    webSource: 'SUPPORT_COMPLAINT',
    login: true
  },
  {
    title: '在线理赔',
    image: 'https://ca.deppon.com.cn/ows/center/5.png',
    webSource: 'SUPPORT_CLAIM',
    login: true
  },
  {
    title: '月结中心',
    image: 'https://ca.deppon.com.cn/ows/center/6.png',
    webSource: 'CUSTOMER_MONTHLY_CENTER',
    login: true
  },
  {
    title: '代收货款',
    image: 'https://ca.deppon.com.cn/ows/center/7.png',
    route: APP_ROUTES.customerCenter
  },
  {
    title: '面单打印',
    image: 'https://ca.deppon.com.cn/ows/center/8.png',
    route: APP_ROUTES.printCenter
  },
  {
    title: '签收码',
    image: 'https://ca.deppon.com.cn/ows/center/9.png',
    route: APP_ROUTES.signCode
  },
  {
    title: '协议说明',
    image: 'https://ca.deppon.com.cn/ows/center/11.png',
    route: APP_ROUTES.privacySettings
  },
  {
    title: '优待证优惠',
    image: 'https://ca.deppon.com.cn/ows/center/12.png',
    route: APP_ROUTES.memberCenter
  },
  {
    title: '体验调研',
    image: 'https://ca.deppon.com.cn/ows/center/13.png',
    route: APP_ROUTES.supportCenter,
    badge: 'HOT'
  },
  {
    title: '企业福利',
    image: 'https://ca.deppon.com.cn/ows/center/14.png',
    route: APP_ROUTES.memberCenter
  },
  {
    title: '实名认证',
    image: 'https://ca.deppon.com.cn/ows/center/15.png',
    route: APP_ROUTES.realNameCenter
  },
  {
    title: '学生专区',
    image: 'https://ca.deppon.com.cn/ows/center/16.png',
    route: APP_ROUTES.memberCenter
  },
  {
    title: '号码保护',
    image: 'https://ca.deppon.com.cn/ows/center/19.png',
    webSource: 'CUSTOMER_PHONE_PROTECT',
    login: true,
    badge: '上新'
  },
  {
    title: '入群有礼',
    image: 'https://ca.deppon.com.cn/ows/center/22.png',
    route: APP_ROUTES.memberCenter,
    badge: '福利'
  }
]

function getTotalRows(
  response: { status: boolean; result?: { totalRows: number } | null } | null
) {
  return response?.status && response.result ? response.result.totalRows : null
}

async function queryMineOrderCounts(): Promise<MineOrderCounts> {
  const dateRange = orderService.getDateRange(90)
  const commonOptions = {
    role: 'sender' as const,
    pageIndex: 1,
    pageSize: 1,
    startTime: dateRange.startTime,
    endTime: dateRange.endTime
  }
  const [all, pickup, payment, transit, signed] = await Promise.all([
    orderService.queryList(commonOptions).catch(() => null),
    orderService
      .queryList({ ...commonOptions, orderStatus: 'RECEIPTING' })
      .catch(() => null),
    paymentService
      .queryPaymentList({ pageIndex: 1, pageSize: 1, status: 'UNPAID' })
      .catch(() => null),
    orderService
      .queryList({ ...commonOptions, orderStatus: 'IN_TRANSIT' })
      .catch(() => null),
    orderService
      .queryList({ ...commonOptions, orderStatus: 'SIGN' })
      .catch(() => null)
  ])

  return {
    all: getTotalRows(all),
    pickup: getTotalRows(pickup),
    payment: getTotalRows(payment),
    transit: getTotalRows(transit),
    signed: getTotalRows(signed)
  }
}

function getMemberLevelAsset(levelCode = 0) {
  const level = Math.max(1, Math.min(5, Math.round(levelCode)))

  return `https://ca.deppon.com.cn/ows/assets/center2412/${level}.png`
}

function getMemberRightsCount(levelCode = 0) {
  return [2, 2, 4, 6, 7, 9][Math.max(0, Math.min(5, levelCode))] ?? 2
}

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
