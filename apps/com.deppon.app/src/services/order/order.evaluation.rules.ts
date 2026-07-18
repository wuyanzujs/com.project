import { createOrderDetailWebUri } from './order.detailRules'
import { getOrderEvaluationLabels } from './order.evaluation.catalog'
import { APP_ROUTES } from '../../shared/navigation/routes'
import { createAppRouteUrl } from '../../shared/navigation/routeUrl'

import type {
  OrderEvaluationContext,
  OrderEvaluationCourierRole,
  OrderEvaluationDraft,
  OrderEvaluationLevel,
  OrderEvaluationQueryResultRaw,
  OrderEvaluationSubmitRequest,
  OrderEvaluationValidation,
  OrderEvaluationView
} from './order.evaluation.types'
import type { OrderDetail, OrderRole } from './types'

const ORDER_EVALUATION_PENDING_CODE = 'NOT_EVALUATED'
const ORDER_EVALUATION_SUGGESTION_MIN_LENGTH = 8
export const ORDER_EVALUATION_SUGGESTION_MAX_LENGTH = 250

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeLevel(
  value: unknown,
  fallback: OrderEvaluationLevel = 5
): OrderEvaluationLevel {
  const level = Number(value)

  return level === 1 || level === 2 || level === 3 || level === 4 || level === 5
    ? level
    : fallback
}

function normalizeAverageLevel(value: unknown) {
  const level = Number(value)

  if (!Number.isFinite(level)) {
    return 0
  }

  return Math.min(5, Math.max(0, level))
}

function normalizeCourierRole(value: unknown): OrderEvaluationCourierRole {
  return value === 'Driver' ? 'Driver' : 'Courier'
}

export function getOrderEvaluationRole(
  detail: OrderDetail,
  routeRole?: string
): OrderRole {
  if (detail.isReceiver === 'Y' && detail.isSender !== 'Y') {
    return 'receive'
  }

  if (detail.isSender === 'Y') {
    return 'sender'
  }

  return routeRole === 'receive' ? 'receive' : 'sender'
}

export function createOrderEvaluationContext(
  detail: OrderDetail,
  routeRole?: string
): OrderEvaluationContext | null {
  const role = getOrderEvaluationRole(detail, routeRole)
  const orderClass = Number(detail.orderClassification)
  const waybillNumber = normalizeText(detail.waybillNumber)
  const eligible =
    role === 'receive'
      ? orderClass === 2 || orderClass === 6
      : orderClass === 1 || orderClass === 2

  if (!eligible || !waybillNumber) {
    return null
  }

  const deliveryEvaluation = role === 'receive' || orderClass === 2

  return {
    orderNumber: normalizeText(detail.orderNumber),
    waybillNumber,
    role,
    recordType: deliveryEvaluation ? 'DELIVERY' : 'COLLECTION',
    query: {
      waybillNo: waybillNumber,
      cateGory: deliveryEvaluation ? 0 : 1,
      sign: orderClass === 2 ? 'Y' : 'N'
    }
  }
}

export function createOrderEvaluationRoute(
  detail: OrderDetail,
  routeRole?: string
) {
  const context = createOrderEvaluationContext(detail, routeRole)

  if (!context) {
    return ''
  }

  return createAppRouteUrl(APP_ROUTES.orderEvaluation, {
    orderNumber: context.orderNumber,
    waybillNumber: context.waybillNumber,
    role: context.role,
    source: 'ORDER_DETAIL'
  })
}

export function createOrderEvaluationFallbackWebUri(
  detail: OrderDetail,
  routeRole: string,
  mobile: string
) {
  const role = getOrderEvaluationRole(detail, routeRole)
  const scene = role === 'sender' ? 'S0505' : 'S0907'

  return createOrderDetailWebUri('/depponmobile/survey/land', {
    scene,
    channel: 'APP',
    mobile,
    rowData: JSON.stringify([
      {
        field: 'orderNumber',
        data: detail.orderNumber || ''
      },
      {
        field: 'waybillNumber',
        data: detail.waybillNumber || ''
      }
    ])
  })
}

