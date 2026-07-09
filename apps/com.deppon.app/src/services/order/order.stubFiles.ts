import { orderApi } from './order.api'
import {
  createRouteUrl,
  getDetailWaybillNumber,
  getOrderNumberField,
  getOrderTextField
} from './order.detailRules'
import { formatAmount } from './order.display'
import { asNumber } from './order.mapper'
import { createAppWebUrl } from '../../shared/webview/appWeb'

import type {
  OrderContractStatus,
  OrderDetail,
  OrderStubDocumentView,
  OrderStubPackageFeeGroupView,
  OrderStubPackageFeeItemView,
  OrderStubPackageFeeView
} from './types'
import type { DepponResponse } from '../../request/deppon'

const ORDER_CONTRACT_STATUS_LABELS: Record<string, string> = {
  SENT: '合同签署中',
  REJECT: '合同已拒签',
  COMPLETE: '合同已完成',
  REVOKE_CANCEL: '合同已撤回',
  OVERDUE: '合同逾期未签',
  IN_SEND_APPROVAL: '合同发送前审批中',
  SEND_APPROVAL_NOT_PASSED: '合同审批被驳回',
  INVALID: '合同已作废'
}

function getOrderContractFileCode(order: OrderDetail) {
  return getOrderTextField(order, ['returnFileId', 'fileCode'])
}

function getOrderContractStatusText(status: OrderContractStatus) {
  return ORDER_CONTRACT_STATUS_LABELS[status] || '合同签署中'
}

function createContractPreviewUri(fileCode: string, waybillNumber: string) {
  return createRouteUrl(
    '/gwapi/onlineService/eco/online/secure/contractPreview',
    {
      fileCode,
      waybillNumber
    }
  )
}

function createContractPreviewRoute(fileCode: string, waybillNumber: string) {
  return createAppWebUrl({
    source: 'ORDER_STUB_CONTRACT_PREVIEW',
    title: '电子合同',
    auth: true,
    uri: createContractPreviewUri(fileCode, waybillNumber)
  })
}

function createOrderStubDocumentView(
  order: OrderDetail,
  status: OrderContractStatus
): OrderStubDocumentView {
  const fileCode = getOrderContractFileCode(order)
  const waybillNumber = getDetailWaybillNumber(order)
  const statusText = getOrderContractStatusText(status)
  const canPreview = status === 'COMPLETE' && !!fileCode && !!waybillNumber

  return {
    available: !!fileCode && !!waybillNumber,
    title: '电子合同.PDF',
    statusText,
    summary: canPreview
      ? '电子合同已签署，文件存储时间为 3 个月，请及时查看。'
      : '到达派送环节收件人签署单据后，可查看带签名的签收回单。',
    actionText: canPreview ? '查看合同' : '暂不可查看',
    canPreview,
    route: canPreview ? createContractPreviewRoute(fileCode, waybillNumber) : '',
    fileCode,
    waybillNumber
  }
}

export async function queryOrderStubDocument(
  order: OrderDetail
): Promise<DepponResponse<OrderStubDocumentView>> {
  const contractId = getOrderContractFileCode(order)
  const waybillNumber = getDetailWaybillNumber(order)

  if (!contractId || !waybillNumber) {
    return Promise.resolve({
      status: true,
      message: '当前运单暂无电子合同票证',
      result: null
    })
  }

  const response = await orderApi.queryContractDetail({
    contractId,
    waybillNumber
  })
  const status = response.result?.status || 'SENT'

  return {
    ...response,
    status: true,
    message: response.message || '',
    result: createOrderStubDocumentView(order, status)
  }
}

function createPackageFeeGroup(
  title: string,
  nameTitle: string,
  countTitle: string,
  amountTitle: string
): OrderStubPackageFeeGroupView {
  return {
    title,
    nameTitle,
    countTitle,
    amountTitle,
    items: []
  }
}

function createPackageFeeItem(
  name: string,
  count: string,
  amount: unknown
): OrderStubPackageFeeItemView | null {
  const value = formatAmount(amount)

  if (!value) {
    return null
  }

  return {
    name,
    count: count || '--',
    amount: value
  }
}

function addPackageFeeItem(
  group: OrderStubPackageFeeGroupView,
  item: OrderStubPackageFeeItemView | null
) {
  if (item) {
    group.items.push(item)
  }
}

