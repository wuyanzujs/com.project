import { Text, View } from '@tarojs/components'

import type { CouponStatus } from '@/services/coupon'
import { AppPressable } from '@/shared/components'

import './index.scss'

export interface CouponTabItem {
  label: string
  value: CouponStatus
}

interface CouponStatusTabsProps {
  activeStatus: CouponStatus
  tabs: CouponTabItem[]
  onChange: (status: CouponStatus) => void
}

export function CouponStatusTabs({ activeStatus, onChange, tabs }: CouponStatusTabsProps) {
  return (
    <View className='coupon-tabs'>
      {tabs.map(tab => (
        <AppPressable
          accessibilityLabel={tab.label}
          className={tab.value === activeStatus ? 'coupon-tab coupon-tab--active' : 'coupon-tab'}
          key={tab.value}
          onPress={() => onChange(tab.value)}
        >
          <Text className={tab.value === activeStatus ? 'coupon-tab__text coupon-tab__text--active' : 'coupon-tab__text'}>{tab.label}</Text>
        </AppPressable>
      ))}
    </View>
  )
}
