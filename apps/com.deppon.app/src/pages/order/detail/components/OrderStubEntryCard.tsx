import { Text, View } from '@tarojs/components'

import { AppPressable } from '../../../../shared/components'

import type { OrderStubEntryView } from '../../../../services/order'

import './OrderStubEntryCard.scss'

interface OrderStubEntryCardProps {
  entry: OrderStubEntryView | null
  onOpen: () => void
}

export function OrderStubEntryCard({
  entry,
  onOpen
}: OrderStubEntryCardProps) {
  if (!entry?.available) {
    return null
  }

  return (
    <AppPressable
      accessibilityLabel={entry.title}
      block
      className='order-detail-stub-entry'
      onPress={onOpen}
    >
      <View className='order-detail-stub-entry__mark'>
        <Text className='order-detail-stub-entry__mark-text'>存</Text>
      </View>
      <View className='order-detail-stub-entry__content'>
        <Text className='order-detail-stub-entry__title'>{entry.title}</Text>
        <Text className='order-detail-stub-entry__summary'>{entry.summary}</Text>
      </View>
      <Text className='order-detail-stub-entry__arrow'>›</Text>
    </AppPressable>
  )
}
