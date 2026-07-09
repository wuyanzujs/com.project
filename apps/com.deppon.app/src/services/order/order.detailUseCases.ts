import { orderApi } from './order.api'
import {
  createOrderUrgeContext,
  createUrgeProgressWebUri
} from './order.detailActions'
import {
  createOrderDetailWebUri,
  DEFAULT_SERVICE_PHONE,
  getDetailWaybillNumber
} from './order.detailRules'
import { createServiceFailure as createFailure } from '../serviceResponse'

import type {
  OrderDepartmentPhoneActionView,
  OrderDetail,
  OrderDetailActionOptions,
  OrderDetailActionView,
  OrderDetailUrgeActionView,
  OrderDetailUrgePanelView,
  OrderInvalidWaybillResult,
  OrderUrgeButtonRaw
} from './types'
import type { DepponResponse } from '../../request/deppon'

const WAYBILL_MODIFY_WEB_PATH = '/depponmobile/mow/order/modifyNew/index'
const INVALID_TO_MODIFY_MESSAGE =
  '货物已经出发，不可作废，可在运单修改中操作拦截'

function createUrgePanel(
  content: string,
  menus: OrderUrgeButtonRaw[] | null | undefined
): OrderDetailUrgePanelView {
  return {
    content,
    menus: menus?.length
      ? menus
      : [
          {
            buttonCode: 'CONFIRM',
            buttonName: '确定'
          }
        ]
  }
}

export async function queryOrderUrgeAction(
  order: OrderDetail,
  options: OrderDetailActionOptions = {}
): Promise<OrderDetailActionView | null> {
  const urgeContext = createOrderUrgeContext(order, options)

  if (!urgeContext) {
    return null
  }

  const response = await orderApi.queryUrgeButtons(
    {
      waybillNo: urgeContext.voucherNumber,
      urgeType: urgeContext.urgeType
    },
    false
  )
  const button = response.result?.buttonList?.[0]

  if (!response.status || !button) {
    return null
  }

  const isProgress = button.buttonCode === 'VIEW_PROGRESS'

  return {
    kind: 'urge',
    title: button.buttonName || (isProgress ? '催单进度' : '我要催单'),
    summary: isProgress
      ? '查看当前催单处理进度'
      : '催促当前订单尽快处理',
    target: 'urge',
    tone: 'warning',
    badgeText: isProgress ? '进度' : '催单',
    webSource: 'ORDER_DETAIL_URGE_PROGRESS',
    webUri: createUrgeProgressWebUri(urgeContext),
    urge: {
      ...urgeContext,
      buttonCode: button.buttonCode
    },
    loginRequired: true
  }
}

export async function queryOrderUrgePanel(
  urge: OrderDetailUrgeActionView
): Promise<DepponResponse<OrderDetailUrgePanelView>> {
  const response = await orderApi.queryUrgeMenus({
    waybillNo: urge.voucherNumber,
    urgeType: urge.urgeType
  })

  if (!response.status || !response.result?.speech) {
    return createFailure(response.message || '暂未获取到催单提示')
  }

  return {
    ...response,
    result: createUrgePanel(
      response.result.speech,
      response.result.buttonList
    )
  }
}

export function resolveOrderUrgeMenuAction(
  menu: OrderUrgeButtonRaw,
  action: OrderDetailActionView
) {
  if (menu.buttonCode === 'CONFIRM') {
    return {
      kind: 'close' as const
    }
  }

  if (menu.buttonCode === 'FOLLOW_UP') {
    return {
      kind: 'submit' as const
    }
  }

  if (menu.buttonCode === 'CONTACT_EMPLOYEE') {
    return {
      kind: 'dial' as const,
      phoneNumber: action.urge?.contactPhone || DEFAULT_SERVICE_PHONE
    }
  }

  if (menu.buttonCode === 'VIEW_PROGRESS') {
    const webUri =
      action.webUri || (action.urge ? createUrgeProgressWebUri(action.urge) : '')

    if (!webUri) {
      return {
        kind: 'unsupported' as const,
        message: '暂未获取到催单进度地址'
      }
    }

    return {
      kind: 'progress' as const,
      webSource: action.webSource || 'ORDER_DETAIL_URGE_PROGRESS',
      webUri,
      title: menu.buttonName || action.title || '催单进度'
    }
  }

  return {
    kind: 'unsupported' as const,
    message: menu.buttonName || '该催单操作后续接入'
  }
}

export async function submitOrderUrge(
  urge: OrderDetailUrgeActionView
): Promise<DepponResponse<string>> {
  const response = await orderApi.submitUrge({
    caseNo: urge.voucherNumber,
    reportScene: urge.urgeType
  })
  const message =
    response.result?.errorMsg ||
    response.message ||
    (response.status ? '催单已提交' : '催单失败，请稍后再试')

  return {
    ...response,
    message,
    result: message
  }
}

export async function notifyOrderDeliver(
  order: OrderDetail
): Promise<DepponResponse<boolean>> {
  const waybillNo = getDetailWaybillNumber(order)

  if (!waybillNo) {
    return Promise.resolve(createFailure<boolean>('缺少运单号，暂无法通知派送'))
  }

  return orderApi.notifyDeliver({
    waybillNo
  })
}

export async function invalidOrderWaybill(
  order: OrderDetail
): Promise<DepponResponse<OrderInvalidWaybillResult>> {
  const waybillNumber = getDetailWaybillNumber(order)

  if (!waybillNumber) {
    return Promise.resolve(
      createFailure<OrderInvalidWaybillResult>('缺少运单号，暂无法拦截作废')
    )
  }

  const response = await orderApi.invalidWaybill({
    waybillNumber
  })
  const message =
    response.message ||
    (response.status ? '拦截作废成功' : '拦截作废失败，请稍后再试')
  const shouldModifyIntercept = message === INVALID_TO_MODIFY_MESSAGE

  return {
    ...response,
    message,
    result: {
      message,
      shouldModifyIntercept,
      modifyWebUri: createOrderDetailWebUri(WAYBILL_MODIFY_WEB_PATH, {
        waybillNumber
      })
    }
  }
}

export async function resolveDepartmentPhone(
  department: OrderDepartmentPhoneActionView
): Promise<DepponResponse<string>> {
  if (department.phoneNumber) {
    return Promise.resolve({
      status: true,
      message: '',
      result: department.phoneNumber
    })
  }

  if (!department.stationCode) {
    return Promise.resolve({
      status: true,
      message: '',
      result: DEFAULT_SERVICE_PHONE
    })
  }

  const response = await orderApi.queryDepartmentPhone(department.stationCode)

  if (response.status && response.result) {
    return response
  }

  return {
    ...response,
    status: true,
    message: response.message || '暂未查询到营业部电话，已转服务热线',
    result: DEFAULT_SERVICE_PHONE
  }
}
