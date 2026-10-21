import { trimText } from '../core/express.draft'
import { createExpressInsuranceCapability } from '../insurance/insurance.rules'

import type {
  ExpressDraft,
  ExpressFlag,
  ExpressFreightRequest,
  ExpressGoodsLabel,
  ExpressGoodsLabelRequest,
  ExpressProductAvailability,
  ExpressProductCustomerCapability,
  ExpressProductPointRequest,
  ExpressProductQuote,
  ExpressProductRole,
  ExpressProductSwitch,
  ExpressProductSwitchRequest,
  ExpressProductUpgradeRequest,
  ExpressProductUpgradeResult
} from '../core/types'

export interface ExpressProductCustomerCapabilitySource {
  customerCode?: string | null
  monthlyEnabled?: boolean | null
  contractEnabled?: boolean | null
  insuranceLimit?: number | null
}

interface ExpressProductAvailabilityInput {
  dczpAvailable?: boolean
  fusionEnabled?: boolean
  goodsLabels?: ExpressGoodsLabel[]
  isOffSiteTransfer?: ExpressFlag
  upgradeResult?: ExpressProductUpgradeResult
}

type ExpressProductFreightFields = Pick<
  ExpressFreightRequest,
  'collectMode' | 'customerCode' | 'customerContract' | 'customerMonthly' | 'deliveryMode' | 'isOffSiteTransfer' | 'isRecommendDczp' | 'passProductCode'
>

/**
 *
 * @param draft 寄件草稿
 * @description 校验并返回收寄件联系人
 */
function requireExpressContacts(draft: ExpressDraft) {
  if (!draft.sender || !draft.consignee) {
    throw new Error('缺少收寄件联系人')
  }

  return {
    consignee: draft.consignee,
    sender: draft.sender
  }
}

/**
 *
 * @param contact 联系人信息
 * @description 拼接省市县为区域字符串
 */
function getProductRegion(contact: NonNullable<ExpressDraft['sender']>) {
  return [contact.province, contact.city, contact.county].map(trimText).filter(Boolean).join('-')
}

/**
 *
 * @param draft 寄件草稿
 * @description 取扫码场景下的客户 code
 */
export function getExpressScanCustomerCode(draft: ExpressDraft) {
  return draft.scanContext?.role === 'shipperNumber' ? trimText(draft.scanContext.value) : ''
}

/**
 *
 * @param draft 寄件草稿
 * @description 组装货物标签查询请求
 */
export function createExpressGoodsLabelRequest(draft: ExpressDraft): ExpressGoodsLabelRequest {
  return {
    goodsName: trimText(draft.goods.name),
    senderProvinceName: draft.sender?.province,
    senderCityName: draft.sender?.city,
    senderCountyName: draft.sender?.county,
    arriveProvinceName: draft.consignee?.province,
    arriveCityName: draft.consignee?.city,
    arriveCountyName: draft.consignee?.county
  }
}

/**
 *
 * @param draft 寄件草稿
 * @description 组装产品网点查询请求
 */
export function createExpressProductPointRequest(draft: ExpressDraft): ExpressProductPointRequest {
  const { consignee, sender } = requireExpressContacts(draft)

  return {
    productCode: 'DCZP',
    contactAddressDetail: getProductRegion(sender),
    receiverCustAddressDetail: getProductRegion(consignee)
  }
}

/**
 *
 * @param draft 寄件草稿
 * @param customer 客户能力
 * @description 组装产品切换查询请求
 */
export function createExpressProductSwitchRequest(draft: ExpressDraft, customer: ExpressProductCustomerCapability): ExpressProductSwitchRequest {
  const pointRequest = createExpressProductPointRequest(draft)

  return {
    customerCode: customer.customerCode,
    contactAddressDetail: pointRequest.contactAddressDetail,
    receiverCustAddressDetail: pointRequest.receiverCustAddressDetail,
    ifExistContract: customer.contractEnabled ? 1 : 0
  }
}

