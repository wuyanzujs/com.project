import { getOrderNpsCatalog } from './order.npsSurvey.catalog'

import type {
  OrderNpsDraft,
  OrderNpsLabelContent,
  OrderNpsSubmitRequest,
  OrderSceneSurveyContext
} from './order.sceneSurvey.types'

export const ORDER_NPS_SCORE_VALUES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
export const ORDER_NPS_CONTENT_MAX_LENGTH = 100

/**
 *
 * @param score 初始评分
 * @description 创建 NPS 问卷草稿
 */
export function createOrderNpsDraft(
  score: number | null = null
): OrderNpsDraft {
  return {
    score,
    category: '',
    reasons: [],
    content: ''
  }
}

/**
 *
 * @param score NPS 评分
 * @description 按评分返回贬损、中立或推荐分组
 */
function getScoreGroup(score: number | null) {
  if (score === null || score < 0 || score > 10) {
    return ''
  }

  if (score <= 6) {
    return 'DETRACTOR'
  }

  return score <= 8 ? 'PASSIVE' : 'PROMOTER'
}

/**
 *
 * @param draft NPS 草稿
 * @param score NPS 评分
 * @description 更新评分，跨分组时清空已选原因
 */
export function updateOrderNpsScore(draft: OrderNpsDraft, score: number) {
  if (!Number.isInteger(score) || score < 0 || score > 10) {
    return draft
  }

  const resetOptions = getScoreGroup(draft.score) !== getScoreGroup(score)

  return {
    ...draft,
    score,
    ...(resetOptions ? { category: '', reasons: [] } : {})
  }
}

/**
 *
 * @param draft NPS 草稿
 * @param category 问题分类
 * @description 切换分类并清空已选原因
 */
export function updateOrderNpsCategory(draft: OrderNpsDraft, category: string) {
  const catalog = getOrderNpsCatalog(draft.score)

  if (!catalog?.options.some(option => option.text === category)) {
    return draft
  }

  return {
    ...draft,
    category: draft.category === category ? '' : category,
    reasons: []
  }
}

/**
 *
 * @param draft NPS 草稿
 * @param reason 推荐或不推荐原因
 * @description 切换原因选中状态，受最大可选数限制
 */
export function toggleOrderNpsReason(draft: OrderNpsDraft, reason: string) {
  const catalog = getOrderNpsCatalog(draft.score)
  const category = catalog?.options.find(
    option => option.text === draft.category
  )

  if (!category?.options.includes(reason)) {
    return draft
  }

  if (draft.reasons.includes(reason)) {
    return {
      ...draft,
      reasons: draft.reasons.filter(item => item !== reason)
    }
  }

  if (draft.reasons.length >= category.maxSelections) {
    return draft
  }

  return {
    ...draft,
    reasons: [...draft.reasons, reason]
  }
}

/**
 *
 * @param draft NPS 草稿
 * @param content 补充说明
 * @description 更新补充说明并按长度上限截断
 */
export function updateOrderNpsContent(draft: OrderNpsDraft, content: string) {
  return {
    ...draft,
    content: content.slice(0, ORDER_NPS_CONTENT_MAX_LENGTH)
  }
}

/**
 *
 * @param draft NPS 草稿
 * @description 组装级联标签内容，无有效分类返回 undefined
 */
export function createOrderNpsLabelContent(
  draft: OrderNpsDraft
): OrderNpsLabelContent | undefined {
  const catalog = getOrderNpsCatalog(draft.score)
  const category = catalog?.options.find(
    option => option.text === draft.category
  )

  if (!catalog || !category) {
    return undefined
  }

  const validReasons = draft.reasons
    .filter(reason => category.options.includes(reason))
    .slice(0, category.maxSelections)

  return {
    type: 'CASCADE',
    option: [
      {
        level: 1,
        name: category.text,
        title: catalog.title
      },
      ...validReasons.map(reason => ({
        level: 2 as const,
        name: reason,
        title: category.title
      }))
    ]
  }
}

/**
 *
 * @param context 场景问卷上下文
 * @param draft NPS 草稿
 * @description 创建 NPS 提交 payload，评分非法返回 null
 */
export function createOrderNpsSubmitRequest(
  context: OrderSceneSurveyContext,
  draft: OrderNpsDraft
): OrderNpsSubmitRequest | null {
  if (
    draft.score === null ||
    !Number.isInteger(draft.score) ||
    draft.score < 0 ||
    draft.score > 10
  ) {
    return null
  }

  const labelContent = createOrderNpsLabelContent(draft)

  return {
    sysCode: 'OWS',
    sceneCode: 'N0101',
    childSysCode: context.childChannel,
    commentCode: context.waybillNumber,
    commentType: 'WaybillNumber',
    content: draft.content.trim().slice(0, ORDER_NPS_CONTENT_MAX_LENGTH),
    labelName: String(draft.score),
    ...(labelContent ? { labelContent } : {}),
    personType: context.role === 'receive' ? 'consignee' : 'sender'
  }
}
