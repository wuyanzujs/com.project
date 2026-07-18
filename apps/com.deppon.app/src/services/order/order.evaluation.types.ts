import type { OrderRole } from './types'
import type { DepponResponse } from '../../request/deppon'

export type OrderEvaluationLevel = 1 | 2 | 3 | 4 | 5
export type OrderEvaluationRecordType = 'DELIVERY' | 'COLLECTION'
export type OrderEvaluationCourierRole = 'Courier' | 'Driver'

export interface OrderEvaluationQueryRequest {
  waybillNo: string
  cateGory: 0 | 1
  sign: 'Y' | 'N'
  courierNo?: string
}

export interface OrderEvaluationPendingCourierRaw {
  courierName: string | null
  courierNo: string | null
  courierPhone: string | null
  isCourier: 'Y' | 'N' | null
  licensePlate: string | null
  courierType?: 'DP' | 'JD'
}

export interface OrderEvaluationDetailRaw {
  courierNo: string
  courierName: string
  courierPhone: string | null
  courierRole: OrderEvaluationCourierRole
  starLevel: string
  evaluateCode: string | null
  degree: number
  evaluateNpsCode: string | null
  licensePlate: string | null
}

export interface OrderEvaluationQueryResultRaw {
  avgStarLevel: string | null
  evaluateType: OrderEvaluationCourierRole
  evaluateDetail: OrderEvaluationDetailRaw | null
  evaluateCourierMessage: OrderEvaluationPendingCourierRaw | null
}

export interface OrderEvaluationQueryResponse
  extends DepponResponse<OrderEvaluationQueryResultRaw> {
  code?: string
}

export interface OrderEvaluationContext {
  orderNumber: string
  waybillNumber: string
  role: OrderRole
  recordType: OrderEvaluationRecordType
  query: OrderEvaluationQueryRequest
}

export interface OrderEvaluationView extends OrderEvaluationContext {
  courierCode: string
  courierName: string
  courierPhone: string
  courierRole: OrderEvaluationCourierRole
  courierCompany: 'DP' | 'JD'
  committed: boolean
  averageLevel: number
  level: OrderEvaluationLevel
  label: string
}

export interface OrderEvaluationDraft {
  level: OrderEvaluationLevel
  selectedLabels: string[]
  suggestion: string
}

export interface OrderEvaluationSubmitRequest {
  waybillNo: string
  recordType: OrderEvaluationRecordType
  courierCode: string
  courierName: string
  starLevel: OrderEvaluationLevel
  suggestion: string
  evaluationLabels: string[]
}

export interface OrderEvaluationValidation {
  valid: boolean
  message: string
}
