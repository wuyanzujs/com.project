import { useDidShow } from '@tarojs/taro'

import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useRef,
  useState
} from 'react'

import { customerService } from '../../../services/customer'
import {
  clearExpressCollection,
  parseExpressCollectionAmount,
  updateExpressCollectionDetails,
  updateExpressCollectionPricing
} from '../../../services/express'
import { navigateToAppRoute } from '../../../shared/navigation/appNavigation'
import { hasValidSession } from '../../../shared/navigation/authGuard'
import { createAppWebUrl } from '../../../shared/webview/appWeb'
import { appWebMessageBridge } from '../../../shared/webview/appWebMessage'

import type {
  ExpressCollectionType,
  ExpressDraft
} from '../../../services/express'

interface UseExpressCollectionOptions {
  setDraft: Dispatch<SetStateAction<ExpressDraft>>
}

const EXPRESS_COLLECTION_MESSAGE_CONTEXT = 'EXPRESS_DRAFT'
const EXPRESS_COLLECTION_WEB_CONTEXT = {
  source: 'EXPRESS_COLLECTION_ACCOUNT',
  messageContext: EXPRESS_COLLECTION_MESSAGE_CONTEXT
} as const

export function useExpressCollection({
  setDraft
}: UseExpressCollectionOptions) {
  const [capabilityLoading, setCapabilityLoading] = useState(false)
  const [capabilityMessage, setCapabilityMessage] = useState('')
  const requestVersion = useRef(0)

  const loadCapability = useCallback(async () => {
    const version = requestVersion.current + 1

    requestVersion.current = version

    if (!hasValidSession()) {
      setCapabilityMessage('登录后可同步代收额度并选择收款账户')
      return
    }

    setCapabilityLoading(true)
    setCapabilityMessage('')

    try {
      const response = await customerService.queryCustomerCapability()

      if (requestVersion.current !== version) {
        return
      }

      if (!response.status || !response.result) {
        setCapabilityMessage(response.message || '暂未获取到代收货款额度')
        return
      }

      if (!response.result.hasBoundCustomer) {
        setCapabilityMessage('当前账号尚未绑定客户编码')
        return
      }

      if (response.result.collectionLimit) {
        setDraft(current =>
          updateExpressCollectionDetails(current, {
            limit: response.result?.collectionLimit ?? current.collection.limit
          })
        )
      }

      setCapabilityMessage(
        response.result.collectionLimit
          ? `当前代收上限 ${response.result.collectionLimit} 元`
          : '已绑定客户，具体额度以下单校验为准'
      )
    } finally {
      if (requestVersion.current === version) {
        setCapabilityLoading(false)
      }
    }
  }, [setDraft])

  useDidShow(() => {
    const account = appWebMessageBridge.consumeCollectionAccount(
      EXPRESS_COLLECTION_WEB_CONTEXT
    )

    if (!account) {
      appWebMessageBridge.cancelCollectionAccount(
        EXPRESS_COLLECTION_WEB_CONTEXT
      )
      return
    }

    setDraft(current =>
      updateExpressCollectionDetails(current, {
        account: account.account,
        accountName: account.accountName
      })
    )
    setCapabilityMessage('已更新代收货款收款账户')
  })

  const handleEnable = () => {
    setDraft(current =>
      updateExpressCollectionPricing(current, { type: 'NORMAL' })
    )
    void loadCapability()
  }

  const handleTypeChange = (type: ExpressCollectionType) => {
    setDraft(current => updateExpressCollectionPricing(current, { type }))
  }

  const handleAmountChange = (value: string) => {
    setDraft(current =>
      updateExpressCollectionPricing(current, {
        amount: parseExpressCollectionAmount(value)
      })
    )
  }

  const handleOpenAccount = () => {
    if (
      !appWebMessageBridge.expectCollectionAccount(
        EXPRESS_COLLECTION_WEB_CONTEXT
      )
    ) {
      return
    }

    navigateToAppRoute(
      createAppWebUrl({
        source: 'EXPRESS_COLLECTION_ACCOUNT',
        messageContext: EXPRESS_COLLECTION_MESSAGE_CONTEXT
      }),
      {
        login: true,
        message: '请先登录后选择收款账户'
      }
    )
  }

  const handleOpenRules = () => {
    navigateToAppRoute(
      createAppWebUrl({
        source: 'EXPRESS_COLLECTION_RULES',
        auth: false
      })
    )
  }

  const handleToggleAgreement = () => {
    setDraft(current =>
      updateExpressCollectionDetails(current, {
        agreementAccepted: !current.collection.agreementAccepted
      })
    )
  }

  const handleClear = () => {
    setDraft(clearExpressCollection)
    setCapabilityMessage('')
  }

  return {
    capabilityLoading,
    capabilityMessage,
    onAmountChange: handleAmountChange,
    onClear: handleClear,
    onEnable: handleEnable,
    onOpenAccount: handleOpenAccount,
    onOpenRules: handleOpenRules,
    onToggleAgreement: handleToggleAgreement,
    onTypeChange: handleTypeChange,
    onRefreshCapability: loadCapability
  }
}

export type ExpressCollectionController = ReturnType<
  typeof useExpressCollection
>
