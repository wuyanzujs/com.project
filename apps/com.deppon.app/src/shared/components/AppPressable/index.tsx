import { Text, View } from '@tarojs/components'

import type { PropsWithChildren } from 'react'

import { AppNativePressable } from '../../native'
import './index.scss'

export type AppPressableVariant = 'plain' | 'surface' | 'ghost'
export type AppPressableLayout =
  | 'center'
  | 'row-start'
  | 'row-center'
  | 'column-start'

export interface AppPressableProps extends PropsWithChildren {
  accessibilityLabel?: string
  /** Keep disabled semantics while allowing onPress to explain why. */
  allowDisabledPress?: boolean
  block?: boolean
  className?: string
  contentElement?: 'text' | 'view'
  disabled?: boolean
  flex?: boolean
  layout?: AppPressableLayout
  selected?: boolean
  variant?: AppPressableVariant
  onLongPress?: () => void
  onPress?: () => void
}

const classNames = (...values: Array<string | false | undefined>) =>
  values.filter(Boolean).join(' ')

export function AppPressable({
  accessibilityLabel,
  allowDisabledPress = false,
  block = false,
  children,
  className,
  contentElement = 'view',
  disabled = false,
  flex = false,
  layout = 'center',
  onLongPress,
  onPress,
  selected = false,
  variant = 'plain'
}: AppPressableProps) {
  const contentClassName = classNames(
    'app-pressable',
    `app-pressable--${variant}`,
    block && 'app-pressable--block',
    layout !== 'center' && `app-pressable--${layout}`,
    selected && 'app-pressable--selected',
    className
  )

  return (
    <AppNativePressable
      accessibilityLabel={accessibilityLabel}
      allowDisabledPress={allowDisabledPress}
      block={block}
      disabled={disabled}
      flex={flex}
      selected={selected}
      onLongPress={onLongPress}
      onPress={onPress}
    >
      {contentElement === 'text' ? (
        <Text className={contentClassName}>{children}</Text>
      ) : (
        <View className={contentClassName}>{children}</View>
      )}
    </AppNativePressable>
  )
}
