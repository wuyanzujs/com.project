import { View } from '@tarojs/components'
import { useDidHide, useDidShow } from '@tarojs/taro'

import { type PropsWithChildren, type ReactNode, useState } from 'react'

import { type Edge, useSafeAreaInsets } from 'react-native-safe-area-context'

import { AppKeyboardAvoidingView, AppSafeAreaView, AppStatusBar } from '@/shared/native'
import { APP_NATIVE_TOKENS, APP_STYLE_COLORS } from '@/styles/nativeTokens'

import './index.scss'

export type AppPageSafeArea = 'none' | 'top' | 'bottom' | 'both'
export type AppPageStatusBar = 'none' | 'dark' | 'light'
export type AppPageSurface = 'page' | 'card' | 'brand-soft'

// RN 的 StatusBar 由最后挂载的实例生效，而 Taro 下多个页面会同时挂着，
// 不聚焦的页面会把当前页的图标配色压掉。这里只在页面显示期间挂载。
function PageStatusBar({ theme }: { theme: AppPageStatusBar }) {
  const [shown, setShown] = useState(false)

  useDidShow(() => setShown(true))
  useDidHide(() => setShown(false))

  if (theme === 'none' || !shown) {
    return null
  }

  return <AppStatusBar theme={theme} />
}

export interface AppPageProps extends PropsWithChildren {
  className?: string
  footer?: ReactNode
  header?: ReactNode
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
  header,
  keyboardAvoiding = false,
  safeArea = 'bottom',
  statusBar = 'none',
  surface = 'page'
}: AppPageProps) {
  const insets = useSafeAreaInsets()
  const edges = SAFE_AREA_EDGES[safeArea]
  const headerInset = header && edges.includes('top') ? insets.top : 0
  const footerInset = footer && edges.includes('bottom') ? insets.bottom : 0
  const safeAreaEdges = edges.filter(edge => !(edge === 'top' && headerInset > 0) && !(edge === 'bottom' && footerInset > 0))

  const content = (
    <AppSafeAreaView backgroundColor={SURFACE_COLORS[surface]} edges={[...safeAreaEdges]}>
      <View className={['app-page', `app-page--${surface}`, className].filter(Boolean).join(' ')}>
        {header ? (
          <View className='app-page__header' style={headerInset > 0 ? { paddingTop: headerInset } : undefined}>
            {header}
          </View>
        ) : null}
        <View className='app-page__content'>{children}</View>
        {footer ? (
          <View className='app-page__footer' style={footerInset > 0 ? { paddingBottom: footerInset } : undefined}>
            {footer}
          </View>
        ) : null}
      </View>
    </AppSafeAreaView>
  )

  return (
    <>
      <PageStatusBar theme={statusBar} />
      {keyboardAvoiding ? <AppKeyboardAvoidingView>{content}</AppKeyboardAvoidingView> : content}
    </>
  )
}
