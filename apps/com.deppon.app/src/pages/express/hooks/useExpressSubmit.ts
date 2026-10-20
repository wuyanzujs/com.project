import Taro from '@tarojs/taro'

import { useCallback, useEffect, useRef, useState } from 'react'

import { expressDraftBridge, expressDraftStorage, expressService, validateExpressDraft } from '@/services/express'
import type { ExpressDraft } from '@/services/express'
import { navigateToAppRoute } from '@/shared/navigation/appNavigation'
import { ensureAuthenticated, hasValidSession } from '@/shared/navigation/authGuard'
import { APP_ROUTES } from '@/shared/navigation/routes'
import { createAppRouteUrl } from '@/shared/navigation/routeUrl'

interface UseExpressSubmitParams {
  draft: ExpressDraft
  warehouseController: {
    prepareForSubmit: () => Promise<{
      draft: ExpressDraft
      proceed: boolean
    } | null>
  }
}

interface UseExpressSubmitResult {
  submiting: boolean
  submitMessage: string
  /** 是否已尝试提交；协议行常显后，校验提示只在用户点过下单后才展示。 */
  attempted: boolean
  validation: ReturnType<typeof validateExpressDraft>
  handleSubmit: () => Promise<void>
}

/** 寄件首页提交流程：完成草稿校验、送货进仓提交前准备、登录处理和下单成功跳转。 */
export function useExpressSubmit({ draft, warehouseController }: UseExpressSubmitParams): UseExpressSubmitResult {
  const [submiting, setSubmiting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState('')
  const [attempted, setAttempted] = useState(false)
  const submissionLock = useRef(false)
  const submittedDraft = useRef<ExpressDraft | null>(null)

  const validation = validateExpressDraft(draft, {
    requireAgreement: true,
    requireProduct: true
  })

  useEffect(() => {
    setSubmitMessage('')
  }, [draft])

  const handleSubmit = useCallback(async () => {
    if (submissionLock.current || submittedDraft.current === draft) {
      return
    }

    setSubmitMessage('')
    setAttempted(true)

    if (!validation.valid) {
      Taro.showToast({
        title: validation.messages[0],
        icon: 'none'
      })
      return
    }

    // ref 在首次点击同步上锁，防止 React 下一次渲染前的连续点击创建重复订单。
    submissionLock.current = true
    setSubmiting(true)

    try {
      if (!hasValidSession()) {
        if (!(await expressDraftStorage.preserveForLogin(draft))) {
          Taro.showToast({ title: '寄件信息保存失败，请重试', icon: 'none' })
          return
        }

        ensureAuthenticated({
          redirectUrl: APP_ROUTES.express,
          replace: true,
          message: '请先登录后提交订单'
        })
        return
      }

      const preparation = await warehouseController.prepareForSubmit()

      if (!preparation || !preparation.proceed) {
        return
      }

      const preparedValidation = validateExpressDraft(preparation.draft, {
        requireAgreement: true,
        requireProduct: true,
        requireWarehouseScreening: true
      })

      if (!preparedValidation.valid) {
        Taro.showToast({
          title: preparedValidation.messages[0],
          icon: 'none'
        })
        return
      }

      const response = await expressService.submitDraft(preparation.draft)

      if (!response.status || !response.result) {
        const message = response.message || '提交失败，请稍后重试'

        setSubmitMessage(message)
        Taro.showToast({
          title: message,
          icon: 'none'
        })
        return
      }

      const orderNumber = response.result.orderNumbers?.[0] || ''
      const waybillNumber = response.result.waybillNumber || response.result.waybillNumbers?.[0] || ''

      submittedDraft.current = draft
      // 系统返回键回到原寄件页时也消费全新草稿，防止重新提交已成功的表单。
      expressDraftBridge.carryFreshSend()

      if (!(await expressDraftStorage.clear())) {
        Taro.showToast({ title: '订单已提交，草稿清理失败', icon: 'none' })
      }

      navigateToAppRoute(
        createAppRouteUrl(APP_ROUTES.expressSuccess, {
          orderNumber,
          waybillNumber
        }),
        { login: true }
      )
    } catch {
      const message = '暂未确认提交结果，请先到订单列表核实后再试'

      setSubmitMessage(message)
      Taro.showToast({ title: message, icon: 'none' })
    } finally {
      submissionLock.current = false
      setSubmiting(false)
    }
  }, [draft, validation, warehouseController])

  return {
    submiting,
    submitMessage,
    attempted,
    validation,
    handleSubmit
  }
}
