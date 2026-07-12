import { View } from '@tarojs/components'

import { type PropsWithChildren, type ReactNode } from 'react'

import { type Edge } from 'react-native-safe-area-context'

import {
  APP_NATIVE_TOKENS,
  APP_STYLE_COLORS
} from '../../../styles/nativeTokens'
import {
  AppKeyboardAvoidingView,
  AppSafeAreaView,
  AppStatusBar
} from '../../native'

import './index.scss'

export type AppPageSafeArea = 'none' | 'top' | 'bottom' | 'both'
export type AppPageStatusBar = 'none' | 'dark' | 'light'
export type AppPageSurface = 'page' | 'card' | 'brand-soft'

export interface AppPageProps extends PropsWithChildren {
  className?: string
  footer?: ReactNode
  keyboardAvoiding?: boolean
  safeArea?: AppPageSafeArea
  statusBar?: AppPageStatusBar
  surface?: AppPageSurface
}

const SAFE_AREA_EDGES: Record<AppPageSafeArea, readonly Edge[]> = {
  none: APP_NATIVE_TOKENS.safeArea.noEdges,
  top: APP_NATIVE_TOKENS.safeArea.topEdge,
  bottom: APP_NATIVE_TOKENS.safeArea.bottomEdge,
  both: APP_NATIVE_TOKENS.safeArea.defaultEdges
}

const SURFACE_COLORS: Record<AppPageSurface, string> = {
  page: APP_STYLE_COLORS.surface.page,
  card: APP_STYLE_COLORS.surface.card,
  'brand-soft': APP_STYLE_COLORS.brand.faint
}

export function AppPage({
  children,
  className,
  footer,
  keyboardAvoiding = false,
  safeArea = 'bottom',
  statusBar = 'none',
  surface = 'page'
}: AppPageProps) {
  const content = (
    <AppSafeAreaView
      backgroundColor={SURFACE_COLORS[surface]}
      edges={[...SAFE_AREA_EDGES[safeArea]]}
    >
      <View
        className={[
          'app-page',
          `app-page--${surface}`,
          className
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <View className='app-page__content'>{children}</View>
        {footer ? <View className='app-page__footer'>{footer}</View> : null}
      </View>
    </AppSafeAreaView>
  )

  return (
    <>
      {statusBar === 'none' ? null : <AppStatusBar theme={statusBar} />}
      {keyboardAvoiding ? (
        <AppKeyboardAvoidingView>{content}</AppKeyboardAvoidingView>
      ) : (
        content
      )}
    </>
  )
}
