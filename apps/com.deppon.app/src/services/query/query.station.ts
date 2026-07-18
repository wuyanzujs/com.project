import { queryApi } from './query.api'
import { APP_RUNTIME_CONFIG } from '../../shared/config/runtime'
import { APP_ROUTES } from '../../shared/navigation/routes'
import {
  appendRouteQuery,
  createAppRouteUrl
} from '../../shared/navigation/routeUrl'
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
import type { DepponResponse } from '../../request/deppon'

const DEFAULT_STATION_PAGE_SIZE = 100
const STATION_FEEDBACK_WEB_PATH = '/depponmobile/survey/noStarEvaluate'

function normalizeText(value?: string | null) {
  return (value ?? '').trim()
}

export function getStationMatchTypes(
  type: StationQueryType,
  subType: 'EXPRESS' | 'LOGISTICS'
) {
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

function normalizeBusiness(value?: string | null) {
  return normalizeText(value).replace(/\s+/g, '、').replace(/、$/, '')
}

function normalizeDistance(value?: number | null) {
  if (!value) {
    return ''
  }

  return `${Math.round(value * 100) / 100}km`
}

function normalizeStationTime(startTime?: string, endTime?: string) {
  if (startTime && endTime) {
    return `周一至周日，${startTime}-${endTime}`
  }

  return '周一至周日'
}

function getStationPrimaryCode(item: Pick<StationItem, 'code' | 'id'>) {
  return normalizeText(item.code || item.id)
}

export function getStationPrimaryPhone(value?: string | null) {
  const candidates = normalizeText(value)
    .split(/[,，;；、\s/]+/)
    .map((item) => item.trim())
    .filter(Boolean)

  return (
    candidates.find((item) =>
      /^(\+?\d{5,20}|\d{3,4}-?\d{7,14})$/.test(item)
    ) ||
    candidates.find((item) => /\d{5,}/.test(item)) ||
    normalizeText(value)
  )
}

function createStationFeedbackRowData(
  station: Pick<StationItem, 'code'> | null,
  address: DispatchAddress | null
) {
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

export function normalizeAddressStation(
  item: AddressStationRawItem
): StationItem {
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
    id:
      normalizeText(item.unifiedCode || item.deptCode || item.code) ||
      options.code,
    code: normalizeText(item.code || item.deptCode) || options.code,
    name: normalizeText(item.name || item.deptName) || '德邦网点',
    address: normalizeText(item.address || item.deptAddress),
    phone: normalizeText(item.contactway || item.contactWay),
    business: normalizeBusiness(item.businessType || item.businessScope),
    lng,
    lat,
    distance: normalizeText(options.distance),
    time: normalizeStationTime(
      normalizeText(item.startTime),
      normalizeText(item.endTime)
    ),
    source: 'Detail',
    coordinateSystem: item.baiduLng || item.baiduLat ? 'bd09' : 'unknown'
  }
}

export function createStationDetailRoute(
  item: Pick<StationItem, 'code' | 'id' | 'distance'>,
  source = 'QUERY_STATIONS'
) {
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

export function createStationFeedbackWebUri(
  station?: Pick<StationItem, 'code'> | null,
  address?: DispatchAddress | null
) {
  const deptCode = normalizeText(station?.code)
  const user = getCurrentUser()

  return appendRouteQuery(STATION_FEEDBACK_WEB_PATH, {
    scene: deptCode ? 'P0101' : 'P0102',
    channel: APP_RUNTIME_CONFIG.systemCode,
    mobile: user?.mobile || '',
    rowData: createStationFeedbackRowData(station ?? null, address ?? null)
  })
}

export async function queryStations(
  options: StationQueryOptions
): Promise<DepponResponse<StationQueryResult>> {
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
