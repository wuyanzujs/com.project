import { type PropsWithChildren } from 'react'

import { SafeAreaView, useSafeAreaInsets, type Edge } from 'react-native-safe-area-context'

import { APP_NATIVE_TOKENS, APP_STYLE_COLORS } from '@/styles/nativeTokens'

interface AppSafeAreaViewProps extends PropsWithChildren {
  backgroundColor?: string
  edges?: Edge[]
  fill?: boolean
}

/** 底部弹层面板需要自身垫高到手势条上方时取用（dp）。 */
export function useAppSafeAreaBottomInset() {
  const insets = useSafeAreaInsets()

  return insets.bottom
}

export function AppSafeAreaView({
  backgroundColor = APP_STYLE_COLORS.surface.card,
  children,
  edges = [...APP_NATIVE_TOKENS.safeArea.defaultEdges],
  fill = true
}: AppSafeAreaViewProps) {
  return (
    <SafeAreaView edges={edges} style={{ ...(fill ? { flex: 1 } : {}), backgroundColor }}>
      {children}
    </SafeAreaView>
  )
}
