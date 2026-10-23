import { Text, View } from '@tarojs/components'

import { useState, type CSSProperties, type PropsWithChildren } from 'react'

import { AppNativePressable } from '@/shared/native'
import './index.scss'

export type AppPressableVariant = 'plain' | 'surface' | 'ghost'
export type AppPressableLayout = 'center' | 'row-start' | 'row-center' | 'column-start'

export interface AppPressableProps extends PropsWithChildren {
  accessibilityLabel?: string
  /** 保留 disabled 语义，同时允许 onPress 说明不可用的原因。 */
  allowDisabledPress?: boolean
  block?: boolean
  className?: string
  /** 视觉盒子不再套用 44dp 最小尺寸，热区改由 hitSlop 补齐。 */
  compact?: boolean
  contentElement?: 'text' | 'view'
  disabled?: boolean
  flex?: boolean
  hitSlop?: number
  layout?: AppPressableLayout
  selected?: boolean
  variant?: AppPressableVariant
  /**
   * Taro 编译会把调用方的静态 className 解析为 style prop 传入，
   * 必须接收并渲染，否则调用方的样式会被整体丢弃。
   */
  style?: CSSProperties
  textClassName?: string
  onLongPress?: () => void
  onPress?: () => void
}

const classNames = (...values: Array<string | false | undefined>) => values.filter(Boolean).join(' ')

export function AppPressable({
  accessibilityLabel,
  allowDisabledPress = false,
  block = false,
  children,
  className,
  compact = false,
  contentElement = 'view',
  disabled = false,
  flex = false,
  hitSlop,
  layout = 'center',
  onLongPress,
  onPress,
  selected = false,
  style,
  textClassName: textClassNameProp,
  variant = 'plain'
}: AppPressableProps) {
  const [pressed, setPressed] = useState(false)
  const contentClassName = classNames(
    'app-pressable',
    `app-pressable--${variant}`,
    block && 'app-pressable--block',
    compact && 'app-pressable--compact',
    flex && 'app-pressable--flex',
    layout !== 'center' && `app-pressable--${layout}`,
    disabled && 'app-pressable--disabled',
    pressed && 'app-pressable--pressed',
    selected && 'app-pressable--selected',
    className
  )

  const textClassName = classNames('app-pressable__text', textClassNameProp ?? className)

  return (
    <View className={contentClassName} style={style}>
      {contentElement === 'text' ? <Text className={textClassName}>{children}</Text> : children}
      <AppNativePressable
        accessibilityLabel={accessibilityLabel}
        allowDisabledPress={allowDisabledPress}
        block={block}
        compact={compact}
        disabled={disabled}
        hitSlop={hitSlop}
        overlay
        selected={selected}
        onLongPress={onLongPress}
        onPress={onPress}
        onPressIn={() => {
          if (!disabled) setPressed(true)
        }}
        onPressOut={() => setPressed(false)}
      />
    </View>
  )
}
