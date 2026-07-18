import type {
  OrderSceneCommentSubmitRequest,
  OrderSceneScoreDraft,
  OrderSceneSurveyContext,
  OrderSceneSurveyItem,
  OrderSceneSurveyLabel,
  OrderSceneSurveyPlanItem,
  OrderSceneSurveyQuestionRaw,
  OrderSceneSurveyScore
} from './order.sceneSurvey.types'
import type { OrderDetail, OrderRole } from './types'

export const ORDER_SCENE_SURVEY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000
export const ORDER_SCENE_SURVEY_CONTENT_MAX_LENGTH = 100
export const ORDER_SCENE_SURVEY_SCORES: OrderSceneSurveyScore[] = [
  1,
  2,
  3,
  4,
  5
]
export const ORDER_SCENE_SURVEY_SCORE_TITLES: Record<
  OrderSceneSurveyScore,
  string
> = {
  1: '非常不满意，我要吐槽',
  2: '不满意，我要吐槽',
  3: '一般般，还需改善',
  4: '比较满意，仍待提升',
  5: '服务太棒了，我想夸一夸'
}

const NPS_PLAN: OrderSceneSurveyPlanItem = {
  code: 'N0101',
  kind: 'NPS'
}

function createScenePlan(code: string): OrderSceneSurveyPlanItem {
  return {
    code,
    kind: code.startsWith('T') ? 'LABEL' : 'SCORE'
  }
}

function normalizeTimestamp(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return null
  }

  return value < 1_000_000_000_000 ? value * 1000 : value
}

export function parseOrderSceneSurveyTime(value: unknown) {
  if (typeof value === 'number') {
    return normalizeTimestamp(value)
  }

  if (typeof value !== 'string') {
    return null
  }

  const text = value.trim()

  if (!text) {
    return null
  }

  if (/^\d+(?:\.\d+)?$/.test(text)) {
    return normalizeTimestamp(Number(text))
  }

  if (text.includes('T')) {
    const parsed = Date.parse(text)

    return Number.isFinite(parsed) ? parsed : null
  }

  const parts = text.match(/\d+/g)

  if (parts && parts.length >= 3) {
    const year = Number(parts[0])
    const month = Number(parts[1])
    const day = Number(parts[2])
    const hour = Number(parts[3] ?? 0)
    const minute = Number(parts[4] ?? 0)
    const second = Number(parts[5] ?? 0)
    const date = new Date(year, month - 1, day, hour, minute, second)

    if (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day &&
      date.getHours() === hour &&
      date.getMinutes() === minute &&
      date.getSeconds() === second
    ) {
      return date.getTime()
    }
  }

  const parsed = Date.parse(text)

  return Number.isFinite(parsed) ? parsed : null
}

function isWithinSurveyWindow(time: unknown, now: number) {
  const timestamp = parseOrderSceneSurveyTime(time)

  if (timestamp === null) {
    return false
  }

  const elapsed = now - timestamp

  return elapsed >= 0 && elapsed < ORDER_SCENE_SURVEY_WINDOW_MS
}

function isSameLocalDay(left: number, right: number) {
  const leftDate = new Date(left)
  const rightDate = new Date(right)

  return (
    leftDate.getFullYear() === rightDate.getFullYear() &&
    leftDate.getMonth() === rightDate.getMonth() &&
    leftDate.getDate() === rightDate.getDate()
  )
}

function getScenePlan(options: {
  detail: OrderDetail
  role: OrderRole
  source: string
  now: number
}) {
  const { detail, now, role } = options
  const orderClass = Number(detail.orderClassification)
  const notificationSource = /^(?:PDC|ECS)/.test(
    options.source.trim().toUpperCase()
  )
  const signedAt = detail.signTime ?? detail.signVoucherTime

  if (notificationSource) {
    return orderClass === 2 && isWithinSurveyWindow(signedAt, now)
      ? [NPS_PLAN]
      : []
  }

  if (orderClass === 1) {
    const orderTime = parseOrderSceneSurveyTime(detail.orderTime)

    if (
      orderTime === null ||
      !isWithinSurveyWindow(orderTime, now)
    ) {
      return []
    }

    if (role === 'receive') {
      return [createScenePlan('S0601')]
    }

    return [
      createScenePlan(isSameLocalDay(orderTime, now) ? 'S0206' : 'S0601'),
      createScenePlan('T0101'),
      createScenePlan('T0401')
    ]
  }

  if (orderClass !== 2 || !isWithinSurveyWindow(signedAt, now)) {
    return []
  }

  return role === 'receive'
    ? [
        NPS_PLAN,
        createScenePlan('T0201'),
        createScenePlan('S0907_1'),
        createScenePlan('T0501')
      ]
    : [NPS_PLAN, createScenePlan('S0908')]
}

