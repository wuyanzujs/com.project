import type { PropsWithChildren } from 'react'

import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View
} from 'react-native'

import { APP_NATIVE_TOKENS } from '../../styles/nativeTokens'

interface AppKeyboardAvoidingViewProps extends PropsWithChildren {
  enabled?: boolean
}

const styles = StyleSheet.create({
  fill: {
    flex: 1
  }
})

export function AppKeyboardAvoidingView({
  children,
  enabled = true
}: AppKeyboardAvoidingViewProps) {
  if (Platform.OS !== 'ios') {
    return <View style={styles.fill}>{children}</View>
  }

  return (
    <KeyboardAvoidingView
      behavior={APP_NATIVE_TOKENS.keyboard.iosBehavior}
      enabled={enabled}
      keyboardVerticalOffset={APP_NATIVE_TOKENS.keyboard.verticalOffset}
      style={styles.fill}
    >
      {children}
    </KeyboardAvoidingView>
  )
}
