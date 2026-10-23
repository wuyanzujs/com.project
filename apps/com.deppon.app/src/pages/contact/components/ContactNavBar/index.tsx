import { Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'

import { AppPressable } from '@/shared/components'
import { AppIcon } from '@/shared/components/AppIcon'
import { APP_STYLE_COLORS } from '@/styles/nativeTokens'

import './index.scss'

interface ContactNavBarProps {
  title: string
  onShare?: () => void
}

export function ContactNavBar({ onShare, title }: ContactNavBarProps) {
  return (
    <View className='contact-nav-bar'>
      <AppPressable accessibilityLabel='返回上一页' className='contact-nav-bar__back' onPress={() => Taro.navigateBack()}>
        <AppIcon color={APP_STYLE_COLORS.text.ink} name='chevronLeft' size={64} />
      </AppPressable>
      <Text className='contact-nav-bar__title'>{title}</Text>
      {onShare ? (
        <AppPressable accessibilityLabel='分享地址簿入口' className='contact-nav-bar__share' onPress={onShare}>
          <AppIcon color={APP_STYLE_COLORS.text.ink} name='forward' size={40} />
          <Text className='contact-nav-bar__share-text'>分享</Text>
        </AppPressable>
      ) : (
        <View className='contact-nav-bar__share' />
      )}
    </View>
  )
}
