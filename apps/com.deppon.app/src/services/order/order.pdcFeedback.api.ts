import { depponHttp } from '../../request/deppon'

export const ORDER_PDC_FEEDBACK_API_ENDPOINTS = {
  query: '/gwapi/commentService/eco/comment/secure/queryFeedback',
  submit: '/gwapi/commentService/eco/comment/secure/submitFeedback'
} as const

export const orderPdcFeedbackApi = {
  query(data: { waybillNo: string }) {
    return depponHttp.post<'Y' | 'N', { waybillNo: string }>(
      ORDER_PDC_FEEDBACK_API_ENDPOINTS.query,
      data,
      {
        loading: false,
        login: false,
        timeout: 3000
      }
    )
  },

  submit(data: {
    waybillNo: string
    sendFrequency: 'ONE' | 'TWO'
    feedbackResult: 'Y' | 'N'
  }) {
    return depponHttp.post<unknown, typeof data>(
      ORDER_PDC_FEEDBACK_API_ENDPOINTS.submit,
      data,
      {
        timeout: 3000
      }
    )
  }
}
