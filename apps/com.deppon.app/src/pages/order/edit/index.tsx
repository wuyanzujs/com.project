import { ScrollView } from '@tarojs/components'
import Taro, { useDidShow, useRouter } from '@tarojs/taro'

import { useMemo, useRef, useState } from 'react'

import { OrderEditActions } from './components/OrderEditActions'
import { OrderEditCollectionSection } from './components/OrderEditCollectionSection'
import { OrderEditContactSection } from './components/OrderEditContactSection'
import { OrderEditGoodsSection } from './components/OrderEditGoodsSection'
import { OrderEditIdentity } from './components/OrderEditIdentity'
import { OrderEditInsuranceSection } from './components/OrderEditInsuranceSection'
import { OrderEditLoadState } from './components/OrderEditLoadState'
import { OrderEditMessage } from './components/OrderEditMessage'
import { OrderEditPackagingSection } from './components/OrderEditPackagingSection'
import { OrderEditScheduleSection } from './components/OrderEditScheduleSection'
import { useOrderEditCollection } from './hooks/useOrderEditCollection'
import { useOrderEditSchedule } from './hooks/useOrderEditSchedule'
import { expressInsuranceRules } from '../../../services/express'
import {
  buildOrderModifyRequest,
  createOrderEditDraft,
  getOrderEditUnavailableMessage,
  orderEditService,
  orderService,
  updateOrderEditPackagingCount,
  updateOrderEditInsuranceAmount,
  validateOrderEditDraft
} from '../../../services/order'
import { navigateToAppRoute } from '../../../shared/navigation/appNavigation'
import { ensureAuthenticated } from '../../../shared/navigation/authGuard'
import { APP_ROUTES } from '../../../shared/navigation/routes'
import { createAppRouteUrl } from '../../../shared/navigation/routeUrl'

import type { OrderEditContact, OrderEditDraft } from '../../../services/order'

import './index.scss'

function getOrderNumber(params: Record<string, string | undefined>) {
  return params.orderNumber || params.orderNo || params.id || ''
}

