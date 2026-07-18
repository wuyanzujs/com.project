import type {
  StationItem,
  StationQueryOptions,
  StationQueryResult
} from './types'

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

function normalizeText(value?: string | null) {
  return (value ?? '').trim()
}

function isStationSelectionSource(
  value: unknown
): value is StationSelectionSource {
  return value === 'EXPRESS_DELIVERY_POINT'
}

export const stationSelection = {
  createParams(
    source: StationSelectionSource,
    address: StationSelectionAddress,
    selectedCode = ''
  ): StationSelectionParams {
    return {
      source,
      province: normalizeText(address.province),
      city: normalizeText(address.city),
      county: normalizeText(address.county),
      address: [address.town, address.address]
        .map(normalizeText)
        .filter(Boolean)
        .join(''),
      selectedCode: normalizeText(selectedCode)
    }
  },

  parseParams(
    params: Record<string, string | undefined> = {}
  ): StationSelectionParams | null {
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

  filterResult(
    source: StationSelectionSource,
    result: StationQueryResult
  ): StationQueryResult {
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

  select(source: StationSelectionSource, station: StationItem | null) {
    pendingSelection = {
      source,
      station,
      selectedAt: Date.now()
    }
  },

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
