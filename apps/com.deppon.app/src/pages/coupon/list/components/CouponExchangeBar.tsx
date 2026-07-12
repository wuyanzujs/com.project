import { Input, Text, View } from '@tarojs/components'

import { AppPressable } from '../../../../shared/components'
import './CouponExchangeBar.scss'

interface CouponExchangeBarProps {
  exchanging: boolean
  value: string
  onBlur: (value: string) => void
  onChange: (value: string) => void
  onExchange: () => void
}

export function CouponExchangeBar({
  exchanging,
  onBlur,
  onChange,
  onExchange,
  value
}: CouponExchangeBarProps) {
  return (
    <View className='coupon-exchange'>
      <Input
        className='coupon-exchange__input'
        maxlength={20}
        placeholder='输入兑换码'
        value={value}
        onBlur={event => onBlur(event.detail.value)}
        onInput={event => onChange(event.detail.value)}
      />
      <AppPressable
        accessibilityLabel={exchanging ? '正在兑换' : '兑换'}
        className='coupon-exchange__button'
        onPress={onExchange}
      >
        <Text className='coupon-exchange__button-text'>
          {exchanging ? '兑换中' : '兑换'}
        </Text>
      </AppPressable>
    </View>
  )
}
