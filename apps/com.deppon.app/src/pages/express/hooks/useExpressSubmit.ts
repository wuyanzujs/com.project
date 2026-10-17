import Taro from '@tarojs/taro'

import { useCallback, useEffect, useState } from 'react'

import { expressDraftStorage, expressService, validateExpressDraft } from '@/services/express'
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
  validation: ReturnType<typeof validateExpressDraft>
  handleSubmit: () => Promise<void>
}

/** 寄件首页提交流程：完成草稿校验、送货进仓提交前准备、登录处理和下单成功跳转。 */
export function useExpressSubmit({ draft, warehouseController }: UseExpressSubmitParams): UseExpressSubmitResult {
  const [submiting, setSubmiting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState('')

  const validation = validateExpressDraft(draft, {
    requireAgreement: true,
    requireProduct: true
  })

  useEffect(() => {
    setSubmitMessage('')
  }, [draft])

  const handleSubmit = useCallback(async () => {
    if (submiting) {
      return
    }

    setSubmitMessage('')

    if (!validation.valid) {
      Taro.showToast({
        title: validation.messages[0],
        icon: 'none'
      })
      return
    }

    if (!hasValidSession()) {
      await expressDraftStorage.preserveForLogin(draft)
      ensureAuthenticated({
        redirectUrl: APP_ROUTES.express,
        replace: true,
        message: '请先登录后提交订单'
      })
      return
    }

    setSubmiting(true)

    try {
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
    } finally {
      setSubmiting(false)
    }
  }, [draft, submiting, validation, warehouseController])

  return {
    submiting,
    submitMessage,
    validation,
    handleSubmit
  }
}
