import { getOrderNpsCatalog } from './order.npsSurvey.catalog'

import type {
  OrderNpsDraft,
  OrderNpsLabelContent,
  OrderNpsSubmitRequest,
  OrderSceneSurveyContext
} from './order.sceneSurvey.types'

export const ORDER_NPS_SCORE_VALUES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
export const ORDER_NPS_CONTENT_MAX_LENGTH = 100

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

function getScoreGroup(score: number | null) {
  if (score === null || score < 0 || score > 10) {
    return ''
  }

  if (score <= 6) {
    return 'DETRACTOR'
  }

  return score <= 8 ? 'PASSIVE' : 'PROMOTER'
}

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

export function updateOrderNpsCategory(
  draft: OrderNpsDraft,
  category: string
) {
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

export function updateOrderNpsContent(draft: OrderNpsDraft, content: string) {
  return {
    ...draft,
    content: content.slice(0, ORDER_NPS_CONTENT_MAX_LENGTH)
  }
}

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
