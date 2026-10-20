import { Text, View } from '@tarojs/components'

import { AppPressable } from '@/shared/components'
import { AppIcon } from '@/shared/components/AppIcon'
import { AppNativeDraggable } from '@/shared/native'
import { APP_STYLE_COLORS } from '@/styles/nativeTokens'

import './index.scss'

export interface AppSupportFloatProps {
  /** 浮窗文案，列表和详情页为「客服中心」，寄件页为「客服」。 */
  label?: string
  onPress: () => void
}

/**
 * @description 右侧停靠的客服浮窗：贴右边缘的白色半圆胶囊，可沿右边缘上下拖动。
 */
export function AppSupportFloat({ label = '客服中心', onPress }: AppSupportFloatProps) {
  // 两字文案（寄件页「客服」）按生产端量测收窄为 104×100 的半圆胶囊。
  const compact = label.length <= 2

  return (
    <View className={compact ? 'app-support-float app-support-float--compact' : 'app-support-float'}>
      <AppNativeDraggable>
        <AppPressable accessibilityLabel={label} block className='app-support-float__button' onPress={onPress}>
          <View className='app-support-float__icon'>
            <AppIcon color={APP_STYLE_COLORS.text.heading} name='headphones' size={44} strokeWidth={2.4} />
            <View className='app-support-float__waves'>
              <View className='app-support-float__wave app-support-float__wave--short' />
              <View className='app-support-float__wave' />
            </View>
          </View>
          <Text className={compact ? 'app-support-float__text app-support-float__text--compact' : 'app-support-float__text'}>{label}</Text>
        </AppPressable>
      </AppNativeDraggable>
    </View>
  )
}