/**
 *
 * @param draft 寄件草稿
 * @param customer 客户能力
 * @param isOffSiteTransfer 是否异地转寄
 * @description 组装产品升级查询请求
 */
export function createExpressProductUpgradeRequest(
  draft: ExpressDraft,
  customer: ExpressProductCustomerCapability,
  isOffSiteTransfer: ExpressFlag = 'N'
): ExpressProductUpgradeRequest {
  const { consignee, sender } = requireExpressContacts(draft)

  return {
    customerCode: customer.customerCode,
    isOffSiteTransfer,
    pilotType: 'CUSTOMER_REGION',
    departProvinceName: trimText(sender.province),
    departCityName: trimText(sender.city),
    departCountyName: trimText(sender.county),
    arriveProvinceName: trimText(consignee.province),
    arriveCityName: trimText(consignee.city),
    arriveCountyName: trimText(consignee.county)
  }
}

/**
 *
 * @param draft 寄件草稿
 * @description 判断当前场景是否支持产品切换查询
 */
export function supportsExpressProductSwitch(draft: ExpressDraft) {
  const role = draft.scanContext?.role

  return !role || role === 'pickupManId' || role === 'shipperNumber'
}

/**
 *
 * @param draft 寄件草稿
 * @description 判断当前场景是否支持 DCZP 推荐
 */
export function supportsExpressDczpRecommendation(draft: ExpressDraft) {
  return !draft.scanContext
}

/**
 *
 * @param draft 寄件草稿
 * @param source 账号侧客户能力
 * @description 归一扫码与账号两种来源的客户能力
 */
export function resolveExpressProductCustomerCapability(
  draft: ExpressDraft,
  source?: ExpressProductCustomerCapabilitySource | null
): ExpressProductCustomerCapability {
  const scanCustomerCode = getExpressScanCustomerCode(draft)
  const accountCustomerCode = trimText(source?.customerCode ?? '')

  if (scanCustomerCode) {
    const matchesAccount = accountCustomerCode === scanCustomerCode

    return {
      customerCode: scanCustomerCode,
      monthlyEnabled: matchesAccount && source?.monthlyEnabled === true,
      contractEnabled: matchesAccount && source?.contractEnabled === true,
      insuranceLimit: matchesAccount ? (source?.insuranceLimit ?? null) : null
    }
  }

  return {
    customerCode: accountCustomerCode,
    monthlyEnabled: source?.monthlyEnabled === true,
    contractEnabled: source?.contractEnabled === true,
    insuranceLimit: source?.insuranceLimit ?? null
  }
}

/**
 *
 * @param fusionEnabled 是否开启融合
 * @param upgradeResult 产品升级结果
 * @param contractEnabled 是否签约客户
 * @description 归一产品切换类型
 */
export function resolveExpressProductSwitch(
  fusionEnabled: boolean | undefined,
  upgradeResult: ExpressProductUpgradeResult | undefined,
  contractEnabled: boolean
): ExpressProductSwitch {
  if (fusionEnabled === false) {
    return 'OLD'
  }

  if (upgradeResult === 'NEW') {
    return contractEnabled ? 'CONTRACT' : 'UNIVERSAL'
  }

  return 'EXP'
}

/**
 *
 * @param draft 寄件草稿
 * @param productSwitch 产品切换类型
 * @description 取下单透传的产品角色 code
 */
export function resolveExpressProductRole(draft: ExpressDraft, productSwitch: ExpressProductSwitch): ExpressProductRole {
  const role = draft.scanContext?.role

  if (role === 'driverId' || role === 'acceptDept') {
    return 'DRIVER_QR_CODE'
  }

  if (role === 'businessCode') {
    return 'EXP'
  }

  if (productSwitch === 'CONTRACT' || productSwitch === 'UNIVERSAL') {
    return productSwitch
  }

  if (role === 'pickupManId') {
    return 'EXP'
  }

  return productSwitch === 'OLD' ? '' : 'EXP'
}

