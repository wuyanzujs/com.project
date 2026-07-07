import { Input, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'

import { useMemo, useState } from 'react'

import { orderService } from '../../../services/order'

import './index.scss'

const OTHER_REASON = '其他原因'

const CANCEL_REASONS = [
  '计划有变，暂不寄了',
  '收寄信息填写错误',
  '重复下单',
  '价格或服务不符合预期',
  '快递员无法上门',
  OTHER_REASON
]

function getOrderNumber(params: Record<string, string | undefined>) {
  return params.orderNumber || params.orderNo || params.id || ''
}

const OrderCancelPage = () => {
  const router = useRouter()
  const orderNumber = useMemo(
    () => getOrderNumber(router.params as Record<string, string | undefined>),
    [router.params]
  )
  const [selectedReason, setSelectedReason] = useState(CANCEL_REASONS[0])
  const [customReason, setCustomReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  const reason =
    selectedReason === OTHER_REASON ? customReason.trim() : selectedReason

  const handleBack = () => {
    Taro.navigateBack()
  }

  const handleSubmit = async () => {
    if (submitting) {
      return
    }

    if (!orderNumber) {
      Taro.showToast({
        title: '缺少订单号，无法取消',
        icon: 'none'
      })
      return
    }

    if (!reason) {
      Taro.showToast({
        title: '请填写取消原因',
        icon: 'none'
      })
      return
    }

    setSubmitting(true)
    setMessage('')

    let shouldResetSubmitting = true

    try {
      const response = await orderService.cancelOrder(orderNumber, reason)

      if (!response.status) {
        const errorMessage = response.message || '取消失败，请稍后重试'

        setMessage(errorMessage)
        Taro.showToast({
          title: errorMessage,
          icon: 'none'
        })
        return
      }

      Taro.showToast({
        title: '订单已取消',
        icon: 'none'
      })

      shouldResetSubmitting = false

      setTimeout(() => {
        Taro.navigateBack()
      }, 600)
    } finally {
      if (shouldResetSubmitting) {
        setSubmitting(false)
      }
    }
  }

  return (
    <ScrollView className='order-cancel-page' scrollY>
      <View className='order-cancel-header'>
        <Text className='order-cancel-header__label'>Order</Text>
        <Text className='order-cancel-header__title'>取消订单</Text>
        <Text className='order-cancel-header__summary'>
          {orderNumber ? `订单 ${orderNumber}` : '订单号缺失'}
        </Text>
      </View>

      <View className='order-cancel-section'>
        <Text className='order-cancel-section__title'>取消原因</Text>
        <View className='order-cancel-reasons'>
          {CANCEL_REASONS.map((item) => (
            <View
              className={
                item === selectedReason
                  ? 'order-cancel-reason order-cancel-reason--active'
                  : 'order-cancel-reason'
              }
              key={item}
              onClick={() => {
                setSelectedReason(item)
                setMessage('')
              }}
            >
              <Text
                className={
                  item === selectedReason
                    ? 'order-cancel-reason__text order-cancel-reason__text--active'
                    : 'order-cancel-reason__text'
                }
              >
                {item}
              </Text>
            </View>
          ))}
        </View>

        {selectedReason === OTHER_REASON && (
          <View className='order-cancel-custom'>
            <Input
              className='order-cancel-custom__input'
              maxlength={60}
              placeholder='请输入取消原因'
              value={customReason}
              onInput={(event) => {
                setCustomReason(event.detail.value)
                setMessage('')
              }}
            />
          </View>
        )}

        {message && (
          <Text className='order-cancel-message'>{message}</Text>
        )}
      </View>

      <View className='order-cancel-actions'>
        <View className='order-cancel-secondary' onClick={handleBack}>
          <Text className='order-cancel-secondary__text'>暂不取消</Text>
        </View>
        <View className='order-cancel-primary' onClick={handleSubmit}>
          <Text className='order-cancel-primary__text'>
            {submitting ? '提交中' : '确认取消'}
          </Text>
        </View>
      </View>
    </ScrollView>
  )
}

export default OrderCancelPage
