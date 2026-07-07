import { depponHttp } from '../../request/deppon'

import type {
  CouponDetailRaw,
  CouponDetailRequest,
  CouponExchangeRequest,
  CouponExchangeResponse,
  CouponItem,
  UserCouponListRequest
} from './types'

export const couponApi = {
  queryUserCouponList(data: UserCouponListRequest, loading = false) {
    return depponHttp.post<CouponItem[], UserCouponListRequest>(
      '/gwapi/couponService/eco/coupon/new/secure/queryNewCouponList',
      data,
      {
        loading
      }
    )
  },

  exchangeCoupon(exchangeCouponCode: string, loading = true) {
    return depponHttp.post<CouponExchangeResponse, CouponExchangeRequest>(
      '/gwapi/couponService/eco/coupon/coupon/secure/exchangeCoupon',
      {
        exchangeCouponCode
      },
      {
        loading
      }
    )
  },

  queryCouponDetail(couponCode: string, loading = false) {
    return depponHttp.post<CouponDetailRaw, CouponDetailRequest>(
      '/gwapi/couponService/eco/coupon/new/secure/queryCouponDetail',
      {
        couponCode
      },
      {
        loading
      }
    )
  }
}
