import { APP_RUNTIME_CONFIG } from '@/shared/config/runtime'

import { getExpressContactRegion, getExpressContactRegionAddress, getNowText, toFiniteNumber, trimText } from './express.draft'
import { isExpressLtlDraft } from './express.goodsType'
import { getExpressDeliveryPointOrderFields } from '../delivery/deliveryPoint.rules'
import { createExpressDeliveryOrderFields, createExpressDeliveryQuoteFields } from '../delivery/deliveryPreference.rules'
import {
  createExpressInsuranceOrderFields,
  createExpressInsuranceQuoteFields,
  getExpressInsuranceEffectiveAmount,
  getExpressInsurancePriceSubtype,
  getFreshExpressInsuranceCapability,
  validateExpressInsurance
} from '../insurance/insurance.rules'
import {
  createExpressOrderPackageInfoList,
  createExpressOrderPackingText,
  createExpressOrderUnpackageLtlInfo,
  createExpressQuotePackageInfoList,
  createExpressUnpackingNumbers,
  getExpressPackageLtlType
} from '../packaging/packaging.payload'
import { getExpressPackagingQuoteVolume } from '../packaging/packaging.rules'
import { createExpressPickupOrderFields, createExpressPickupQuoteFields, getFreshExpressPickupNightCapability } from '../pickup/pickupTime.rules'
import { createExpressProductFreightFields } from '../product/productAvailability.rules'
import {
  getExpressReturnBillPpcType,
  getExpressReturnBillRequirementText,
  isExpressCloudSignType,
  isExpressPaperReturnBillType,
  normalizeExpressReturnBillDraft
} from '../value-added/valueAdded'
import { createExpressValueAddedOrderFields, createExpressValueAddedQuoteFields } from '../value-added/valueAdded.rules'
import { createExpressWarehouseOrderFields, createExpressWarehouseQuoteFields } from '../warehouse/warehouse.payload'

import type {
  CreateExpressOrderRequest,
  ExpressDraft,
  ExpressFilterRequest,
  ExpressFreightRequest,
  ExpressInsuranceCapability,
  ExpressInsurancePriceRequest,
  ExpressOrderPriceLogRequest,
  ExpressPickupNightCapability,
  ExpressPickupTimeRequest,
  ExpressProductAvailability,
  ExpressProductQuote,
  ExpressOrderExtendField,
  ExpressScanRole,
  ExpressSignStagingRequest
} from './types'

const DEFAULT_GOODS_COUNT = 1
const DEFAULT_GOODS_WEIGHT = 1

/**
 *
 * @param paymentType 页面付款方式
 * @description 付款方式转 PPC 报价编码
 */
function getPpcPaymentType(paymentType: ExpressDraft['service']['paymentType']) {
  switch (paymentType) {
    case 'PAY_ARIIVE':
      return 'FC' as const
    case 'MONTH_PAY':
      return 'CT' as const
    default:
      return 'MP' as const
  }
}

/**
 *
 * @param product 选中的报价产品
 * @description 生成报价产品的下单扩展字段
 */
function createExpressQuoteOrderFields(product: ExpressProductQuote | null): ExpressOrderExtendField[] {
  if (!product) {
    return []
  }

  const fields: ExpressOrderExtendField[] = []
  const timeProduct = product.timeProducts?.[0]

  if (product.totalfee !== null && product.totalfee !== undefined) {
    fields.push({ key: 'productPrice', value: String(product.totalfee) })
  }

  if (product.daysFormat) {
    fields.push({ key: 'days', value: product.daysFormat })
  }

  if (timeProduct?.timeProductsCode) {
    fields.push({ key: 'timeProductsCode', value: timeProduct.timeProductsCode })
  }

  if (timeProduct?.timeProductsName) {
    fields.push({ key: 'timeProductsName', value: timeProduct.timeProductsName })
  }

  if (product.ppcTotalFee) {
    const freight = toFiniteNumber(product.detail?.find(item => item.priceEntryCode === 'FRT')?.caculateFee ?? 0)
    const discountFee = (product.discount ?? []).reduce((total, item) => total + toFiniteNumber(item.reduceFee), 0)
    const basicFee = freight + discountFee

    fields.push({ key: 'totalFee', value: product.ppcTotalFee })

    if (basicFee) {
      fields.push({ key: 'basicFee', value: basicFee })
    }

    if (discountFee) {
      fields.push({ key: 'discountFee', value: discountFee })
    }
  }

  return fields
}

