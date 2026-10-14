import { Image, Text, View } from '@tarojs/components'

import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { AppPressable } from '@/shared/components'
import { designPxToDp } from '@/shared/native'

import './index.scss'

// 设计稿里 hero 高 410、内容顶部留白 84；状态栏高度要运行时才知道，
// 所以这两项在行内按设备补足，让渐变背景从屏幕最顶端铺起。
const HERO_HEIGHT = 410
const HERO_TOP_SPACE = 84

interface MineHeroProps {
  authenticated: boolean
  profileName: string
  onOpenProfile: () => void
  onOpenSupport: () => void
}

export function MineHero({ authenticated, onOpenProfile, onOpenSupport, profileName }: MineHeroProps) {
  const insets = useSafeAreaInsets()
  const heroHeight = designPxToDp(HERO_HEIGHT) + insets.top
  const heroTopSpace = designPxToDp(HERO_TOP_SPACE) + insets.top

  return (
    <View className='mine-hero' style={{ minHeight: heroHeight, paddingTop: heroTopSpace }}>
      <Image className='mine-hero__background' mode='scaleToFill' src='https://ca.deppon.com.cn/ows/assets/center2412/14.png' style={{ height: heroHeight }} />
      <AppPressable flex accessibilityLabel='打开个人设置' block className='mine-profile' onPress={onOpenProfile}>
        <Image
          className='mine-profile__avatar'
          mode='aspectFit'
          src={authenticated ? 'https://ca.deppon.com.cn/ows/assets/center2412/38.png' : 'https://ca.deppon.com.cn/ows/assets/center2412/37.png'}
        />
        <View className='mine-profile__content'>
          <Text className='mine-profile__name'>{profileName}</Text>
          {authenticated && <Text className='mine-profile__summary'>个人设置 ›</Text>}
        </View>
      </AppPressable>
      <AppPressable accessibilityLabel='在线客服' className='mine-hero__message' onPress={onOpenSupport}>
        <Image className='mine-hero__message-image' mode='aspectFit' src='https://ca.deppon.com.cn/ows/assets/center/23.png' />
      </AppPressable>
    </View>
  )
}
