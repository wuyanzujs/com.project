import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AppRadio } from '@/shared/components/AppRadio'

import { findElement } from '../support/react-runtime'

const native = vi.hoisted(() => ({ scale: 0.5 }))

vi.mock('@tarojs/components', () => ({ Image: 'Image', View: 'View' }))
vi.mock('@/shared/native', () => ({ designPxToDp: (value: number) => value * native.scale }))
vi.mock('@/shared/components/AppPressable', () => ({ AppPressable: 'AppPressable' }))
vi.mock('@/shared/components/AppRadio/index.scss', () => ({}))

describe('AppRadio 交互', () => {
  beforeEach(() => {
    native.scale = 0.5
  })

  it.each([false, true])('点击后回传相反的选中状态（当前 %s）', checked => {
    const onChange = vi.fn()
    const view = AppRadio({ checked, onChange })

    view.props.onPress()

    expect(onChange).toHaveBeenCalledExactlyOnceWith(!checked)
  })

  it('禁用态传递给点击层，且不回传状态变化', () => {
    const onChange = vi.fn()
    const view = AppRadio({ checked: false, disabled: true, onChange })

    expect(view.props.disabled).toBe(true)
    view.props.onPress()
    expect(onChange).not.toHaveBeenCalled()
  })

  it.each([0.4, 0.5, 0.64])('保持圆圈尺寸，并在屏宽比例 %s 下补足 44dp 热区', scale => {
    native.scale = scale
    const view = AppRadio({ checked: false, onChange: vi.fn() })
    const circle = findElement(view, element => element.props?.className === 'app-radio')

    expect(circle.props.style.width).toBe(32 * scale)
    expect(circle.props.style.height).toBe(32 * scale)
    expect(circle.props.style.width + view.props.hitSlop * 2).toBeGreaterThanOrEqual(44)
    expect(circle.props.style.height + view.props.hitSlop * 2).toBeGreaterThanOrEqual(44)
  })

  it('大于最小热区的圆圈不会被缩小', () => {
    const view = AppRadio({ checked: false, size: 112, onChange: vi.fn() })
    const circle = findElement(view, element => element.props?.className === 'app-radio')

    expect(circle.props.style.width).toBe(56)
    expect(view.props.hitSlop).toBe(0)
  })

  it('没有回调时只渲染圆圈', () => {
    const view = AppRadio({ checked: true })

    expect(view.type).toBe('View')
    expect(view.props.onPress).toBeUndefined()
  })
})
