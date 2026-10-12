import type { GisWeatherDayItem } from './gis.api'

export interface GisCountyRainResult {
  rain: boolean
  rainStorm: boolean
}

// 与旧小程序一致：按日期匹配预报，白天天气含「雨」视为降水，大雨/暴雨额外标记。
export function findCountyRain(
  infos: GisWeatherDayItem[] | undefined,
  date: string
): GisCountyRainResult {
  const info = infos?.find(item => item.date === date)
  const weather = info?.day?.weather ?? ''

  if (!weather.includes('雨')) {
    return { rain: false, rainStorm: false }
  }

  return {
    rain: true,
    rainStorm: weather.includes('大雨') || weather.includes('暴雨')
  }
}

// 生产 App 文案用「降水」；寄件侧取件日、收件侧预计到达日分别判定。
export function createWaterproofText(
  senderRain: boolean,
  consigneeRain: boolean
) {
  if (senderRain && consigneeRain) {
    return '寄收件地址预计有降水，德邦可提供防水包装'
  }

  if (senderRain) {
    return '寄件地址预计有降水，德邦可提供防水包装'
  }

  if (consigneeRain) {
    return '收件地址预计有降水，德邦可提供防水包装'
  }

  return ''
}
