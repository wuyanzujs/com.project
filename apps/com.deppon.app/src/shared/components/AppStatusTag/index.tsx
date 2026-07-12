import { Text, View } from '@tarojs/components'

import './index.scss'

export type AppStatusTagTone =
  | 'neutral'
  | 'brand'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger'

export interface AppStatusTagProps {
  className?: string
  label: string
  tone?: AppStatusTagTone
}

export function AppStatusTag({
  className,
  label,
  tone = 'neutral'
}: AppStatusTagProps) {
  return (
    <View
      className={['app-status-tag', `app-status-tag--${tone}`, className]
        .filter(Boolean)
        .join(' ')}
    >
      <Text className={`app-status-tag__label app-status-tag__label--${tone}`}>
        {label}
      </Text>
    </View>
  )
}
