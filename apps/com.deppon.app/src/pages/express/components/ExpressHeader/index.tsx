import { Text, View } from '@tarojs/components'

import { AppPressable } from '@/shared/components'
import { AppIcon } from '@/shared/components/AppIcon'
import { APP_NATIVE_TOKENS, APP_STYLE_COLORS } from '@/styles/nativeTokens'

import './index.scss'

interface ExpressHeaderProps {
  onOpenRealName: () => void
}

// 生产 App 的寄件页顶部只有实名提示条，批量寄/模板库等入口由首页承载。
export function ExpressHeader({ onOpenRealName }: ExpressHeaderProps) {
  return (
    <View className='express-header'>
      <View className='express-header__notice'>
        <View className='express-header__notice-copy'>
          <AppIcon
            color={APP_STYLE_COLORS.status.warningText}
            name='badgeCheck'
            size={APP_NATIVE_TOKENS.icon.small}
          />
          <Text className='express-header__notice-text'>
            根据相关法律法规要求，寄件须实名认证。推荐您提前线上实名，一次实名长期有效，寄件更便捷。
          </Text>
        </View>
        <AppPressable
          accessibilityLabel='立即进行实名认证'
          className='express-header__real-name'
          onPress={onOpenRealName}
        >
          <Text className='express-header__real-name-text'>立即实名</Text>
        </AppPressable>
      </View>
    </View>
  )
}
