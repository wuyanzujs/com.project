import Taro from '@tarojs/taro'

import { useCallback, useEffect, useRef, useState } from 'react'

import { expressDraftBridge, expressDraftStorage, expressService, isExpressSignResponseCode, validateExpressDraft } from '@/services/express'
import type { ExpressDraft } from '@/services/express'
import { navigateToAppRoute } from '@/shared/navigation/appNavigation'
import { ensureAuthenticated, hasValidSession } from '@/shared/navigation/authGuard'
import { APP_ROUTES } from '@/shared/navigation/routes'
import { createAppRouteUrl } from '@/shared/navigation/routeUrl'
import { createAppWebUrl } from '@/shared/webview/appWeb'

interface UseExpressSubmitParams {
  draft: ExpressDraft
  /** 月结资格：null 表示尚未确认，只在明确不是月结客户时拦截。 */
  monthlyEnabled?: boolean | null
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

const LOGIN_EXPIRED_MESSAGE_KEYWORD = '登录超时'

/** 寄件首页提交流程：完成草稿校验、送货进仓提交前准备、登录处理和下单成功跳转。 */
export function useExpressSubmit({ draft, monthlyEnabled, warehouseController }: UseExpressSubmitParams): UseExpressSubmitResult {
  const [submiting, setSubmiting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState('')
  const [attempted, setAttempted] = useState(false)
  const submissionLock = useRef(false)
  const submittedDraft = useRef<ExpressDraft | null>(null)

  const validation = validateExpressDraft(draft, {
    requireAgreement: true,
    requireProduct: true,
    monthlyEnabled
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

    /** 登录态缺失时先保草稿再跳登录，保存失败不跳转避免丢单。 */
    const redirectToLogin = async (message: string) => {
      if (!(await expressDraftStorage.preserveForLogin(draft))) {
        Taro.showToast({ title: '寄件信息保存失败，请重试', icon: 'none' })
        return
      }

      ensureAuthenticated({
        redirectUrl: APP_ROUTES.express,
        replace: true,
        message
      })
    }

    /** 下单被电子签署函拦截时暂存发货信息并打开签署页，草稿保留以便签名后重新提交。 */
    const redirectToSign = async (sourceDraft: ExpressDraft, code: string) => {
      const stage = await expressService.stageSignInfo(sourceDraft, code)

      if (!stage.status || !stage.result) {
        const message = stage.message || '发货信息暂存失败，请稍后再试'

        setSubmitMessage(message)
        Taro.showToast({ title: message, icon: 'none' })
        return
      }

      setSubmitMessage('请先完成电子签名，返回后重新提交订单')
      navigateToAppRoute(createAppWebUrl({ source: 'EXPRESS_STATEMENT', uri: stage.result.uri }))
    }

    try {
      if (!hasValidSession()) {
        await redirectToLogin('请先登录后提交订单')
        return
      }

      const preparation = await warehouseController.prepareForSubmit()

      if (!preparation || !preparation.proceed) {
        return
      }

      const preparedValidation = validateExpressDraft(preparation.draft, {
        requireAgreement: true,
        requireProduct: true,
        requireWarehouseScreening: true,
        monthlyEnabled
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

        if (isExpressSignResponseCode(response.code)) {
          await redirectToSign(preparation.draft, response.code as string)
          return
        }

        if (message.includes(LOGIN_EXPIRED_MESSAGE_KEYWORD)) {
          await redirectToLogin('登录已失效，请重新登录后提交订单')
          return
        }

        setSubmitMessage(message)
        Taro.showModal({
          title: '下单失败',
          content: message,
          showCancel: false,
          confirmText: '知道了'
        })
        return
      }

      const orderNumber = response.result.orderNumbers?.[0] || ''
      const waybillNumber = response.result.waybillNumber || response.result.waybillNumbers?.[0] || ''

      submittedDraft.current = draft
      // 价格日志只做报价留痕，失败不影响已成功的订单。
      void expressService.saveOrderPriceLog(preparation.draft, orderNumber)
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
  }, [draft, monthlyEnabled, validation, warehouseController])

  return {
    submiting,
    submitMessage,
    attempted,
    validation,
    handleSubmit
  }
}
