import { expressSuccessApi } from './success.api'

import type { ExpressSuccessCourierResult } from './success.types'

function readText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

/** 调度查询失败独立降级，不改变已成功提交的订单。 */
export async function queryExpressSuccessCourier(orderNumber: string): Promise<ExpressSuccessCourierResult> {
  const normalizedOrderNumber = orderNumber.trim()

  if (!normalizedOrderNumber) {
    return { status: 'unavailable' }
  }

  try {
    const response = await expressSuccessApi.queryCourier({ orderNumber: normalizedOrderNumber })

    if (!response.status) {
      return { status: 'unavailable' }
    }

    const name = readText(response.result?.courierName)
    const phone = readText(response.result?.courierPhone)

    // 成功页仅在姓名和电话均返回时显示已分配快递员。
    if (!name || !phone) {
      return { status: 'pending' }
    }

    return { status: 'assigned', courier: { code: readText(response.result?.courierCode), name, phone } }
  } catch {
    return { status: 'unavailable' }
  }
}
