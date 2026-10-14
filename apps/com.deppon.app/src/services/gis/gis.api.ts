import { depponHttp } from '@/request/deppon'

// 腾讯位置服务 key 沿用旧小程序工程配置，天气 WebService 接口对该 key 开放。
const TENCENT_LBS_KEY = 'N3JBZ-GVFKJ-RRFF7-XFQ7X-2FFQT-HGB7F'

export interface GisWeatherDayInfo {
  weather?: string
}

export interface GisWeatherDayItem {
  date: string
  day?: GisWeatherDayInfo
  night?: GisWeatherDayInfo
}

export interface GisWeatherForecast {
  infos: GisWeatherDayItem[]
}

interface GisWeatherResponse {
  forecast: GisWeatherForecast[]
}

// 腾讯天气按区县 adcode 查询未来预报；外网接口，静默失败由调用方兜底。
export function queryCountyWeather(adcode: string) {
  return depponHttp.get<GisWeatherResponse>(`https://apis.map.qq.com/ws/weather/v1/?key=${TENCENT_LBS_KEY}&adcode=${adcode}&type=future&get_md=1`, {
    loading: false,
    login: false,
    timeout: 3000
  })
}
