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

function getPdcSendFrequency(source: string): OrderPdcSendFrequency | null {
  if (source.includes(PDC_SECOND_SOURCE)) {
    return 'TWO'
  }

  return source.includes(PDC_FIRST_SOURCE) ? 'ONE' : null
}

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

  submit(
    context: OrderPdcFeedbackContext,
    feedbackResult: OrderPdcFeedbackResult
  ) {
    return orderPdcFeedbackApi.submit(
      createOrderPdcFeedbackRequest(context, feedbackResult)
    )
  }
}
