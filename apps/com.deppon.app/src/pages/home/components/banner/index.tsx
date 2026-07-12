import { Image } from '@tarojs/components'

import { AppPressable } from '../../../../shared/components'
import './index.scss'

interface BannerProps {
  onPress: () => void
}

const Banner = ({ onPress }: BannerProps) => {
  return (
    <AppPressable
      accessibilityLabel='寄快递'
      block
      className='home-banner'
      onPress={onPress}
    >
      <Image
        className='home-banner__image'
        mode='aspectFill'
        src='https://mascdn.deppon.com/h5/img/2025/other/banner-532-050317.jpg'
      />
    </AppPressable>
  )
}

export default Banner
