import { Text, View } from '@tarojs/components'

import { AppPressable } from '../../../../shared/components'
import { AppIcon } from '../../../../shared/components/AppIcon'
import { APP_STYLE_COLORS } from '../../../../styles/nativeTokens'

import './OrderSupportFloat.scss'

export function OrderSupportFloat(props: { onPress: () => void }) {
  return (
    <View className='order-support-float'>
      <AppPressable
        accessibilityLabel='客服中心'
        block
        className='order-support-float__button'
        onPress={props.onPress}
      >
        <AppIcon
          color={APP_STYLE_COLORS.text.heading}
          name='headphones'
          size={34}
          strokeWidth={2.1}
        />
        <Text className='order-support-float__text'>客服中心</Text>
      </AppPressable>
    </View>
  )
}
