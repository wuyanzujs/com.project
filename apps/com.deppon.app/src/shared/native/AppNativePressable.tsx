import type { PropsWithChildren } from 'react'

import { Pressable, StyleSheet, type PressableProps } from 'react-native'

import { APP_NATIVE_TOKENS } from '../../styles/nativeTokens'

interface AppNativePressableProps extends PropsWithChildren {
  accessibilityLabel?: string
  allowDisabledPress?: boolean
  block?: boolean
  disabled?: boolean
  fill?: boolean
  flex?: boolean
  overlay?: boolean
  selected?: boolean
  onLongPress?: PressableProps['onLongPress']
  onPress?: PressableProps['onPress']
  onPressIn?: PressableProps['onPressIn']
  onPressOut?: PressableProps['onPressOut']
}

const styles = StyleSheet.create({
  target: {
    minWidth: APP_NATIVE_TOKENS.touch.minimum,
    minHeight: APP_NATIVE_TOKENS.touch.minimum
  },
  block: {
    alignSelf: 'stretch'
  },
  fill: {
    flex: 1
  },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0
  },
  disabled: {
    opacity: APP_NATIVE_TOKENS.interaction.disabledOpacity
  },
  pressed: {
    opacity: APP_NATIVE_TOKENS.interaction.pressedOpacity
  }
})

export function AppNativePressable({
  accessibilityLabel,
  allowDisabledPress = false,
  block = false,
  children,
  disabled = false,
  fill = false,
  flex = false,
  overlay = false,
  onLongPress,
  onPress,
  selected = false,
  onPressIn,
  onPressOut
}: AppNativePressableProps) {
  const nativeDisabled = disabled && !allowDisabledPress

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole='button'
      accessibilityState={{ disabled, selected }}
      disabled={nativeDisabled}
      style={({ pressed }) => [
        styles.target,
        overlay && styles.overlay,
        block && styles.block,
        fill && styles.fill,
        flex && styles.fill,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed
      ]}
      onLongPress={onLongPress}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
    >
      {children}
    </Pressable>
  )
}
