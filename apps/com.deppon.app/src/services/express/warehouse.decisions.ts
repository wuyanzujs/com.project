import { updateExpressWarehouse } from './warehouse.rules'

import type { ExpressDraft } from './types'

export function acknowledgeExpressWarehouseScreening(draft: ExpressDraft) {
  return updateExpressWarehouse(
    draft,
    { enabled: draft.warehouse.enabled },
    { acknowledge: true }
  )
}

export function rejectExpressWarehouse(draft: ExpressDraft) {
  return updateExpressWarehouse(
    draft,
    { enabled: false },
    { acknowledge: true }
  )
}
