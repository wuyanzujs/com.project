import { Text, View } from '@tarojs/components'

import { AppStatusTag } from '../../../../shared/components'

import type {
  PrintOrderListItem,
  PrintSearchType
} from '../../../../services/print'

import './PrintOrderCard.scss'

interface PrintOrderCardProps {
  item: PrintOrderListItem
  status: PrintSearchType
}

export function PrintOrderCard({ item, status }: PrintOrderCardProps) {
  return (
    <View className='print-order-card'>
      <View className='print-order-card__head'>
        <View className='print-order-card__number-block'>
          <Text className='print-order-card__eyebrow'>运单号</Text>
          <Text className='print-order-card__number'>{item.waybillNumber}</Text>
        </View>
        <AppStatusTag
          label={status === '1' ? '待打印' : '已打印'}
          tone={status === '1' ? 'brand' : 'success'}
        />
      </View>

      <View className='print-order-card__recipient'>
        <Text className='print-order-card__name'>{item.recipientName}</Text>
        <Text className='print-order-card__phone'>{item.recipientPhone}</Text>
      </View>

      <Text className='print-order-card__address'>{item.address}</Text>
    </View>
  )
}
