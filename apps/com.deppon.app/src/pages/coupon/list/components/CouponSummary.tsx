import { Text, View } from '@tarojs/components'

import './CouponSummary.scss'

interface CouponSummaryProps {
  count: number
  title: string
}

export function CouponSummary({ count, title }: CouponSummaryProps) {
  return (
    <View className='coupon-summary'>
      <View>
        <Text className='coupon-summary__title'>{title}</Text>
        <Text className='coupon-summary__count'>共 {count} 张券</Text>
      </View>
      <Text className='coupon-summary__hint'>可用券会带入寄件页重新报价</Text>
    </View>
  )
}
