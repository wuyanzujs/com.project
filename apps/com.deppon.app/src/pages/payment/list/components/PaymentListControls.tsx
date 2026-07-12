import { Input, Text, View } from '@tarojs/components'

import { AppPressable } from '../../../../shared/components'

import type {
  PaymentListStatus,
  PaymentRole
} from '../../../../services/payment'

import './PaymentListControls.scss'

const PAYMENT_STATUS_TABS: Array<{
  label: string
  value: PaymentListStatus
}> = [
  {
    label: '待支付',
    value: 'UNPAID'
  },
  {
    label: '已支付',
    value: 'PAID'
  }
]

const PAYMENT_ROLE_TABS: Array<{ label: string; value: PaymentRole }> = [
  {
    label: '我寄的',
    value: 'sender'
  },
  {
    label: '我收的',
    value: 'receive'
  }
]

interface PaymentListControlsProps {
  status: PaymentListStatus
  role: PaymentRole
  keyword: string
  totalRows: number
  loadedAmount: number
  onStatusChange: (status: PaymentListStatus) => void
  onRoleChange: (role: PaymentRole) => void
  onKeywordChange: (keyword: string) => void
  onSearch: () => void
}

export function PaymentListControls(props: PaymentListControlsProps) {
  return (
    <>
      <View className='payment-status-tabs'>
        {PAYMENT_STATUS_TABS.map(tab => (
          <AppPressable flex
            accessibilityLabel={tab.label}
            className={
              tab.value === props.status
                ? 'payment-status-tab payment-status-tab--active'
                : 'payment-status-tab'
            }
            key={tab.value}
            onPress={() => props.onStatusChange(tab.value)}
          >
            <Text
              className={
                tab.value === props.status
                  ? 'payment-status-tab__text payment-status-tab__text--active'
                  : 'payment-status-tab__text'
              }
            >
              {tab.label}
            </Text>
          </AppPressable>
        ))}
      </View>

      <View className='payment-tabs'>
        {PAYMENT_ROLE_TABS.map(tab => (
          <AppPressable
            accessibilityLabel={tab.label}
            className={
              tab.value === props.role
                ? 'payment-tab payment-tab--active'
                : 'payment-tab'
            }
            key={tab.value}
            onPress={() => props.onRoleChange(tab.value)}
          >
            <Text
              className={
                tab.value === props.role
                  ? 'payment-tab__text payment-tab__text--active'
                  : 'payment-tab__text'
              }
            >
              {tab.label}
            </Text>
          </AppPressable>
        ))}
      </View>

      <View className='payment-search'>
        <Input
          className='payment-search__input'
          placeholder='输入运单号，多个用逗号分隔'
          value={props.keyword}
          onInput={event => props.onKeywordChange(event.detail.value)}
        />
        <AppPressable
          accessibilityLabel='搜索待支付费用'
          className='payment-search__button'
          onPress={props.onSearch}
        >
          <Text className='payment-search__button-text'>搜索</Text>
        </AppPressable>
      </View>

      <View className='payment-summary'>
        <View>
          <Text className='payment-summary__title'>
            {props.status === 'PAID' ? '最近180天' : '最近一个月'}
          </Text>
          <Text className='payment-summary__count'>
            共 {props.totalRows} 笔费用
          </Text>
        </View>
        <View className='payment-summary__side'>
          <Text className='payment-summary__hint'>已加载合计</Text>
          <Text className='payment-summary__amount'>
            ¥{props.loadedAmount.toFixed(2)}
          </Text>
        </View>
      </View>
    </>
  )
}
