import { Text, View } from '@tarojs/components'

import { AppPressable } from '@/shared/components'

import './index.scss'

interface ExpressHeaderProps {
  onOpenRealName: () => void
}

export function ExpressHeader({ onOpenRealName }: ExpressHeaderProps) {
  return (
    <View className='express-header'>
      <View className='express-header__notice'>
        <Text className='express-header__notice-text'>根据相关法律法规要求，寄件须实名认证。推荐您提前线上实名，一次实名长期有效，寄件更便捷。</Text>
        <AppPressable accessibilityLabel='立即进行实名认证' className='express-header__real-name' onPress={onOpenRealName}>
          <Text className='express-header__real-name-text'>立即实名</Text>
        </AppPressable>
      </View>
    </View>
  )
}
