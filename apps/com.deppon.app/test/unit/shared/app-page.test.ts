import { describe, expect, it, vi } from 'vitest'

import { AppPage } from '@/shared/components/AppPage'

import { findAllElements } from '../support/react-runtime'

vi.mock('@tarojs/components', () => ({
  View: 'View'
}))

vi.mock('@tarojs/taro', () => ({
  useDidHide: () => undefined,
  useDidShow: () => undefined
}))

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 41, bottom: 24, left: 0, right: 0 })
}))

vi.mock('@/shared/native', () => ({
  AppKeyboardAvoidingView: 'AppKeyboardAvoidingView',
  AppSafeAreaView: 'AppSafeAreaView',
  AppStatusBar: 'AppStatusBar'
}))

vi.mock('@/styles/nativeTokens', () => ({
  APP_NATIVE_TOKENS: {
    safeArea: {
      noEdges: [],
      topEdge: ['top'],
      bottomEdge: ['bottom'],
      defaultEdges: ['top', 'bottom']
    }
  },
  APP_STYLE_COLORS: {
    brand: { faint: '#eef6ff' },
    surface: { card: '#ffffff', page: '#f5f7fb' }
  }
}))

const renderPage = (props: Record<string, unknown>) => AppPage({ children: 'body', ...props } as never) as any

const findSafeArea = (page: unknown) => findAllElements(page, element => element.type === 'AppSafeAreaView')[0]
const findHeader = (page: unknown) => findAllElements(page, element => element.props?.className === 'app-page__header')[0]
const findFooter = (page: unknown) => findAllElements(page, element => element.props?.className === 'app-page__footer')[0]

describe('AppPage 安全区', () => {
  it('头部接管状态栏区域，白色导航栏一直铺到屏幕顶部', () => {
    const page = renderPage({ header: 'navbar', safeArea: 'both' })

    expect(findSafeArea(page).props.edges).toEqual(['bottom'])
    expect(findHeader(page).props.style).toEqual({ paddingTop: 41 })
  })

  it('底栏接管手势条区域，底栏底色一直铺到屏幕底部', () => {
    const page = renderPage({ footer: 'submit', safeArea: 'bottom' })

    expect(findSafeArea(page).props.edges).toEqual([])
    expect(findFooter(page).props.style).toEqual({ paddingBottom: 24 })
  })

  it('没有头部/底栏的页面仍由页面底色铺满安全区', () => {
    const page = renderPage({ safeArea: 'top' })

    expect(findSafeArea(page).props.edges).toEqual(['top'])
    expect(findHeader(page)).toBeUndefined()
    expect(findSafeArea(page).props.backgroundColor).toBe('#f5f7fb')
  })
})
