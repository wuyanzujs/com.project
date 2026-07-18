import { depponHttp } from '../../request/deppon'

import type {
  OrderNpsQueryRequest,
  OrderNpsSubmitRequest
} from './order.sceneSurvey.types'

export const ORDER_NPS_SURVEY_API_ENDPOINTS = {
  query: '/gwapi/commentService/eco/comment/queryCustomerQuestionnaire',
  submit: '/gwapi/commentService/eco/comment/addCustomerQuestionnaire'
} as const

export const orderNpsSurveyApi = {
  query(data: OrderNpsQueryRequest) {
    return depponHttp.post<boolean, OrderNpsQueryRequest>(
      ORDER_NPS_SURVEY_API_ENDPOINTS.query,
      data,
      {
        loading: false,
        timeout: 3000
      }
    )
  },

  submit(data: OrderNpsSubmitRequest) {
    return depponHttp.post<boolean, OrderNpsSubmitRequest>(
      ORDER_NPS_SURVEY_API_ENDPOINTS.submit,
      data,
      {
        timeout: 5000
      }
    )
  }
}
