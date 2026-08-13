import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { customerService } from '@/services/customer'
import type { CustomerCenterView } from '@/services/customer'
import { createExpressMonthlyPayView } from '@/services/express'
import type {
  ExpressDraft,
  ExpressMonthlyPayView,
  ExpressPaymentType
} from '@/services/express'
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
  monthlyPayView: ExpressMonthlyPayView | null
  loadMonthlyCustomer: () => Promise<void>
  handlePaymentTypeSelect: (paymentType: ExpressPaymentType) => void
}

export function useExpressMonthlyPay({
  draft,
  updateService
}: UseExpressMonthlyPayParams): UseExpressMonthlyPayResult {
  const [monthlyCustomer, setMonthlyCustomer] =
    useState<CustomerCenterView | null>(null)
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
      setMonthlyCustomerLoading(false)
      setMonthlyCustomerMessage('请先登录后确认客户编码')
      return
    }

    setMonthlyCustomerLoading(true)
    setMonthlyCustomerMessage('')

    try {
      const response = await customerService.queryCustomerCenter()

      if (monthlyCustomerVersion.current !== requestVersion) {
        return
      }

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

    void loadMonthlyCustomer()
  }, [draft.service.paymentType, loadMonthlyCustomer])

  const monthlyPayView = useMemo(
    () =>
      createExpressMonthlyPayView({
        paymentType: draft.service.paymentType,
        customer: monthlyCustomer,
        loading: monthlyCustomerLoading,
        checked: monthlyCustomerChecked,
        errorMessage: monthlyCustomerMessage
      }),
    [
      draft.service.paymentType,
      monthlyCustomer,
      monthlyCustomerChecked,
      monthlyCustomerLoading,
      monthlyCustomerMessage
    ]
  )

  const handlePaymentTypeSelect = useCallback(
    (paymentType: ExpressPaymentType) => {
      updateService({ paymentType })

      if (paymentType === 'MONTH_PAY') {
        void loadMonthlyCustomer()
      }
    },
    [loadMonthlyCustomer, updateService]
  )

  return {
    monthlyCustomer,
    monthlyCustomerLoading,
    monthlyCustomerChecked,
    monthlyCustomerMessage,
    monthlyPayView,
    loadMonthlyCustomer,
    handlePaymentTypeSelect
  }
}
