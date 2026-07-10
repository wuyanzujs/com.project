import { Text, View } from '@tarojs/components'

import { AppIcon } from '../../../../shared/components/AppIcon'

import './index.scss'

interface NavibarProps {
  onSupport: () => void
}

const Navibar = ({ onSupport }: NavibarProps) => {
  return (
    <View className='home-navibar'>
      <View>
        <Text className='home-navibar__title'>德邦快递</Text>
        <Text className='home-navibar__subtitle'>大件快递 发德邦</Text>
      </View>
      <View className='home-navibar__support' onClick={onSupport}>
        <AppIcon color='#344054' name='headphones' size={24} />
      </View>
    </View>
  )
}

export default Navibar
