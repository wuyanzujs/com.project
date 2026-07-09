import { queryApi } from './query.api'
import { APP_ROUTES } from '../../shared/navigation/routes'
import { createAppRouteUrl } from '../../shared/navigation/routeUrl'
import { contactService } from '../contact'
import { createServiceFailure as createFailure } from '../serviceResponse'

import type {
  AddressStationRawItem,
  CityStationRawItem,
  DispatchAddress,
  DispatchAddressQuery,
  DispatchProductType,
  DispatchRangeGroup,
  DispatchRangeResult,
  DispatchStreet,
  ExpressDispatchItem,
  LogisticsDispatchItem,
  LogisticsDispatchResponse,
  StationDetailRaw,
  StationDetailView,
  StationCityType,
  StationItem,
  StationQueryOptions,
  StationQueryResult,
  StationQueryType
} from './types'
import type { DepponResponse } from '../../request/deppon'

const DISPATCH_RANGE_NAMES: Record<string, string> = {
  DELIVERY_NATURE_QJPS: '全境派送',
  DELIVERY_NATURE_GBQYBS: '特殊区域派送',
  DELIVERY_NATURE_ZTBPS: '不服务区域',
  DELIVERY_NATURE_FQJPS: '网点自提',
  DELIVERY_NATURE_ZZXPS: '镇中心派送',
  DELIVERY_NATURE_CZTBPS: '乡镇自提'
}

const SERVICEABLE_RANGE_CODES = new Set([
  'DELIVERY_NATURE_QJPS',
  'DELIVERY_NATURE_GBQYBS',
  'DELIVERY_NATURE_ZZXPS'
])

const PICKUP_ONLY_RANGE_CODES = new Set([
  'DELIVERY_NATURE_FQJPS',
  'DELIVERY_NATURE_CZTBPS'
])

const UNSERVICEABLE_RANGE_CODES = new Set(['DELIVERY_NATURE_ZTBPS'])
const DEFAULT_STATION_PAGE_SIZE = 100

function normalizeText(value?: string | null) {
  return (value ?? '').trim()
}

function createFullAddress(query: DispatchAddressQuery) {
  return normalizeText(
    query.rawText ||
      [
        query.province,
        query.city,
        query.county,
        query.address
      ].filter(Boolean).join('')
  )
}

function createAddressFromAnalysis(
  analysis: {
    province?: string
    provinceCode?: string
    city?: string
    cityCode?: string
    county?: string
    countyCode?: string
    town?: string
    townCode?: string
    detailAddress?: string
  },
  query: DispatchAddressQuery
): DispatchAddress {
  const province = normalizeText(analysis.province || query.province)
  const city = normalizeText(analysis.city || query.city)
  const county = normalizeText(analysis.county || query.county)
  const town = normalizeText(analysis.town)
  const detailAddress = normalizeText(analysis.detailAddress || query.address)

  return {
    province,
    provinceCode: normalizeText(analysis.provinceCode),
    city,
    cityCode: normalizeText(analysis.cityCode),
    county,
    countyCode: normalizeText(analysis.countyCode),
    town,
    townCode: normalizeText(analysis.townCode),
    address: detailAddress,
    fullAddress: [province, city, county, town, detailAddress]
      .filter(Boolean)
      .join('')
  }
}

function normalizeLogisticsStreet(
  item: LogisticsDispatchItem
): DispatchStreet {
  return {
    streetName: item.villageName,
    streetCode: item.villageCode
  }
}

function normalizeLogisticsGroups(
  response: LogisticsDispatchResponse
): DispatchRangeGroup[] {
  const groups: DispatchRangeGroup[] = []

  if (response.normalFarDeliveryList?.length) {
    groups.push({
      name: '全境派送',
      code: 'DELIVERY_NATURE_QJPS',
      streetList: response.normalFarDeliveryList.map(normalizeLogisticsStreet)
    })
  }

  if (response.specialDeliverList?.length) {
    groups.push({
      name: '超远派送',
      code: 'DELIVERY_NATURE_GBQYBS',
      streetList: response.specialDeliverList.map(normalizeLogisticsStreet)
    })
  }

  if (response.noDeliverList?.length) {
    groups.push({
      name: '不派送',
      code: 'DELIVERY_NATURE_ZTBPS',
      streetList: response.noDeliverList.map(normalizeLogisticsStreet)
    })
  }

  return groups
}

