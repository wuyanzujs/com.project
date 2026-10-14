import { useCallback, useEffect, useRef, useState } from 'react'

import { invoiceOrderAuth, invoiceOrderSearchService } from '@/services/invoice'
import type { InvoiceOrderAuthChallenge } from '@/services/invoice'

import type { LatestRequestRunner } from './latestRequestTypes'

interface UseInvoiceOrderAuthParams {
  runLatestRequest: LatestRequestRunner
  invalidateLatestRequest: () => void
  showPendingToast: (title: string) => void
  applyOrderSearchResponse: (response: import('@/request/deppon').DepponResponse<import('@/services/invoice').InvoiceOrderSearchView>) => boolean
}

interface UseInvoiceOrderAuthResult {
  orderAuth: InvoiceOrderAuthChallenge | null
  orderAuthValue: string
  orderAuthMessage: string
  orderAuthCountdown: number
  orderAuthSending: boolean
  orderAuthSubmitting: boolean
  setOrderAuth: (next: InvoiceOrderAuthChallenge | null) => void
  setOrderAuthValue: (next: string) => void
  setOrderAuthMessage: (next: string) => void
  handleCloseOrderAuth: () => void
  handleSendOrderAuthCode: () => Promise<void>
  handleConfirmOrderAuth: () => Promise<void>
}

export function useInvoiceOrderAuth({
  runLatestRequest,
  invalidateLatestRequest,
  showPendingToast,
  applyOrderSearchResponse
}: UseInvoiceOrderAuthParams): UseInvoiceOrderAuthResult {
  const [orderAuth, setOrderAuth] = useState<InvoiceOrderAuthChallenge | null>(null)
  const [orderAuthValue, setOrderAuthValue] = useState('')
  const [orderAuthMessage, setOrderAuthMessage] = useState('')
  const [orderAuthCountdown, setOrderAuthCountdown] = useState(0)
  const [orderAuthSending, setOrderAuthSending] = useState(false)
  const [orderAuthSubmitting, setOrderAuthSubmitting] = useState(false)
  const orderAuthRequestId = useRef(0)

  useEffect(() => {
    if (!orderAuth || orderAuth.authType !== '04') {
      setOrderAuthCountdown(0)
      return
    }

    setOrderAuthCountdown(invoiceOrderAuth.getCodeCountdown())
  }, [orderAuth])

  useEffect(() => {
    if (orderAuthCountdown <= 0) {
      return undefined
    }

    const timer = setTimeout(() => {
      setOrderAuthCountdown(current => Math.max(0, current - 1))
    }, 1000)

    return () => clearTimeout(timer)
  }, [orderAuthCountdown])

  const handleCloseOrderAuth = useCallback(() => {
    orderAuthRequestId.current += 1
    invalidateLatestRequest()
    setOrderAuthSubmitting(false)
    setOrderAuth(null)
    setOrderAuthValue('')
    setOrderAuthMessage('')
  }, [invalidateLatestRequest])

  const handleSendOrderAuthCode = useCallback(async () => {
    if (!orderAuth || orderAuth.authType !== '04' || orderAuthCountdown > 0 || orderAuthSending) {
      return
    }

    setOrderAuthSending(true)
    setOrderAuthMessage('')

    try {
      const response = await invoiceOrderSearchService.sendAuthCode(orderAuth.waybillNumber)

      if (!response.status) {
        setOrderAuthMessage(response.message || '发送失败，请稍后再试')
        return
      }

      await invoiceOrderAuth.markCodeSent()
      setOrderAuthCountdown(invoiceOrderAuth.codeSeconds)
      showPendingToast('验证码已发送')
    } finally {
      setOrderAuthSending(false)
    }
  }, [orderAuth, orderAuthCountdown, orderAuthSending, showPendingToast])

  const handleConfirmOrderAuth = useCallback(async () => {
    if (!orderAuth || orderAuthSubmitting) {
      return
    }

    const auth = orderAuth
    const requestId = ++orderAuthRequestId.current
    const normalizedValue = orderAuthValue.trim()
    const validationMessage = invoiceOrderAuth.validateValue(auth, normalizedValue)

    if (validationMessage) {
      showPendingToast(validationMessage)
      return
    }

    setOrderAuthSubmitting(true)
    setOrderAuthMessage('')

    try {
      await runLatestRequest(
        `order-auth:${auth.waybillNumber}`,
        async () => {
          if (auth.authType === '04') {
            const verifyResponse = await invoiceOrderSearchService.verifyAuthCode(auth.waybillNumber, normalizedValue)

            if (!verifyResponse.status) {
              return {
                kind: 'error' as const,
                message: verifyResponse.message || '验证失败，请稍后试'
              }
            }

            return {
              kind: 'result' as const,
              response: await invoiceOrderSearchService.queryByWaybill(auth.waybillNumber),
              shouldCache: false
            }
          }

          const response = await invoiceOrderSearchService.verifyPhone(auth.waybillNumber, normalizedValue)

          return response.status
            ? { kind: 'result' as const, response, shouldCache: true }
            : {
                kind: 'error' as const,
                message: response.message || '验证失败，请重新确认信息'
              }
        },
        async result => {
          if (result.kind === 'error') {
            setOrderAuthMessage(result.message)
            return
          }

          if (applyOrderSearchResponse(result.response)) {
            if (result.shouldCache) {
              await invoiceOrderAuth.rememberValue(auth.waybillNumber, normalizedValue)
            }
            showPendingToast('验证通过')
          }
        },
        { force: true }
      )
    } finally {
      if (requestId === orderAuthRequestId.current) {
        setOrderAuthSubmitting(false)
      }
    }
  }, [applyOrderSearchResponse, orderAuth, orderAuthSubmitting, orderAuthValue, runLatestRequest, showPendingToast])

  return {
    orderAuth,
    orderAuthValue,
    orderAuthMessage,
    orderAuthCountdown,
    orderAuthSending,
    orderAuthSubmitting,
    setOrderAuth,
    setOrderAuthValue,
    setOrderAuthMessage,
    handleCloseOrderAuth,
    handleSendOrderAuthCode,
    handleConfirmOrderAuth
  }
}
