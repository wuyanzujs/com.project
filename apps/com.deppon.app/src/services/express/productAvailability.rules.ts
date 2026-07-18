import { trimText } from './express.draft'
import { createExpressInsuranceCapability } from './insurance.rules'

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
} from './types'

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
  | 'collectMode'
  | 'customerCode'
  | 'customerContract'
  | 'customerMonthly'
  | 'deliveryMode'
  | 'isOffSiteTransfer'
  | 'isRecommendDczp'
  | 'passProductCode'
>

function requireExpressContacts(draft: ExpressDraft) {
  if (!draft.sender || !draft.consignee) {
    throw new Error('缺少收寄件联系人')
  }

  return {
    consignee: draft.consignee,
    sender: draft.sender
  }
}

function getProductRegion(contact: NonNullable<ExpressDraft['sender']>) {
  return [contact.province, contact.city, contact.county]
    .map(trimText)
    .filter(Boolean)
    .join('-')
}

export function getExpressScanCustomerCode(draft: ExpressDraft) {
  return draft.scanContext?.role === 'shipperNumber'
    ? trimText(draft.scanContext.value)
    : ''
}

export function createExpressGoodsLabelRequest(
  draft: ExpressDraft
): ExpressGoodsLabelRequest {
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

export function createExpressProductPointRequest(
  draft: ExpressDraft
): ExpressProductPointRequest {
  const { consignee, sender } = requireExpressContacts(draft)

  return {
    productCode: 'DCZP',
    contactAddressDetail: getProductRegion(sender),
    receiverCustAddressDetail: getProductRegion(consignee)
  }
}

export function createExpressProductSwitchRequest(
  draft: ExpressDraft,
  customer: ExpressProductCustomerCapability
): ExpressProductSwitchRequest {
  const pointRequest = createExpressProductPointRequest(draft)

  return {
    customerCode: customer.customerCode,
    contactAddressDetail: pointRequest.contactAddressDetail,
    receiverCustAddressDetail: pointRequest.receiverCustAddressDetail,
    ifExistContract: customer.contractEnabled ? 1 : 0
  }
}

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

export function supportsExpressProductSwitch(draft: ExpressDraft) {
  const role = draft.scanContext?.role

  return !role || role === 'pickupManId' || role === 'shipperNumber'
}

export function supportsExpressDczpRecommendation(draft: ExpressDraft) {
  return !draft.scanContext
}

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
      insuranceLimit: matchesAccount ? source?.insuranceLimit ?? null : null
    }
  }

  return {
    customerCode: accountCustomerCode,
    monthlyEnabled: source?.monthlyEnabled === true,
    contractEnabled: source?.contractEnabled === true,
    insuranceLimit: source?.insuranceLimit ?? null
  }
}

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

export function resolveExpressProductRole(
  draft: ExpressDraft,
  productSwitch: ExpressProductSwitch
): ExpressProductRole {
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

export function hasExpressBatteryGoodsLabel(labels: ExpressGoodsLabel[]) {
  return labels.some(label => label.goodsRemarkCode === 'battery_category')
}

export function createExpressProductAvailability(
  draft: ExpressDraft,
  customer: ExpressProductCustomerCapability,
  input: ExpressProductAvailabilityInput = {}
): ExpressProductAvailability {
  const isOffSiteTransfer = input.isOffSiteTransfer ?? 'N'
  const productSwitch = resolveExpressProductSwitch(
    input.fusionEnabled,
    input.upgradeResult,
    customer.contractEnabled
  )
  const goodsHasBattery = hasExpressBatteryGoodsLabel(input.goodsLabels ?? [])
  const dczpAvailable = input.dczpAvailable === true
  const recommendDczp =
    supportsExpressDczpRecommendation(draft) &&
    dczpAvailable &&
    goodsHasBattery

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

export function createExpressProductFreightFields(
  draft: ExpressDraft,
  availability?: ExpressProductAvailability
): ExpressProductFreightFields {
  const scanCustomerCode = getExpressScanCustomerCode(draft)
  const customer = availability?.customer ?? {
    customerCode: scanCustomerCode,
    monthlyEnabled: Boolean(scanCustomerCode),
    contractEnabled: Boolean(scanCustomerCode),
    insuranceLimit: null
  }
  const passProductCode =
    availability?.passProductCode ?? resolveExpressProductRole(draft, 'EXP')
  const resolvedCustomer = Boolean(availability)
  const productFields: ExpressProductFreightFields = {
    passProductCode,
    isOffSiteTransfer: availability?.isOffSiteTransfer ?? 'N',
    customerCode: customer.customerCode || undefined,
    customerMonthly: resolvedCustomer
      ? customer.monthlyEnabled
        ? '1'
        : '0'
      : scanCustomerCode
        ? '1'
        : undefined,
    customerContract: resolvedCustomer
      ? customer.contractEnabled
        ? '1'
        : '0'
      : scanCustomerCode
        ? '1'
        : undefined
  }

  if (availability?.recommendDczp) {
    productFields.isRecommendDczp = 'Y'
  }

  if (passProductCode === 'CONTRACT' || passProductCode === 'UNIVERSAL') {
    productFields.collectMode = 'BZLS'
    productFields.deliveryMode =
      draft.service.deliveryMode === 'PICKSELF' ? 'ZDZT' : 'BZPS'
  }

  return productFields
}

export function selectDefaultExpressQuote(
  products: ExpressProductQuote[],
  recommendDczp: boolean
) {
  if (recommendDczp) {
    const recommended = products.find(
      product =>
        product.omsProductCode === 'DCZP' || product.producteCode === 'DCZP'
    )

    if (recommended) {
      return recommended
    }
  }

  return products[0] ?? null
}
