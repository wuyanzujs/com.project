import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { customerService } from '@/services/customer'
import type { CustomerCapabilityView, CustomerCenterView } from '@/services/customer'
import { createExpressMonthlyPayView } from '@/services/express'
import type { ExpressDraft, ExpressMonthlyPayView, ExpressPaymentType } from '@/services/express'
import { hasValidSession } from '@/shared/navigation/authGuard'

interface UseExpressMonthlyPayParams {
  draft: ExpressDraft
  updateService: (patch: Partial<ExpressDraft['service']>) => void
}

interface UseExpressMonthlyPayResult {
  monthlyCustomer: CustomerCenterView | null
  monthlyCustomerLoading: boolean
  monthlyCustomerChecked: boolean
  monthlyCustomerMessage: string
  /** 月结资格：null 表示未确认或查询失败，只在明确不是月结客户时为 false。 */
  monthlyEnabled: boolean | null
  monthlyPayView: ExpressMonthlyPayView | null
  loadMonthlyCustomer: () => Promise<void>
  handlePaymentTypeSelect: (paymentType: ExpressPaymentType) => void
}

/** 月结支付管理：选择月结时查询客户编码状态，并生成支付方式区域需要的展示模型。 */
export function useExpressMonthlyPay({ draft, updateService }: UseExpressMonthlyPayParams): UseExpressMonthlyPayResult {
  const [monthlyCustomer, setMonthlyCustomer] = useState<CustomerCenterView | null>(null)
  const [monthlyCapability, setMonthlyCapability] = useState<CustomerCapabilityView | null>(null)
  const [monthlyCustomerLoading, setMonthlyCustomerLoading] = useState(false)
  const [monthlyCustomerChecked, setMonthlyCustomerChecked] = useState(false)
  const [monthlyCustomerMessage, setMonthlyCustomerMessage] = useState('')
  const monthlyCustomerVersion = useRef(0)

  const loadMonthlyCustomer = useCallback(async () => {
    const requestVersion = monthlyCustomerVersion.current + 1

    monthlyCustomerVersion.current = requestVersion
    setMonthlyCustomerChecked(true)

    if (!hasValidSession()) {
      setMonthlyCustomer(null)
      setMonthlyCapability(null)
      setMonthlyCustomerLoading(false)
      setMonthlyCustomerMessage('请先登录后确认客户编码')
      return
    }

    setMonthlyCustomerLoading(true)
    setMonthlyCustomerMessage('')

    try {
      // 月结资格来自 customerLabel；查询失败时保持 null，不把不确定当成“不是月结客户”。
      const [response, capabilityResponse] = await Promise.all([
        customerService.queryCustomerCenter(),
        customerService.queryCustomerCapability().catch(() => null)
      ])

      if (monthlyCustomerVersion.current !== requestVersion) {
        return
      }

      setMonthlyCapability(capabilityResponse?.status ? (capabilityResponse.result ?? null) : null)

      if (!response.status || !response.result) {
        setMonthlyCustomer(null)
        setMonthlyCustomerMessage(response.message || '暂未获取到客户信息')
        return
      }

      setMonthlyCustomer(response.result)
    } finally {
      if (monthlyCustomerVersion.current === requestVersion) {
        setMonthlyCustomerLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    if (draft.service.paymentType !== 'MONTH_PAY') {
      return
    }

    loadMonthlyCustomer()
  }, [draft.service.paymentType, loadMonthlyCustomer])

  const monthlyEnabled = monthlyCustomerChecked && !monthlyCustomerLoading && monthlyCapability ? monthlyCapability.monthlyEnabled : null

  const monthlyPayView = useMemo(
    () =>
      createExpressMonthlyPayView({
        paymentType: draft.service.paymentType,
        customer: monthlyCustomer,
        loading: monthlyCustomerLoading,
        checked: monthlyCustomerChecked,
        errorMessage: monthlyCustomerMessage
      }),
    [draft.service.paymentType, monthlyCustomer, monthlyCustomerChecked, monthlyCustomerLoading, monthlyCustomerMessage]
  )

  const handlePaymentTypeSelect = useCallback(
    (paymentType: ExpressPaymentType) => {
      updateService({ paymentType })

      if (paymentType === 'MONTH_PAY') {
        loadMonthlyCustomer()
      }
    },
    [loadMonthlyCustomer, updateService]
  )

  return {
    monthlyCustomer,
    monthlyCustomerLoading,
    monthlyCustomerChecked,
    monthlyCustomerMessage,
    monthlyEnabled,
    monthlyPayView,
    loadMonthlyCustomer,
    handlePaymentTypeSelect
  }
}
