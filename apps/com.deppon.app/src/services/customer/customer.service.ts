import { customerApi } from './customer.api'
import { createServiceFailure } from '../serviceResponse'

import type { CustomerCenterView, CustomerInfoRaw } from './types'
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

export const customerService = {
  async queryCustomerCenter(): Promise<DepponResponse<CustomerCenterView>> {
    const response = await customerApi.queryCustomerInfo(false)

    if (!response.status) {
      return createServiceFailure(response.message || '暂未获取到客户信息')
    }

    return {
      ...response,
      result: toCustomerCenterView(response.result)
    }
  }
}
