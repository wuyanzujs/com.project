import { Text, View } from '@tarojs/components'

import { AppPressable } from '../../../shared/components'
import { AppIcon } from '../../../shared/components/AppIcon'
import {
  APP_NATIVE_TOKENS,
  APP_STYLE_COLORS
} from '../../../styles/nativeTokens'

import type { ExpressDraft } from '../../../services/express'

import './ExpressDeliveryPointField.scss'

interface ExpressDeliveryPointFieldProps {
  deliveryPoint: ExpressDraft['deliveryPoint']
  onOpen: () => void
}

export function ExpressDeliveryPointField({
  deliveryPoint,
  onOpen
}: ExpressDeliveryPointFieldProps) {
  const selected = Boolean(deliveryPoint.code && deliveryPoint.name)

  return (
    <AppPressable
      accessibilityLabel={selected ? '更换收件自提服务点' : '选择收件自提服务点'}
      block
      className='express-delivery-point-field'
      layout='row-start'
      onPress={onOpen}
    >
      <View className='express-delivery-point-field__content'>
        <Text className='express-delivery-point-field__title'>自提服务点</Text>
        <Text className='express-delivery-point-field__summary'>
          {selected ? deliveryPoint.name : '由系统匹配收件地址附近服务点'}
        </Text>
      </View>
      <Text className='express-delivery-point-field__action'>
        {selected ? '更换' : '选择'}
      </Text>
      <AppIcon
        color={APP_STYLE_COLORS.text.supporting}
        name='chevronRight'
        size={APP_NATIVE_TOKENS.icon.small}
      />
    </AppPressable>
  )
}
