import { orderPdcFeedbackApi } from './order.pdcFeedback.api'
import { createServiceFailure } from '../serviceResponse'

import type { OrderDetail } from './types'

export type OrderPdcFeedbackResult = 'Y' | 'N'
export type OrderPdcSendFrequency = 'ONE' | 'TWO'

export interface OrderPdcFeedbackContext {
  waybillNumber: string
  source: string
  sendFrequency: OrderPdcSendFrequency
}

export interface OrderPdcFeedbackRequest {
  waybillNo: string
  sendFrequency: OrderPdcSendFrequency
  feedbackResult: OrderPdcFeedbackResult
}

const PDC_SIGNED_ORDER_CLASS = 2
const PDC_FIRST_SOURCE = 'PDC_KDYZJO'
const PDC_SECOND_SOURCE = 'PDC_KDYZJT'

/**
 *
 * @param source 来源标识
 * @description 按来源返回发送频次，未匹配返回 null
 */
function getPdcSendFrequency(source: string): OrderPdcSendFrequency | null {
  if (source.includes(PDC_SECOND_SOURCE)) {
    return 'TWO'
  }

  return source.includes(PDC_FIRST_SOURCE) ? 'ONE' : null
}

/**
 *
 * @param detail 订单信息，可为空
 * @param source 来源标识
 * @param publicTrackMode 是否公开轨迹
 * @description 创建签收反馈上下文，条件不满足返回 null
 */
export function createOrderPdcFeedbackContext(
  detail: Pick<OrderDetail, 'orderClassification' | 'waybillNumber'> | null,
  source: string,
  publicTrackMode = false
): OrderPdcFeedbackContext | null {
  const normalizedSource = source.trim()
  const waybillNumber = detail?.waybillNumber?.trim() ?? ''
  const sendFrequency = getPdcSendFrequency(normalizedSource)

  if (
    publicTrackMode ||
    !detail ||
    Number(detail.orderClassification) !== PDC_SIGNED_ORDER_CLASS ||
    !waybillNumber ||
    !sendFrequency
  ) {
    return null
  }

  return {
    waybillNumber,
    source: normalizedSource,
    sendFrequency
  }
}

/**
 *
 * @param context 签收反馈上下文
 * @param feedbackResult 反馈结果
 * @description 创建签收反馈提交请求
 */
export function createOrderPdcFeedbackRequest(
  context: OrderPdcFeedbackContext,
  feedbackResult: OrderPdcFeedbackResult
): OrderPdcFeedbackRequest {
  return {
    waybillNo: context.waybillNumber,
    sendFrequency: context.sendFrequency,
    feedbackResult
  }
}

export const orderPdcFeedbackService = {
  /**
   *
   * @param context 签收反馈上下文
   * @description 查询待反馈状态
   */
  async queryPending(context: OrderPdcFeedbackContext) {
    const response = await orderPdcFeedbackApi.query({
      waybillNo: context.waybillNumber
    })

    if (!response.status) {
      return createServiceFailure<boolean>(
        response.message || '暂未获取到签收反馈状态'
      )
    }

    return {
      ...response,
      result: response.result === 'N'
    }
  },

  /**
   *
   * @param context 签收反馈上下文
   * @param feedbackResult 反馈结果
   * @description 提交签收反馈
   */
  submit(
    context: OrderPdcFeedbackContext,
    feedbackResult: OrderPdcFeedbackResult
  ) {
    return orderPdcFeedbackApi.submit(
      createOrderPdcFeedbackRequest(context, feedbackResult)
    )
  }
}
