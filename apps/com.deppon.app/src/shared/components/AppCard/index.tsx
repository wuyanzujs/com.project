import { View } from '@tarojs/components'

import type { PropsWithChildren } from 'react'

import './index.scss'

export type AppCardPadding = 'none' | 'compact' | 'default'
export type AppCardVariant = 'default' | 'subtle' | 'outlined' | 'brand-soft'

export interface AppCardProps extends PropsWithChildren {
  className?: string
  padding?: AppCardPadding
  variant?: AppCardVariant
}

export function AppCard({
  children,
  className,
  padding = 'default',
  variant = 'default'
}: AppCardProps) {
  return (
    <View
      className={[
        'app-card',
        `app-card--${variant}`,
        `app-card--padding-${padding}`,
        className
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </View>
  )
}
