import { describe, expect, it } from 'vitest'

import { createWaterproofText, findCountyRain } from '@/services/gis/weather.rules'

import type { GisWeatherDayItem } from '@/services/gis/gis.api'

const createDay = (date: string, weather: string): GisWeatherDayItem => ({ date, day: { weather } }) as GisWeatherDayItem

describe('findCountyRain', () => {
  it('matches the forecast by date only', () => {
    const infos = [createDay('2026-10-21', '小雨'), createDay('2026-10-22', '晴')]

    expect(findCountyRain(infos, '2026-10-21')).toEqual({ rain: true, rainStorm: false })
    expect(findCountyRain(infos, '2026-10-22')).toEqual({ rain: false, rainStorm: false })
    expect(findCountyRain(infos, '2026-10-23')).toEqual({ rain: false, rainStorm: false })
  })

  it('flags heavy and storm level rain', () => {
    expect(findCountyRain([createDay('d1', '大雨')], 'd1').rainStorm).toBe(true)
    expect(findCountyRain([createDay('d1', '暴雨转中雨')], 'd1').rainStorm).toBe(true)
    expect(findCountyRain([createDay('d1', '雷阵雨')], 'd1').rainStorm).toBe(false)
  })

  it('treats missing data as no rain', () => {
    expect(findCountyRain(undefined, 'd1')).toEqual({ rain: false, rainStorm: false })
    expect(findCountyRain([], 'd1')).toEqual({ rain: false, rainStorm: false })
    expect(findCountyRain([{ date: 'd1' } as GisWeatherDayItem], 'd1')).toEqual({ rain: false, rainStorm: false })
  })
})

describe('createWaterproofText', () => {
  it('covers both sides, one side, and no rain', () => {
    expect(createWaterproofText(true, true)).toBe('寄收件地址预计有降水，德邦可提供防水包装')
    expect(createWaterproofText(true, false)).toBe('寄件地址预计有降水，德邦可提供防水包装')
    expect(createWaterproofText(false, true)).toBe('收件地址预计有降水，德邦可提供防水包装')
    expect(createWaterproofText(false, false)).toBe('')
  })
})
