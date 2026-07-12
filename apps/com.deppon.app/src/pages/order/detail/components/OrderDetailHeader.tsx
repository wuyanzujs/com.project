import { Text, View } from '@tarojs/components'

import {
  AppPageHeader,
  AppPressable
} from '../../../../shared/components'

import './OrderDetailHeader.scss'

interface OrderDetailHeaderProps {
  identityText: string
  title: string
  onCopy: () => void
}

export function OrderDetailHeader({
  identityText,
  title,
  onCopy
}: OrderDetailHeaderProps) {
  return (
    <AppPageHeader
      className='order-detail-header'
      details={
        <View className='order-detail-header__summary-row'>
          <Text className='order-detail-header__summary'>{identityText}</Text>
          <AppPressable
            accessibilityLabel='复制订单编号'
            className='order-detail-header__copy'
            onPress={onCopy}
          >
            <Text className='order-detail-header__copy-text'>复制</Text>
          </AppPressable>
        </View>
      }
      title={title}
      titleClassName='order-detail-header__title'
    />
  )
}
