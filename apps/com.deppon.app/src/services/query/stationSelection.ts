import type { StationItem, StationQueryOptions, StationQueryResult } from './types'

export type StationSelectionSource = 'EXPRESS_DELIVERY_POINT'

export interface StationSelectionAddress {
  province: string
  city: string
  county: string
  town?: string
  address: string
}

export interface StationSelectionParams {
  [key: string]: string
  source: StationSelectionSource
  province: string
  city: string
  county: string
  address: string
  selectedCode: string
}

export interface StationSelectionResult {
  source: StationSelectionSource
  station: StationItem | null
  selectedAt: number
}

export const EXPRESS_DELIVERY_POINT_MAX_DISTANCE_KM = 20

let pendingSelection: StationSelectionResult | null = null

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
 * @param value 待判断的值
 * @description 判断是否为网点选择来源
 */
function isStationSelectionSource(value: unknown): value is StationSelectionSource {
  return value === 'EXPRESS_DELIVERY_POINT'
}

export const stationSelection = {
  /**
   *
   * @param source 网点选择来源
   * @param address 网点选择地址
   * @param selectedCode 已选网点 code
   * @description 创建网点选择页参数
   */
  createParams(source: StationSelectionSource, address: StationSelectionAddress, selectedCode = ''): StationSelectionParams {
    return {
      source,
      province: normalizeText(address.province),
      city: normalizeText(address.city),
      county: normalizeText(address.county),
      address: [address.town, address.address].map(normalizeText).filter(Boolean).join(''),
      selectedCode: normalizeText(selectedCode)
    }
  },

  /**
   *
   * @param params 路由 query 参数
   * @description 解析网点选择页参数
   */
  parseParams(params: Record<string, string | undefined> = {}): StationSelectionParams | null {
    if (!isStationSelectionSource(params.source)) {
      return null
    }

    return {
      source: params.source,
      province: normalizeText(params.province),
      city: normalizeText(params.city),
      county: normalizeText(params.county),
      address: normalizeText(params.address),
      selectedCode: normalizeText(params.selectedCode)
    }
  },

  /**
   *
   * @param params 网点选择页参数
   * @description 由页面参数创建网点查询条件
   */
  createQuery(params: StationSelectionParams): StationQueryOptions {
    return {
      province: params.province,
      city: params.city,
      county: params.county,
      address: params.address,
      type: 'PICKUP',
      subType: 'EXPRESS'
    }
  },

  /**
   *
   * @param source 网点选择来源
   * @param result 网点查询结果
   * @description 按来源过滤网点查询结果
   */
  filterResult(source: StationSelectionSource, result: StationQueryResult): StationQueryResult {
    const list =
      source === 'EXPRESS_DELIVERY_POINT'
        ? result.list.filter(
            item =>
              item.source === 'Address' &&
              item.pickupSelf &&
              Boolean(normalizeText(item.id)) &&
              Boolean(normalizeText(item.name)) &&
              item.distanceKm !== null &&
              item.distanceKm >= 0 &&
              item.distanceKm <= EXPRESS_DELIVERY_POINT_MAX_DISTANCE_KM
          )
        : result.list

    return {
      ...result,
      list,
      totalRows: list.length
    }
  },

  /**
   *
   * @param source 网点选择来源
   * @param station 选中的网点
   * @description 暂存选中的网点
   */
  select(source: StationSelectionSource, station: StationItem | null) {
    pendingSelection = {
      source,
      station,
      selectedAt: Date.now()
    }
  },

  /**
   *
   * @param source 网点选择来源
   * @description 取出并清空暂存的选中网点
   */
  consumeSelection(source?: StationSelectionSource) {
    if (!pendingSelection) {
      return null
    }

    if (source && pendingSelection.source !== source) {
      return null
    }

    const selection = pendingSelection

    pendingSelection = null

    return selection
  }
}
