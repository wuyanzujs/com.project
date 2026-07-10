import { depponHttp } from '../../request/deppon'

import type { CourierCodeRequest, CourierListRaw, CourierRaw } from './types'

const COURIER_API_ROOT = '/gwapi/onlineService/eco/online/courier/secure'

export const courierApi = {
  queryList() {
    return depponHttp.get<CourierListRaw>(`${COURIER_API_ROOT}/courierList`, {
      loading: false
    })
  },

  queryDetail(courierNo: string) {
    return depponHttp.get<CourierRaw>(`${COURIER_API_ROOT}/queryDetail`, {
      data: {
        courierNo
      },
      loading: false
    })
  },

  bind(courierNo: string) {
    return depponHttp.get<null>(`${COURIER_API_ROOT}/binding`, {
      data: {
        courierNo
      } satisfies CourierCodeRequest
    })
  },

  unbind(courierNo: string) {
    return depponHttp.get<null>(`${COURIER_API_ROOT}/unBinding`, {
      data: {
        courierNo
      } satisfies CourierCodeRequest
    })
  }
}
