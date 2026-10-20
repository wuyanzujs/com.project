import { Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'

import { AppPressable } from '@/shared/components'
import { AppIcon } from '@/shared/components/AppIcon'
import { chooseAppFile, getNativeCapabilityErrorMessage } from '@/shared/platform'
import { APP_STYLE_COLORS } from '@/styles/nativeTokens'

import './index.scss'

// 货物信息页在「给快递员捎话」右侧提供照片上传位，当前图片选择能力尚未接入，
// 点击统一走 shared/platform 的降级提示，避免页面直接调用原生能力。
export function GoodsMediaUploader() {
  const handlePress = async () => {
    try {
      await chooseAppFile({
        source: 'EXPRESS_GOODS_MEDIA',
        multiple: false,
        mimeTypes: ['image/*']
      })
    } catch (error) {
      Taro.showToast({
        title: getNativeCapabilityErrorMessage(error),
        icon: 'none'
      })
    }
  }

  return (
    <AppPressable accessibilityLabel='上传货物照片' className='express-goods-media' onPress={handlePress}>
      <View className='express-goods-media__icon'>
        <AppIcon color={APP_STYLE_COLORS.brand.default} name='camera' size={48} />
      </View>
      <Text className='express-goods-media__text'>上传照片</Text>
    </AppPressable>
  )
}
