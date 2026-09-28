import { Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'

import type {
  ExpressMonthlyPayView,
  ExpressPaymentType
} from '@/services/express'
import { AppPressable } from '@/shared/components'
import { AppIcon } from '@/shared/components/AppIcon'
import { APP_NATIVE_TOKENS, APP_STYLE_COLORS } from '@/styles/nativeTokens'

import { ExpressMonthlyPayCard } from '../ExpressMonthlyPayCard'

import './index.scss'

const PAYMENT_OPTIONS: Array<{ label: string; value: ExpressPaymentType }> = [
  {
    label: '寄付现结',
    value: 'MP'
  },
  {
    label: '到付',
    value: 'PAY_ARIIVE'
  },
  {
    label: '月结',
    value: 'MONTH_PAY'
  }
]

interface ExpressPaymentRowProps {
  monthlyPayView: ExpressMonthlyPayView | null
  value: ExpressPaymentType
  onMonthlyPayAction: (view: ExpressMonthlyPayView) => void
  onSelect: (paymentType: ExpressPaymentType) => void
}

export function ExpressPaymentRow({
  monthlyPayView,
  value,
  onMonthlyPayAction,
  onSelect
}: ExpressPaymentRowProps) {
  const label =
    PAYMENT_OPTIONS.find(option => option.value === value)?.label || '请选择'

  const handlePress = () => {
    void Taro.showActionSheet({
      itemList: PAYMENT_OPTIONS.map(option => option.label)
    })
      .then(result => {
        const option = PAYMENT_OPTIONS[result.tapIndex]

        if (option) {
          onSelect(option.value)
        }
      })
      .catch(() => {
        // 用户取消选择，保持当前付款方式。
      })
  }

  return (
    <View className='express-payment-row'>
      <AppPressable
        accessibilityLabel={`付款方式${label}`}
        block
        className='express-payment-row__entry'
        layout='row-start'
        onPress={handlePress}
      >
        <Text className='express-payment-row__label'>付款方式</Text>
        {value === 'MP' ? (
          <Text className='express-payment-row__badge'>推荐使用储值卡</Text>
        ) : null}
        <Text className='express-payment-row__value' numberOfLines={1}>
          {label}
        </Text>
        <AppIcon
          color={APP_STYLE_COLORS.text.supporting}
          name='chevronRight'
          size={APP_NATIVE_TOKENS.icon.small}
        />
      </AppPressable>

      {monthlyPayView ? (
        <ExpressMonthlyPayCard
          view={monthlyPayView}
          onAction={onMonthlyPayAction}
        />
      ) : null}
    </View>
  )
}
