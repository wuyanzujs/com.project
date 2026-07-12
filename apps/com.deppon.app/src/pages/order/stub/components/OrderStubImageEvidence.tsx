import { Image, Text, View } from '@tarojs/components'

import { OrderStubSection, OrderStubSectionEmpty } from './OrderStubSection'
import { AppPressable } from '../../../../shared/components'

import type {
  OrderStubImageGroupView,
  OrderStubImagesView,
  OrderStubImageView
} from '../../../../services/order'

import './OrderStubImageEvidence.scss'

function OrderStubImageGroup(props: {
  first: boolean
  group: OrderStubImageGroupView
  onPreview: (
    group: OrderStubImageGroupView,
    image: OrderStubImageView,
    index: number
  ) => void
}) {
  const { group } = props

  return (
    <View
      className={
        props.first
          ? 'order-stub-image-group order-stub-image-group--first'
          : 'order-stub-image-group'
      }
    >
      <View className='order-stub-image-group__head'>
        <View className='order-stub-image-group__content'>
          <Text className='order-stub-image-group__title'>{group.title}</Text>
          <Text className='order-stub-image-group__summary'>
            {group.summary}
          </Text>
        </View>
        <Text className='order-stub-image-group__count'>
          {group.images.length}张
        </Text>
      </View>
      <View className='order-stub-image-grid'>
        {group.images.map((image, index) => (
          <View className='order-stub-image-thumb-slot' key={image.id}>
            <AppPressable
              accessibilityLabel={`预览${group.title}第${index + 1}张照片`}
              className='order-stub-image-thumb'
              onPress={() => props.onPreview(group, image, index)}
            >
              <Image
                className='order-stub-image-thumb__image'
                mode='aspectFill'
                src={image.url}
              />
            </AppPressable>
          </View>
        ))}
      </View>
    </View>
  )
}

export function OrderStubImageEvidence(props: {
  images: OrderStubImagesView | null
  loading: boolean
  onPreview: (
    group: OrderStubImageGroupView,
    image: OrderStubImageView,
    index: number
  ) => void
}) {
  return (
    <OrderStubSection
      hint={props.loading ? '查询中' : '只读预览'}
      title='照片凭证'
    >
      {props.loading && (
        <OrderStubSectionEmpty>正在查询揽收/签收照片...</OrderStubSectionEmpty>
      )}
      {!props.loading &&
        props.images?.groups.map((group, index) => (
          <OrderStubImageGroup
            first={index === 0}
            group={group}
            key={group.kind}
            onPreview={props.onPreview}
          />
        ))}
      {!props.loading && props.images && !props.images.groups.length && (
        <OrderStubSectionEmpty>
          {props.images.message || '暂未查询到揽收/签收照片'}
        </OrderStubSectionEmpty>
      )}
    </OrderStubSection>
  )
}