/**
 *
 * @param labels 货物标签列表
 * @description 判断货物标签是否含电池类
 */
export function hasExpressBatteryGoodsLabel(labels: ExpressGoodsLabel[]) {
  return labels.some(label => label.goodsRemarkCode === 'battery_category')
}

/**
 *
 * @param draft 寄件草稿
 * @param customer 客户能力
 * @param input 产品可用性输入项
 * @description 生成产品可用性结果
 */
export function createExpressProductAvailability(
  draft: ExpressDraft,
  customer: ExpressProductCustomerCapability,
  input: ExpressProductAvailabilityInput = {}
): ExpressProductAvailability {
  const isOffSiteTransfer = input.isOffSiteTransfer ?? 'N'
  const productSwitch = resolveExpressProductSwitch(input.fusionEnabled, input.upgradeResult, customer.contractEnabled)
  const goodsHasBattery = hasExpressBatteryGoodsLabel(input.goodsLabels ?? [])
  const dczpAvailable = input.dczpAvailable === true
  const recommendDczp = supportsExpressDczpRecommendation(draft) && dczpAvailable && goodsHasBattery

  return {
    customer,
    dczpAvailable,
    goodsHasBattery,
    insuranceCapability:
      input.goodsLabels === undefined
        ? {
            inputKey: '',
            fragile: false,
            worryFree: false,
            disabled: false
          }
        : createExpressInsuranceCapability(draft, input.goodsLabels),
    isOffSiteTransfer,
    passProductCode: resolveExpressProductRole(draft, productSwitch),
    productSwitch,
    recommendDczp
  }
}

/**
 *
 * @param draft 寄件草稿
 * @param availability 产品可用性，可为空
 * @description 组装运费试算的产品相关字段
 */
export function createExpressProductFreightFields(draft: ExpressDraft, availability?: ExpressProductAvailability): ExpressProductFreightFields {
  const scanCustomerCode = getExpressScanCustomerCode(draft)
  const customer = availability?.customer ?? {
    customerCode: scanCustomerCode,
    monthlyEnabled: Boolean(scanCustomerCode),
    contractEnabled: Boolean(scanCustomerCode),
    insuranceLimit: null
  }
  const passProductCode = availability?.passProductCode ?? resolveExpressProductRole(draft, 'EXP')
  const resolvedCustomer = Boolean(availability)
  const productFields: ExpressProductFreightFields = {
    passProductCode,
    isOffSiteTransfer: availability?.isOffSiteTransfer ?? 'N',
    customerCode: customer.customerCode || undefined,
    customerMonthly: resolvedCustomer ? (customer.monthlyEnabled ? '1' : '0') : scanCustomerCode ? '1' : undefined,
    customerContract: resolvedCustomer ? (customer.contractEnabled ? '1' : '0') : scanCustomerCode ? '1' : undefined
  }

  if (availability?.recommendDczp) {
    productFields.isRecommendDczp = 'Y'
  }

  if (passProductCode === 'CONTRACT' || passProductCode === 'UNIVERSAL') {
    productFields.collectMode = 'BZLS'
    productFields.deliveryMode = draft.service.deliveryMode === 'PICKSELF' ? 'ZDZT' : 'BZPS'
  }

  return productFields
}

/**
 *
 * @param products 产品报价列表
 * @param recommendDczp 是否推荐 DCZP
 * @description 选择默认选中的产品报价
 */
export function selectDefaultExpressQuote(products: ExpressProductQuote[], recommendDczp: boolean) {
  if (recommendDczp) {
    const recommended = products.find(product => product.omsProductCode === 'DCZP' || product.producteCode === 'DCZP')

    if (recommended) {
      return recommended
    }
  }

  return products[0] ?? null
}
