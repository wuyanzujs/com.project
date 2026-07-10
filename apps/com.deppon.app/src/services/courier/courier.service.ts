import { courierApi } from './courier.api'
import {
  isAlreadyBoundCourierMessage,
  normalizeCourier
} from './courier.mapper'
import { createCourierExpressDraft } from './courier.rules'
import { expressDraftBridge } from '../express/draftBridge'
import { createServiceFailure } from '../serviceResponse'

import type {
  CourierBindingState,
  CourierDetailView,
  CourierView
} from './types'
import type { DepponResponse } from '../../request/deppon'

function normalizeCourierNo(value?: string | null) {
  return (value ?? '').trim()
}

export const courierService = {
  async queryList(): Promise<DepponResponse<CourierView[]>> {
    const response = await courierApi.queryList()

    if (!response.status || !response.result) {
      return createServiceFailure(response.message || '暂未获取到专属快递员')
    }

    return {
      ...response,
      result: (response.result.couriers ?? [])
        .map(normalizeCourier)
        .filter(item => item.id)
    }
  },

  async queryDetail(
    courierNo: string
  ): Promise<DepponResponse<CourierDetailView>> {
    const normalizedCourierNo = normalizeCourierNo(courierNo)

    if (!normalizedCourierNo) {
      return createServiceFailure('缺少快递员工号')
    }

    const [detailResponse, listResponse] = await Promise.all([
      courierApi.queryDetail(normalizedCourierNo),
      courierApi.queryList()
    ])

    if (!detailResponse.status || !detailResponse.result) {
      return createServiceFailure(
        detailResponse.message || '未查询到快递员信息'
      )
    }

    let bindingState: CourierBindingState = 'unknown'

    if (listResponse.status && listResponse.result) {
      bindingState = (listResponse.result.couriers ?? []).some(
        item => normalizeCourierNo(item.courierNo) === normalizedCourierNo
      )
        ? 'bound'
        : 'unbound'
    }

    return {
      ...detailResponse,
      result: {
        courier: normalizeCourier(detailResponse.result),
        bindingState
      }
    }
  },

  async bind(courierNo: string): Promise<DepponResponse<null>> {
    const normalizedCourierNo = normalizeCourierNo(courierNo)

    if (!normalizedCourierNo) {
      return createServiceFailure('缺少快递员工号')
    }

    const response = await courierApi.bind(normalizedCourierNo)

    if (!response.status && !isAlreadyBoundCourierMessage(response.message)) {
      return createServiceFailure(response.message || '关注失败，请稍后再试')
    }

    return {
      ...response,
      status: true,
      result: null
    }
  },

  async unbind(courierNo: string): Promise<DepponResponse<null>> {
    const normalizedCourierNo = normalizeCourierNo(courierNo)

    if (!normalizedCourierNo) {
      return createServiceFailure('缺少快递员工号')
    }

    const response = await courierApi.unbind(normalizedCourierNo)

    if (!response.status) {
      return createServiceFailure(response.message || '取消关注失败')
    }

    return {
      ...response,
      result: null
    }
  },

  prepareExpress(courierNo: string) {
    const draft = createCourierExpressDraft(courierNo)

    if (!draft) {
      return false
    }

    expressDraftBridge.carryFromCourier(draft)
    return true
  }
}
