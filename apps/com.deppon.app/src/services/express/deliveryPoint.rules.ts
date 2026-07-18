import type {
  ExpressDeliveryPointDraft,
  ExpressDraft
} from './types'
import type { StationItem } from '../query/types'

const DELIVERY_POINT_STALE_REASON = '自提服务点变化，请重新获取价格'

function normalizeText(value?: string | null) {
  return (value ?? '').trim()
}

export function createExpressDeliveryPointDraft(): ExpressDeliveryPointDraft {
  return {
    code: '',
    name: ''
  }
}

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

export function createExpressDeliveryPointFromStation(
  station: Pick<StationItem, 'code' | 'id' | 'name'>
) {
  return normalizeExpressDeliveryPointDraft({
    code: station.id,
    name: station.name
  })
}

export function updateExpressDeliveryPoint(
  draft: ExpressDraft,
  station: Pick<StationItem, 'code' | 'id' | 'name'> | null
): ExpressDraft {
  const deliveryPoint =
    draft.service.deliveryMode === 'PICKSELF' && station
      ? createExpressDeliveryPointFromStation(station)
      : createExpressDeliveryPointDraft()

  if (
    draft.deliveryPoint.code === deliveryPoint.code &&
    draft.deliveryPoint.name === deliveryPoint.name
  ) {
    return draft
  }

  return {
    ...draft,
    deliveryPoint,
    selectedProduct: null,
    quoteStaleReason: DELIVERY_POINT_STALE_REASON
  }
}

export function getExpressDeliveryPointOrderFields(draft: ExpressDraft) {
  const deliveryPoint = normalizeExpressDeliveryPointDraft(
    draft.deliveryPoint,
    draft.service.deliveryMode
  )

  return {
    receivingToPoint: deliveryPoint.code,
    receivingToPointName: deliveryPoint.name
  }
}
