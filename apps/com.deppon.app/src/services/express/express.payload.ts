import { getExpressDeliveryPointOrderFields } from './deliveryPoint.rules'
import {
  createExpressDeliveryOrderFields,
  createExpressDeliveryQuoteFields
} from './deliveryPreference.rules'
import {
  getExpressContactRegion,
  getNowText,
  toFiniteNumber,
  trimText
} from './express.draft'
import {
  createExpressInsuranceOrderFields,
  createExpressInsuranceQuoteFields,
  getExpressInsuranceEffectiveAmount,
  getExpressInsurancePriceSubtype,
  getFreshExpressInsuranceCapability,
  validateExpressInsurance
} from './insurance.rules'
import {
  createExpressOrderPackageInfoList,
  createExpressOrderPackingText,
  createExpressOrderUnpackageLtlInfo,
  createExpressQuotePackageInfoList,
  createExpressUnpackingNumbers,
  getExpressPackageLtlType
} from './packaging.payload'
import { getExpressPackagingQuoteVolume } from './packaging.rules'
import {
  createExpressPickupOrderFields,
  createExpressPickupQuoteFields,
  getFreshExpressPickupNightCapability
} from './pickupTime.rules'
import { createExpressProductFreightFields } from './productAvailability.rules'
import {
  getExpressReturnBillPpcType,
  getExpressReturnBillRequirementText,
  isExpressCloudSignType,
  isExpressPaperReturnBillType,
  normalizeExpressReturnBillDraft
} from './valueAdded'
import {
  createExpressWarehouseOrderFields,
  createExpressWarehouseQuoteFields
} from './warehouse.payload'
import { APP_RUNTIME_CONFIG } from '../../shared/config/runtime'

import type {
  CreateExpressOrderRequest,
  ExpressDraft,
  ExpressFilterRequest,
  ExpressFreightRequest,
  ExpressInsuranceCapability,
  ExpressInsurancePriceRequest,
  ExpressPickupNightCapability,
  ExpressPickupTimeRequest,
  ExpressProductAvailability
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

function getPpcCollectionType(
  reciveLoanType: ExpressDraft['collection']['type']
) {
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
  draft: ExpressDraft,
  availability?: ExpressProductAvailability
): ExpressFreightRequest {
  if (!draft.sender || !draft.consignee) {
    throw new Error('缺少收寄件联系人')
  }

  const couponNumber = trimText(draft.couponNumber)
  const deliveryQuoteFields = createExpressDeliveryQuoteFields(
    draft.deliveryPreference
  )
  const pickupQuoteFields = createExpressPickupQuoteFields(draft)
  const warehouseQuoteFields = createExpressWarehouseQuoteFields(
    draft.warehouse
  )
  const packageInfoList = createExpressQuotePackageInfoList(draft.packaging)
  const unpackingFields = createExpressUnpackingNumbers(draft.packaging)
  const returnBill = normalizeExpressReturnBillDraft(
    draft.service.returnBill,
    getDraftProductCode(draft)
  )
  const productFields = createExpressProductFreightFields(draft, availability)
  const insuranceFields = createExpressInsuranceQuoteFields(
    draft,
    availability?.insuranceCapability
  )

  return {
    channel: APP_RUNTIME_CONFIG.omsChannel,
    ...insuranceFields,
    originalsStreet: getExpressContactRegion(draft.consignee),
    receiverAddress: draft.consignee.address,
    originalsaddress: getExpressContactRegion(draft.sender),
    shipperAddress: draft.sender.address,
    reciveLoanType: getPpcCollectionType(draft.collection.type),
    returnBillType: getExpressReturnBillPpcType(returnBill.type),
    receiveMethod: getPpcDeliveryMode(draft.service.deliveryMode),
    reviceMoneyAmount: toFiniteNumber(draft.collection.amount),
    totalVolume: getExpressPackagingQuoteVolume(draft),
    totalWeight: toFiniteNumber(draft.goods.weight, DEFAULT_GOODS_WEIGHT),
    goodsName: trimText(draft.goods.name),
    client: true,
    detail: true,
    sendDateTime: draft.pickup.time || getNowText(),
    promotionsCode: couponNumber || undefined,
    customerMobile: couponNumber ? trimText(draft.sender.mobile) : undefined,
    pickUpToDoor: draft.pickup.dispatch === 'Y',
    passwordSigning: draft.service.passwordSigning,
    ...productFields,
    packageLtlType: getExpressPackageLtlType(draft.packaging),
    ...unpackingFields,
    ...(packageInfoList ? { packageInfoList } : {}),
    ...pickupQuoteFields,
    ...deliveryQuoteFields,
    ...warehouseQuoteFields
  }
}

export function buildPickupTimeRequest(
  draft: ExpressDraft,
  nightCapability?: ExpressPickupNightCapability
): ExpressPickupTimeRequest {
  if (!draft.sender) {
    throw new Error('缺少寄件人联系人')
  }

  const capability =
    nightCapability ?? getFreshExpressPickupNightCapability(draft)

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
    source: 0,
    nightOpening: capability?.enabled ? 'Y' : 'N',
    nightStartTime: capability?.enabled ? capability.startTime : '',
    nightEndTime: capability?.enabled ? capability.endTime : ''
  }
}

