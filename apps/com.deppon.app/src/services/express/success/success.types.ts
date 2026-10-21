/** 下单成功后按订单号查询调度信息；不用于下单前指定快递员。 */
export interface ExpressSuccessCourierRequest {
  orderNumber: string
}

export interface ExpressSuccessCourierResponse {
  courierCode?: string
  courierName?: string
  courierPhone?: string
}

export interface ExpressSuccessCourier {
  code: string
  name: string
  phone: string
}

export type ExpressSuccessCourierResult = { status: 'assigned'; courier: ExpressSuccessCourier } | { status: 'pending' } | { status: 'unavailable' }
