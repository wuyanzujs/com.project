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

// 生产 App 的寄件页导航栏带「分享」入口，Taro 默认头部无法承载右侧动作，
// 这里用自定义头部替代（页面配置 navigationStyle: 'custom'）。物品信息等
// 子页复用这个头部但不带分享入口。
export function ExpressNavBar({ onShare, title }: ExpressNavBarProps) {
  return (
    <View className='express-nav-bar'>
      <AppPressable accessibilityLabel='返回上一页' className='express-nav-bar__back' onPress={() => Taro.navigateBack()}>
        {/* 生产端返回键是大号粗描边 chevron，墨迹约 53×30。 */}
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
