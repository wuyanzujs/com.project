import { Text, View } from '@tarojs/components'

import './index.scss'

const Navibar = () => {
  return (
    <View className='home-navibar'>
      <View>
        <Text className='home-navibar__title'>德邦快递</Text>
        <Text className='home-navibar__subtitle'>App 版业务工作台</Text>
      </View>
      <Text className='home-navibar__status'>RN</Text>
    </View>
  )
}

export default Navibar
