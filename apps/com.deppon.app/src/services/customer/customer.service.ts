import { customerApi } from './customer.api'
import { createServiceFailure } from '../serviceResponse'

import type {
  CustomerCapabilityRaw,
  CustomerCapabilitySummaryView,
  CustomerCapabilityView,
  CustomerCenterOverviewView,
  CustomerCenterView,
  CustomerInfoRaw
} from './types'
import type { DepponResponse } from '../../request/deppon'

function normalizeText(value?: string | null) {
  return (value ?? '').trim()
}

function getMainContactText(value?: string | null) {
  const normalized = normalizeText(value).toUpperCase()

  return normalized === 'Y' || normalized === '1' || normalized === 'TRUE'
    ? '主联系人'
    : '普通联系人'
}

function getPrivateBillText(value?: string | null) {
  const normalized = normalizeText(value).toUpperCase()

  if (normalized === 'Y') {
    return '已开通'
  }

  if (normalized === 'N') {
    return '未开通'
  }

  return '以客户中心为准'
}

function toCustomerCenterView(
  raw?: CustomerInfoRaw | null
): CustomerCenterView {
  const code = normalizeText(raw?.cusCode)
  const name = normalizeText(raw?.custName)
  const hasBoundCustomer = Boolean(code || name)

  if (!hasBoundCustomer) {
    return {
      code: '',
      name: '',
      statusText: '未绑定客户',
      summary: '当前账号暂未查询到客户编码，可前往客户中心绑定或查看。',
      mainContactText: '未确认',
      privateBillText: '未确认',
      hasBoundCustomer
    }
  }

  return {
    code,
    name,
    statusText: '已绑定客户',
    summary: '已同步当前账号绑定的客户信息，月结和合同权限以后端校验为准。',
    mainContactText: getMainContactText(raw?.isMainLinkman),
    privateBillText: getPrivateBillText(raw?.privateBill),
    hasBoundCustomer
  }
}

function toPositiveNumber(value: unknown) {
  const parsed = Number(value)

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export function normalizeCustomerCapability(
  raw?: CustomerCapabilityRaw | null
): CustomerCapabilityView {
  const customerCode = normalizeText(raw?.custNumber)

  return {
    customerCode,
    collectionLimit: toPositiveNumber(raw?.teanLimit),
    insuranceLimit: toPositiveNumber(raw?.insuredPriceCap),
    hasBoundCustomer: Boolean(customerCode),
    monthlyEnabled: raw?.exPayWay === true,
    contractEnabled: normalizeText(raw?.ifExistContract) === '1'
  }
}

function formatCollectionLimit(value: number | null) {
  if (value === null) {
    return '--'
  }

  const text = Number.isInteger(value)
    ? String(value)
    : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')

  return text + ' 元'
}

export function createCustomerCapabilitySummary(
  capability: CustomerCapabilityView,
  customer?: CustomerCenterView | null
): CustomerCapabilitySummaryView {
  const available =
    capability.hasBoundCustomer || customer?.hasBoundCustomer === true

  return {
    available,
    collectionLimitText: available
      ? formatCollectionLimit(capability.collectionLimit)
      : '--',
    contractText: available
      ? capability.contractEnabled
        ? '已签约'
        : '未签约'
      : '--',
    customerCode: capability.customerCode || customer?.code || '',
    monthlyPaymentText: available
      ? capability.monthlyEnabled
        ? '已开通'
        : '未开通'
      : '--'
  }
}

async function queryCustomerCenter(): Promise<
  DepponResponse<CustomerCenterView>
> {
  const response = await customerApi.queryCustomerInfo(false)

  if (!response.status) {
    return createServiceFailure(response.message || '暂未获取到客户信息')
  }

  return {
    ...response,
    result: toCustomerCenterView(response.result)
  }
}

async function queryCustomerCapability(): Promise<
  DepponResponse<CustomerCapabilityView>
> {
  const response = await customerApi.queryCustomerCapability(false)

  if (!response.status) {
    return createServiceFailure(response.message || '暂未获取到客户服务额度')
  }

  return {
    ...response,
    result: normalizeCustomerCapability(response.result)
  }
}

async function queryCustomerOverview(): Promise<
  DepponResponse<CustomerCenterOverviewView>
> {
  const [customerResponse, capabilityResponse] = await Promise.all([
    queryCustomerCenter(),
    queryCustomerCapability()
  ])
  const customer =
    customerResponse.status && customerResponse.result
      ? customerResponse.result
      : null
  const capability =
    capabilityResponse.status && capabilityResponse.result
      ? createCustomerCapabilitySummary(
          capabilityResponse.result,
          customer
        )
      : null
  const warning = [
    customerResponse.status ? '' : customerResponse.message,
    capabilityResponse.status ? '' : capabilityResponse.message
  ]
    .filter((message): message is string => !!message)
    .join('；')

  if (!customer && !capability) {
    return createServiceFailure(warning || '暂未获取到客户服务信息')
  }

  return {
    status: true,
    message: warning,
    result: { capability, customer, warning }
  }
}

export const customerService = {
  queryCustomerCapability,
  queryCustomerCenter,
  queryCustomerOverview
}
