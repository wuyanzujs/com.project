import { APP_ROUTES } from '@/shared/navigation/routes'
import { createAppRouteUrl } from '@/shared/navigation/routeUrl'

import { getOrderEvaluationLabels } from './order.evaluation.catalog'
import { createOrderDetailWebUri } from '../detail/order.detailRules'

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
import type { OrderDetail, OrderRole } from '../core/types'

const ORDER_EVALUATION_PENDING_CODE = 'NOT_EVALUATED'
const ORDER_EVALUATION_SUGGESTION_MIN_LENGTH = 8
export const ORDER_EVALUATION_SUGGESTION_MAX_LENGTH = 250

/**
 *
 * @param value 待处理文本
 * @description 归一文本，非字符串返回空字符串
 */
function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

/**
 *
 * @param value 待归一星级
 * @param fallback 兜底星级
 * @description 校验 1 到 5 星级，非法时取兜底值
 */
function normalizeLevel(value: unknown, fallback: OrderEvaluationLevel = 5): OrderEvaluationLevel {
  const level = Number(value)

  return level === 1 || level === 2 || level === 3 || level === 4 || level === 5 ? level : fallback
}

/**
 *
 * @param value 待归一平均分
 * @description 将平均分限制在 0 到 5 之间
 */
function normalizeAverageLevel(value: unknown) {
  const level = Number(value)

  if (!Number.isFinite(level)) {
    return 0
  }

  return Math.min(5, Math.max(0, level))
}

/**
 *
 * @param value 配送角色
 * @description 归一配送角色，非 Driver 返回 Courier
 */
function normalizeCourierRole(value: unknown): OrderEvaluationCourierRole {
  return value === 'Driver' ? 'Driver' : 'Courier'
}

/**
 *
 * @param detail 订单详情
 * @param routeRole 路由角色
 * @description 根据寄收双方标识判断评价角色
 */
export function getOrderEvaluationRole(detail: OrderDetail, routeRole?: string): OrderRole {
  if (detail.isReceiver === 'Y' && detail.isSender !== 'Y') {
    return 'receive'
  }

  if (detail.isSender === 'Y') {
    return 'sender'
  }

  return routeRole === 'receive' ? 'receive' : 'sender'
}

/**
 *
 * @param detail 订单详情
 * @param routeRole 路由角色
 * @description 创建评价上下文，不满足条件返回 null
 */
export function createOrderEvaluationContext(detail: OrderDetail, routeRole?: string): OrderEvaluationContext | null {
  const role = getOrderEvaluationRole(detail, routeRole)
  const orderClass = Number(detail.orderClassification)
  const waybillNumber = normalizeText(detail.waybillNumber)
  const eligible = role === 'receive' ? orderClass === 2 || orderClass === 6 : orderClass === 1 || orderClass === 2

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

/**
 *
 * @param detail 订单详情
 * @param routeRole 路由角色
 * @description 创建订单评价页跳转路由
 */
export function createOrderEvaluationRoute(detail: OrderDetail, routeRole?: string) {
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

/**
 *
 * @param detail 订单详情
 * @param routeRole 路由角色
 * @param mobile 手机号
 * @description 创建评价兜底 H5 的 WebView URI
 */
export function createOrderEvaluationFallbackWebUri(detail: OrderDetail, routeRole: string, mobile: string) {
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

/**
 *
 * @param context 评价上下文
 * @param result 评价查询结果
 * @param responseCode 响应 code
 * @description 组装评价视图，缺少配送员信息返回 null
 */
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

  const committed = responseCode ? responseCode !== ORDER_EVALUATION_PENDING_CODE : Boolean(evaluatedCourier && !pendingCourier)
  const evaluatedDetail = pendingCourier ? null : evaluatedCourier

  return {
    ...context,
    courierCode,
    courierName,
    courierPhone: normalizeText(courier?.courierPhone),
    courierRole: normalizeCourierRole(pendingCourier ? result.evaluateType : evaluatedDetail?.courierRole),
    courierCompany: pendingCourier?.courierType === 'JD' ? 'JD' : 'DP',
    committed,
    averageLevel: normalizeAverageLevel(result.avgStarLevel),
    level: committed ? normalizeLevel(evaluatedDetail?.starLevel) : 5,
    label: committed ? normalizeText(evaluatedDetail?.evaluateCode) : ''
  }
}

/**
 *
 * @param level 初始星级
 * @description 创建评价草稿
 */
export function createOrderEvaluationDraft(level: OrderEvaluationLevel = 5): OrderEvaluationDraft {
  return {
    level,
    selectedLabels: [],
    suggestion: ''
  }
}

/**
 *
 * @param draft 评价草稿
 * @param level 评价星级
 * @description 更新星级并清空已选标签
 */
export function updateOrderEvaluationLevel(draft: OrderEvaluationDraft, level: OrderEvaluationLevel): OrderEvaluationDraft {
  return {
    ...draft,
    level,
    selectedLabels: []
  }
}

/**
 *
 * @param draft 评价草稿
 * @param recordType 评价记录类型
 * @param label 评价标签
 * @description 切换评价标签的选中状态
 */
export function toggleOrderEvaluationLabel(draft: OrderEvaluationDraft, recordType: OrderEvaluationView['recordType'], label: string): OrderEvaluationDraft {
  const allowedLabels = getOrderEvaluationLabels(recordType, draft.level)

  if (!allowedLabels.includes(label)) {
    return draft
  }

  return {
    ...draft,
    selectedLabels: draft.selectedLabels.includes(label) ? draft.selectedLabels.filter(item => item !== label) : [...draft.selectedLabels, label]
  }
}

/**
 *
 * @param draft 评价草稿
 * @param suggestion 评价建议
 * @description 更新评价建议并按长度上限截断
 */
export function updateOrderEvaluationSuggestion(draft: OrderEvaluationDraft, suggestion: string): OrderEvaluationDraft {
  return {
    ...draft,
    suggestion: suggestion.slice(0, ORDER_EVALUATION_SUGGESTION_MAX_LENGTH)
  }
}

/**
 *
 * @param draft 评价草稿
 * @description 校验评价草稿并返回提示文案
 */
export function validateOrderEvaluationDraft(draft: OrderEvaluationDraft): OrderEvaluationValidation {
  if (!draft.selectedLabels.length) {
    return {
      valid: false,
      message: '请至少选择一个评价标签'
    }
  }

  const suggestion = draft.suggestion.trim()

  if (suggestion && suggestion.length < ORDER_EVALUATION_SUGGESTION_MIN_LENGTH) {
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

/**
 *
 * @param view 评价视图
 * @param draft 评价草稿
 * @description 创建评价提交 payload
 */
export function createOrderEvaluationSubmitRequest(view: OrderEvaluationView, draft: OrderEvaluationDraft): OrderEvaluationSubmitRequest {
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

/**
 *
 * @param view 评价视图
 * @param draft 评价草稿
 * @description 提交成功后回写评价状态
 */
export function applyOrderEvaluationSubmission(view: OrderEvaluationView, draft: OrderEvaluationDraft): OrderEvaluationView {
  return {
    ...view,
    committed: true,
    level: draft.level,
    label: draft.selectedLabels.join('、')
  }
}
