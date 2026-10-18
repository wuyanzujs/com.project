import { Text, View } from '@tarojs/components'

import { AppPressable } from '@/shared/components'
import { AppIcon } from '@/shared/components/AppIcon'
import { APP_STYLE_COLORS } from '@/styles/nativeTokens'

import './index.scss'

export interface AppSupportFloatProps {
  /** 浮窗文案,生产端列表/详情页为「客服中心」,寄件页为「客服」 */
  label?: string
  onPress: () => void
}

/**
 * @description 右侧停靠的客服浮窗,对齐生产端 common/components/customer_service/draggable
 */
export function AppSupportFloat({ label = '客服中心', onPress }: AppSupportFloatProps) {
  return (
    <View className='app-support-float'>
      <AppPressable accessibilityLabel={label} block className='app-support-float__button' onPress={onPress}>
        <AppIcon color={APP_STYLE_COLORS.text.heading} name='headphones' size={34} strokeWidth={2.1} />
        <Text className='app-support-float__text'>{label}</Text>
      </AppPressable>
    </View>
  )
}
