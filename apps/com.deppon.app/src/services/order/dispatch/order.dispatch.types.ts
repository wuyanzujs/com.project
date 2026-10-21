export interface OrderPickupTimeRequest {
  sysCode: string
  provinceName: string
  cityName: string
  countyName: string
  townName?: string
  address: string
  weight: number
  volume: number
  goodsNumber: number
  source: 4
}

export type OrderPickupTimeSlotType = 'NORMAL' | 'NIGHT' | 'DISABLE'

export interface OrderPickupTimeSlotRaw {
  time: string
  text: string
  type: OrderPickupTimeSlotType
}

export interface OrderPickupTimeDateRaw {
  date: string
  dateList: OrderPickupTimeSlotRaw[]
}

export interface OrderPickupTimeResponse {
  deptCode?: string
  deptName?: string
  startTime?: string
  endTime?: string
  serviceTime?: string
  opening: boolean
  openingMessage?: string
  openingList?: OrderPickupTimeDateRaw[]
}

export interface OrderDispatchRequest {
  orderNumber: string
  beginAcceptTime: string
  queryFlag?: boolean
}

export interface OrderPickupSlotView {
  time: string
  text: string
  type: Exclude<OrderPickupTimeSlotType, 'DISABLE'>
}

export interface OrderPickupDateView {
  date: string
  label: string
  slots: OrderPickupSlotView[]
}

export interface OrderPickupScheduleView {
  orderNumber: string
  currentTime: string
  message: string
  dates: OrderPickupDateView[]
}
