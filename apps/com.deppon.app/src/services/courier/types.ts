export interface CourierLabelRaw {
  evaluateValue?: string | null
  evaluateAmount?: number | null
  labelName?: string | null
  labelCount?: number | null
}

export interface CourierRaw {
  avgStart?: number | null
  courierMobile?: string | null
  courierName?: string | null
  courierNo?: string | null
  deptName?: string | null
  deptCode?: string | null
  evaluateLabels?: CourierLabelRaw[] | null
  labels?: CourierLabelRaw[] | null
  rewardTimes?: number | null
  signedCount?: number | null
}

export interface CourierListRaw {
  couriers?: CourierRaw[] | null
}

export interface CourierLabelView {
  name: string
  count: number
}

export interface CourierView {
  id: string
  name: string
  mobile: string
  departmentName: string
  departmentCode: string
  rating: number
  ratingText: string
  signedCount: number
  rewardTimes: number
  labels: CourierLabelView[]
}

export type CourierBindingState = 'bound' | 'unbound' | 'unknown'

export interface CourierDetailView {
  courier: CourierView
  bindingState: CourierBindingState
}

export interface CourierCodeRequest {
  courierNo: string
}
