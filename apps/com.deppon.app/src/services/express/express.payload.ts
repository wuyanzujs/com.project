import {
  getExpressContactRegion,
  getNowText,
  toFiniteNumber,
  trimText
} from './express.draft'
import { APP_RUNTIME_CONFIG } from '../../shared/config/runtime'

import type {
  CreateExpressOrderRequest,
  ExpressDraft,
  ExpressFilterRequest,
  ExpressFreightRequest,
  ExpressPickupTimeRequest
} from './types'

const DEFAULT_GOODS_COUNT = 1
const DEFAULT_GOODS_WEIGHT = 1

function getPpcDeliveryMode(deliveryMode: ExpressDraft['service']['deliveryMode']) {
  switch (deliveryMode) {
    case 'PICKSELF':
      return 'SELF_PICKUP'
    case 'PICKUPSTAIRS':
      return 'DELIVER_UP'
    case 'BIGUPSTAIRS':
      return 'LARGE_DELIVER_UP'
    case 'PICKNOTUPSTAIRS':
      return 'DELIVER_NOUP'
    default:
      return ''
  }
}

function getPpcReturnBillType(returnBillType: ExpressDraft['service']['returnBillType']) {
  switch (returnBillType) {
    case 'CUSTOMER_SIGNED_FAX':
      return 'FAX'
    case 'CUSTOMER_SIGNED_ORIGINAL':
      return 'ORIGINAL'
    case 'RETURNBILL_TYPE_ONLINE':
      return 'ONLINE'
    default:
      return 'NONE'
  }
}

function getPpcCollectionType(reciveLoanType: ExpressDraft['service']['reciveLoanType']) {
  switch (reciveLoanType) {
    case 'INTRADAY':
      return 'R1'
    case 'NORMAL':
      return 'R3'
    default:
      return ''
  }
}

export function getDraftProductCode(draft: ExpressDraft) {
  return draft.selectedProduct?.omsProductCode || draft.service.transportMode
}

function getScanContextCustomerCode(scanContext: ExpressDraft['scanContext']) {
  if (scanContext?.role !== 'shipperNumber') {
    return ''
  }

  return trimText(scanContext.value)
}

export function buildFreightRequest(
  draft: ExpressDraft
): ExpressFreightRequest {
  if (!draft.sender || !draft.consignee) {
    throw new Error('缺少收寄件联系人')
  }

  const scanCustomerCode = getScanContextCustomerCode(draft.scanContext)
  const couponNumber = trimText(draft.couponNumber)

  return {
    channel: APP_RUNTIME_CONFIG.omsChannel,
    insuredAmount: toFiniteNumber(draft.goods.insuredAmount),
    originalsStreet: getExpressContactRegion(draft.consignee),
    receiverAddress: draft.consignee.address,
    originalsaddress: getExpressContactRegion(draft.sender),
    shipperAddress: draft.sender.address,
    reciveLoanType: getPpcCollectionType(draft.service.reciveLoanType),
    returnBillType: getPpcReturnBillType(draft.service.returnBillType),
    receiveMethod: getPpcDeliveryMode(draft.service.deliveryMode),
    reviceMoneyAmount: toFiniteNumber(draft.goods.reviceMoneyAmount),
    totalVolume: toFiniteNumber(draft.goods.volume),
    totalWeight: toFiniteNumber(draft.goods.weight, DEFAULT_GOODS_WEIGHT),
    goodsName: trimText(draft.goods.name),
    client: true,
    detail: true,
    sendDateTime: draft.pickup.time || getNowText(),
    promotionsCode: couponNumber || undefined,
    customerMobile: couponNumber ? trimText(draft.sender.mobile) : undefined,
    pickUpToDoor: draft.pickup.dispatch === 'Y',
    passwordSigning: draft.service.passwordSigning,
    passProductCode: draft.service.transportMode,
    customerCode: scanCustomerCode || undefined,
    customerMonthly: scanCustomerCode ? '1' : undefined,
    customerContract: scanCustomerCode ? '1' : undefined
  }
}

export function buildPickupTimeRequest(
  draft: ExpressDraft
): ExpressPickupTimeRequest {
  if (!draft.sender) {
    throw new Error('缺少寄件人联系人')
  }

  return {
    sysCode: APP_RUNTIME_CONFIG.systemCode,
    provinceName: draft.sender.province,
    cityName: draft.sender.city,
    countyName: draft.sender.county,
    townName: draft.sender.town,
    address: draft.sender.address,
    weight: toFiniteNumber(draft.goods.weight, DEFAULT_GOODS_WEIGHT),
    volume: toFiniteNumber(draft.goods.volume),
    goodsNumber: toFiniteNumber(draft.goods.count, DEFAULT_GOODS_COUNT),
    originalsaddress: getExpressContactRegion(draft.sender),
    originalsStreet: draft.consignee
      ? getExpressContactRegion(draft.consignee)
      : undefined,
    priceTimeProductCode:
      draft.selectedProduct?.omsProductCode ||
      draft.service.transportMode ||
      undefined,
    source: 0
  }
}