export function createOrderEvaluationView(
  context: OrderEvaluationContext,
  result: OrderEvaluationQueryResultRaw,
  responseCode?: string
): OrderEvaluationView | null {
  const pendingCourier = result.evaluateCourierMessage
  const evaluatedCourier = result.evaluateDetail
  const courier = pendingCourier || evaluatedCourier
  const courierCode = normalizeText(courier?.courierNo)
  const courierName = normalizeText(courier?.courierName)

  if (!courierCode || !courierName) {
    return null
  }

  const committed = responseCode
    ? responseCode !== ORDER_EVALUATION_PENDING_CODE
    : Boolean(evaluatedCourier && !pendingCourier)
  const evaluatedDetail = pendingCourier ? null : evaluatedCourier

  return {
    ...context,
    courierCode,
    courierName,
    courierPhone: normalizeText(courier?.courierPhone),
    courierRole: normalizeCourierRole(
      pendingCourier ? result.evaluateType : evaluatedDetail?.courierRole
    ),
    courierCompany: pendingCourier?.courierType === 'JD' ? 'JD' : 'DP',
    committed,
    averageLevel: normalizeAverageLevel(result.avgStarLevel),
    level: committed
      ? normalizeLevel(evaluatedDetail?.starLevel)
      : 5,
    label: committed ? normalizeText(evaluatedDetail?.evaluateCode) : ''
  }
}

export function createOrderEvaluationDraft(
  level: OrderEvaluationLevel = 5
): OrderEvaluationDraft {
  return {
    level,
    selectedLabels: [],
    suggestion: ''
  }
}

export function updateOrderEvaluationLevel(
  draft: OrderEvaluationDraft,
  level: OrderEvaluationLevel
): OrderEvaluationDraft {
  return {
    ...draft,
    level,
    selectedLabels: []
  }
}

export function toggleOrderEvaluationLabel(
  draft: OrderEvaluationDraft,
  recordType: OrderEvaluationView['recordType'],
  label: string
): OrderEvaluationDraft {
  const allowedLabels = getOrderEvaluationLabels(recordType, draft.level)

  if (!allowedLabels.includes(label)) {
    return draft
  }

  return {
    ...draft,
    selectedLabels: draft.selectedLabels.includes(label)
      ? draft.selectedLabels.filter(item => item !== label)
      : [...draft.selectedLabels, label]
  }
}

export function updateOrderEvaluationSuggestion(
  draft: OrderEvaluationDraft,
  suggestion: string
): OrderEvaluationDraft {
  return {
    ...draft,
    suggestion: suggestion.slice(0, ORDER_EVALUATION_SUGGESTION_MAX_LENGTH)
  }
}

export function validateOrderEvaluationDraft(
  draft: OrderEvaluationDraft
): OrderEvaluationValidation {
  if (!draft.selectedLabels.length) {
    return {
      valid: false,
      message: '请至少选择一个评价标签'
    }
  }

  const suggestion = draft.suggestion.trim()

  if (
    suggestion &&
    suggestion.length < ORDER_EVALUATION_SUGGESTION_MIN_LENGTH
  ) {
    return {
      valid: false,
      message: '评价建议至少填写 8 个字，或保持为空'
    }
  }

  return {
    valid: true,
    message: ''
  }
}

export function createOrderEvaluationSubmitRequest(
  view: OrderEvaluationView,
  draft: OrderEvaluationDraft
): OrderEvaluationSubmitRequest {
  return {
    waybillNo: view.waybillNumber,
    recordType: view.recordType,
    courierCode: view.courierCode,
    courierName: view.courierName,
    starLevel: draft.level,
    suggestion: draft.suggestion.trim(),
    evaluationLabels: [...draft.selectedLabels]
  }
}

export function applyOrderEvaluationSubmission(
  view: OrderEvaluationView,
  draft: OrderEvaluationDraft
): OrderEvaluationView {
  return {
    ...view,
    committed: true,
    level: draft.level,
    label: draft.selectedLabels.join('、')
  }
}
