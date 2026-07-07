import { ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'

import { useCallback, useState } from 'react'

import { ecardService } from '../../../services/ecard'
import { navigateToAppRoute } from '../../../shared/navigation/appNavigation'
import { ensureAuthenticated } from '../../../shared/navigation/authGuard'
import { APP_ROUTES } from '../../../shared/navigation/routes'
import { createAppWebUrl } from '../../../shared/webview/appWeb'

import type {
  ECardOverviewView,
  ECardTargetPage
} from '../../../services/ecard'

import './index.scss'

const ECARD_ACTIONS: Array<{
  title: string
  summary: string
  targetPage: ECardTargetPage
  source: string
}> = [
  {
    title: '进入 E 卡',
    summary: '开通、管理和查看储值卡',
    targetPage: 'HOME',
    source: 'ECARD_CENTER'
  },
  {
    title: '充值',
    summary: '充值优惠和支付由 E 卡页面承接',
    targetPage: 'RECHARGE',
    source: 'ECARD_RECHARGE'
  },
  {
    title: '账单',
    summary: '查看充值和消费明细',
    targetPage: 'BILL',
    source: 'ECARD_BILL'
  }
]

const ECardCenterPage = () => {
  const [overview, setOverview] = useState<ECardOverviewView | null>(null)
  const [loading, setLoading] = useState(false)
  const [opening, setOpening] = useState('')
  const [message, setMessage] = useState('')

  const ensureECardAccess = useCallback(
    () =>
      ensureAuthenticated({
        redirectUrl: APP_ROUTES.ecardCenter,
        replace: true
      }),
    []
  )

  const loadOverview = useCallback(async () => {
    if (loading) {
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const response = await ecardService.queryOverview()

      if (!response.status || !response.result) {
        setOverview(null)
        setMessage(response.message || '暂未获取到 E 卡信息')
        return
      }

      setOverview(response.result)
    } finally {
      setLoading(false)
    }
  }, [loading])

  useDidShow(() => {
    if (ensureECardAccess()) {
      loadOverview()
    }
  })

  const handleOpenECard = async (
    targetPage: ECardTargetPage,
    source: string,
    title: string
  ) => {
    if (!ensureECardAccess() || opening) {
      return
    }

    setOpening(source)

    try {
      const response = await ecardService.createCenterUrl(targetPage)

      if (!response.status || !response.result) {
        Taro.showToast({
          title: response.message || '暂未获取到 E 卡页面',
          icon: 'none'
        })
        return
      }

      navigateToAppRoute(
        createAppWebUrl({
          source,
          uri: response.result,
          title
        }),
        {
          login: true
        }
      )
    } finally {
      setOpening('')
    }
  }

  return (
    <ScrollView className='ecard-page' scrollY>
      <View className='ecard-header'>
        <Text className='ecard-header__label'>E-Card</Text>
        <Text className='ecard-header__title'>德邦 E 卡</Text>
        <Text className='ecard-header__summary'>
          首期同步储值卡余额、开通状态和充值入口，支付和充值流程由 E 卡 WebView 承接。
        </Text>
      </View>

      <View className='ecard-balance-card'>
        <View className='ecard-balance-card__top'>
          <View>
            <Text className='ecard-balance-card__label'>当前余额</Text>
            <Text className='ecard-balance-card__amount'>
              {overview?.balanceText || '¥0'}
            </Text>
          </View>
          <Text
            className={
              overview?.hasCard
                ? 'ecard-balance-card__badge ecard-balance-card__badge--ok'
                : 'ecard-balance-card__badge'
            }
          >
            {overview?.statusText || (loading ? '同步中' : '待同步')}
          </Text>
        </View>
        <Text className='ecard-balance-card__summary'>
          {overview?.rechargeDesc ||
            message ||
            '进入页面后会同步当前账号的 E 卡余额和开通状态。'}
        </Text>
      </View>

      <View className='ecard-status'>
        <View className='ecard-status__item'>
          <Text className='ecard-status__label'>卡片状态</Text>
          <Text className='ecard-status__value'>
            {overview?.statusText || '--'}
          </Text>
        </View>
        <View className='ecard-status__item'>
          <Text className='ecard-status__label'>支付密码</Text>
          <Text className='ecard-status__value'>
            {overview?.securityText || '--'}
          </Text>
        </View>
      </View>

      <View className='ecard-actions'>
        <Text className='ecard-actions__title'>E 卡服务</Text>
        {ECARD_ACTIONS.map((item) => (
          <View
            className='ecard-action-row'
            key={item.source}
            onClick={() =>
              handleOpenECard(item.targetPage, item.source, item.title)
            }
          >
            <View>
              <Text className='ecard-action-row__title'>{item.title}</Text>
              <Text className='ecard-action-row__summary'>{item.summary}</Text>
            </View>
            <Text className='ecard-action-row__arrow'>
              {opening === item.source ? '...' : '›'}
            </Text>
          </View>
        ))}
      </View>

      <View className='ecard-promotions'>
        <View className='ecard-promotions__head'>
          <Text className='ecard-promotions__title'>充值优惠</Text>
          <Text className='ecard-promotions__summary'>
            共 {overview?.promotions.length ?? 0} 条
          </Text>
        </View>

        {(overview?.promotions ?? []).map((item) => (
          <View className='ecard-promotion' key={`${item.title}-${item.summary}`}>
            <Text className='ecard-promotion__title'>{item.title}</Text>
            <Text className='ecard-promotion__summary'>{item.summary}</Text>
          </View>
        ))}

        {overview && !overview.promotions.length && (
          <View className='ecard-empty'>
            <Text className='ecard-empty__title'>暂无充值优惠</Text>
            <Text className='ecard-empty__summary'>
              具体优惠以 E 卡页面展示和收银台结果为准。
            </Text>
          </View>
        )}
      </View>

      <View className='ecard-footer'>
        <Text className='ecard-footer__title'>使用说明</Text>
        <Text className='ecard-footer__summary'>
          储值卡可用于符合规则的运费和增值服务费。是否支持抵扣、支付密码和充值活动，以 E 卡页面和后端校验为准。
        </Text>
      </View>
    </ScrollView>
  )
}

export default ECardCenterPage