function getOrderPackageCharge(order: OrderDetail) {
  const directCharge = getOrderNumberField(order, ['pickCharge'])

  if (directCharge) {
    return directCharge
  }

  const serviceChargeList = Array.isArray(order.serviceChargeList)
    ? order.serviceChargeList
    : []
  const pickCharge = serviceChargeList.find((item) => {
    return (
      !!item &&
      typeof item === 'object' &&
      (item as Record<string, unknown>).feeAttribute === 'pickCharge'
    )
  }) as Record<string, unknown> | undefined

  return pickCharge ? asNumber(pickCharge.feeMoney) : 0
}

export async function queryOrderStubPackageFee(
  order: OrderDetail
): Promise<DepponResponse<OrderStubPackageFeeView>> {
  const waybillNumber = getDetailWaybillNumber(order)
  const packageCharge = getOrderPackageCharge(order)

  if (!waybillNumber || packageCharge <= 0) {
    return Promise.resolve({
      status: true,
      message: '当前运单暂无包装费用明细',
      result: {
        available: false,
        message: '当前运单暂无包装费用明细',
        totalAmount: '',
        groups: []
      }
    })
  }

  const response = await orderApi.queryPackagingFee({
    waybillNumber
  })

  if (!response.status || !response.result) {
    return {
      ...response,
      result: {
        available: false,
        message: response.message || '暂未查询到包装费用明细',
        totalAmount: formatAmount(packageCharge),
        groups: []
      }
    }
  }

  const detail = response.result
  const woodenGroup = createPackageFeeGroup(
    '木包装',
    '包装类型',
    '规格',
    '金额'
  )
  const cartonGroup = createPackageFeeGroup(
    '非木包装',
    '包装类型',
    '件数',
    '金额'
  )
  let totalPrice = 0

  if (detail.woodenFrameFee) {
    totalPrice += detail.woodenFrameFee
    addPackageFeeItem(
      woodenGroup,
      createPackageFeeItem(
        '木架',
        detail.standVolume ? `${detail.standVolume}m³` : '--',
        detail.woodenFrameFee
      )
    )
  }

  if (detail.woodenCaseFee) {
    totalPrice += detail.woodenCaseFee
    addPackageFeeItem(
      woodenGroup,
      createPackageFeeItem(
        '木箱',
        detail.boxVolume ? `${detail.boxVolume}m³` : '--',
        detail.woodenCaseFee
      )
    )
  }

  if (detail.swoodenPalletFee) {
    totalPrice += detail.swoodenPalletFee
    addPackageFeeItem(
      woodenGroup,
      createPackageFeeItem(
        '标准木托',
        detail.salverNum ? String(detail.salverNum) : '--',
        detail.swoodenPalletFee
      )
    )
  }

  if (detail.nwoodenPalletFee) {
    totalPrice += detail.nwoodenPalletFee
    addPackageFeeItem(
      woodenGroup,
      createPackageFeeItem(
        '非标准木托',
        detail.nonSalverNum ? String(detail.nonSalverNum) : '--',
        detail.nwoodenPalletFee
      )
    )
  }

  ;(detail.waybillPackageList ?? []).forEach((item) => {
    if (!item.thirdClassName || !item.calcAmount) {
      return
    }

    totalPrice += item.calcAmount
    addPackageFeeItem(
      cartonGroup,
      createPackageFeeItem(
        item.thirdClassName,
        item.packageTotal ? String(item.packageTotal) : '--',
        item.calcAmount
      )
    )
  })

  if (totalPrice > packageCharge) {
    return {
      ...response,
      status: true,
      result: {
        available: false,
        message: '包装费用明细暂未匹配当前运单金额',
        totalAmount: formatAmount(packageCharge),
        groups: []
      }
    }
  }

  if (totalPrice < packageCharge) {
    addPackageFeeItem(
      cartonGroup,
      createPackageFeeItem(
        '其他',
        '1',
        Math.floor((packageCharge - totalPrice) * 100) / 100
      )
    )
  }

  const groups = [woodenGroup, cartonGroup].filter(
    (group) => group.items.length > 0
  )

  return {
    ...response,
    status: true,
    result: {
      available: groups.length > 0,
      message: groups.length ? '' : '暂未查询到包装费用明细',
      totalAmount: formatAmount(packageCharge),
      groups
    }
  }
}
