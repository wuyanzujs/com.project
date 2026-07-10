import { Image, View } from '@tarojs/components'

import './index.scss'

interface BannerProps {
  onClick: () => void
}

const Banner = ({ onClick }: BannerProps) => {
  return (
    <View className='home-banner' onClick={onClick}>
      <Image
        className='home-banner__image'
        mode='aspectFill'
        src='https://mascdn.deppon.com/h5/img/2025/other/banner-532-050317.jpg'
      />
    </View>
  )
}

export default Banner
