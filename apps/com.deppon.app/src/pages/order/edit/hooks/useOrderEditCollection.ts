import { useDidShow } from '@tarojs/taro'

import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useRef,
  useState
} from 'react'

import { customerService } from '../../../../services/customer'
import {
  clearOrderEditCollection,
  parseOrderEditCollectionAmount,
  updateOrderEditCollection
} from '../../../../services/order'
import { navigateToAppRoute } from '../../../../shared/navigation/appNavigation'
import { createAppWebUrl } from '../../../../shared/webview/appWeb'
import { appWebMessageBridge } from '../../../../shared/webview/appWebMessage'

import type {
  OrderEditCollectionType,
  OrderEditDraft
} from '../../../../services/order'

interface UseOrderEditCollectionOptions {
  orderNumber: string
  setDraft: Dispatch<SetStateAction<OrderEditDraft | null>>
}

function createCollectionMessageContext(orderNumber: string) {
  const normalized = orderNumber.trim()

  return normalized ? 'ORDER_EDIT:' + normalized : ''
}

export function useOrderEditCollection({
  orderNumber,
  setDraft
}: UseOrderEditCollectionOptions) {
  const [capabilityLoading, setCapabilityLoading] = useState(false)
  const [capabilityMessage, setCapabilityMessage] = useState('')
  const requestVersion = useRef(0)
  const messageContext = createCollectionMessageContext(orderNumber)
  const webContext = {
    source: 'ORDER_EDIT_COLLECTION_ACCOUNT',
    messageContext
  } as const

  const patchCollection = useCallback(
    (patch: Partial<OrderEditDraft['collection']>) => {
      setDraft(current =>
        current
          ? {
              ...current,
              collection: updateOrderEditCollection(
                current.collection,
                patch
              )
            }
          : current
      )
    },
    [setDraft]
  )

  const loadCapability = useCallback(async () => {
    const version = requestVersion.current + 1

    requestVersion.current = version
    setCapabilityLoading(true)
    setCapabilityMessage('')

    try {
      const [centerResponse, capabilityResponse] = await Promise.all([
        customerService.queryCustomerCenter(),
        customerService.queryCustomerCapability()
      ])

      if (requestVersion.current !== version) {
        return
      }

      const centerBound =
        centerResponse.status && centerResponse.result?.hasBoundCustomer
      const capability =
        capabilityResponse.status && capabilityResponse.result
          ? capabilityResponse.result
          : null
      const hasBoundCustomer =
        Boolean(centerBound) || Boolean(capability?.hasBoundCustomer)

      if (capability?.collectionLimit) {
        patchCollection({ limit: capability.collectionLimit })
      }

      if (!hasBoundCustomer) {
        setCapabilityMessage('当前账号尚未绑定客户编码')
      } else if (capability?.collectionLimit) {
        setCapabilityMessage(
          '当前代收上限 ' + capability.collectionLimit + ' 元'
        )
      } else {
        setCapabilityMessage('已绑定客户，具体额度以后端修改校验为准')
      }
    } finally {
      if (requestVersion.current === version) {
        setCapabilityLoading(false)
      }
    }
  }, [patchCollection])

  useDidShow(() => {
    if (!messageContext) {
      return
    }

    const account = appWebMessageBridge.consumeCollectionAccount(webContext)

    if (!account) {
      appWebMessageBridge.cancelCollectionAccount(webContext)
      return
    }

    patchCollection({
      account: account.account,
      accountName: account.accountName
    })
    setCapabilityMessage('已更新代收货款收款账户')
  })

  const handleEnable = () => {
    patchCollection({
      enabled: true,
      type: 'NORMAL',
      agreementAccepted: false
    })
    void loadCapability()
  }

  const handleClear = () => {
    setDraft(current =>
      current
        ? {
            ...current,
            collection: clearOrderEditCollection(current.collection)
          }
        : current
    )
    setCapabilityMessage('')
  }

  const handleTypeChange = (type: OrderEditCollectionType) => {
    patchCollection({ type })
  }

  const handleAmountChange = (value: string) => {
    patchCollection({
      amount: parseOrderEditCollectionAmount(value)
    })
  }

  const handleOpenAccount = () => {
    if (
      !messageContext ||
      !appWebMessageBridge.expectCollectionAccount(webContext)
    ) {
      return
    }

    navigateToAppRoute(
      createAppWebUrl({
        source: 'ORDER_EDIT_COLLECTION_ACCOUNT',
        messageContext
      }),
      {
        login: true,
        message: '请先登录后选择收款账户'
      }
    )
  }

  const handleToggleAgreement = () => {
    setDraft(current =>
      current
        ? {
            ...current,
            collection: updateOrderEditCollection(current.collection, {
              agreementAccepted: !current.collection.agreementAccepted
            })
          }
        : current
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

  return {
    capabilityLoading,
    capabilityMessage,
    onAmountChange: handleAmountChange,
    onClear: handleClear,
    onEnable: handleEnable,
    onOpenAccount: handleOpenAccount,
    onOpenRules: handleOpenRules,
    onRefreshCapability: loadCapability,
    onToggleAgreement: handleToggleAgreement,
    onTypeChange: handleTypeChange
  }
}

export type OrderEditCollectionController = ReturnType<
  typeof useOrderEditCollection
>
