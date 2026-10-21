import { describe, expect, it, vi } from 'vitest'

import { AppFormScrollView } from '@/shared/native/AppFormScrollView'

vi.mock('@tarojs/components', () => ({
  ScrollView: function ScrollView() {
    return null
  }
}))

describe('AppFormScrollView', () => {
  it('keeps taps working while the keyboard is open', () => {
    const element = AppFormScrollView({ children: 'form' } as never) as any

    expect(element.props.keyboardShouldPersistTaps).toBe('handled')
  })

  it('passes caller props and children through without overriding them', () => {
    const onScroll = vi.fn()
    const element = AppFormScrollView({
      children: 'form',
      className: 'signup-form',
      onScroll,
      scrollY: true,
      style: { flex: 1 }
    } as never) as any

    expect(element.props.children).toBe('form')
    expect(element.props.className).toBe('signup-form')
    expect(element.props.onScroll).toBe(onScroll)
    expect(element.props.scrollY).toBe(true)
    expect(element.props.style).toEqual({ flex: 1 })
  })
})
