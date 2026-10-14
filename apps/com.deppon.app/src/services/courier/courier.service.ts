import type { DepponResponse } from '@/request/deppon'

import { courierApi } from './courier.api'
import { isAlreadyBoundCourierMessage, normalizeCourier } from './courier.mapper'
import { createCourierExpressDraft } from './courier.rules'
import { expressDraftBridge } from '../express/draftBridge'
import { createServiceFailure } from '../serviceResponse'

import type { CourierBindingState, CourierDetailView, CourierView } from './types'

/**
 *
 * @param value 快递员工号，可为空
 * @description 归一快递员工号，去首尾空白
 */
function normalizeCourierNo(value?: string | null) {
  return (value ?? '').trim()
}

export const courierService = {
  /**
   *
   * @description 查询专属快递员列表
   */
  async queryList(): Promise<DepponResponse<CourierView[]>> {
    const response = await courierApi.queryList()

    if (!response.status || !response.result) {
      return createServiceFailure(response.message || '暂未获取到专属快递员')
    }

    return {
      ...response,
      result: (response.result.couriers ?? []).map(normalizeCourier).filter(item => item.id)
    }
  },

  /**
   *
   * @param courierNo 快递员工号
   * @description 查询快递员详情与绑定状态
   */
  async queryDetail(courierNo: string): Promise<DepponResponse<CourierDetailView>> {
    const normalizedCourierNo = normalizeCourierNo(courierNo)

    if (!normalizedCourierNo) {
      return createServiceFailure('缺少快递员工号')
    }

    const [detailResponse, listResponse] = await Promise.all([courierApi.queryDetail(normalizedCourierNo), courierApi.queryList()])

    if (!detailResponse.status || !detailResponse.result) {
      return createServiceFailure(detailResponse.message || '未查询到快递员信息')
    }

    let bindingState: CourierBindingState = 'unknown'

    if (listResponse.status && listResponse.result) {
      bindingState = (listResponse.result.couriers ?? []).some(item => normalizeCourierNo(item.courierNo) === normalizedCourierNo) ? 'bound' : 'unbound'
    }

    return {
      ...detailResponse,
      result: {
        courier: normalizeCourier(detailResponse.result),
        bindingState
      }
    }
  },

  /**
   *
   * @param courierNo 快递员工号
   * @description 关注快递员，已绑定视为成功
   */
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

  /**
   *
   * @param courierNo 快递员工号
   * @description 取消关注快递员
   */
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

  /**
   *
   * @param courierNo 快递员工号
   * @description 把快递员信息带入寄件草稿
   */
  prepareExpress(courierNo: string) {
    const draft = createCourierExpressDraft(courierNo)

    if (!draft) {
      return false
    }

    expressDraftBridge.carryFromCourier(draft)
    return true
  }
}
