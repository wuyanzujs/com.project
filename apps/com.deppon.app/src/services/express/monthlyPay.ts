import type { CustomerCenterView } from '../customer'
import type { ExpressPaymentType } from './types'
import type { AppWebSource } from '../../shared/webview/appWeb'

export type ExpressMonthlyPayTone = 'info' | 'success' | 'warning'

export type ExpressMonthlyPayActionSource = Extract<
  AppWebSource,
  | 'CUSTOMER_BIND'
  | 'CUSTOMER_CENTER'
  | 'CUSTOMER_MONTHLY_CENTER'
>

export interface ExpressMonthlyPayView {
  title: string
  summary: string
  actionText: string
  actionSource: ExpressMonthlyPayActionSource
  tone: ExpressMonthlyPayTone
}

export interface ExpressMonthlyPayViewOptions {
  paymentType: ExpressPaymentType
  customer: CustomerCenterView | null
  loading: boolean
  checked: boolean
  errorMessage: string
}

function getBoundCustomerSummary(customer: CustomerCenterView) {
  const codeText = customer.code ? `客户编码 ${customer.code}` : '已绑定客户'
  const nameText = customer.name ? `，${customer.name}` : ''

  return `${codeText}${nameText}。月结和合同权限提交时仍以后端校验为准。`
}

export function createExpressMonthlyPayView({
  paymentType,
  customer,
  loading,
  checked,
  errorMessage
}: ExpressMonthlyPayViewOptions): ExpressMonthlyPayView | null {
  if (paymentType !== 'MONTH_PAY') {
    return null
  }

  if (customer?.hasBoundCustomer) {
    return {
      title: loading ? '正在刷新客户信息' : '已同步客户编码',
      summary: getBoundCustomerSummary(customer),
      actionText: '月结中心',
      actionSource: 'CUSTOMER_MONTHLY_CENTER',
      tone: 'success'
    }
  }

  if (loading) {
    return {
      title: '正在同步客户信息',
      summary: '正在确认当前账号是否已绑定客户编码。',
      actionText: '客户中心',
      actionSource: 'CUSTOMER_CENTER',
      tone: 'info'
    }
  }

  if (errorMessage) {
    return {
      title: '暂未确认月结资格',
      summary: `${errorMessage}。如需使用月结，可前往客户中心查看或绑定客户编码。`,
      actionText: '去客户中心',
      actionSource: 'CUSTOMER_CENTER',
      tone: 'warning'
    }
  }

  if (checked) {
    return {
      title: '暂未绑定客户编码',
      summary:
        '使用月结付款前建议先绑定月结客户编码；提交时仍以后端月结和合同权限校验为准。',
      actionText: '去绑定',
      actionSource: 'CUSTOMER_BIND',
      tone: 'warning'
    }
  }

  return {
    title: '月结需绑定客户编码',
    summary: '选择月结后会同步当前账号客户信息，未绑定时可前往客户中心处理。',
    actionText: '去绑定',
    actionSource: 'CUSTOMER_BIND',
    tone: 'info'
  }
}
