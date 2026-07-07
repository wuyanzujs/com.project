import { ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'

import { useState } from 'react'

import { memberService } from '../../../services/member'
import { navigateToAppRoute } from '../../../shared/navigation/appNavigation'
import { ensureAuthenticated } from '../../../shared/navigation/authGuard'
import { APP_ROUTES } from '../../../shared/navigation/routes'
import { createAppWebUrl } from '../../../shared/webview/appWeb'

import type { MemberOverviewView } from '../../../services/member'

import './index.scss'

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
      const [overviewResponse, nextWelfareUrl] = await Promise.all([
        memberService.queryOverview(),
        memberService.createWelfareCenterUrl()
      ])

      setWelfareUrl(nextWelfareUrl)

      if (!overviewResponse.status || !overviewResponse.result) {
        setOverview(null)
        setMessage(overviewResponse.message || '暂未获取到会员权益')
        return
      }

      setOverview(overviewResponse.result)
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

  const handleOpenWelfare = () => {
    navigateToAppRoute(
      createAppWebUrl({
        source: 'MEMBER_WELFARE_CENTER',
        uri: welfareUrl,
        title: '会员权益'
      }),
      {
        login: true
      }
    )
  }

  const handlePending = (title: string) => {
    Taro.showToast({
      title,
      icon: 'none'
    })
  }

  return (
    <ScrollView className='member-page' scrollY>
      <View className='member-header'>
        <Text className='member-header__label'>Member</Text>
        <Text className='member-header__title'>会员权益</Text>
        <Text className='member-header__summary'>
          首期同步会员等级、成长值和 SVIP 摘要，福利活动由 App WebView 承接。
        </Text>
      </View>

      <View className='member-card member-card--hero'>
        <View className='member-card__top'>
          <View>
            <Text className='member-card__label'>当前等级</Text>
            <Text className='member-card__title'>
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
        <Text className='member-card__summary'>
          成长值 {overview?.growthValue ?? 0} / {overview?.maxGrowthValue || '--'}
        </Text>
      </View>

      <View className='member-card'>
        <View className='member-card__top'>
          <View>
            <Text className='member-card__label'>积分</Text>
            <Text className='member-card__title'>{overview?.points ?? 0}</Text>
          </View>
          <Text className='member-card__badge member-card__badge--dark'>
            {overview?.svipStatusText || '普通会员'}
          </Text>
        </View>
        <Text className='member-card__summary'>
          {overview?.svipMessage || '更多权益由福利中心承接'}
        </Text>
        <View className='member-actions'>
          <View className='member-action' onClick={handleOpenWelfare}>
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
        {(overview?.benefits ?? []).map((item) => (
          <View
            className='member-benefit'
            key={item.title}
            onClick={() =>
              item.status === 'ready'
                ? navigateToAppRoute(APP_ROUTES.couponList)
                : handlePending('该权益后续由福利中心承接')
            }
          >
            <View>
              <Text className='member-benefit__title'>{item.title}</Text>
              <Text className='member-benefit__summary'>{item.summary}</Text>
            </View>
            <Text
              className={
                item.status === 'ready'
                  ? 'member-benefit__tag'
                  : 'member-benefit__tag member-benefit__tag--pending'
              }
            >
              {item.status === 'ready' ? '已接入' : '承接中'}
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
  )
}

export default MemberCenterPage
