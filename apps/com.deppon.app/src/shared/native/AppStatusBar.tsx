import { StatusBar } from 'react-native'

interface AppStatusBarProps {
  backgroundColor?: string
  theme?: 'dark' | 'light'
  translucent?: boolean
}

export function AppStatusBar({
  backgroundColor = 'transparent',
  theme = 'dark',
  translucent = true
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
