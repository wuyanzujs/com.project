import { Text, View } from '@tarojs/components'

import { AppButton } from '../AppButton'
import { AppLoadingState } from '../AppLoadingState'
import './index.scss'

export interface AppBootScreenProps {
  /** 启动失败时展示的原因，为空表示仍在启动中。 */
  errorMessage?: string
  onRetry?: () => void
}

export function AppBootScreen({ errorMessage, onRetry }: AppBootScreenProps) {
  if (!errorMessage) {
    return (
      <View className='app-boot-screen'>
        <AppLoadingState label='正在加载' layout='page' />
      </View>
    )
  }

  return (
    <View className='app-boot-screen'>
      <Text className='app-boot-screen__message'>{errorMessage}</Text>
      {onRetry ? (
        <View className='app-boot-screen__action'>
          <AppButton label='重试' variant='primary' onPress={onRetry} />
        </View>
      ) : null}
    </View>
  )
}
