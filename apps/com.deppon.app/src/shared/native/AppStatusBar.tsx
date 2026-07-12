import { StatusBar } from 'react-native'

import {
  APP_NATIVE_TOKENS,
  APP_STYLE_COLORS
} from '../../styles/nativeTokens'

interface AppStatusBarProps {
  backgroundColor?: string
  theme?: 'dark' | 'light'
  translucent?: boolean
}

export function AppStatusBar({
  backgroundColor = APP_STYLE_COLORS.transparent,
  theme = APP_NATIVE_TOKENS.statusBar.theme,
  translucent = APP_NATIVE_TOKENS.statusBar.translucent
}: AppStatusBarProps) {
  return (
    <StatusBar
      animated
      backgroundColor={backgroundColor}
      barStyle={theme === 'light' ? 'light-content' : 'dark-content'}
      translucent={translucent}
    />
  )
}
