import { orderEvaluationApi } from './order.evaluation.api'
import {
  createOrderEvaluationContext,
  createOrderEvaluationSubmitRequest,
  createOrderEvaluationView,
  validateOrderEvaluationDraft
} from './order.evaluation.rules'
import { createServiceFailure } from '../serviceResponse'

import type {
  OrderEvaluationDraft,
  OrderEvaluationView
} from './order.evaluation.types'
import type { OrderDetail } from './types'

export const orderEvaluationService = {
  async query(detail: OrderDetail, routeRole?: string) {
    const context = createOrderEvaluationContext(detail, routeRole)

    if (!context) {
      return createServiceFailure<OrderEvaluationView>(
        '当前运单暂不支持服务评价'
      )
    }

    const response = await orderEvaluationApi.queryDetail(context.query)

    if (!response.status || !response.result) {
      return createServiceFailure<OrderEvaluationView>(
        response.message || '暂未获取到评价信息'
      )
    }

    const view = createOrderEvaluationView(
      context,
      response.result,
      response.code
    )

    if (!view) {
      return createServiceFailure<OrderEvaluationView>(
        '暂未获取到可评价的快递员信息'
      )
    }

    return {
      ...response,
      result: view
    }
  },

  submit(view: OrderEvaluationView, draft: OrderEvaluationDraft) {
    const validation = validateOrderEvaluationDraft(draft)

    if (!validation.valid) {
      return Promise.resolve(createServiceFailure<unknown>(validation.message))
    }

    return orderEvaluationApi.submit(
      createOrderEvaluationSubmitRequest(view, draft)
    )
  }
}
