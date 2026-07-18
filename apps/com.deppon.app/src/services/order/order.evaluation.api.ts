import { depponHttp } from '../../request/deppon'

import type {
  OrderEvaluationQueryRequest,
  OrderEvaluationQueryResponse,
  OrderEvaluationQueryResultRaw,
  OrderEvaluationSubmitRequest
} from './order.evaluation.types'

export const ORDER_EVALUATION_API_ENDPOINTS = {
  queryDetail:
    '/gwapi/onlineService/eco/online/evaluate/secure/queryEvaluateDetail',
  submit: '/gwapi/onlineService/eco/online/courier/evaluation/secure/commit'
} as const

export const orderEvaluationApi = {
  queryDetail(
    data: OrderEvaluationQueryRequest
  ): Promise<OrderEvaluationQueryResponse> {
    return depponHttp.post<
      OrderEvaluationQueryResultRaw,
      OrderEvaluationQueryRequest
    >(ORDER_EVALUATION_API_ENDPOINTS.queryDetail, data, {
      loading: false
    })
  },

  submit(data: OrderEvaluationSubmitRequest) {
    return depponHttp.post<unknown, OrderEvaluationSubmitRequest>(
      ORDER_EVALUATION_API_ENDPOINTS.submit,
      data
    )
  }
}
