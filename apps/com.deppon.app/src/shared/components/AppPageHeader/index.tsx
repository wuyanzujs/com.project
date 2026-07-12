import { Text, View } from '@tarojs/components'

import type { ReactNode } from 'react'

import './index.scss'

export type AppPageHeaderSurface = 'card' | 'brand-soft'

export interface AppPageHeaderProps {
  action?: ReactNode
  actionClassName?: string
  className?: string
  contentClassName?: string
  details?: ReactNode
  detailsClassName?: string
  eyebrow?: string
  leading?: ReactNode
  subtitleClassName?: string
  subtitle?: string
  surface?: AppPageHeaderSurface
  title: string
  titleClassName?: string
}

export function AppPageHeader({
  action,
  actionClassName,
  className,
  contentClassName,
  details,
  detailsClassName,
  eyebrow,
  leading,
  subtitle,
  subtitleClassName,
  surface = 'card',
  title,
  titleClassName
}: AppPageHeaderProps) {
  return (
    <View
      className={[
        'app-page-header',
        `app-page-header--${surface}`,
        className
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {leading ? <View className='app-page-header__leading'>{leading}</View> : null}
      <View
        className={['app-page-header__content', contentClassName]
          .filter(Boolean)
          .join(' ')}
      >
        {eyebrow ? (
          <Text className='app-page-header__eyebrow'>{eyebrow}</Text>
        ) : null}
        <Text
          className={['app-page-header__title', titleClassName]
            .filter(Boolean)
            .join(' ')}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            className={['app-page-header__subtitle', subtitleClassName]
              .filter(Boolean)
              .join(' ')}
          >
            {subtitle}
          </Text>
        ) : null}
        {details ? (
          <View
            className={['app-page-header__details', detailsClassName]
              .filter(Boolean)
              .join(' ')}
          >
            {details}
          </View>
        ) : null}
      </View>
      {action ? (
        <View
          className={['app-page-header__action', actionClassName]
            .filter(Boolean)
            .join(' ')}
        >
          {action}
        </View>
      ) : null}
    </View>
  )
}
