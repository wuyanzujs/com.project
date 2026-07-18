import Taro, { useDidShow } from '@tarojs/taro'

import { type Dispatch, type SetStateAction, useRef } from 'react'

import {
  isExpressCloudSignType,
  isExpressReturnBillTypeSupported,
  updateExpressReturnBillDraft
} from '../../../services/express'
import { navigateToAppRoute } from '../../../shared/navigation/appNavigation'
import {
  ensureAuthenticated,
  hasValidSession
} from '../../../shared/navigation/authGuard'
import { APP_ROUTES } from '../../../shared/navigation/routes'
import { createAppWebUrl } from '../../../shared/webview/appWeb'
import { appWebMessageBridge } from '../../../shared/webview/appWebMessage'

import type {
  ExpressDraft,
  ExpressProductQuote,
  ExpressReturnBillDraft
} from '../../../services/express'

interface UseExpressReturnBillOptions {
  draft: ExpressDraft
  setDraft: Dispatch<SetStateAction<ExpressDraft>>
  restoreQuotes: (quotes: ExpressProductQuote[]) => void
}

function getReturnBillProductCode(draft: ExpressDraft) {
  return draft.selectedProduct?.omsProductCode || draft.service.transportMode
}

export function useExpressReturnBill({
  draft,
  restoreQuotes,
  setDraft
}: UseExpressReturnBillOptions) {
  const messageContextRef = useRef('')
  const latestDraft = useRef(draft)

  latestDraft.current = draft

  useDidShow(() => {
    const messageContext = messageContextRef.current

    if (!messageContext) {
      return
    }

    const result = appWebMessageBridge.consumeOnlineSign({ messageContext })

    messageContextRef.current = ''

    if (!result) {
      appWebMessageBridge.cancelOnlineSign({ messageContext })
      return
    }

    const currentDraft = latestDraft.current

    if (
      !isExpressCloudSignType(currentDraft.service.returnBill.type) ||
      !isExpressReturnBillTypeSupported(
        currentDraft.service.returnBill.type,
        getReturnBillProductCode(currentDraft)
      )
    ) {
      Taro.showToast({
        title: '当前产品不支持电子云签',
        icon: 'none'
      })
      return
    }

    setDraft(current => ({
      ...current,
      service: {
        ...current.service,
        returnBill: updateExpressReturnBillDraft(
          current.service.returnBill,
          { fileCode: result.fileCode },
          getReturnBillProductCode(current)
        )
      },
      selectedProduct: null,
      agreementAccepted: false,
      quoteStaleReason: '电子云签已更新，请重新获取价格'
    }))
    restoreQuotes([])
    Taro.showToast({
      title: '电子云签已回填，请重新获取价格',
      icon: 'none'
    })
  })

  const handleChange = (patch: Partial<ExpressReturnBillDraft>) => {
    restoreQuotes([])
    setDraft(current => ({
      ...current,
      service: {
        ...current.service,
        returnBill: updateExpressReturnBillDraft(
          current.service.returnBill,
          patch,
          getReturnBillProductCode(current)
        )
      },
      selectedProduct: null,
      agreementAccepted: false,
      quoteStaleReason: '签收单返单变化，请重新获取价格'
    }))
  }

  const handleOpenCloudSign = () => {
    const currentDraft = latestDraft.current

    if (!hasValidSession()) {
      ensureAuthenticated({
        redirectUrl: APP_ROUTES.express,
        message: '请先登录后进行电子云签'
      })
      return
    }

    if (
      !isExpressCloudSignType(currentDraft.service.returnBill.type) ||
      !isExpressReturnBillTypeSupported(
        currentDraft.service.returnBill.type,
        getReturnBillProductCode(currentDraft)
      )
    ) {
      return
    }

    const messageContext = `EXPRESS_RETURN_BILL:${Date.now()}`

    if (!appWebMessageBridge.expectOnlineSign({ messageContext })) {
      Taro.showToast({
        title: '电子云签暂不可用，请重试',
        icon: 'none'
      })
      return
    }

    messageContextRef.current = messageContext

    const fileCode = encodeURIComponent(
      currentDraft.service.returnBill.fileCode
    )
    const navigated = navigateToAppRoute(
      createAppWebUrl({
        source: 'EXPRESS_RETURN_BILL_CLOUD_SIGN',
        uri: `/depponmobile/electronCloudSign/index?fileCode=${fileCode}`,
        messageContext
      }),
      { login: true }
    )

    if (!navigated) {
      messageContextRef.current = ''
      appWebMessageBridge.cancelOnlineSign({ messageContext })
    }
  }

  return {
    onChange: handleChange,
    onOpenCloudSign: handleOpenCloudSign
  }
}