export function createOrderSceneSurveyContext(options: {
  detail: OrderDetail | null
  role: OrderRole
  source: string
  publicTrackMode: boolean
  mobile: string
  childChannel: string
  now?: number
}): OrderSceneSurveyContext | null {
  const detail = options.detail
  const waybillNumber = detail?.waybillNumber?.trim() ?? ''
  const childChannel = options.childChannel.trim()

  if (
    !detail ||
    options.publicTrackMode ||
    !waybillNumber ||
    !childChannel
  ) {
    return null
  }

  const now = options.now ?? Date.now()
  const mobile = options.mobile.trim()
  const plan = getScenePlan({
    detail,
    role: options.role,
    source: options.source,
    now
  }).filter(item => item.kind === 'NPS' || mobile)

  if (!plan.length) {
    return null
  }

  const source = options.source.trim()
  const stateTime = String(detail.signTime ?? detail.orderTime ?? '')
  const planKey = plan.map(item => `${item.kind}:${item.code}`).join(',')

  return {
    key: [
      waybillNumber,
      options.role,
      source,
      detail.orderClassification,
      stateTime,
      mobile,
      childChannel,
      planKey
    ]
      .join('|'),
    waybillNumber,
    mobile,
    childChannel,
    role: options.role,
    source,
    plan
  }
}

function asText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeLabel(value: unknown): OrderSceneSurveyLabel | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const record = value as Record<string, unknown>
  const id = asText(record.id)
  const name = asText(record.labelName)
  const min = Number(record.starMin)
  const max = Number(record.starMax)

  if (
    !id ||
    !name ||
    !Number.isInteger(min) ||
    !Number.isInteger(max) ||
    min < 1 ||
    max > 5 ||
    min > max
  ) {
    return null
  }

  return { id, name, min, max }
}

export function normalizeOrderSceneSurveyQuestion(
  plan: OrderSceneSurveyPlanItem,
  raw: OrderSceneSurveyQuestionRaw | null | undefined
): OrderSceneSurveyItem | null {
  if (plan.kind === 'NPS' || !raw) {
    return null
  }

  const id = asText(raw.questionId)
  const title = asText(raw.title)
  const labels = Array.isArray(raw.labelList)
    ? raw.labelList
        .map(normalizeLabel)
        .filter((item): item is OrderSceneSurveyLabel => Boolean(item))
    : []

  if (!id || !title || !labels.length) {
    return null
  }

  return {
    key: `${plan.kind}:${plan.code}`,
    id,
    code: plan.code,
    title,
    kind: plan.kind,
    labels
  }
}

export function getOrderSceneScoreLabels(
  item: OrderSceneSurveyItem,
  score: OrderSceneSurveyScore | null
) {
  if (item.kind !== 'SCORE' || score === null) {
    return []
  }

  return item.labels.filter(label => score >= label.min && score <= label.max)
}

export function validateOrderSceneScoreDraft(
  item: OrderSceneSurveyItem,
  draft: OrderSceneScoreDraft
) {
  if (item.kind !== 'SCORE' || draft.score === null) {
    return '请先选择服务评分'
  }

  const eligibleIds = new Set(
    getOrderSceneScoreLabels(item, draft.score).map(label => label.id)
  )
  const selected = draft.selectedLabelIds.some(id => eligibleIds.has(id))

  if (!selected && !draft.content.trim()) {
    return '请选择评价标签或填写补充说明'
  }

  return ''
}

function createSubmitBase(context: OrderSceneSurveyContext, sceneCode: string) {
  return {
    content: '',
    channel: 'OWS' as const,
    mobile: context.mobile,
    sceneCode,
    childChannel: context.childChannel,
    waybillNumber: context.waybillNumber,
    question: [],
    additionalData: [
      {
        field: 'waybillNumber' as const,
        data: context.waybillNumber
      }
    ]
  }
}

export function createOrderSceneScoreSubmitRequest(
  context: OrderSceneSurveyContext,
  item: OrderSceneSurveyItem,
  draft: OrderSceneScoreDraft
): OrderSceneCommentSubmitRequest | null {
  if (validateOrderSceneScoreDraft(item, draft) || draft.score === null) {
    return null
  }

  const eligibleLabels = getOrderSceneScoreLabels(item, draft.score)
  const eligibleIds = new Set(eligibleLabels.map(label => label.id))
  const labelIds = draft.selectedLabelIds.filter(id => eligibleIds.has(id))
  const request = createSubmitBase(context, item.code)

  return {
    ...request,
    content: draft.content
      .trim()
      .slice(0, ORDER_SCENE_SURVEY_CONTENT_MAX_LENGTH),
    question: eligibleLabels.length
      ? [
          {
            star: String(draft.score),
            questionId: item.id,
            labelIds
          }
        ]
      : []
  }
}

export function createOrderSceneLabelSubmitRequest(
  context: OrderSceneSurveyContext,
  item: OrderSceneSurveyItem,
  labelId: string
): OrderSceneCommentSubmitRequest | null {
  if (item.kind !== 'LABEL') {
    return null
  }

  const label = item.labels.find(candidate => candidate.id === labelId)

  if (!label) {
    return null
  }

  return {
    ...createSubmitBase(context, item.code),
    question: [
      {
        star: String(label.max),
        questionId: item.id,
        labelIds: [label.id]
      }
    ]
  }
}
