import { depponHttp } from '@/request/deppon'

import type { ExpressSuccessCourierRequest, ExpressSuccessCourierResponse } from './success.types'

export const expressSuccessApi = {
  queryCourier(data: ExpressSuccessCourierRequest) {
    return depponHttp.post<ExpressSuccessCourierResponse, ExpressSuccessCourierRequest>('/gwapi/orderService/eco/order/secure/preAllocationCourier', data, {
      loading: false,
      login: false,
      timeout: 3000
    })
  }
}