/**
 *
 * @param deliveryMode 页面派送方式
 * @description 派送方式转 PPC 编码
 */
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

/**
 *
 * @param reciveLoanType 代收货款类型
 * @description 代收货款类型转 PPC 编码
 */
function getPpcCollectionType(reciveLoanType: ExpressDraft['collection']['type']) {
  switch (reciveLoanType) {
    case 'INTRADAY':
      return 'R1'
    case 'NORMAL':
      return 'R3'
    default:
      return ''
  }
}

/**
 *
 * @param draft 寄件草稿
 * @description 取草稿生效的产品 code
 */
export function getDraftProductCode(draft: ExpressDraft) {
  return draft.selectedProduct?.omsProductCode || draft.service.transportMode
}

/**
 *
 * @param scanContext 扫码上下文
 * @description 取扫码上下文中的客户 code
 */
function getScanContextCustomerCode(scanContext: ExpressDraft['scanContext']) {
  if (scanContext?.role !== 'shipperNumber') {
    return ''
  }

  return trimText(scanContext.value)
}

/**
 *
 * @param draft 寄件草稿
 * @param availability 产品可用性信息
 * @description 组装询价请求 payload
 */
export function buildFreightRequest(draft: ExpressDraft, availability?: ExpressProductAvailability): ExpressFreightRequest {
  if (!draft.sender || !draft.consignee) {
    throw new Error('缺少收寄件联系人')
  }

  const couponNumber = trimText(draft.couponNumber)
  const deliveryQuoteFields = createExpressDeliveryQuoteFields(draft.deliveryPreference)
  const pickupQuoteFields = createExpressPickupQuoteFields(draft)
  const warehouseQuoteFields = createExpressWarehouseQuoteFields(draft.warehouse)
  const packageInfoList = createExpressQuotePackageInfoList(draft.packaging)
  const unpackingFields = createExpressUnpackingNumbers(draft.packaging)
  const returnBill = normalizeExpressReturnBillDraft(draft.service.returnBill, getDraftProductCode(draft))
  const productFields = createExpressProductFreightFields(draft, availability)
  const insuranceFields = createExpressInsuranceQuoteFields(draft, availability?.insuranceCapability)

  return {
    channel: APP_RUNTIME_CONFIG.omsChannel,
    ...insuranceFields,
    originalsStreet: getExpressContactRegionAddress(draft.consignee),
    receiverAddress: draft.consignee.address,
    originalsaddress: getExpressContactRegionAddress(draft.sender),
    shipperAddress: draft.sender.address,
    reciveLoanType: getPpcCollectionType(draft.collection.type),
    returnBillType: getExpressReturnBillPpcType(returnBill.type),
    receiveMethod: getPpcDeliveryMode(draft.service.deliveryMode),
    reviceMoneyAmount: toFiniteNumber(draft.collection.amount),
    totalVolume: getExpressPackagingQuoteVolume(draft),
    totalQuantity: toFiniteNumber(draft.goods.count, DEFAULT_GOODS_COUNT),
    totalWeight: toFiniteNumber(draft.goods.weight, DEFAULT_GOODS_WEIGHT),
    goodsName: trimText(draft.goods.name),
    client: true,
    detail: true,
    sendDateTime: draft.pickup.time || getNowText(),
    promotionsCode: couponNumber || undefined,
    customerMobile: couponNumber ? trimText(draft.sender.mobile) : undefined,
    paidMethod: getPpcPaymentType(draft.service.paymentType),
    pickUpToDoor: draft.pickup.dispatch === 'Y',
    passwordSigning: draft.service.passwordSigning,
    ...productFields,
    packageLtlType: getExpressPackageLtlType(draft.packaging),
    ...unpackingFields,
    ...(packageInfoList ? { packageInfoList } : {}),
    ...pickupQuoteFields,
    ...deliveryQuoteFields,
    ...warehouseQuoteFields,
    ...createExpressValueAddedQuoteFields(draft.valueAdded)
  }
}

