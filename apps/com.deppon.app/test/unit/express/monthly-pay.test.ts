import { describe, expect, it } from 'vitest'

import { createExpressMonthlyPayView } from '@/services/express/billing/monthlyPay'

import type { CustomerCenterView } from '@/services/customer/types'

const createCustomer = (overrides: Partial<CustomerCenterView> = {}): CustomerCenterView => ({
  code: '',
  name: '',
  statusText: '',
  summary: '',
  mainContactText: '',
  privateBillText: '',
  hasBoundCustomer: true,
  ...overrides
})

describe('createExpressMonthlyPayView', () => {
  it('ignores every payment type except month pay', () => {
    expect(createExpressMonthlyPayView({ paymentType: 'MP', customer: null, loading: false, checked: false, errorMessage: '' })).toBeNull()
    expect(createExpressMonthlyPayView({ paymentType: 'PAY_ARIIVE', customer: null, loading: false, checked: false, errorMessage: '' })).toBeNull()
  })

  it('summarizes the bound customer with code and name', () => {
    const view = createExpressMonthlyPayView({
      paymentType: 'MONTH_PAY',
      customer: createCustomer({ code: 'C001', name: '德邦科技' }),
      loading: false,
      checked: true,
      errorMessage: ''
    })

    expect(view).not.toBeNull()
    expect(view?.title).toBe('已同步客户编码')
    expect(view?.summary).toBe('客户编码 C001，德邦科技。月结和合同权限提交时仍以后端校验为准。')
    expect(view?.actionText).toBe('月结中心')
    expect(view?.actionSource).toBe('CUSTOMER_MONTHLY_CENTER')
    expect(view?.tone).toBe('success')
  })

  it('omits missing customer fields instead of printing empty labels', () => {
    const view = createExpressMonthlyPayView({
      paymentType: 'MONTH_PAY',
      customer: createCustomer(),
      loading: false,
      checked: true,
      errorMessage: ''
    })

    expect(view?.summary).toBe('已绑定客户。月结和合同权限提交时仍以后端校验为准。')
  })

  it('keeps the bound state while the customer card refreshes', () => {
    const view = createExpressMonthlyPayView({
      paymentType: 'MONTH_PAY',
      customer: createCustomer({ code: 'C001' }),
      loading: true,
      checked: true,
      errorMessage: ''
    })

    expect(view?.title).toBe('正在刷新客户信息')
    expect(view?.tone).toBe('success')
  })

  it('shows the syncing state before the first customer lookup finishes', () => {
    const view = createExpressMonthlyPayView({ paymentType: 'MONTH_PAY', customer: null, loading: true, checked: false, errorMessage: '' })

    expect(view?.title).toBe('正在同步客户信息')
    expect(view?.actionSource).toBe('CUSTOMER_CENTER')
    expect(view?.tone).toBe('info')
  })

  it('falls back to a warning carrying the customer error', () => {
    const view = createExpressMonthlyPayView({ paymentType: 'MONTH_PAY', customer: null, loading: false, checked: false, errorMessage: '客户接口超时' })

    expect(view?.title).toBe('暂未确认月结资格')
    expect(view?.summary).toBe('客户接口超时。如需使用月结，可前往客户中心查看或绑定客户编码。')
    expect(view?.tone).toBe('warning')
  })

  it('prompts binding once the lookup confirms no customer code', () => {
    const checkedView = createExpressMonthlyPayView({ paymentType: 'MONTH_PAY', customer: null, loading: false, checked: true, errorMessage: '' })
    const initialView = createExpressMonthlyPayView({ paymentType: 'MONTH_PAY', customer: null, loading: false, checked: false, errorMessage: '' })

    expect(checkedView?.title).toBe('暂未绑定客户编码')
    expect(checkedView?.actionSource).toBe('CUSTOMER_BIND')
    expect(checkedView?.tone).toBe('warning')
    expect(initialView?.title).toBe('月结需绑定客户编码')
    expect(initialView?.tone).toBe('info')
  })
})
