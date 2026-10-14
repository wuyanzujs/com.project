import type { DepponResponse } from '@/request/deppon'

import { orderNpsSurveyService } from './order.npsSurvey.service'
import { orderSceneSurveyService } from './order.sceneSurvey.service'

import type { OrderSceneSurveyContext, OrderSceneSurveyItem, OrderSceneSurveyQueryResult, OrderSceneSurveySubmitInput } from './order.sceneSurvey.types'

/**
 *
 * @param context 场景问卷上下文
 * @param index 计划项下标
 * @description 按计划项类型查询单个问卷
 */
async function queryPlanItem(context: OrderSceneSurveyContext, index: number) {
  const plan = context.plan[index]

  return plan.kind === 'NPS' ? orderNpsSurveyService.query(context) : orderSceneSurveyService.queryOne(context, plan)
}

export const orderSceneSurveyOrchestrator = {
  /**
   *
   * @param context 场景问卷上下文
   * @description 并发查询所有问卷并汇总结果
   */
  async query(context: OrderSceneSurveyContext): Promise<OrderSceneSurveyQueryResult> {
    const results = await Promise.allSettled(context.plan.map((_, index) => queryPlanItem(context, index)))
    const items: OrderSceneSurveyItem[] = []
    let failedCount = 0

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.status && result.value.result) {
        items.push(result.value.result)
      } else if (result.status === 'rejected' || !result.value.status) {
        failedCount += 1
      }
    }

    return { items, failedCount }
  },

  /**
   *
   * @param context 场景问卷上下文
   * @param item 问卷项
   * @param input 提交入参
   * @description 按问卷类型分发提交
   */
  submit(context: OrderSceneSurveyContext, item: OrderSceneSurveyItem, input: OrderSceneSurveySubmitInput): Promise<DepponResponse<unknown>> {
    if (item.kind === 'NPS' && input.kind === 'NPS') {
      return orderNpsSurveyService.submit(context, input.draft)
    }

    if (item.kind === 'SCORE' && input.kind === 'SCORE') {
      return orderSceneSurveyService.submitScore(context, item, input)
    }

    if (item.kind === 'LABEL' && input.kind === 'LABEL') {
      return orderSceneSurveyService.submitLabel(context, item, input.labelId)
    }

    return Promise.resolve({
      status: false,
      message: '问卷提交上下文已变化',
      result: null
    })
  }
}
