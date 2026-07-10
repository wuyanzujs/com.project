import { ScrollView, Text, View } from '@tarojs/components'
import { useDidShow } from '@tarojs/taro'

import { useState } from 'react'

import { memberService } from '../../../services/member'
import AppTabBar from '../../../shared/components/AppTabBar'
import { AppSafeAreaView, AppStatusBar } from '../../../shared/native'
import { navigateToAppRoute } from '../../../shared/navigation/appNavigation'
import { ensureAuthenticated } from '../../../shared/navigation/authGuard'
import { APP_ROUTES } from '../../../shared/navigation/routes'
import { createAppWebUrl } from '../../../shared/webview/appWeb'

import type {
  MemberBenefitView,
  MemberOverviewView,
  MemberWebAction
} from '../../../services/member'
import type { AppWebSource } from '../../../shared/webview/appWeb'

import './index.scss'

const MEMBER_WEB_SOURCES: Record<MemberWebAction, AppWebSource> = {
  MEMBER_CENTER: 'MEMBER_CENTER_HOME',
  MEMBER_POINTS: 'MEMBER_POINTS_CENTER',
  MEMBER_SVIP: 'MEMBER_SVIP_CENTER',
  MEMBER_STUDENTS: 'MEMBER_STUDENT_CENTER'
}

const MemberCenterPage = () => {
  const [overview, setOverview] = useState<MemberOverviewView | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [welfareUrl, setWelfareUrl] = useState('')

  const loadOverview = async () => {
    if (loading) {
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const overviewResponse = await memberService.queryOverview()
      const overviewResult = overviewResponse.result ?? null
      const nextWelfareUrl = await memberService.createWelfareCenterUrl(
        'MEMBER_INDEX',
        overviewResult?.svipUrl
      )

      if (!overviewResponse.status || !overviewResponse.result) {
        setOverview(null)
        setWelfareUrl(nextWelfareUrl)
        setMessage(overviewResponse.message || '暂未获取到会员权益')
        return
      }

      setOverview(overviewResult)
      setWelfareUrl(nextWelfareUrl)
    } finally {
      setLoading(false)
    }
  }

  useDidShow(() => {
    if (
      ensureAuthenticated({
        replace: true
      })
    ) {
      loadOverview()
    }
  })

  const handleOpenWelfare = (
    source: AppWebSource = 'MEMBER_WELFARE_CENTER',
    title = '会员权益'
  ) => {
    navigateToAppRoute(
      createAppWebUrl({
        source,
        uri: welfareUrl,
        title
      }),
      {
        login: true
      }
    )
  }

  const handleOpenMemberWeb = async (
    action: MemberWebAction,
    title: string
  ) => {
    const uri = await memberService.createMasUrl(action, action)

    navigateToAppRoute(
      createAppWebUrl({
        source: MEMBER_WEB_SOURCES[action],
        uri,
        title
      }),
      {
        login: true
      }
    )
  }

  const handleBenefit = (item: MemberBenefitView) => {
    if (item.action === 'COUPON_LIST') {
      navigateToAppRoute(APP_ROUTES.couponList)
      return
    }

    if (item.action === 'MEMBER_SVIP') {
      handleOpenWelfare(MEMBER_WEB_SOURCES.MEMBER_SVIP, item.title)
      return
    }

    handleOpenMemberWeb(item.action, item.title)
  }

  return (
    <AppSafeAreaView backgroundColor='#eef6ff' edges={['top']}>
      <AppStatusBar />
      <ScrollView className='member-page' scrollY>
        <View className='member-header'>
          <Text className='member-header__label'>Member</Text>
          <Text className='member-header__title'>会员权益</Text>
          <Text className='member-header__summary'>
            查看会员等级、成长值、积分和福利活动。
          </Text>
        </View>

        <View className='member-card member-card--hero'>
          <View className='member-card__top'>
            <View>
              <Text className='member-card__label'>当前等级</Text>
              <Text className='member-card__title member-card__title--hero'>
                {overview?.levelName || '普通会员'}
              </Text>
            </View>
            <Text className='member-card__badge'>
              Lv.{overview?.levelCode ?? 0}
            </Text>
          </View>
          <View className='member-progress'>
            <View
              className='member-progress__bar'
              style={{ width: `${overview?.growthPercent ?? 0}%` }}
            />
          </View>
          <Text className='member-card__summary member-card__summary--hero'>
            成长值 {overview?.growthValue ?? 0} /{' '}
            {overview?.maxGrowthValue || '--'}
          </Text>
        </View>

        <View className='member-card'>
          <View className='member-card__top'>
            <View>
              <Text className='member-card__label'>积分</Text>
              <Text className='member-card__title'>
                {overview?.points ?? 0}
              </Text>
            </View>
            <Text className='member-card__badge member-card__badge--dark'>
              {overview?.svipStatusText || '普通会员'}
            </Text>
          </View>
          <Text className='member-card__summary'>
            {overview?.svipMessage || '更多权益由福利中心承接'}
          </Text>
          <View className='member-actions'>
            <View className='member-action' onClick={() => handleOpenWelfare()}>
              <Text className='member-action__text'>
                {overview?.svipButtonText || '查看权益'}
              </Text>
            </View>
            <View
              className='member-action member-action--ghost'
              onClick={() => navigateToAppRoute(APP_ROUTES.couponList)}
            >
              <Text className='member-action__text member-action__text--ghost'>
                我的优惠券
              </Text>
            </View>
          </View>
        </View>

        <View className='member-section'>
          <Text className='member-section__title'>权益服务</Text>
          {(overview?.benefits ?? []).map(item => (
            <View
              className='member-benefit'
              key={item.title}
              onClick={() => handleBenefit(item)}
            >
              <View>
                <Text className='member-benefit__title'>{item.title}</Text>
                <Text className='member-benefit__summary'>{item.summary}</Text>
              </View>
              <Text
                className={
                  item.status === 'ready'
                    ? 'member-benefit__tag'
                    : `member-benefit__tag member-benefit__tag--${item.status}`
                }
              >
                {item.badgeText}
              </Text>
            </View>
          ))}

          {!overview && !loading && (
            <View className='member-empty'>
              <Text className='member-empty__title'>
                {message || '暂未获取到会员权益'}
              </Text>
            </View>
          )}
        </View>

        {loading && <Text className='member-loading'>正在同步会员权益...</Text>}
      </ScrollView>
      <AppTabBar active='memberCenter' />
    </AppSafeAreaView>
  )
}

export default MemberCenterPage
