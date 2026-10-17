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

// 地址簿列表/编辑两个页面的生产端导航栏：返回键 + 居中标题 + 弯尾前转分享箭头。
// 生产寄件页分享是 redo 回转造型（ExpressNavBar 已按其验收），地址簿是弯尾前转，
// 为不干扰寄件页既有验收结论，这里单独建组件不复用。
export function ContactNavBar({ onShare, title }: ContactNavBarProps) {
  return (
    <View className='contact-nav-bar'>
      <AppPressable accessibilityLabel='返回上一页' className='contact-nav-bar__back' onPress={() => Taro.navigateBack()}>
        {/* 生产端返回键是大号粗描边 chevron，墨迹约 53×30。 */}
        <AppIcon color={APP_STYLE_COLORS.text.heading} name='chevronLeft' size={64} />
      </AppPressable>
      <Text className='contact-nav-bar__title'>{title}</Text>
      {onShare ? (
        <AppPressable accessibilityLabel='分享地址簿入口' className='contact-nav-bar__share' onPress={onShare}>
          <AppIcon color={APP_STYLE_COLORS.text.heading} name='forward' size={40} />
          <Text className='contact-nav-bar__share-text'>分享</Text>
        </AppPressable>
      ) : (
        <View className='contact-nav-bar__share' />
      )}
    </View>
  )
}
