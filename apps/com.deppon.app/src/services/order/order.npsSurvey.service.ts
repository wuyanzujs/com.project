import { orderNpsSurveyApi } from './order.npsSurvey.api'
import { createOrderNpsSubmitRequest } from './order.npsSurvey.rules'
import { createServiceFailure } from '../serviceResponse'

import type {
  OrderNpsDraft,
  OrderSceneSurveyContext,
  OrderSceneSurveyItem
} from './order.sceneSurvey.types'

const NPS_ITEM: OrderSceneSurveyItem = {
  key: 'NPS:N0101',
  id: 'NPS',
  code: 'N0101',
  kind: 'NPS',
  title: '针对本次服务，您有多大意愿将德邦推荐给亲友/同事？',
  labels: []
}

export const orderNpsSurveyService = {
  async query(context: OrderSceneSurveyContext) {
    const response = await orderNpsSurveyApi.query({
      sysCode: 'OWS',
      sceneCode: 'N0101',
      commentCode: context.waybillNumber
    })

    if (!response.status || typeof response.result !== 'boolean') {
      return createServiceFailure<OrderSceneSurveyItem>(
        response.message || '推荐意愿问卷状态查询失败'
      )
    }

    return {
      ...response,
      result: response.result ? null : NPS_ITEM
    }
  },

  async submit(context: OrderSceneSurveyContext, draft: OrderNpsDraft) {
    const request = createOrderNpsSubmitRequest(context, draft)

    if (!request) {
      return createServiceFailure<boolean>('请先选择推荐评分')
    }

    const response = await orderNpsSurveyApi.submit(request)

    return response.status && response.result
      ? response
      : createServiceFailure<boolean>(
          response.message || '推荐意愿问卷提交失败'
        )
  }
}
