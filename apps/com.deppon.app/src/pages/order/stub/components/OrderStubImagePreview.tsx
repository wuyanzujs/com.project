import { Image, Text, View } from '@tarojs/components'

import {
  AppDialog,
  AppPressable
} from '../../../../shared/components'

import type {
  OrderStubImageGroupView,
  OrderStubImageView
} from '../../../../services/order'

import './OrderStubImagePreview.scss'

export interface OrderStubImagePreviewState {
  group: OrderStubImageGroupView
  image: OrderStubImageView
  index: number
}

export function OrderStubImagePreview(props: {
  preview: OrderStubImagePreviewState | null
  onClose: () => void
}) {
  if (!props.preview) {
    return null
  }

  return (
    <AppDialog
      backdropClassName='order-stub-preview-mask'
      contentSpacing={false}
      panelClassName='order-stub-preview-card'
      visible
      onClose={props.onClose}
    >
      <View className='order-stub-preview-card__head'>
        <Text className='order-stub-preview-card__title'>
          {props.preview.group.title}
        </Text>
        <Text className='order-stub-preview-card__index'>
          {props.preview.index + 1}/{props.preview.group.images.length}
        </Text>
      </View>
      <Image
        className='order-stub-preview-card__image'
        mode='aspectFit'
        src={props.preview.image.url}
      />
      <AppPressable
        accessibilityLabel='关闭照片预览'
        block
        className='order-stub-preview-card__close'
        onPress={props.onClose}
      >
        <Text className='order-stub-preview-card__close-text'>关闭</Text>
      </AppPressable>
    </AppDialog>
  )
}
