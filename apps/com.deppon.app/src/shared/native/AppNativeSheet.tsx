import type { PropsWithChildren } from 'react'
import { useEffect, useRef, useState } from 'react'

import { Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native'

import { APP_NATIVE_TOKENS, APP_STYLE_COLORS } from '@/styles/nativeTokens'

import { AppNativeModal } from './AppNativeModal'
import { AppNativePressable } from './AppNativePressable'

interface AppNativeSheetProps extends PropsWithChildren {
  accessibilityLabel?: string
  /** 遮罩颜色，默认 rgba(0,0,0,0.26)。 */
  overlayColor?: string
  /** 面板自底部上滑时长（毫秒）。 */
  duration?: number
  onRequestClose: () => void
  visible: boolean
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'flex-end',
    zIndex: APP_NATIVE_TOKENS.layer.dialog
  },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0
  },
  panel: {
    width: '100%'
  }
})

/**
 * @description 底部弹层基件：遮罩首帧即铺满且不参与动画，只有面板自底部上滑，
 * 点开弹窗蒙层直接出现、面板滑入。
 */
export function AppNativeSheet({ accessibilityLabel, children, duration = 260, onRequestClose, overlayColor, visible }: AppNativeSheetProps) {
  const { height: windowHeight } = useWindowDimensions()
  const progress = useRef(new Animated.Value(0)).current
  const [mounted, setMounted] = useState(visible)

  useEffect(() => {
    if (visible) {
      setMounted(true)
      progress.stopAnimation()
      progress.setValue(0)
      Animated.timing(progress, {
        toValue: 1,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }).start()
      return
    }

    progress.stopAnimation()
    Animated.timing(progress, {
      toValue: 0,
      duration: Math.round(duration * 0.8),
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true
    }).start(({ finished }) => {
      if (finished) {
        setMounted(false)
      }
    })
  }, [duration, progress, visible])

  if (!mounted) {
    return null
  }

  return (
    <View style={styles.root}>
      <AppNativePressable accessibilityLabel={accessibilityLabel ?? '关闭弹窗'} overlay onPress={onRequestClose}>
        <View style={[styles.overlay, { backgroundColor: overlayColor ?? APP_STYLE_COLORS.overlay.sheet }]} />
      </AppNativePressable>
      <Animated.View
        style={[
          styles.panel,
          {
            transform: [
              {
                translateY: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [Math.max(windowHeight, 320), 0]
                })
              }
            ]
          }
        ]}
      >
        {children}
      </Animated.View>
    </View>
  )
}

/**
 * @description 全屏 Modal 版底部弹层，用在需要盖住整页（含导航栏）的业务弹窗上。
 */
export function AppNativeModalSheet({ accessibilityLabel, children, duration, onRequestClose, overlayColor, visible }: AppNativeSheetProps) {
  return (
    <AppNativeModal animationType='none' visible={visible} onRequestClose={onRequestClose}>
      <AppNativeSheet accessibilityLabel={accessibilityLabel} duration={duration} overlayColor={overlayColor} visible={visible} onRequestClose={onRequestClose}>
        {children}
      </AppNativeSheet>
    </AppNativeModal>
  )
}
