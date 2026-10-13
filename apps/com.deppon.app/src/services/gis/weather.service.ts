import { DPCacheExpireType, dpCache } from '@/cache'

import { queryCountyWeather } from './gis.api'
import { resolveCountyAdcode } from './weather.adcode'
import { createWaterproofText, findCountyRain } from './weather.rules'

import type { GisWeatherDayItem } from './gis.api'

export interface GisWeatherAddress {
  province: string
  city: string
  county: string
}

interface WaterproofQuery {
  sender: GisWeatherAddress | null
  // 寄件侧按取件日（未选时间则当天），收件侧按产品预计到达日。
  senderDate: string
  consignee: GisWeatherAddress | null
  consigneeDate: string
}

const WEATHER_CACHE_KEY_PREFIX = 'DEPPON_GIS_WEATHER_'
// 旧小程序天气缓存 300 分钟过期，保持一致。
const WEATHER_CACHE_EXPIRE = { type: DPCacheExpireType.HOURS, value: 5 }

/**
 *
 * @param adcode 区县 adcode
 * @description 带缓存查询区县天气预报
 */
async function loadCountyWeatherInfos(adcode: string) {
  const cacheKey = `${WEATHER_CACHE_KEY_PREFIX}${adcode}`
  const cached = dpCache.get<GisWeatherDayItem[]>(cacheKey)

  if (cached) {
    return cached
  }

  const response = await queryCountyWeather(adcode)
  const infos = response.status ? response.result?.forecast[0]?.infos : null

  if (!infos?.length) {
    return null
  }

  void dpCache.set(cacheKey, { data: infos, expire: WEATHER_CACHE_EXPIRE })

  return infos
}

// 收寄两侧任意一侧天气请求失败时静默跳过该侧，只提示能确认的一侧。
export async function loadWaterproofText(query: WaterproofQuery) {
  const senderAdcode = query.sender
    ? resolveCountyAdcode(
        query.sender.province,
        query.sender.city,
        query.sender.county
      )
    : ''
  const consigneeAdcode = query.consignee
    ? resolveCountyAdcode(
        query.consignee.province,
        query.consignee.city,
        query.consignee.county
      )
    : ''

  if (!senderAdcode && !consigneeAdcode) {
    return ''
  }

  const [senderInfos, consigneeInfos] = await Promise.all([
    senderAdcode ? loadCountyWeatherInfos(senderAdcode) : Promise.resolve(null),
    consigneeAdcode
      ? loadCountyWeatherInfos(consigneeAdcode)
      : Promise.resolve(null)
  ])

  const senderRain = senderInfos
    ? findCountyRain(senderInfos, query.senderDate).rain
    : false
  const consigneeRain = consigneeInfos
    ? findCountyRain(consigneeInfos, query.consigneeDate).rain
    : false

  return createWaterproofText(senderRain, consigneeRain)
}