function normalizeExpressGroups(
  list: ExpressDispatchItem[] = []
): DispatchRangeGroup[] {
  return list
    .filter((item) => item.rangeTypeDesc?.length)
    .map((item) => ({
      name:
        normalizeText(item.rangeTypeName) ||
        DISPATCH_RANGE_NAMES[item.rangeTypeCode] ||
        '派送范围',
      code: item.rangeTypeCode,
      streetList: item.rangeTypeDesc
    }))
}

function findMatchedStreetCode(
  groups: DispatchRangeGroup[],
  matchedStreet: string
) {
  if (!matchedStreet) {
    return ''
  }

  const group = groups.find((item) =>
    item.streetList.some((street) => street.streetName === matchedStreet)
  )

  return group?.code || ''
}

function createDispatchHint(
  groups: DispatchRangeGroup[],
  matchedStreet: string
) {
  const matchedCode = findMatchedStreetCode(groups, matchedStreet)

  if (!groups.length) {
    return '暂未查询到当前区域的收派范围'
  }

  if (PICKUP_ONLY_RANGE_CODES.has(matchedCode)) {
    return '当前详细地址建议选择德邦网点自提'
  }

  if (UNSERVICEABLE_RANGE_CODES.has(matchedCode)) {
    return '当前详细地址可能暂不支持派送'
  }

  if (groups.some((group) => SERVICEABLE_RANGE_CODES.has(group.code))) {
    return '当前区域可寄收，可继续预约寄件'
  }

  return '当前区域存在特殊收派规则，请以页面结果为准'
}

function canCreateExpress(groups: DispatchRangeGroup[], matchedStreet: string) {
  const matchedCode = findMatchedStreetCode(groups, matchedStreet)

  if (UNSERVICEABLE_RANGE_CODES.has(matchedCode)) {
    return false
  }

  return groups.some((group) => SERVICEABLE_RANGE_CODES.has(group.code))
}

function getStationMatchTypes(
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

function getStationPrimaryPhone(value?: string | null) {
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

function normalizeAddressStation(item: AddressStationRawItem): StationItem {
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

async function resolveDispatchAddress(
  query: DispatchAddressQuery
): Promise<DepponResponse<DispatchAddress>> {
  const fullAddress = createFullAddress(query)

  if (!fullAddress) {
    return createFailure('请输入省市区和详细地址，或粘贴完整地址')
  }

  const response = await contactService.analyze4(fullAddress, {
    province: query.province,
    city: query.city,
    county: query.county
  })

  if (!response.status || !response.result) {
    return createFailure(response.message || '地址识别失败，请补全省市区')
  }

  const address = createAddressFromAnalysis(response.result, query)

  if (!address.cityCode || !address.countyCode) {
    return createFailure('缺少城市编码，请粘贴更完整的省市区地址')
  }

  return {
    ...response,
    result: address
  }
}

export const queryService = {
  resolveDispatchAddress,

  createStationDetailRoute(
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
  },

  getStationPrimaryPhone,

  async queryDispatchRange(
    productType: DispatchProductType,
    query: DispatchAddressQuery
  ): Promise<DepponResponse<DispatchRangeResult>> {
    const addressResponse = await resolveDispatchAddress(query)

    if (!addressResponse.status || !addressResponse.result) {
      return createFailure(addressResponse.message || '地址识别失败')
    }

    const address = addressResponse.result
    const groupsResponsePromise =
      productType === 'EXPRESS'
        ? queryApi.queryExpressDispatch({
            cityCode: address.cityCode,
            countyCode: address.countyCode
          }).then((response) => ({
            status: response.status,
            message: response.message,
            groups: response.result
              ? normalizeExpressGroups(response.result.deliveryList ?? [])
              : []
          }))
        : queryApi.queryLogisticsDispatch(address.countyCode).then(
            (response) => ({
              status: response.status,
              message: response.message,
              groups: response.result
                ? normalizeLogisticsGroups(response.result)
                : []
            })
          )

    const [groupsResponse, streetResponse] = await Promise.all([
      groupsResponsePromise,
      queryApi.queryDispatchStreet({
        province: address.province,
        city: address.city,
        county: address.county,
        address: [address.town, address.address].filter(Boolean).join('')
      })
    ])

    if (!groupsResponse.status) {
      return createFailure(groupsResponse.message || '暂未获取到收派范围')
    }

    const groups = groupsResponse.groups
    const matchedStreet =
      streetResponse.status && streetResponse.result ? streetResponse.result : ''

    return {
      status: true,
      message: groupsResponse.message,
      result: {
        productType,
        address,
        groups,
        matchedStreet,
        hint: createDispatchHint(groups, matchedStreet),
        canCreateExpress: canCreateExpress(groups, matchedStreet)
      }
    }
  },

  async queryStations(
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
  },

  async queryStationDetail(
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
}
