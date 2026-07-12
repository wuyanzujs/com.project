import { Text, View } from '@tarojs/components'

import type { ReactNode } from 'react'

import { AppPressable } from '../AppPressable'
import './index.scss'

export type AppButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
export type AppButtonDensity = 'default' | 'compact'

export interface AppButtonProps {
  accessibilityLabel?: string
  block?: boolean
  className?: string
  density?: AppButtonDensity
  disabled?: boolean
  label: string
  leading?: ReactNode
  labelClassName?: string
  loading?: boolean
  loadingLabel?: string
  trailing?: ReactNode
  variant?: AppButtonVariant
  onPress?: () => void
}

export function AppButton({
  accessibilityLabel,
  block = true,
  className,
  density = 'default',
  disabled = false,
  label,
  labelClassName,
  leading,
  loading = false,
  loadingLabel,
  onPress,
  trailing,
  variant = 'primary'
}: AppButtonProps) {
  const currentLabel = loading ? loadingLabel ?? label : label

  return (
    <AppPressable
      accessibilityLabel={accessibilityLabel ?? currentLabel}
      block={block}
      className={[
        'app-button',
        `app-button--${variant}`,
        `app-button--${density}`,
        className
      ]
        .filter(Boolean)
        .join(' ')}
      disabled={disabled || loading}
      onPress={onPress}
    >
      {leading ? <View className='app-button__leading'>{leading}</View> : null}
      <Text
        className={[
          'app-button__label',
          `app-button__label--${variant}`,
          labelClassName
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {currentLabel}
      </Text>
      {trailing ? <View className='app-button__trailing'>{trailing}</View> : null}
    </AppPressable>
  )
}
