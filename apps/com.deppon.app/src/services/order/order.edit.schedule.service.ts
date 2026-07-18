import {
  buildOrderEditPickupNightRequest,
  buildOrderEditPickupTimeRequest,
  createOrderEditPickupNightCapability,
  getFreshOrderEditPickupNightCapability
} from './order.edit.schedule'
import { orderEditScheduleApi } from './order.edit.schedule.api'
import { normalizeOrderEditPickupTimeResponse } from './order.edit.schedule.options'
import { createServiceFailure } from '../serviceResponse'

import type { OrderEditDraft, OrderEditPickupTimeResponse } from './types'
import type { DepponResponse } from '../../request/deppon'

export async function queryOrderEditPickupTimes(
  draft: OrderEditDraft
): Promise<DepponResponse<OrderEditPickupTimeResponse>> {
  const nightRequest = buildOrderEditPickupNightRequest(draft)

  if (!nightRequest) {
    return createServiceFailure('寄件地址不完整，暂无法获取上门时间')
  }

  let capability = getFreshOrderEditPickupNightCapability(draft)

  if (!capability) {
    try {
      const response = await orderEditScheduleApi.queryPickupNight(
        nightRequest
      )

      capability = createOrderEditPickupNightCapability(
        draft,
        response.status ? response.result : null
      )
    } catch {
      capability = createOrderEditPickupNightCapability(draft)
    }
  }

  const request = buildOrderEditPickupTimeRequest(draft, capability)

  if (!request) {
    return createServiceFailure('寄件地址不完整，暂无法获取上门时间')
  }

  const response = await orderEditScheduleApi.queryPickupTimes(request)

  if (!response.status || !response.result) {
    return createServiceFailure(response.message || '暂未获取到上门时间')
  }

  const result = normalizeOrderEditPickupTimeResponse(
    response.result,
    capability
  )

  if (result.opening === false || !result.openingList?.length) {
    return createServiceFailure(
      result.openingMessage || '当前地址暂无可预约时间'
    )
  }

  return { ...response, result }
}
