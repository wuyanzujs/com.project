import { Text, View } from '@tarojs/components'

import type { PropsWithChildren } from 'react'

import './OrderStubSection.scss'

export function OrderStubSection(
  props: PropsWithChildren<{
    hint?: string
    title: string
  }>
) {
  return (
    <View className='order-stub-section'>
      {props.hint ? (
        <View className='order-stub-section__head'>
          <Text className='order-stub-section__title'>{props.title}</Text>
          <Text className='order-stub-section__hint'>{props.hint}</Text>
        </View>
      ) : (
        <Text className='order-stub-section__title'>{props.title}</Text>
      )}
      {props.children}
    </View>
  )
}

export function OrderStubSectionEmpty(props: { children: string }) {
  return (
    <Text className='order-stub-section__empty'>{props.children}</Text>
  )
}
