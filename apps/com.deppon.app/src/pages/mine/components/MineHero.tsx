import { Image, Text, View } from '@tarojs/components'

import { AppPressable } from '../../../shared/components'
import './MineHero.scss'

interface MineHeroProps {
  authenticated: boolean
  profileName: string
  onOpenProfile: () => void
  onOpenSupport: () => void
}

export function MineHero({
  authenticated,
  onOpenProfile,
  onOpenSupport,
  profileName
}: MineHeroProps) {
  return (
    <View className='mine-hero'>
      <Image
        className='mine-hero__background'
        mode='scaleToFill'
        src='https://ca.deppon.com.cn/ows/assets/center2412/14.png'
      />
      <AppPressable flex
        accessibilityLabel='打开个人设置'
        block
        className='mine-profile'
        onPress={onOpenProfile}
      >
        <Image
          className='mine-profile__avatar'
          mode='aspectFit'
          src={
            authenticated
              ? 'https://ca.deppon.com.cn/ows/assets/center2412/38.png'
              : 'https://ca.deppon.com.cn/ows/assets/center2412/37.png'
          }
        />
        <View className='mine-profile__content'>
          <Text className='mine-profile__name'>{profileName}</Text>
          <Text className='mine-profile__summary'>个人设置 ›</Text>
        </View>
      </AppPressable>
      <AppPressable
        accessibilityLabel='在线客服'
        className='mine-hero__message'
        onPress={onOpenSupport}
      >
        <Image
          className='mine-hero__message-image'
          mode='aspectFit'
          src='https://ca.deppon.com.cn/ows/assets/center/23.png'
        />
      </AppPressable>
    </View>
  )
}
