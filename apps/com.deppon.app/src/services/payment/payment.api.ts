import { depponHttp } from '@/request/deppon'

import type {
  ECardCheckRequest,
  ECardConfirmRequest,
  PaymentCancelRequest,
  PaymentConfirmResponse,
  PaymentCreateRequest,
  PaymentListRequest,
  PaymentListResponse,
  PaymentOrder
} from './types'

export const paymentApi = {
  queryUnpaidList(data: PaymentListRequest, loading = false) {
    return depponHttp.post<PaymentListResponse, PaymentListRequest>('/gwapi/onlineService/eco/online/pay/pmc/secure/queryUnWriteOffList', data, {
      loading
    })
  },

  createOrder(data: PaymentCreateRequest, loading = true) {
    return depponHttp.post<PaymentOrder, PaymentCreateRequest>('/gwapi/onlineService/eco/online/pay/pmc/secure/payCreate', data, { loading })
  },

  confirmOrder(data: PaymentOrder, loading = true) {
    return depponHttp.post<PaymentConfirmResponse, PaymentOrder>('/gwapi/onlineService/eco/online/pay/pmc/secure/payConfirm', data, { loading })
  },

  cancelOrder(data: PaymentCancelRequest, loading = false) {
    return depponHttp.post<null, PaymentCancelRequest>('/gwapi/onlineService/eco/online/pay/pmc/secure/payCancel', data, { loading })
  },

  // E 卡支付通道:纯 HTTP 闭环,不依赖原生支付 SDK(参照小程序收银台 ExistsECardPayment/ConfirmECardOrder)。
  queryECardPayable(data: ECardCheckRequest) {
    return depponHttp.post<boolean, ECardCheckRequest>('/gwapi/onlineService/eco/online/pay/secure/queryIsPreCardPay', data, {
      loading: false,
      login: false
    })
  },

  confirmECardOrder(data: ECardConfirmRequest) {
    return depponHttp.post<boolean, ECardConfirmRequest>('/gwapi/onlineService/eco/online/pay/secure/preCardConfirm', data, { loading: true, login: true })
  }
}
