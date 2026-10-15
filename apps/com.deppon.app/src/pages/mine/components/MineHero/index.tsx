import { Image, Text, View } from '@tarojs/components'

import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { AppPressable } from '@/shared/components'
import { AppIcon } from '@/shared/components/AppIcon'
import { designPxToDp } from '@/shared/native'
import { APP_STYLE_COLORS } from '@/styles/nativeTokens'

import './index.scss'

// 设计稿里背景图 750x520、内容顶部留白 92。容器只按内容撑高，
// 背景图从屏幕最顶端铺满整宽并向下溢出，垫在会员卡底下自然淡出；
// 状态栏高度要运行时才知道，所以留白在行内按设备补足；
// 右上操作列随状态栏顶部绝对定位，生产端图标中心 ≈ 状态栏底部下 44。
const HERO_BACKGROUND_HEIGHT = 520
const HERO_TOP_SPACE = 92

interface MineHeroProps {
  authenticated: boolean
  profileName: string
  onOpenProfile: () => void
  onOpenSettings: () => void
  onOpenShare: () => void
  onOpenSupport: () => void
}

export function MineHero({ authenticated, onOpenProfile, onOpenSettings, onOpenShare, onOpenSupport, profileName }: MineHeroProps) {
  const insets = useSafeAreaInsets()
  const heroBackgroundHeight = designPxToDp(HERO_BACKGROUND_HEIGHT)
  const heroTopSpace = designPxToDp(HERO_TOP_SPACE) + insets.top

  return (
    <View className='mine-hero' style={{ paddingTop: heroTopSpace }}>
      <Image
        className='mine-hero__background'
        mode='scaleToFill'
        src='https://ca.deppon.com.cn/ows/assets/center2412/14.png'
        style={{ height: heroBackgroundHeight }}
      />
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
      <View className='mine-hero__actions' style={{ top: insets.top }}>
        <AppPressable accessibilityLabel='在线客服' className='mine-hero__action' onPress={onOpenSupport}>
          <Image className='mine-hero__message-image' mode='aspectFit' src='https://ca.deppon.com.cn/ows/assets/center/23.png' />
          {/* 生产端此处是带未读数的红色圆点（如「2」）；暂无消息未读数接口，先保持常驻红点占位 */}
          <View className='mine-hero__message-dot' />
        </AppPressable>
        <AppPressable accessibilityLabel='分享我的页面' className='mine-hero__action' onPress={onOpenShare}>
          <AppIcon color={APP_STYLE_COLORS.text.heading} name='forward' size={48} strokeWidth={2.1} />
        </AppPressable>
        <AppPressable accessibilityLabel='打开账号设置' className='mine-hero__action mine-hero__action--settings' onPress={onOpenSettings}>
          <AppIcon color={APP_STYLE_COLORS.text.heading} name='settingNut' size={48} strokeWidth={2.3} />
        </AppPressable>
      </View>
    </View>
  )
}
