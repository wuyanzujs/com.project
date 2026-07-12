import { Text, View } from '@tarojs/components'

import type { ReactNode } from 'react'

import './index.scss'

export type AppEmptyStateTone = 'neutral' | 'error'

export interface AppEmptyStateProps {
  action?: ReactNode
  actionClassName?: string
  className?: string
  descriptionClassName?: string
  description?: string
  title: string
  titleClassName?: string
  tone?: AppEmptyStateTone
  visual?: ReactNode
}

export function AppEmptyState({
  action,
  actionClassName,
  className,
  descriptionClassName,
  description,
  title,
  titleClassName,
  tone = 'neutral',
  visual
}: AppEmptyStateProps) {
  return (
    <View
      className={['app-empty-state', `app-empty-state--${tone}`, className]
        .filter(Boolean)
        .join(' ')}
    >
      {visual ? <View className='app-empty-state__visual'>{visual}</View> : null}
      <Text
        className={[
          'app-empty-state__title',
          `app-empty-state__title--${tone}`,
          titleClassName
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {title}
      </Text>
      {description ? (
        <Text
          className={['app-empty-state__description', descriptionClassName]
            .filter(Boolean)
            .join(' ')}
        >
          {description}
        </Text>
      ) : null}
      {action ? (
        <View
          className={['app-empty-state__action', actionClassName]
            .filter(Boolean)
            .join(' ')}
        >
          {action}
        </View>
      ) : null}
    </View>
  )
}
