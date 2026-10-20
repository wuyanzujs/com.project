// 「选择城市」弹层使用的省市数据来自自有静态 JSON：
// https://ca.deppon.com/ows/static/common/cityData/city-receiver.json
// 结构：nation -> province -> city -> county（只取 nationCode=100000 的中国）。

export interface RegionCounty {
  code: string
  name: string
}

export interface RegionCity {
  code: string
  counties: RegionCounty[]
  name: string
}

export interface RegionProvince {
  cities: RegionCity[]
  code: string
  name: string
}

export interface RegionSelection {
  cityName: string
  countyName: string
  /** 地址页的地区行按「省 市 区」空格拼接展示 */
  label: string
  provinceName: string
}

export interface RegionSearchResult extends RegionSelection {
  kind: 'province' | 'city' | 'county'
}
