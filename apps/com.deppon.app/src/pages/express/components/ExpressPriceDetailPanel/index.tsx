import { Text, View } from '@tarojs/components'

import type { ExpressProductQuoteView } from '@/services/express'
import { AppPressable } from '@/shared/components'

import './index.scss'

interface ExpressPriceDetailPanelProps {
  view: ExpressProductQuoteView
  onClose: () => void
}

export function ExpressPriceDetailPanel({ view, onClose }: ExpressPriceDetailPanelProps) {
  return (
    <View className='express-price-detail'>
      <View className='express-price-detail__head'>
        <Text className='express-price-detail__title'>费用明细</Text>
        <AppPressable accessibilityLabel='收起费用明细' className='express-price-detail__close' onPress={onClose}>
          <Text className='express-price-detail__close-text'>收起</Text>
        </AppPressable>
      </View>
      <View className='express-price-detail__row'>
        <Text className='express-price-detail__label'>基础费用</Text>
        <Text className='express-price-detail__value'>{view.priceText}</Text>
      </View>
      <View className='express-price-detail__row'>
        <Text className='express-price-detail__label'>计费重量</Text>
        <Text className='express-price-detail__value'>{view.billWeightText}</Text>
      </View>
      {view.feeRows.map(row => (
        <View className='express-price-detail__row' key={row.key}>
          <Text className='express-price-detail__label'>{row.name}</Text>
          <Text className='express-price-detail__value'>{`¥${row.amount}`}</Text>
        </View>
      ))}
    </View>
  )
}