export function buildInsurancePriceRequest(draft: ExpressDraft) {
  const amount = toFiniteNumber(draft.goods.insuredAmount)
  const productCode = getDraftProductCode(draft)

  if (amount <= 0) {
    throw new Error('请填写保价金额')
  }

  if (!productCode) {
    throw new Error('请先获取并选择产品价格')
  }

  return {
    pricingEntryCode: 'BF' as const,
    productCode,
    statements: [amount],
    subType: 'QEB',
    weight: toFiniteNumber(draft.goods.weight, DEFAULT_GOODS_WEIGHT),
    volume: toFiniteNumber(draft.goods.volume)
  }
}

export function buildFilterOrderRequest(
  draft: ExpressDraft
): ExpressFilterRequest {
  if (!draft.sender || !draft.consignee) {
    throw new Error('缺少收寄件联系人')
  }

  const scanCustomerCode = getScanContextCustomerCode(draft.scanContext)

  return {
    contactAddress: `${getExpressContactRegion(draft.sender)},${draft.sender.address}`,
    contactMobile: draft.sender.mobile,
    contactName: draft.sender.name,
    receiverAddress: `${getExpressContactRegion(draft.consignee)},${draft.consignee.address}`,
    receiverMobile: draft.consignee.mobile,
    receiverName: draft.consignee.name,
    goodsName: trimText(draft.goods.name),
    totalWeight: toFiniteNumber(draft.goods.weight, DEFAULT_GOODS_WEIGHT),
    transportMode:
      draft.selectedProduct?.omsProductCode || draft.service.transportMode,
    deliveryMode: draft.service.deliveryMode,
    customerCode: scanCustomerCode || undefined,
    limitCust:
      !!scanCustomerCode || draft.service.paymentType === 'MONTH_PAY' ? 1 : 0
  }
}

function getScanContextOrderFields(scanContext: ExpressDraft['scanContext']) {
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

export function buildCreateOrderRequest(
  draft: ExpressDraft
): CreateExpressOrderRequest {
  if (!draft.sender || !draft.consignee) {
    throw new Error('缺少收寄件联系人')
  }

  const selectedProductCode =
    draft.selectedProduct?.omsProductCode || draft.service.transportMode
  const scanOrderFields = getScanContextOrderFields(draft.scanContext)

  return {
    contactIdList: [draft.sender.id, draft.consignee.id].filter(
      (id): id is string => !!id
    ),
    isAgreement: draft.agreementAccepted ? 'Y' : 'N',
    isContact: draft.service.needContact,
    clientChannel: APP_RUNTIME_CONFIG.appClientChannel,
    contactName: draft.sender.name,
    contactMobile: draft.sender.mobile,
    contactProvince: draft.sender.province,
    contactCity: draft.sender.city,
    contactArea: draft.sender.county,
    contactAddress: getExpressContactRegion(draft.sender),
    contactAddressDetail: draft.sender.address,
    startStation: draft.pickup.stationCode,
    startStationName: draft.pickup.stationName,
    acceptDept: scanOrderFields.acceptDept,
    shipperNumber: scanOrderFields.shipperNumber,
    pickupManId: scanOrderFields.pickupManId,
    dispatchFlag: draft.pickup.dispatch,
    passwordSigning: draft.service.passwordSigning,
    receive: [
      {
        receiverCustName: draft.consignee.name,
        receiverCustMobile: draft.consignee.mobile,
        receiverCustAddress: getExpressContactRegion(draft.consignee),
        receiverCustAddressDetail: draft.consignee.address,
        receiverCustProvince: draft.consignee.province,
        receiverCustCity: draft.consignee.city,
        receiverCustArea: draft.consignee.county,
        goodsName: trimText(draft.goods.name),
        goodsNumber: toFiniteNumber(draft.goods.count, DEFAULT_GOODS_COUNT),
        totalVolume: toFiniteNumber(draft.goods.volume),
        totalWeight: toFiniteNumber(draft.goods.weight, DEFAULT_GOODS_WEIGHT),
        transportMode: selectedProductCode,
        deliveryMode: draft.service.deliveryMode,
        paymentType: draft.service.paymentType,
        returnBillType: draft.service.returnBillType,
        reciveLoanType: draft.service.reciveLoanType,
        reciveLoanAccount: '',
        couponNumber: trimText(draft.couponNumber),
        encryptInfo: draft.service.privacyProtection,
        remark: trimText(draft.remark),
        isRecieveGoods: 0,
        reviceMoneyAmount: toFiniteNumber(draft.goods.reviceMoneyAmount),
        insuredAmount: toFiniteNumber(draft.goods.insuredAmount),
        beginAcceptTime: draft.pickup.time || getNowText(),
        endAcceptTime: draft.pickup.endTime,
        accountName: '',
        receivingToPoint: '',
        receivingToPointName: '',
        waybillNumber: '',
        appointmentDeliveryTime: '',
        returnRequirement: '',
        customReturnRequirement: '',
        pickPeriodTime: draft.pickup.pickPeriodTime
      }
    ]
  }
}
