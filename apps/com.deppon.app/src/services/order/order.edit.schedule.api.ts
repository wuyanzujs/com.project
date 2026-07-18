import { depponHttp } from '../../request/deppon'

import type {
  OrderEditPickupNightRequest,
  OrderEditPickupNightResponse,
  OrderEditPickupTimeRequest,
  OrderEditPickupTimeResponse
} from './order.edit.types'

export const orderEditScheduleApi = {
  queryPickupNight(data: OrderEditPickupNightRequest) {
    return depponHttp.post<
      OrderEditPickupNightResponse,
      OrderEditPickupNightRequest
    >('/gwapi/queryService/eco/query/range/matchFeatureAoi', data, {
      loading: false,
      timeout: 3000
    })
  },

  queryPickupTimes(data: OrderEditPickupTimeRequest) {
    return depponHttp.post<
      OrderEditPickupTimeResponse,
      OrderEditPickupTimeRequest
    >(
      '/gwapi/orderService/eco/order/dispatchTime/dispatchTimeByDeptCode',
      data,
      {
        loading: false,
        timeout: 3000
      }
    )
  }
}
