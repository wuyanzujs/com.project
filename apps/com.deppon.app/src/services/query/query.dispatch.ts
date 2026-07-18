import { queryApi } from './query.api'
import { contactService } from '../contact'
import { createServiceFailure as createFailure } from '../serviceResponse'

import type {
  DispatchAddress,
  DispatchAddressQuery,
  DispatchProductType,
  DispatchRangeGroup,
  DispatchRangeResult,
  DispatchStreet,
  ExpressDispatchItem,
  LogisticsDispatchItem,
  LogisticsDispatchResponse
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

function normalizeText(value?: string | null) {
  return (value ?? '').trim()
}

function createFullAddress(query: DispatchAddressQuery) {
  return normalizeText(
    query.rawText ||
      [query.province, query.city, query.county, query.address]
        .filter(Boolean)
        .join('')
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

export async function resolveDispatchAddress(
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

export async function queryDispatchRange(
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
}
