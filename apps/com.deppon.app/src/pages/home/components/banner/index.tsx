import { Text, View } from '@tarojs/components'

import './index.scss'

const Banner = () => {
  return (
    <View className='home-banner'>
      <Text className='home-banner__eyebrow'>App 端重构首屏</Text>
      <Text className='home-banner__title'>寄件、查件和会员服务会在这里重新组织</Text>
      <Text className='home-banner__desc'>
        保留参考项目的业务能力，按 RN App 的交互和原生能力重新落地。
      </Text>
    </View>
  )
}

export default Banner
