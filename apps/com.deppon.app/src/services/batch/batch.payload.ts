import { APP_RUNTIME_CONFIG } from '@/shared/config/runtime'

import { getExpressContactRegionAddress, getNowText, toFiniteNumber, trimText } from '../express/core/express.draft'

import type { BatchConsigneeDraft, BatchDraft } from './types'
import type { CreateExpressOrderRequest, ExpressReceiveOrder, ExpressScanContext } from '../express/core/types'

/**
 *
 * @param scanContext 扫码上下文，可为空
 * @description 从扫码上下文解析下单用的扫码字段
 */
function getScanOrderFields(scanContext?: ExpressScanContext) {
  const fields = {
    acceptDept: '',
    shipperNumber: '',
    pickupManId: ''
  }

  if (!scanContext) {
    return fields
  }

  const value = trimText(scanContext.value)

  if (!value) {
    return fields
  }

  switch (scanContext.role) {
    case 'pickupManId':
    case 'driverId':
      fields.pickupManId = value
      break
    case 'shipperNumber':
      fields.shipperNumber = value
      break
    case 'acceptDept':
    case 'businessCode':
      fields.acceptDept = value
      break
  }

  return fields
}

/**
 *
 * @param item 收货人草稿
 * @param draft 批量草稿
 * @param pickupTime 取件时间
 * @description 组装单个收货人的下单明细
 */
function buildReceiveOrder(item: BatchConsigneeDraft, draft: BatchDraft, pickupTime: string): ExpressReceiveOrder {
  if (!item.contact) {
    throw new Error('缺少收货人信息')
  }

  return {
    receiverCustName: trimText(item.contact.name),
    receiverCustMobile: trimText(item.contact.mobile),
    receiverCustAddress: trimText(item.contact.address),
    receiverCustAddressDetail: getExpressContactRegionAddress(item.contact),
    receiverCustProvince: trimText(item.contact.province),
    receiverCustCity: trimText(item.contact.city),
    receiverCustArea: trimText(item.contact.county),
    goodsName: trimText(item.goods.name),
    goodsNumber: toFiniteNumber(item.goods.count, 1),
    totalVolume: toFiniteNumber(item.goods.volume),
    totalWeight: toFiniteNumber(item.goods.weight, 1),
    transportMode: item.productCode,
    deliveryMode: item.deliveryMode,
    paymentType: draft.paymentType,
    returnBillType: item.service.returnBillType,
    reciveLoanType: item.service.reciveLoanType,
    reciveLoanAccount: trimText(item.service.reciveLoanAccount),
    couponNumber: trimText(item.couponNumber),
    encryptInfo: item.service.privacyProtection,
    remark: trimText(item.remark),
    isRecieveGoods: item.receiveGoods ? 1 : 0,
    reviceMoneyAmount: toFiniteNumber(item.service.reviceMoneyAmount),
    insuredAmount: toFiniteNumber(item.service.insuredAmount),
    beginAcceptTime: pickupTime,
    endAcceptTime: draft.pickup.endTime,
    accountName: trimText(item.service.accountName),
    receivingToPoint: '',
    receivingToPointName: '',
    waybillNumber: trimText(item.waybillNumber),
    appointmentDeliveryTime: '',
    returnRequirement: trimText(item.service.returnRequirement),
    customReturnRequirement: '',
    pickPeriodTime: draft.pickup.pickPeriodTime
  }
}

/**
 *
 * @param draft 批量草稿
 * @description 组装批量创建订单的请求体
 */
export function buildBatchCreateOrderRequest(draft: BatchDraft): CreateExpressOrderRequest {
  if (!draft.sender) {
    throw new Error('缺少发货人信息')
  }

  if (!draft.consignees.length) {
    throw new Error('缺少收货人信息')
  }

  const pickupTime = trimText(draft.pickup.time) || getNowText()
  const scanOrderFields = getScanOrderFields(draft.scanContext)
  const contactIdList = [draft.sender.id, ...draft.consignees.map(item => item.contact?.id)].filter((id): id is string => !!id)

  return {
    batch: true,
    contactIdList: [...new Set(contactIdList)],
    isContact: draft.needContact,
    clientChannel: APP_RUNTIME_CONFIG.appClientChannel,
    contactName: trimText(draft.sender.name),
    contactMobile: trimText(draft.sender.mobile),
    contactProvince: trimText(draft.sender.province),
    contactCity: trimText(draft.sender.city),
    contactArea: trimText(draft.sender.county),
    contactAddress: trimText(draft.sender.address),
    contactAddressDetail: getExpressContactRegionAddress(draft.sender),
    startStation: draft.pickup.stationCode,
    startStationName: draft.pickup.stationName,
    acceptDept: scanOrderFields.acceptDept,
    shipperNumber: scanOrderFields.shipperNumber,
    pickupManId: scanOrderFields.pickupManId,
    dispatchFlag: draft.pickup.dispatch,
    passwordSigning: 'N',
    receive: draft.consignees.map(item => buildReceiveOrder(item, draft, pickupTime))
  }
}
