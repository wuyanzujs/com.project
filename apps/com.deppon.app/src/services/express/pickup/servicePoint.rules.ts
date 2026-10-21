import { getStationPrimaryPhone } from '../../query/stationPhone'
import { stationSelection } from '../../query/stationSelection'
import { updateExpressPickup } from '../core/express.mutations'

import type { StationItem } from '../../query/types'
import type { ExpressDraft, ExpressPickupStationDetail } from '../core/types'

const STATION_HOURS_SEPARATOR = '，'

/**
 *
 * @param value 网点营业时间
 * @description 卡片时间用空格分隔，这里去掉营业星期与时段之间的逗号
 */
function normalizeStationHours(value?: string | null) {
  return (value ?? '')
    .split(STATION_HOURS_SEPARATOR)
    .map(item => item.trim())
    .filter(Boolean)
    .join(' ')
}

/**
 *
 * @param station 选中的自送网点
 * @description 生成自送网点卡片展示信息
 */
export function createExpressPickupStationDetail(station: StationItem): ExpressPickupStationDetail {
  return {
    address: station.address.trim(),
    phone: getStationPrimaryPhone(station.phone),
    hours: normalizeStationHours(station.time),
    longitude: station.lng.trim(),
    latitude: station.lat.trim()
  }
}

/**
 *
 * @param left 当前网点展示信息
 * @param right 待比较的网点展示信息
 * @description 判断两份额外网点展示信息是否一致
 */
function isSameStationDetail(left?: ExpressPickupStationDetail, right?: ExpressPickupStationDetail) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null)
}

/** 自送网点使用 deptCode，下单 startStation 与收件自提使用的 deptNo 分开。 */
export function applyExpressServicePoint(draft: ExpressDraft, station: StationItem | null, addressKey: string): ExpressDraft {
  if (draft.pickup.dispatch !== 'N' || !addressKey || stationSelection.createAddressKey(draft.sender) !== addressKey) {
    return draft
  }

  const stationCode = station?.code.trim() ?? ''
  const stationName = station?.name.trim() ?? ''

  if (station && (!stationCode || !stationName)) {
    return draft
  }

  const stationDetail = station && stationCode && stationName ? createExpressPickupStationDetail(station) : undefined

  if (draft.pickup.stationCode === stationCode && draft.pickup.stationName === stationName) {
    // 网点未变时只补展示信息，避免仅因补全地址电话就判定报价过期。
    return isSameStationDetail(draft.pickup.stationDetail, stationDetail) ? draft : { ...draft, pickup: { ...draft.pickup, stationDetail } }
  }

  return updateExpressPickup(draft, { stationCode, stationName, stationDetail }, '自送服务点变化，请重新获取价格')
}

/** 地址查询默认使用最近网点；有效的用户选择继续保留，无匹配结果允许空网点。 */
export function applyExpressServicePointCandidates(draft: ExpressDraft, stations: StationItem[], addressKey: string): ExpressDraft {
  const selected = stations.find(item => item.code === draft.pickup.stationCode) ?? stations[0] ?? null

  return applyExpressServicePoint(draft, selected, addressKey)
}
