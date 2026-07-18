import { depponHttp } from '../../request/deppon'

import type {
  ExpressCouponQueryRaw,
  ExpressCouponQueryRequest
} from './types'

export const expressCouponApi = {
  queryOrderCoupons(data: ExpressCouponQueryRequest, loading = false) {
    return depponHttp.post<ExpressCouponQueryRaw, ExpressCouponQueryRequest>(
      '/gwapi/couponService/eco/coupon/new/secure/queryCouponOrder',
      data,
      {
        loading
      }
    )
  }
}