/**
 *
 * @param role 扫码角色
 * @description 取件时间请求来源，与参考端 GetPickupTimeType 一致
 */
function getPickupTimeSource(role?: ExpressScanRole) {
  switch (role) {
    case 'pickupManId':
      return 1
    case 'shipperNumber':
      return 2
    case 'acceptDept':
      return 3
    case 'driverId':
      return 5
    default:
      return 0
  }
}

/**
 *
 * @param draft 寄件草稿
 * @param nightCapability 夜间取件能力
 * @description 组装取件时间查询请求
 */
export function buildPickupTimeRequest(draft: ExpressDraft, nightCapability?: ExpressPickupNightCapability): ExpressPickupTimeRequest {
  if (!draft.sender) {
    throw new Error('缺少寄件人联系人')
  }

  const capability = nightCapability ?? getFreshExpressPickupNightCapability(draft)

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
    originalsStreet: draft.consignee ? getExpressContactRegion(draft.consignee) : undefined,
    priceTimeProductCode: draft.selectedProduct?.omsProductCode || draft.service.transportMode || undefined,
    source: getPickupTimeSource(draft.scanContext?.role),
    nightOpening: capability?.enabled ? 'Y' : 'N',
    nightStartTime: capability?.enabled ? capability.startTime : '',
    nightEndTime: capability?.enabled ? capability.endTime : ''
  }
}

/**
 *
 * @param draft 寄件草稿
 * @param capability 保价能力配置
 * @description 组装保价费用请求
 */
