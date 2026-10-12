import { GIS_COUNTY_ADCODE_MAP } from './weatherRegionMap'

// 区县名 → 腾讯天气 adcode；省市区名与地址簿/智能识别的标准名一致。
export function resolveCountyAdcode(
  province: string,
  city: string,
  county: string
) {
  const trimmed = [province, city, county].map(value => value.trim())

  if (trimmed.some(value => !value)) {
    return ''
  }

  return GIS_COUNTY_ADCODE_MAP[trimmed[0]]?.[trimmed[1]]?.[trimmed[2]] ?? ''
}
