import { ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow, useRouter } from '@tarojs/taro'

import { useMemo, useRef, useState } from 'react'

import { OrderEditContactSection } from './components/OrderEditContactSection'
import { OrderEditGoodsSection } from './components/OrderEditGoodsSection'
import {
  buildOrderModifyRequest,
  createOrderEditDraft,
  orderEditService,
  orderService,
  validateOrderEditDraft
} from '../../../services/order'
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

  const loadOrder = async () => {
    if (loadingRef.current) {
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

      if (
        Number(response.result.orderClassification) !== 0 ||
        response.result.modifyFlag === false
      ) {
        setDraft(null)
        setOrigin(null)
        setErrorMessage('当前订单状态不支持修改')
        return
      }

      const nextDraft = createOrderEditDraft(response.result)

      setDraft(nextDraft)
      setOrigin(nextDraft)
    } finally {
      loadingRef.current = false
      setLoading(false)
    }
  }

  useDidShow(() => {
    loadOrder()
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
      {loading && !draft && (
        <Text className='order-edit-loading'>正在加载订单...</Text>
      )}

      {!loading && !draft && (
        <View className='order-edit-empty'>
          <Text className='order-edit-empty__title'>
            {errorMessage || '暂无法修改订单'}
          </Text>
          <View className='order-edit-empty__button' onClick={loadOrder}>
            <Text className='order-edit-empty__button-text'>重新加载</Text>
          </View>
        </View>
      )}

      {draft && (
        <>
          <Text className='order-edit-identity'>订单 {orderNumber}</Text>
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

          {!!errorMessage && (
            <Text className='order-edit-message'>{errorMessage}</Text>
          )}

          <View className='order-edit-actions'>
            <View
              className='order-edit-actions__secondary'
              onClick={() => Taro.navigateBack()}
            >
              <Text className='order-edit-actions__secondary-text'>取消</Text>
            </View>
            <View
              className={
                submitting || !preview?.changed
                  ? 'order-edit-actions__primary order-edit-actions__primary--disabled'
                  : 'order-edit-actions__primary'
              }
              onClick={handleSubmit}
            >
              <Text className='order-edit-actions__primary-text'>
                {submitting ? '提交中' : '保存修改'}
              </Text>
            </View>
          </View>
        </>
      )}
    </ScrollView>
  )
}

export default OrderEditPage
