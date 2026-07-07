import { depponHttp } from '../../request/deppon'

import type {
  PaymentListRequest,
  PaymentListResponse
} from './types'

export const paymentApi = {
  queryUnpaidList(data: PaymentListRequest, loading = false) {
    return depponHttp.post<PaymentListResponse, PaymentListRequest>(
      '/gwapi/onlineService/eco/online/pay/pmc/secure/queryUnWriteOffList',
      data,
      {
        loading
      }
    )
  }
}
