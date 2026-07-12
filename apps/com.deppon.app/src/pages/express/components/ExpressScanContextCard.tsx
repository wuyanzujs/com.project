import { Text, View } from '@tarojs/components'

import { AppCard, AppPressable } from '../../../shared/components'

import type { ExpressScanContextView } from '../../../services/express'

import './ExpressScanContextCard.scss'

interface ExpressScanContextCardProps {
  view: ExpressScanContextView
  onClear: () => void
}

export function ExpressScanContextCard({
  view,
  onClear
}: ExpressScanContextCardProps) {
  return (
    <AppCard
      className={`express-scan-context express-scan-context--${view.tone}`}
      padding='none'
    >
      <View className='express-scan-context__head'>
        <Text className='express-scan-context__title'>{view.title}</Text>
        <Text className='express-scan-context__tag'>{view.tag}</Text>
      </View>
      <Text className='express-scan-context__summary'>{view.summary}</Text>
      <AppPressable
        accessibilityLabel={view.actionText}
        className='express-scan-context__action'
        onPress={onClear}
      >
        <Text className='express-scan-context__action-text'>
          {view.actionText}
        </Text>
      </AppPressable>
    </AppCard>
  )
}
