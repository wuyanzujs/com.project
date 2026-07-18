import { couponService } from './coupon.service'
import { expressCouponApi } from './expressCoupon.api'
import { createServiceFailure } from '../serviceResponse'

import type {
  ExpressCouponQueryRequest,
  ExpressCouponQueryResult
} from './types'
import type { DepponResponse } from '../../request/deppon'

export const expressCouponService = {
  async queryOrderCoupons(
    request: ExpressCouponQueryRequest
  ): Promise<DepponResponse<ExpressCouponQueryResult>> {
    try {
      const response = await expressCouponApi.queryOrderCoupons(request)

      if (!response.status) {
        return createServiceFailure(
          response.message || '暂未获取到可用优惠券'
        )
      }

      const available = Array.isArray(response.result?.available)
        ? response.result.available
        : []
      const unavailable = Array.isArray(response.result?.unAvailable)
        ? response.result.unAvailable
        : []

      return {
        ...response,
        result: {
          available: available.map(coupon =>
            couponService.toCouponCard(coupon, 'AVAILABLE')
          ),
          unavailable: unavailable.map(coupon =>
            couponService.toCouponCard(coupon, 'UN_AVAILABLE')
          )
        }
      }
    } catch {
      return createServiceFailure('可用优惠券查询失败，请检查网络后重试')
    }
  }
}
