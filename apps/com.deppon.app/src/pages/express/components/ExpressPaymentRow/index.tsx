import { Image, Text, View } from '@tarojs/components'

import { useState } from 'react'

import type { ExpressMonthlyPayView, ExpressPaymentType } from '@/services/express'
import { AppPressable } from '@/shared/components'
import { APP_IMAGE_ICONS } from '@/shared/components/AppIcon'

import { ExpressMonthlyPayCard } from '../ExpressMonthlyPayCard'
import { ExpressPaymentSheet } from '../ExpressPaymentSheet'

import './index.scss'

interface ExpressPaymentRowProps {
  monthlyPayView: ExpressMonthlyPayView | null
  value: ExpressPaymentType
  onMonthlyPayAction: (view: ExpressMonthlyPayView) => void
  onSelect: (paymentType: ExpressPaymentType) => void
}

export function ExpressPaymentRow({ monthlyPayView, value, onMonthlyPayAction, onSelect }: ExpressPaymentRowProps) {
  const [sheetVisible, setSheetVisible] = useState(false)
  const label = value === 'MP' ? '寄付现结' : value === 'PAY_ARIIVE' ? '到付' : value === 'MONTH_PAY' ? '月结' : '请选择'

  return (
    <View className='express-payment-row'>
      <AppPressable
        accessibilityLabel={`付款方式${label}`}
        block
        className='express-payment-row__entry'
        layout='row-start'
        onPress={() => setSheetVisible(true)}
      >
        <Text className='express-payment-row__label'>付款方式</Text>
        {/* 生产端角标贴在右侧值文字前面，不跟在标签后。 */}
        {value === 'MP' ? (
          <View className='express-payment-row__badge'>
            <Text className='express-payment-row__badge-text'>推荐使用储值卡</Text>
            <View className='express-payment-row__badge-arrow' />
          </View>
        ) : null}
        <Text className='express-payment-row__value' numberOfLines={1}>
          {label}
        </Text>
        <Image className='express-payment-row__arrow' mode='aspectFit' src={APP_IMAGE_ICONS.arrowRightGrey} />
      </AppPressable>

      <ExpressPaymentSheet visible={sheetVisible} value={value} onClose={() => setSheetVisible(false)} onSelect={onSelect} />

      {monthlyPayView ? <ExpressMonthlyPayCard view={monthlyPayView} onAction={onMonthlyPayAction} /> : null}
    </View>
  )
}