export function buildInsurancePriceRequest(draft: ExpressDraft, capability?: ExpressInsuranceCapability | null): ExpressInsurancePriceRequest {
  const productCode = getDraftProductCode(draft)

  if (!productCode) {
    throw new Error('产品价格尚未就绪，请稍候')
  }

  const validationMessages = validateExpressInsurance(draft, capability)

  if (validationMessages.length) {
    throw new Error(validationMessages[0])
  }

  const amount = getExpressInsuranceEffectiveAmount(draft, capability)

  if (amount <= 0) {
    throw new Error(getFreshExpressInsuranceCapability(draft, capability)?.disabled ? '当前货物暂不支持保价' : '请填写保价金额')
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

/**
 *
 * @param draft 寄件草稿
 * @description 组装下单前筛单拦截请求
 */
export function buildFilterOrderRequest(draft: ExpressDraft): ExpressFilterRequest {
  if (!draft.sender || !draft.consignee) {
    throw new Error('缺少收寄件联系人')
  }

  const scanCustomerCode = getScanContextCustomerCode(draft.scanContext)

  return {
    contactAddress: getExpressContactRegionAddress(draft.sender),
    contactMobile: draft.sender.mobile,
    contactName: draft.sender.name,
    receiverAddress: getExpressContactRegionAddress(draft.consignee),
    receiverMobile: draft.consignee.mobile,
    receiverName: draft.consignee.name,
    goodsName: trimText(draft.goods.name),
    totalWeight: toFiniteNumber(draft.goods.weight, DEFAULT_GOODS_WEIGHT),
    totalVolume: toFiniteNumber(draft.goods.volume),
    transportMode: draft.selectedProduct?.omsProductCode || draft.service.transportMode,
    deliveryMode: draft.service.deliveryMode,
    customerCode: scanCustomerCode || undefined,
    limitCust: scanCustomerCode ? 1 : 0
  }
}

/**
 *
 * @param scanContext 扫码上下文
 * @description 从扫码上下文提取下单字段
 */
function getScanContextOrderFields(scanContext: ExpressDraft['scanContext']) {
  const fields = {
    acceptDept: '',
    shipperNumber: '',
    pickupManId: '',
    /** 营业部/服务点二维码把扫描到的网点同时作为始发网点。 */
    startStation: '',
    startStationName: '',
    /** 服务点二维码视为客户自送到点，不再调度上门取件。 */
    forceNoDispatch: false
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
      fields.startStation = value
      fields.startStationName = ''
      fields.forceNoDispatch = scanContext.role === 'businessCode'
      break
  }

  return fields
}

/**
 *
 * @param draft 寄件草稿
 * @description 取下单用的取件开始时间
 */
function getPickupOrderTime(draft: ExpressDraft) {
  const timeSlot = trimText(draft.pickup.timeSlot)

  if (timeSlot && !timeSlot.includes('-')) {
    return timeSlot
  }

  return draft.pickup.time || getNowText()
}

/**
 *
 * @param draft 寄件草稿
 * @param insuranceCapability 保价能力配置
 * @description 组装创建订单请求 payload
 */
export function buildCreateOrderRequest(draft: ExpressDraft, insuranceCapability?: ExpressInsuranceCapability | null): CreateExpressOrderRequest {
  if (!draft.sender || !draft.consignee) {
    throw new Error('缺少收寄件联系人')
  }

  const selectedProductCode = draft.selectedProduct?.omsProductCode || draft.service.transportMode
  const scanOrderFields = getScanContextOrderFields(draft.scanContext)
  const deliveryOrderFields = createExpressDeliveryOrderFields(draft.deliveryPreference)
  const deliveryPointOrderFields = getExpressDeliveryPointOrderFields(draft)
  const warehouseOrderFields = createExpressWarehouseOrderFields(draft.warehouse)
  const packageInfoList = createExpressOrderPackageInfoList(draft.packaging)
  const packing = createExpressOrderPackingText(draft.packaging)
  const unpackageLtlInfo = createExpressOrderUnpackageLtlInfo(draft.packaging)
  const returnBill = normalizeExpressReturnBillDraft(draft.service.returnBill, selectedProductCode)
  const returnBillOrderFields = isExpressCloudSignType(returnBill.type) && returnBill.fileCode ? [{ key: 'fileCode', value: returnBill.fileCode }] : []
  const returnBillQuantityFields =
    isExpressPaperReturnBillType(returnBill.type) && returnBill.returnCount > 1 ? [{ key: 'returnBillQty', value: returnBill.returnCount }] : []
  const insuranceOrderFields = createExpressInsuranceOrderFields(draft, insuranceCapability)
  const isScannedOrder = Boolean(draft.scanContext)
  const effectiveDispatch = scanOrderFields.forceNoDispatch ? 'N' : draft.pickup.dispatch
  const orderExtendFields = [
    ...deliveryOrderFields.orderExtendFields,
    ...createExpressPickupOrderFields(draft),
    ...warehouseOrderFields.orderExtendFields,
    ...insuranceOrderFields.orderExtendFields,
    ...returnBillOrderFields,
    ...returnBillQuantityFields,
    ...createExpressValueAddedOrderFields(draft.valueAdded),
    ...createExpressQuoteOrderFields(draft.selectedProduct)
  ]

  return {
    contactIdList: [draft.sender.id, draft.consignee.id].filter((id): id is string => !!id),
    ...(packageInfoList ? { packageInfoList } : {}),
    unpackageLtlInfo,
    ...(warehouseOrderFields.deliveryToWarehouse ? { deliveryToWarehouse: warehouseOrderFields.deliveryToWarehouse } : {}),
    isAgreement: draft.agreementAccepted ? 'Y' : 'N',
    isContact: isScannedOrder || draft.pickup.dispatch === 'N' ? 'N' : draft.service.needContact,
    clientChannel: APP_RUNTIME_CONFIG.appClientChannel,
    contactName: draft.sender.name,
    contactMobile: draft.sender.mobile,
    contactProvince: draft.sender.province,
    contactCity: draft.sender.city,
    contactArea: draft.sender.county,
    contactAddress: trimText(draft.sender.address),
    contactAddressDetail: getExpressContactRegionAddress(draft.sender),
    startStation: scanOrderFields.startStation || draft.pickup.stationCode,
    startStationName: scanOrderFields.startStation ? scanOrderFields.startStationName : draft.pickup.stationName,
    acceptDept: scanOrderFields.acceptDept,
    shipperNumber: scanOrderFields.shipperNumber,
    pickupManId: scanOrderFields.pickupManId,
    dispatchFlag: effectiveDispatch,
    passwordSigning: draft.service.passwordSigning,
    receive: [
      {
        receiverCustName: draft.consignee.name,
        receiverCustMobile: draft.consignee.mobile,
        receiverCustAddress: trimText(draft.consignee.address),
        receiverCustAddressDetail: getExpressContactRegionAddress(draft.consignee),
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
        isRecieveGoods: isExpressLtlDraft(draft) && draft.pickup.dispatch === 'N' ? 0 : 1,
        reviceMoneyAmount: toFiniteNumber(draft.collection.amount),
        insuredAmount: insuranceOrderFields.insuredAmount,
        beginAcceptTime: getPickupOrderTime(draft),
        endAcceptTime: draft.pickup.endTime,
        accountName: trimText(draft.collection.accountName),
        receivingToPoint: deliveryPointOrderFields.receivingToPoint,
        receivingToPointName: deliveryPointOrderFields.receivingToPointName,
        waybillNumber: '',
        appointmentDeliveryTime: deliveryOrderFields.appointmentDeliveryTime,
        returnRequirement: getExpressReturnBillRequirementText(returnBill),
        customReturnRequirement: returnBill.customRequirement,
        pickPeriodTime: draft.pickup.pickPeriodTime,
        currentFirstTime:
          draft.pickup.dispatch === 'Y' && !!draft.pickup.pickPeriodTime && !!draft.pickup.timeSlot && !draft.pickup.timeSlot.includes('-') ? 'Y' : undefined,
        orderExtendFields: orderExtendFields.length > 0 ? orderExtendFields : undefined,
        newOrderExtendFields: deliveryOrderFields.newOrderExtendFields.length > 0 ? deliveryOrderFields.newOrderExtendFields : undefined
      }
    ]
  }
}

/**
 *
 * @param draft 寄件草稿
 * @param orderNumber 下单返回的订单号
 * @description 组装下单成功后的价格日志入参
 */
export function buildOrderPriceLogRequest(draft: ExpressDraft, orderNumber: string): ExpressOrderPriceLogRequest | null {
  // 与小程序一致：没有订单号或没有报价金额时不回写价格日志。
  if (!draft.selectedProduct?.totalfee || !trimText(orderNumber)) {
    return null
  }

  return {
    orderNumber: trimText(orderNumber),
    priceBody: {
      totalWeight: toFiniteNumber(draft.goods.weight, DEFAULT_GOODS_WEIGHT),
      totalVolume: getExpressPackagingQuoteVolume(draft),
      deliveryMode: draft.service.deliveryMode,
      productDetail: draft.selectedProduct
    }
  }
}

/**
 *
 * @param draft 寄件草稿
 * @param sign 签署函类型与协议号
 * @param orderPhone 下单账号手机号
 * @description 组装电子签署函暂存入参
 */
export function buildSignStagingRequest(draft: ExpressDraft, sign: { goodsType: string; agreementId: string }, orderPhone: string): ExpressSignStagingRequest {
  if (!draft.sender || !draft.consignee) {
    throw new Error('缺少收寄件联系人')
  }

  return {
    agreementId: sign.agreementId,
    goodsName: trimText(draft.goods.name),
    goodsType: sign.goodsType,
    orderPhone: trimText(orderPhone),
    senderPhone: trimText(draft.sender.mobile),
    senderAddress: getExpressContactRegionAddress(draft.sender),
    consigneePhone: trimText(draft.consignee.mobile),
    consigneeAddress: getExpressContactRegionAddress(draft.consignee)
  }
}
