import { Text, View } from '@tarojs/components'

import type { PropsWithChildren } from 'react'

import './OrderDetailSection.scss'

interface OrderDetailSectionProps extends PropsWithChildren {
  hint?: string
  title: string
}

export function OrderDetailSection({
  children,
  hint,
  title
}: OrderDetailSectionProps) {
  return (
    <View className='order-detail-section'>
      {hint !== undefined ? (
        <View className='order-detail-section__head'>
          <Text className='order-detail-section__title'>{title}</Text>
          <Text className='order-detail-section__hint'>{hint}</Text>
        </View>
      ) : (
        <Text className='order-detail-section__title'>{title}</Text>
      )}
      {children}
    </View>
  )
}
