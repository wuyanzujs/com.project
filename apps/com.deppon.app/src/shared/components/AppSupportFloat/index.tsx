import { Image, Text, View } from '@tarojs/components'

import supportIcon from '@/assets/express/customer_icon_service.png'
import { AppPressable } from '@/shared/components'
import { AppNativeDraggable, designPxToDp } from '@/shared/native'

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
    <AppNativeDraggable style={{ position: 'absolute', right: 0, bottom: designPxToDp(148), zIndex: 10 }}>
      <View className={compact ? 'app-support-float app-support-float--compact' : 'app-support-float'}>
        <AppPressable accessibilityLabel={label} block className='app-support-float__button' onPress={onPress}>
          <Image className='app-support-float__icon' mode='aspectFit' src={supportIcon} />
          <Text className={compact ? 'app-support-float__text app-support-float__text--compact' : 'app-support-float__text'}>{label}</Text>
        </AppPressable>
      </View>
    </AppNativeDraggable>
  )
}
