import type { DepponResponse } from '@/request/deppon'
import { APP_RUNTIME_CONFIG } from '@/shared/config/runtime'
import { APP_ROUTES } from '@/shared/navigation/routes'
import { appendRouteQuery, createAppRouteUrl } from '@/shared/navigation/routeUrl'

import { queryApi } from './query.api'
import { getCurrentUser } from '../auth'
import { createServiceFailure as createFailure } from '../serviceResponse'
import { resolveDispatchAddress } from './query.dispatch'

import type {
  AddressStationRawItem,
  CityStationRawItem,
  DispatchAddress,
  StationDetailRaw,
  StationDetailView,
  StationCityType,
  StationItem,
  StationQueryOptions,
  StationQueryResult,
  StationQueryType
} from './types'

const DEFAULT_STATION_PAGE_SIZE = 100
const STATION_FEEDBACK_WEB_PATH = '/depponmobile/survey/noStarEvaluate'

/**
 *
 * @param value 联系电话文本
 * @description 提取网点主电话号码，寄件自送网点卡片复用同一套解析
 */
export { getStationPrimaryPhone } from './stationPhone'

/**
 *
 * @param value 文本，可为空
 * @description 去除首尾空白
 */
function normalizeText(value?: string | null) {
  return (value ?? '').trim()
}

/**
 *
 * @param type 网点查询类型
 * @param subType 业务子类型
 * @description 按查询类型生成网点的 matchtypes
 */
export function getStationMatchTypes(type: StationQueryType, subType: 'EXPRESS' | 'LOGISTICS') {
  if (type === 'LEAVE') {
    return ['leave']
  }

  if (type === 'PICKUP') {
    return subType === 'EXPRESS' ? ['expressPickup'] : ['pickup']
  }

  if (type === 'DELIVERY') {
    return subType === 'EXPRESS' ? ['expressDeliver'] : ['deliver']
  }

  return ['leave', 'pickup', 'expressPickup', 'deliver', 'expressDeliver']
}

/**
 *
 * @param type 网点查询类型
 * @description 映射城市网点查询的 type 值
 */
function getStationCityType(type: StationQueryType): StationCityType {
  if (type === 'LEAVE') {
    return '1'
  }

  if (type === 'PICKUP') {
    return '3'
  }

  if (type === 'DELIVERY') {
    return '2'
  }

  return ''
}

/**
 *
 * @param value 经营范围文本
 * @description 归一经营范围的分隔符
 */
function normalizeBusiness(value?: string | null) {
  return normalizeText(value).replace(/\s+/g, '、').replace(/、$/, '')
}

/**
 *
 * @param value 距离数值
 * @description 距离转为 km 文案
 */
function normalizeDistance(value?: number | null) {
  if (!value) {
    return ''
  }

  return `${Math.round(value * 100) / 100}km`
}

/**
 *
 * @param startTime 开始营业时间
 * @param endTime 结束营业时间
 * @description 生成网点营业时间文案
 */
function normalizeStationTime(startTime?: string, endTime?: string) {
  if (startTime && endTime) {
    return `周一至周日，${startTime}-${endTime}`
  }

  return '周一至周日'
}

/**
 *
 * @param item 网点
 * @description 取网点主编码
 */
function getStationPrimaryCode(item: Pick<StationItem, 'code' | 'id'>) {
  return normalizeText(item.code || item.id)
}

/**
 *
 * @param station 网点
 * @param address 查询地址
 * @description 生成网点反馈的 rowData
 */
function createStationFeedbackRowData(station: Pick<StationItem, 'code'> | null, address: DispatchAddress | null) {
  return JSON.stringify([
    {
      field: 'deptCode',
      data: normalizeText(station?.code)
    },
    {
      field: 'queryAddress',
      data: normalizeText(address?.fullAddress)
    }
  ])
}

/**
 *
 * @param item 地址网点原始数据
 * @description 地址网点原始数据转网点结构
 */
export function normalizeAddressStation(item: AddressStationRawItem): StationItem {
  return {
    id: item.deptNo,
    code: item.deptCode,
    name: item.deptName,
    address: item.deptAddress,
    phone: item.contactway || '',
    business: normalizeBusiness(item.businessScope),
    lng: item.baiduLng,
    lat: item.baiduLat,
    distance: normalizeDistance(item.distance),
    distanceKm: item.distance,
    pickupSelf: item.pickupSelf === true,
    time: normalizeStationTime(item.startTime, item.endTime),
    source: 'Address'
  }
}

/**
 *
 * @param item 城市网点原始数据
 * @description 城市网点原始数据转网点结构
 */
function normalizeCityStation(item: CityStationRawItem): StationItem {
  return {
    id: item.unifiedCode,
    code: item.code,
    name: item.name,
    address: item.address,
    phone: item.contactway || '',
    business: normalizeBusiness(item.businessType),
    lng: item.longitude,
    lat: item.latitude,
    distance: '',
    distanceKm: null,
    pickupSelf: false,
    time: '周一至周日',
    source: 'City'
  }
}

