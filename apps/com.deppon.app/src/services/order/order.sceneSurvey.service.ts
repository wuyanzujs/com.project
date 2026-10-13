import { orderSceneSurveyApi } from './order.sceneSurvey.api'
import {
  createOrderSceneLabelSubmitRequest,
  createOrderSceneScoreSubmitRequest,
  normalizeOrderSceneSurveyQuestion
} from './order.sceneSurvey.rules'
import { createServiceFailure } from '../serviceResponse'

import type {
  OrderSceneScoreDraft,
  OrderSceneSurveyContext,
  OrderSceneSurveyItem,
  OrderSceneSurveyPlanItem
} from './order.sceneSurvey.types'

/**
 *
 * @param context 场景问卷上下文
 * @param plan 场景计划项
 * @description 创建问卷查询请求参数
 */
function createQueryRequest(
  context: OrderSceneSurveyContext,
  plan: OrderSceneSurveyPlanItem
) {
  return {
    mobile: context.mobile,
    sceneCode: plan.code,
    childChannel: context.childChannel,
    waybillNumber: context.waybillNumber
  }
}

export const orderSceneSurveyService = {
  /**
   *
   * @param context 场景问卷上下文
   * @param plan 场景计划项
   * @description 查询单个场景问卷配置
   */
  async queryOne(
    context: OrderSceneSurveyContext,
    plan: OrderSceneSurveyPlanItem
  ) {
    if (plan.kind === 'NPS' || !context.mobile) {
      return createServiceFailure<OrderSceneSurveyItem>(
        '当前场景不属于动态评价问卷'
      )
    }

    const statusResponse = await orderSceneSurveyApi.query(
      createQueryRequest(context, plan)
    )

    if (statusResponse.transportFailure) {
      return createServiceFailure<OrderSceneSurveyItem>(
        statusResponse.message || '评价状态查询失败'
      )
    }

    if (statusResponse.status) {
      return {
        ...statusResponse,
        result: null
      }
    }

    const definitionResponse = await orderSceneSurveyApi.queryDefinition(
      plan.code
    )
    const firstQuestion = Array.isArray(definitionResponse.result?.questionList)
      ? definitionResponse.result.questionList[0]
      : undefined
    const item = normalizeOrderSceneSurveyQuestion(plan, firstQuestion)

    if (!definitionResponse.status || !item) {
      return createServiceFailure<OrderSceneSurveyItem>(
        definitionResponse.message || '评价问卷配置不可用'
      )
    }

    return {
      ...definitionResponse,
      result: item
    }
  },

  /**
   *
   * @param context 场景问卷上下文
   * @param item 问卷项
   * @param draft 评分草稿
   * @description 提交评分问卷
   */
  submitScore(
    context: OrderSceneSurveyContext,
    item: OrderSceneSurveyItem,
    draft: OrderSceneScoreDraft
  ) {
    const request = createOrderSceneScoreSubmitRequest(context, item, draft)

    return request
      ? orderSceneSurveyApi.submit(request)
      : Promise.resolve(createServiceFailure<boolean>('请完善评价内容'))
  },

  /**
   *
   * @param context 场景问卷上下文
   * @param item 问卷项
   * @param labelId 标签 id
   * @description 提交标签问卷
   */
  submitLabel(
    context: OrderSceneSurveyContext,
    item: OrderSceneSurveyItem,
    labelId: string
  ) {
    const request = createOrderSceneLabelSubmitRequest(context, item, labelId)

    return request
      ? orderSceneSurveyApi.submit(request)
      : Promise.resolve(createServiceFailure<boolean>('评价标签不可用'))
  }
}
