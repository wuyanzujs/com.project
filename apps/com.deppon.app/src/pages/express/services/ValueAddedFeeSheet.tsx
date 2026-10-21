import { Text, View } from '@tarojs/components'

import type { createExpressValueAddedQuoteView } from '@/services/express/value-added/valueAdded.quoteView'
import { formatExpressValueAddedFee } from '@/services/express/value-added/valueAdded.quoteView'
import { AppPressable } from '@/shared/components'
import { AppNativeSheet } from '@/shared/native'

import './cards.scss'

interface ValueAddedFeeSheetProps {
  view: ReturnType<typeof createExpressValueAddedQuoteView>
  visible: boolean
  onClose: () => void
}

export function ValueAddedFeeSheet({ onClose, view, visible }: ValueAddedFeeSheetProps) {
  return (
    <AppNativeSheet accessibilityLabel='关闭增值服务费用明细' visible={visible} onRequestClose={onClose}>
      <View className='express-services-detail'>
        <View className='express-services-detail__header'>
          <Text className='express-services-detail__title'>增值服务费用明细</Text>
          <AppPressable accessibilityLabel='关闭增值服务费用明细' onPress={onClose}>
            <Text className='express-services-detail__close'>×</Text>
          </AppPressable>
        </View>
        {view.rows.length ? (
          view.rows.map(row => (
            <View className='express-services-detail__row' key={row.key}>
              <Text className='express-services-detail__label'>{row.name}</Text>
              <Text className='express-services-detail__amount'>{formatExpressValueAddedFee(row.amount)}</Text>
            </View>
          ))
        ) : (
          <Text className='express-services-detail__label'>暂无增值服务费用</Text>
        )}
        <View className='express-services-detail__row'>
          <Text className='express-services-detail__title'>费用合计</Text>
          <Text className='express-services-detail__amount'>{view.priceText}</Text>
        </View>
        <Text className='express-services-editor__hint'>实际费用以快递员开单为准</Text>
      </View>
    </AppNativeSheet>
  )
}