/**
 *
 * @param item 网点详情原始数据
 * @param options 详情补充选项
 * @description 网点详情原始数据转详情结构
 */
function normalizeStationDetail(
  item: StationDetailRaw,
  options: {
    code: string
    distance?: string
  }
): StationDetailView {
  const lng = normalizeText(item.longitude || item.baiduLng)
  const lat = normalizeText(item.latitude || item.baiduLat)

  return {
    id: normalizeText(item.unifiedCode || item.deptCode || item.code) || options.code,
    code: normalizeText(item.code || item.deptCode) || options.code,
    name: normalizeText(item.name || item.deptName) || '德邦网点',
    address: normalizeText(item.address || item.deptAddress),
    phone: normalizeText(item.contactway || item.contactWay),
    business: normalizeBusiness(item.businessType || item.businessScope),
    lng,
    lat,
    distance: normalizeText(options.distance),
    time: normalizeStationTime(normalizeText(item.startTime), normalizeText(item.endTime)),
    source: 'Detail',
    coordinateSystem: item.baiduLng || item.baiduLat ? 'bd09' : 'unknown'
  }
}

/**
 *
 * @param item 网点
 * @param source 来源标识
 * @description 创建网点详情的路由 URL
 */
export function createStationDetailRoute(item: Pick<StationItem, 'code' | 'id' | 'distance'>, source = 'QUERY_STATIONS') {
  const code = getStationPrimaryCode(item)

  if (!code) {
    return ''
  }

  return createAppRouteUrl(APP_ROUTES.stationDetail, {
    code,
    distance: item.distance,
    source
  })
}

/**
 *
 * @param station 网点
 * @param address 查询地址
 * @description 创建网点反馈的 WebView URI
 */
export function createStationFeedbackWebUri(station?: Pick<StationItem, 'code'> | null, address?: DispatchAddress | null) {
  const deptCode = normalizeText(station?.code)
  const user = getCurrentUser()

  return appendRouteQuery(STATION_FEEDBACK_WEB_PATH, {
    scene: deptCode ? 'P0101' : 'P0102',
    channel: APP_RUNTIME_CONFIG.systemCode,
    mobile: user?.mobile || '',
    rowData: createStationFeedbackRowData(station ?? null, address ?? null)
  })
}

/**
 *
 * @param options 网点查询条件
 * @description 查询附近或城市网点列表
 */
export async function queryStations(options: StationQueryOptions): Promise<DepponResponse<StationQueryResult>> {
  const addressResponse = await resolveDispatchAddress(options)

  if (!addressResponse.status || !addressResponse.result) {
    return createFailure(addressResponse.message || '地址识别失败')
  }

  const address = addressResponse.result
  const type = options.type ?? 'ALL'
  const subType = options.subType ?? 'EXPRESS'
  const hasDetailAddress = !!address.address

  if (hasDetailAddress) {
    const response = await queryApi.queryAddressStations({
      province: address.province,
      city: address.city,
      county: address.county,
      otherAddress: [address.town, address.address].filter(Boolean).join(''),
      transportway: 'motor_self',
      matchtypes: getStationMatchTypes(type, subType)
    })

    if (!response.status || !response.result) {
      return createFailure(response.message || '暂未查询到附近网点')
    }

    return {
      ...response,
      result: {
        address,
        type,
        subType,
        list: (response.result.data ?? []).map(normalizeAddressStation),
        totalRows: response.result.data?.length ?? 0,
        source: 'Address'
      }
    }
  }

  const response = await queryApi.queryCityStations({
    level: '4',
    type: getStationCityType(type),
    provinceCode: address.provinceCode,
    provinceName: address.province,
    cityCode: address.cityCode,
    cityName: address.city,
    countyCode: address.countyCode,
    countyName: address.county,
    pageIndex: options.pageIndex ?? 1,
    pageSize: options.pageSize ?? DEFAULT_STATION_PAGE_SIZE
  })

  if (!response.status || !response.result) {
    return createFailure(response.message || '暂未查询到网点')
  }

  const list = (response.result.netResponses ?? []).map(normalizeCityStation)
  const totalRows = response.result.totalRows ?? list.length

  return {
    ...response,
    result: {
      address,
      type,
      subType,
      list,
      totalRows,
      source: 'City'
    }
  }
}

/**
 *
 * @param code 网点编码
 * @param options 详情补充选项
 * @description 查询网点详情
 */
export async function queryStationDetail(
  code: string,
  options: {
    distance?: string
  } = {}
): Promise<DepponResponse<StationDetailView>> {
  const deptCode = normalizeText(code)

  if (!deptCode) {
    return createFailure('缺少网点编码')
  }

  const response = await queryApi.queryStationDetail({ deptCode })

  if (!response.status || !response.result) {
    return createFailure(response.message || '未查询到网点信息')
  }

  return {
    ...response,
    result: normalizeStationDetail(response.result, {
      code: deptCode,
      distance: options.distance
    })
  }
}
