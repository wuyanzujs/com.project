import { ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'

import { useCallback, useMemo, useState } from 'react'

import { customerService } from '../../../services/customer'
import { navigateToAppRoute } from '../../../shared/navigation/appNavigation'
import { ensureAuthenticated } from '../../../shared/navigation/authGuard'
import { APP_ROUTES } from '../../../shared/navigation/routes'
import { copyTextToClipboard } from '../../../shared/platform/clipboard'
import { createAppWebUrl } from '../../../shared/webview/appWeb'

import type { CustomerCenterView } from '../../../services/customer'
import type { AppWebSource } from '../../../shared/webview/appWeb'

import './index.scss'

interface CustomerWebAction {
  title: string
  summary: string
  source: AppWebSource
}

const CUSTOMER_WEB_ACTIONS: CustomerWebAction[] = [
  {
    title: '月结中心',
    summary: '查看月结客户和代收货款能力',
    source: 'CUSTOMER_MONTHLY_CENTER'
  },
  {
    title: '号码保护',
    summary: '查看客户资料与号码保护设置',
    source: 'CUSTOMER_PHONE_PROTECT'
  }
]

function getPrimaryCustomerAction(
  customer: CustomerCenterView | null
): CustomerWebAction {
  if (customer?.hasBoundCustomer) {
    return {
      title: '管理客户',
      summary: '管理客户编码和联系人关系',
      source: 'CUSTOMER_CENTER'
    }
  }

  return {
    title: '绑定客户编码',
    summary: '绑定月结客户编码和联系人关系',
    source: 'CUSTOMER_BIND'
  }
}

const CustomerCenterPage = () => {
  const [customer, setCustomer] = useState<CustomerCenterView | null>(null)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const customerWebActions = useMemo(
    () => [getPrimaryCustomerAction(customer), ...CUSTOMER_WEB_ACTIONS],
    [customer]
  )

  const ensureCustomerAccess = useCallback(
    () =>
      ensureAuthenticated({
        redirectUrl: APP_ROUTES.customerCenter,
        replace: true
      }),
    []
  )

  const loadCustomer = useCallback(async () => {
    if (loading) {
      return
    }

    setLoading(true)
    setErrorMessage('')

    try {
      const response = await customerService.queryCustomerCenter()

      if (!response.status || !response.result) {
        setCustomer(null)
        setErrorMessage(response.message || '暂未获取到客户信息')
        return
      }

      setCustomer(response.result)
    } finally {
      setLoading(false)
    }
  }, [loading])

  useDidShow(() => {
    if (ensureCustomerAccess()) {
      loadCustomer()
    }
  })

  const handleOpenWeb = (source: AppWebSource) => {
    if (!ensureCustomerAccess()) {
      return
    }

    navigateToAppRoute(createAppWebUrl({ source }), {
      login: true
    })
  }

  const handleCopyCode = async () => {
    if (!customer?.code) {
      Taro.showToast({
        title: '暂无客户编码',
        icon: 'none'
      })
      return
    }

    try {
      await copyTextToClipboard(customer.code)
    } catch {
      Taro.showToast({
        title: '复制失败，请稍后再试',
        icon: 'none'
      })
    }
  }

  return (
    <ScrollView className='customer-page' scrollY>
      <View className='customer-header'>
        <Text className='customer-header__label'>Customer</Text>
        <Text className='customer-header__title'>客户中心</Text>
        <Text className='customer-header__summary'>
          查看当前账号的客户编码、月结入口和号码保护设置。
        </Text>
      </View>

      <View className='customer-card customer-card--hero'>
        <View className='customer-card__top'>
          <View>
            <Text className='customer-card__label'>绑定状态</Text>
            <Text className='customer-card__title'>
              {customer?.statusText || (loading ? '同步中' : '待同步')}
            </Text>
          </View>
          <Text
            className={
              customer?.hasBoundCustomer
                ? 'customer-card__badge customer-card__badge--ok'
                : 'customer-card__badge'
            }
          >
            {customer?.hasBoundCustomer ? '已绑定' : '未绑定'}
          </Text>
        </View>
        <Text className='customer-card__summary'>
          {customer?.summary ||
            errorMessage ||
            '进入页面后会自动同步当前账号的客户绑定状态。'}
        </Text>
      </View>

      <View className='customer-section'>
        <Text className='customer-section__title'>客户资料</Text>
        <View className='customer-info-row'>
          <Text className='customer-info-row__label'>客户编码</Text>
          <Text className='customer-info-row__value'>
            {customer?.code || '--'}
          </Text>
        </View>
        <View className='customer-info-row'>
          <Text className='customer-info-row__label'>客户名称</Text>
          <Text className='customer-info-row__value'>
            {customer?.name || '--'}
          </Text>
        </View>
        <View className='customer-info-row'>
          <Text className='customer-info-row__label'>联系人身份</Text>
          <Text className='customer-info-row__value'>
            {customer?.mainContactText || '--'}
          </Text>
        </View>
        <View className='customer-info-row'>
          <Text className='customer-info-row__label'>隐私面单</Text>
          <Text className='customer-info-row__value'>
            {customer?.privateBillText || '--'}
          </Text>
        </View>

        <View className='customer-actions'>
          <View className='customer-action customer-action--ghost' onClick={loadCustomer}>
            <Text className='customer-action__text customer-action__text--ghost'>
              {loading ? '同步中' : '刷新'}
            </Text>
          </View>
          <View className='customer-action' onClick={handleCopyCode}>
            <Text className='customer-action__text'>复制编码</Text>
          </View>
        </View>
      </View>

      <View className='customer-section'>
        <Text className='customer-section__title'>客户服务</Text>
        {customerWebActions.map((item) => (
          <View
            className='customer-link'
            key={item.source}
            onClick={() => handleOpenWeb(item.source)}
          >
            <View>
              <Text className='customer-link__title'>{item.title}</Text>
              <Text className='customer-link__summary'>{item.summary}</Text>
            </View>
            <Text className='customer-link__arrow'>›</Text>
          </View>
        ))}
      </View>

      <View className='customer-support'>
        <Text className='customer-support__title'>需要人工协助？</Text>
        <Text className='customer-support__summary'>
          可进入客服中心咨询客户绑定、月结和合同客户相关问题。
        </Text>
        <View
          className='customer-support__button'
          onClick={() => navigateToAppRoute(APP_ROUTES.supportCenter)}
        >
          <Text className='customer-support__button-text'>联系客服</Text>
        </View>
      </View>
    </ScrollView>
  )
}

export default CustomerCenterPage
