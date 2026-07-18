import { depponHttp } from '../../request/deppon'

import type {
  PaymentCancelRequest,
  PaymentConfirmResponse,
  PaymentCreateRequest,
  PaymentListRequest,
  PaymentListResponse,
  PaymentOrder
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
  },

  createOrder(data: PaymentCreateRequest, loading = true) {
    return depponHttp.post<PaymentOrder, PaymentCreateRequest>(
      '/gwapi/onlineService/eco/online/pay/pmc/secure/payCreate',
      data,
      { loading }
    )
  },

  confirmOrder(data: PaymentOrder, loading = true) {
    return depponHttp.post<PaymentConfirmResponse, PaymentOrder>(
      '/gwapi/onlineService/eco/online/pay/pmc/secure/payConfirm',
      data,
      { loading }
    )
  },

  cancelOrder(data: PaymentCancelRequest, loading = false) {
    return depponHttp.post<null, PaymentCancelRequest>(
      '/gwapi/onlineService/eco/online/pay/pmc/secure/payCancel',
      data,
      { loading }
    )
  }
}
