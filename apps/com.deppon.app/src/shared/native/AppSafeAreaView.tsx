import type { PropsWithChildren } from 'react'

import { SafeAreaView } from 'react-native-safe-area-context'

import type { Edge } from 'react-native-safe-area-context'

interface AppSafeAreaViewProps extends PropsWithChildren {
  backgroundColor?: string
  edges?: Edge[]
  fill?: boolean
}

export function AppSafeAreaView({
  backgroundColor = '#ffffff',
  children,
  edges = ['top', 'bottom'],
  fill = true
}: AppSafeAreaViewProps) {
  return (
    <SafeAreaView
      edges={edges}
      style={{ ...(fill ? { flex: 1 } : {}), backgroundColor }}
    >
      {children}
    </SafeAreaView>
  )
}
