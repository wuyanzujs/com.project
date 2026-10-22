import { describe, expect, it } from 'vitest'

import { isValidCoordinate } from '@/shared/geo/coordinates'

describe('isValidCoordinate', () => {
  it('接受合法范围内的数字与字符串坐标', () => {
    expect(isValidCoordinate(31.2304, 121.4737)).toBe(true)
    expect(isValidCoordinate('31.2304', '121.4737')).toBe(true)
    expect(isValidCoordinate(0, 0)).toBe(true)
    expect(isValidCoordinate(' 31.2304 ', '121.4737')).toBe(true)
  })

  it('接受边界值 ±90 / ±180', () => {
    expect(isValidCoordinate(90, 180)).toBe(true)
    expect(isValidCoordinate(-90, -180)).toBe(true)
    expect(isValidCoordinate(90, -180)).toBe(true)
  })

  it('拒绝越界坐标', () => {
    expect(isValidCoordinate(90.0001, 0)).toBe(false)
    expect(isValidCoordinate(-90.0001, 0)).toBe(false)
    expect(isValidCoordinate(0, 180.0001)).toBe(false)
    expect(isValidCoordinate(0, -180.0001)).toBe(false)
  })

  it('拒绝缺失、非数字与无穷值', () => {
    expect(isValidCoordinate(undefined, undefined)).toBe(false)
    expect(isValidCoordinate('abc', 121)).toBe(false)
    expect(isValidCoordinate(31, 'abc')).toBe(false)
    expect(isValidCoordinate(NaN, 121)).toBe(false)
    expect(isValidCoordinate(31, Infinity)).toBe(false)
    expect(isValidCoordinate(Infinity, 121)).toBe(false)
  })

  // 与迁移前实现保持一致：Number('') / Number(null) 都是 0，
  // 因此空串与 null 会被当作合法坐标（本轮只做搬家，不修这个历史行为）。
  it('保持历史行为：空串与 null 经 Number 转换为 0', () => {
    expect(isValidCoordinate('', '')).toBe(true)
    expect(isValidCoordinate(null, null)).toBe(true)
  })
})
