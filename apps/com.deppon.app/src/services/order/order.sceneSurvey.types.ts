import type { OrderRole } from './types'

export type OrderSceneSurveyKind = 'NPS' | 'SCORE' | 'LABEL'
export type OrderSceneSurveyScore = 1 | 2 | 3 | 4 | 5

export interface OrderSceneSurveyPlanItem {
  code: string
  kind: OrderSceneSurveyKind
}

export interface OrderSceneSurveyContext {
  key: string
  waybillNumber: string
  mobile: string
  childChannel: string
  role: OrderRole
  source: string
  plan: OrderSceneSurveyPlanItem[]
}

export interface OrderSceneSurveyLabel {
  id: string
  name: string
  min: number
  max: number
}

export interface OrderSceneSurveyItem {
  key: string
  id: string
  code: string
  title: string
  kind: OrderSceneSurveyKind
  labels: OrderSceneSurveyLabel[]
}

export interface OrderSceneSurveyLabelRaw {
  id?: unknown
  labelName?: unknown
  starMin?: unknown
  starMax?: unknown
}

export interface OrderSceneSurveyQuestionRaw {
  questionId?: unknown
  title?: unknown
  labelList?: unknown
}

export interface OrderSceneSurveyDefinitionRaw {
  sceneCode?: unknown
  questionList?: unknown
}

export interface OrderSceneCommentQueryRequest {
  mobile: string
  sceneCode: string
  childChannel: string
  waybillNumber: string
}

export interface OrderSceneCommentQuestionRequest {
  star: string
  questionId: string
  labelIds: string[]
}

export interface OrderSceneCommentSubmitRequest {
  content: string
  channel: 'OWS'
  mobile: string
  sceneCode: string
  childChannel: string
  waybillNumber: string
  question: OrderSceneCommentQuestionRequest[]
  additionalData: Array<{
    field: 'waybillNumber'
    data: string
  }>
}

export interface OrderSceneScoreDraft {
  score: OrderSceneSurveyScore | null
  selectedLabelIds: string[]
  content: string
}

export interface OrderSceneLabelSubmitInput {
  kind: 'LABEL'
  labelId: string
}

export interface OrderSceneScoreSubmitInput extends OrderSceneScoreDraft {
  kind: 'SCORE'
}

export interface OrderNpsSubmitInput {
  kind: 'NPS'
  draft: OrderNpsDraft
}

export type OrderSceneSurveySubmitInput =
  | OrderSceneLabelSubmitInput
  | OrderSceneScoreSubmitInput
  | OrderNpsSubmitInput

export interface OrderNpsCatalogOption {
  text: string
  title: string
  options: string[]
  maxSelections: number
}

export interface OrderNpsCatalog {
  title: string
  options: OrderNpsCatalogOption[]
}

export interface OrderNpsDraft {
  score: number | null
  category: string
  reasons: string[]
  content: string
}

export interface OrderNpsLabelContent {
  type: 'CASCADE'
  option: Array<{
    level: 1 | 2
    name: string
    title: string
  }>
}

export interface OrderNpsQueryRequest {
  sysCode: 'OWS'
  sceneCode: 'N0101'
  commentCode: string
}

export interface OrderNpsSubmitRequest {
  sysCode: 'OWS'
  sceneCode: 'N0101'
  childSysCode: string
  commentCode: string
  commentType: 'WaybillNumber'
  content: string
  labelName: string
  labelContent?: OrderNpsLabelContent
  personType: 'sender' | 'consignee'
}

export interface OrderSceneSurveyQueryResult {
  items: OrderSceneSurveyItem[]
  failedCount: number
}
