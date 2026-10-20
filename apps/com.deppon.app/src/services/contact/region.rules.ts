import type { RegionCity, RegionCounty, RegionProvince, RegionSearchResult, RegionSelection } from './region.types'

export const REGION_DATA_URL = 'https://ca.deppon.com/ows/static/common/cityData/city-receiver.json'

// 「选择城市」弹层的热门城市固定 6 个，顺序固定。
export const REGION_HOT_CITIES = ['上海市', '北京市', '广州市', '深圳市', '杭州市', '苏州市'] as const

const CHINA_NATION_CODE = '100000'

type UnknownRecord = Record<string, unknown>

function readText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function readArray(value: unknown): UnknownRecord[] {
  return Array.isArray(value) ? value.filter((item): item is UnknownRecord => Boolean(item) && typeof item === 'object') : []
}

/**
 *
 * @param raw city-receiver.json 原始结构
 * @description 只保留中国（nationCode=100000）的省/市/区三级数据，并压掉空节点
 */
export function normalizeRegionTree(raw: unknown): RegionProvince[] {
  const nations = readArray(raw)

  if (nations.length === 0) {
    return []
  }

  const china = nations.find(nation => readText(nation.nationCode) === CHINA_NATION_CODE) ?? nations[0]
  const provinces: RegionProvince[] = []

  readArray(china?.province).forEach(provinceNode => {
    const provinceName = readText(provinceNode.provinceName)
    const cities: RegionCity[] = []

    readArray(provinceNode.city).forEach(cityNode => {
      const cityName = readText(cityNode.cityName)
      const counties: RegionCounty[] = readArray(cityNode.county)
        .map(countyNode => ({
          code: readText(countyNode.countyCode),
          name: readText(countyNode.countyName)
        }))
        .filter(county => county.name)

      if (cityName) {
        cities.push({
          code: readText(cityNode.cityCode),
          counties,
          name: cityName
        })
      }
    })

    if (provinceName) {
      provinces.push({
        cities,
        code: readText(provinceNode.provinceCode),
        name: provinceName
      })
    }
  })

  return provinces
}

/**
 *
 * @param provinceName 省名
 * @param cityName 市名
 * @param countyName 区县名
 * @description 地区行「省 市 区」空格拼接，缺省层级跳过
 */
export function formatRegionLabel(provinceName: string, cityName: string, countyName: string): string {
  return [provinceName, cityName, countyName].map(readText).filter(Boolean).join(' ')
}

/**
 *
 * @param provinces 省市树
 * @param provinceName 省名
 * @param cityName 市名
 * @param countyName 区县名
 * @description 组装选中结果（含展示文案）
 */
export function createRegionSelection(provinces: RegionProvince[], provinceName: string, cityName: string, countyName: string): RegionSelection {
  const province = provinces.find(item => item.name === provinceName)
  const city = province?.cities.find(item => item.name === cityName)

  return {
    cityName: city?.name ?? '',
    countyName: countyName && city?.counties.some(county => county.name === countyName) ? countyName : '',
    label: formatRegionLabel(province?.name ?? '', city?.name ?? '', countyName),
    provinceName: province?.name ?? ''
  }
}

/**
 *
 * @param provinces 省市树
 * @param keyword 省份/城市/区县关键字
 * @param limit 最多返回条数
 * @description 弹层顶部搜索：省、市、区县三级都能命中
 */
export function searchRegions(provinces: RegionProvince[], keyword: string, limit = 30): RegionSearchResult[] {
  const query = keyword.trim()

  if (!query) {
    return []
  }

  const results: RegionSearchResult[] = []

  provinces.forEach(province => {
    if (results.length >= limit) {
      return
    }

    if (province.name.includes(query)) {
      results.push({
        cityName: '',
        countyName: '',
        kind: 'province',
        label: province.name,
        provinceName: province.name
      })
    }

    province.cities.forEach(city => {
      if (results.length >= limit) {
        return
      }

      if (city.name.includes(query)) {
        results.push({
          cityName: city.name,
          countyName: '',
          kind: 'city',
          label: formatRegionLabel(province.name, city.name, ''),
          provinceName: province.name
        })
        return
      }

      city.counties.forEach(county => {
        if (results.length >= limit || !county.name.includes(query)) {
          return
        }

        results.push({
          cityName: city.name,
          countyName: county.name,
          kind: 'county',
          label: formatRegionLabel(province.name, city.name, county.name),
          provinceName: province.name
        })
      })
    })
  })

  return results
}

/**
 *
 * @param provinces 省市树
 * @param cityName 热门城市名（如「上海市」）
 * @description 热门城市定位到「省 + 市」，区县留给弹层继续选
 */
export function findHotCity(provinces: RegionProvince[], cityName: string): { city: RegionCity; province: RegionProvince } | null {
  for (const province of provinces) {
    const city = province.cities.find(item => item.name === cityName)

    if (city) {
      return {
        city,
        province
      }
    }
  }

  return null
}