const OrderEditPage = () => {
  const router = useRouter()
  const orderNumber = useMemo(
    () => getOrderNumber(router.params as Record<string, string | undefined>),
    [router.params]
  )
  const [draft, setDraft] = useState<OrderEditDraft | null>(null)
  const [origin, setOrigin] = useState<OrderEditDraft | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const loadingRef = useRef(false)
  const loadedOrderRef = useRef('')
  const collectionController = useOrderEditCollection({
    orderNumber,
    setDraft
  })
  const scheduleController = useOrderEditSchedule({ draft, setDraft })
  const editUrl = useMemo(
    () => createAppRouteUrl(APP_ROUTES.orderEdit, { orderNumber }),
    [orderNumber]
  )
  const validation = useMemo(
    () => (draft ? validateOrderEditDraft(draft) : null),
    [draft]
  )
  const preview = useMemo(
    () => (draft && origin ? buildOrderModifyRequest(draft, origin) : null),
    [draft, origin]
  )

  const loadOrder = async (force = false) => {
    if (loadingRef.current) {
      return
    }

    if (!force && loadedOrderRef.current === orderNumber) {
      return
    }

    if (!ensureAuthenticated({ redirectUrl: editUrl, replace: true })) {
      return
    }

    if (!orderNumber) {
      setErrorMessage('缺少订单号，无法修改')
      return
    }

    loadingRef.current = true
    loadedOrderRef.current = orderNumber
    setLoading(true)
    setErrorMessage('')

    try {
      const response = await orderService.queryDetail({ orderNumber })

      if (!response.status || !response.result) {
        setDraft(null)
        setOrigin(null)
        setErrorMessage(response.message || '暂未获取到订单详情')
        return
      }

      const unavailableMessage = getOrderEditUnavailableMessage(
        response.result
      )

      if (unavailableMessage) {
        setDraft(null)
        setOrigin(null)
        setErrorMessage(unavailableMessage)
        return
      }

      const nextDraft = createOrderEditDraft(response.result)

      setDraft(nextDraft)
      setOrigin(nextDraft)

      if (nextDraft.collection.enabled) {
        void collectionController.onRefreshCapability()
      }
    } finally {
      loadingRef.current = false
      setLoading(false)
    }
  }

  useDidShow(() => {
    void loadOrder()
  })

  const updateDraft = (patch: Partial<OrderEditDraft>) => {
    setDraft(current => (current ? { ...current, ...patch } : current))
    setErrorMessage('')
  }

  const updateContact = (
    role: 'sender' | 'receiver',
    patch: Partial<OrderEditContact>
  ) => {
    setDraft(current =>
      current
        ? {
            ...current,
            [role]: {
              ...current[role],
              ...patch
            }
          }
        : current
    )
    setErrorMessage('')
  }

  const updateInsuranceAmount = (value: string) => {
    setDraft(current =>
      current
        ? {
            ...current,
            insurance: updateOrderEditInsuranceAmount(
              current.insurance,
              value
            )
          }
        : current
    )
    setErrorMessage('')
  }

  const updatePackagingCount = (value: number) => {
    setDraft(current =>
      current
        ? {
            ...current,
            packaging: updateOrderEditPackagingCount(
              current.packaging,
              value
            )
          }
        : current
    )
    setErrorMessage('')
  }

  const handleSubmit = async () => {
    if (!draft || !origin || submitting) {
      return
    }

    if (!validation?.valid) {
      Taro.showToast({
        title: validation?.messages[0] || '请检查订单信息',
        icon: 'none'
      })
      return
    }

    if (!preview?.changed) {
      Taro.showToast({
        title: '您还没有修改订单信息',
        icon: 'none'
      })
      return
    }

    const confirm = await Taro.showModal({
      title: '确认修改',
      content: `本次将修改：${preview.changedFields.join('、')}`,
      cancelText: '继续检查',
      confirmText: '确认提交'
    })

    if (!confirm.confirm) {
      return
    }

    setSubmitting(true)

    try {
      const response = await orderEditService.submit(draft, origin)

      if (!response.status) {
        const message = response.message || '修改失败，请稍后再试'

        setErrorMessage(message)
        Taro.showToast({ title: message, icon: 'none' })
        return
      }

      Taro.showToast({
        title: '修改成功',
        icon: 'success'
      })
      setTimeout(() => Taro.navigateBack(), 600)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ScrollView className='order-edit-page' scrollY>
      <OrderEditLoadState
        errorMessage={errorMessage}
        hasDraft={!!draft}
        loading={loading}
        onReload={() => void loadOrder(true)}
      />

      {draft && (
        <>
          <OrderEditIdentity orderNumber={orderNumber} />
          <OrderEditContactSection
            contact={draft.sender}
            title='寄件人'
            onChange={patch => updateContact('sender', patch)}
          />
          <OrderEditContactSection
            contact={draft.receiver}
            title='收件人'
            onChange={patch => updateContact('receiver', patch)}
          />
          <OrderEditGoodsSection draft={draft} onChange={updateDraft} />
          <OrderEditPackagingSection
            packaging={draft.packaging}
            onCountChange={updatePackagingCount}
          />
          <OrderEditScheduleSection
            controller={scheduleController}
            draft={draft}
          />
          <OrderEditInsuranceSection
            insurance={draft.insurance}
            onAmountChange={updateInsuranceAmount}
            onOpenRules={() =>
              navigateToAppRoute(
                expressInsuranceRules.createRuleRoute('NORMAL')
              )
            }
          />
          <OrderEditCollectionSection
            collection={draft.collection}
            controller={collectionController}
          />

          {!!errorMessage && (
            <OrderEditMessage message={errorMessage} />
          )}

          <OrderEditActions
            disabled={submitting || !preview?.changed}
            submitting={submitting}
            onCancel={() => Taro.navigateBack()}
            onSubmit={handleSubmit}
          />
        </>
      )}
    </ScrollView>
  )
}

export default OrderEditPage
