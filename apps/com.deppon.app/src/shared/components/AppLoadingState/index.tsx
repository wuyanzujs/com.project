import { Text, View } from '@tarojs/components'

import './index.scss'

export type AppLoadingStateLayout = 'inline' | 'page'

export interface AppLoadingStateProps {
  className?: string
  label?: string
  layout?: AppLoadingStateLayout
  showIndicator?: boolean
}

export function AppLoadingState({
  className,
  label = '加载中',
  layout = 'page',
  showIndicator = true
}: AppLoadingStateProps) {
  return (
    <View
      className={['app-loading-state', `app-loading-state--${layout}`, className]
        .filter(Boolean)
        .join(' ')}
      role='status'
    >
      {showIndicator ? (
        <View className='app-loading-state__indicator'>
          <View className='app-loading-state__dot' />
          <View className='app-loading-state__dot' />
          <View className='app-loading-state__dot' />
        </View>
      ) : null}
      <Text className='app-loading-state__label'>{label}</Text>
    </View>
  )
}
