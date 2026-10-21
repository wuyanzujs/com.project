import { updateExpressWarehouse } from './warehouse.rules'

import type { ExpressDraft } from '../core/types'

/**
 *
 * @param draft 寄件草稿
 * @description 确认送货进仓筛单结果
 */
export function acknowledgeExpressWarehouseScreening(draft: ExpressDraft) {
  return updateExpressWarehouse(draft, { enabled: draft.warehouse.enabled }, { acknowledge: true })
}

/**
 *
 * @param draft 寄件草稿
 * @description 关闭送货进仓并记录已确认
 */
export function rejectExpressWarehouse(draft: ExpressDraft) {
  return updateExpressWarehouse(draft, { enabled: false }, { acknowledge: true })
}
