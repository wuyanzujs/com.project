import type { StationItem } from '../../query/types'
import type { ExpressDeliveryPointDraft, ExpressDraft } from '../core/types'

const DELIVERY_POINT_STALE_REASON = '自提服务点变化，请重新获取价格'

/**
 *
 * @param value 原始文本
 * @description 去除首尾空白，空值返回空字符串
 */
function normalizeText(value?: string | null) {
  return (value ?? '').trim()
}

/**
 *
 * @description 创建空的自提服务点草稿
 */
export function createExpressDeliveryPointDraft(): ExpressDeliveryPointDraft {
  return {
    code: '',
    name: ''
  }
}

/**
 *
 * @param value 自提服务点草稿，可为空
 * @param deliveryMode 派送方式
 * @description 非自提或信息不全时返回空草稿
 */
export function normalizeExpressDeliveryPointDraft(
  value?: Partial<ExpressDeliveryPointDraft> | null,
  deliveryMode?: ExpressDraft['service']['deliveryMode']
): ExpressDeliveryPointDraft {
  if (deliveryMode && deliveryMode !== 'PICKSELF') {
    return createExpressDeliveryPointDraft()
  }

  const code = normalizeText(value?.code)
  const name = normalizeText(value?.name)

  return code && name ? { code, name } : createExpressDeliveryPointDraft()
}

/**
 *
 * @param station 网点信息
 * @description 由网点信息生成自提服务点草稿
 */
export function createExpressDeliveryPointFromStation(station: Pick<StationItem, 'code' | 'id' | 'name'>) {
  return normalizeExpressDeliveryPointDraft({
    code: station.id,
    name: station.name
  })
}

/**
 *
 * @param draft 寄件草稿
 * @param station 选中的网点，可为空
 * @description 更新自提服务点，有变化时标记报价过期
 */
export function updateExpressDeliveryPoint(draft: ExpressDraft, station: Pick<StationItem, 'code' | 'id' | 'name'> | null): ExpressDraft {
  const deliveryPoint =
    draft.service.deliveryMode === 'PICKSELF' && station ? createExpressDeliveryPointFromStation(station) : createExpressDeliveryPointDraft()

  if (draft.deliveryPoint.code === deliveryPoint.code && draft.deliveryPoint.name === deliveryPoint.name) {
    return draft
  }

  return {
    ...draft,
    deliveryPoint,
    selectedProduct: null,
    quoteStaleReason: DELIVERY_POINT_STALE_REASON
  }
}

/**
 *
 * @param draft 寄件草稿
 * @description 生成下单所需的自提点字段
 */
export function getExpressDeliveryPointOrderFields(draft: ExpressDraft) {
  const deliveryPoint = normalizeExpressDeliveryPointDraft(draft.deliveryPoint, draft.service.deliveryMode)

  return {
    receivingToPoint: deliveryPoint.code,
    receivingToPointName: deliveryPoint.name
  }
}
