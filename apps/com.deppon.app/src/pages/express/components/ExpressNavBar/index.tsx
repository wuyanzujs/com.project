import { Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'

import { AppPressable } from '@/shared/components'
import { AppIcon } from '@/shared/components/AppIcon'
import { APP_STYLE_COLORS } from '@/styles/nativeTokens'

import './index.scss'

interface ExpressNavBarProps {
  title: string
  onShare?: () => void
}

// 自定义头部承载分享操作，页面需设置 navigationStyle: 'custom'。
// 物品信息等子页复用头部时隐藏分享入口。
export function ExpressNavBar({ onShare, title }: ExpressNavBarProps) {
  return (
    <View className='express-nav-bar'>
      <AppPressable accessibilityLabel='返回上一页' className='express-nav-bar__back' onPress={() => Taro.navigateBack()}>
        <AppIcon color={APP_STYLE_COLORS.text.heading} name='chevronLeft' size={64} />
      </AppPressable>
      <Text className='express-nav-bar__title'>{title}</Text>
      {onShare ? (
        <AppPressable accessibilityLabel='分享寄件入口' className='express-nav-bar__share' onPress={onShare}>
          <AppIcon color={APP_STYLE_COLORS.text.heading} name='redo' size={48} />
          <Text className='express-nav-bar__share-text'>分享</Text>
        </AppPressable>
      ) : (
        <View className='express-nav-bar__share' />
      )}
    </View>
  )
}