export function buildInsurancePriceRequest(
  draft: ExpressDraft,
  capability?: ExpressInsuranceCapability | null
): ExpressInsurancePriceRequest {
  const productCode = getDraftProductCode(draft)

  if (!productCode) {
    throw new Error('请先获取并选择产品价格')
  }

  const validationMessages = validateExpressInsurance(draft, capability)

  if (validationMessages.length) {
    throw new Error(validationMessages[0])
  }

  const amount = getExpressInsuranceEffectiveAmount(draft, capability)

  if (amount <= 0) {
    throw new Error(
      getFreshExpressInsuranceCapability(draft, capability)?.disabled
        ? '当前货物暂不支持保价'
        : '请填写保价金额'
    )
  }

  return {
    pricingEntryCode: 'BF' as const,
    productCode,
    statements: [amount],
    subType: getExpressInsurancePriceSubtype(draft, capability),
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

function getPickupOrderTime(draft: ExpressDraft) {
  const timeSlot = trimText(draft.pickup.timeSlot)

  if (timeSlot && !timeSlot.includes('-')) {
    return timeSlot
  }

  return draft.pickup.time || getNowText()
}

export function buildCreateOrderRequest(
  draft: ExpressDraft,
  insuranceCapability?: ExpressInsuranceCapability | null
): CreateExpressOrderRequest {
  if (!draft.sender || !draft.consignee) {
    throw new Error('缺少收寄件联系人')
  }

  const selectedProductCode =
    draft.selectedProduct?.omsProductCode || draft.service.transportMode
  const scanOrderFields = getScanContextOrderFields(draft.scanContext)
  const deliveryOrderFields = createExpressDeliveryOrderFields(
    draft.deliveryPreference
  )
  const deliveryPointOrderFields = getExpressDeliveryPointOrderFields(draft)
  const warehouseOrderFields = createExpressWarehouseOrderFields(
    draft.warehouse
  )
  const packageInfoList = createExpressOrderPackageInfoList(draft.packaging)
  const packing = createExpressOrderPackingText(draft.packaging)
  const unpackageLtlInfo = createExpressOrderUnpackageLtlInfo(draft.packaging)
  const returnBill = normalizeExpressReturnBillDraft(
    draft.service.returnBill,
    selectedProductCode
  )
  const returnBillOrderFields = isExpressCloudSignType(returnBill.type) &&
    returnBill.fileCode
    ? [{ key: 'fileCode', value: returnBill.fileCode }]
    : []
  const returnBillQuantityFields =
    isExpressPaperReturnBillType(returnBill.type) &&
    returnBill.returnCount > 1
      ? [{ key: 'returnBillQty', value: returnBill.returnCount }]
      : []
  const insuranceOrderFields = createExpressInsuranceOrderFields(
    draft,
    insuranceCapability
  )
  const orderExtendFields = [
    ...deliveryOrderFields.orderExtendFields,
    ...createExpressPickupOrderFields(draft),
    ...warehouseOrderFields.orderExtendFields,
    ...insuranceOrderFields.orderExtendFields,
    ...returnBillOrderFields,
    ...returnBillQuantityFields
  ]

  return {
    contactIdList: [draft.sender.id, draft.consignee.id].filter(
      (id): id is string => !!id
    ),
    ...(packageInfoList ? { packageInfoList } : {}),
    unpackageLtlInfo,
    ...(warehouseOrderFields.deliveryToWarehouse
      ? { deliveryToWarehouse: warehouseOrderFields.deliveryToWarehouse }
      : {}),
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
        returnBillType: returnBill.type,
        reciveLoanType: draft.collection.type,
        reciveLoanAccount: trimText(draft.collection.account),
        couponNumber: trimText(draft.couponNumber),
        encryptInfo: draft.service.privacyProtection,
        remark: trimText(draft.remark),
        packing,
        isRecieveGoods: 0,
        reviceMoneyAmount: toFiniteNumber(draft.collection.amount),
        insuredAmount: insuranceOrderFields.insuredAmount,
        beginAcceptTime: getPickupOrderTime(draft),
        endAcceptTime: draft.pickup.endTime,
        accountName: trimText(draft.collection.accountName),
        receivingToPoint: deliveryPointOrderFields.receivingToPoint,
        receivingToPointName: deliveryPointOrderFields.receivingToPointName,
        waybillNumber: '',
        appointmentDeliveryTime:
          deliveryOrderFields.appointmentDeliveryTime,
        returnRequirement: getExpressReturnBillRequirementText(returnBill),
        customReturnRequirement: returnBill.customRequirement,
        pickPeriodTime: draft.pickup.pickPeriodTime,
        currentFirstTime:
          draft.pickup.dispatch === 'Y' &&
          !!draft.pickup.pickPeriodTime &&
          !!draft.pickup.timeSlot &&
          !draft.pickup.timeSlot.includes('-')
            ? 'Y'
            : undefined,
        orderExtendFields:
          orderExtendFields.length > 0 ? orderExtendFields : undefined,
        newOrderExtendFields:
          deliveryOrderFields.newOrderExtendFields.length > 0
            ? deliveryOrderFields.newOrderExtendFields
            : undefined
      }
    ]
  }
}
