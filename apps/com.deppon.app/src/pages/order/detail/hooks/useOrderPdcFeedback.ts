import Taro from '@tarojs/taro'

import { useEffect, useMemo, useState } from 'react'

import {
  createOrderPdcFeedbackContext,
  orderPdcFeedbackService
} from '../../../../services/order'

import type {
  OrderDetail,
  OrderPdcFeedbackResult
} from '../../../../services/order'

export function useOrderPdcFeedback(options: {
  detail: OrderDetail | null
  source: string
  publicTrackMode: boolean
}) {
  const [visible, setVisible] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const hasDetail = Boolean(options.detail)
  const orderClassification = options.detail?.orderClassification ?? ''
  const waybillNumber = options.detail?.waybillNumber ?? null
  const context = useMemo(
    () =>
      createOrderPdcFeedbackContext(
        hasDetail
          ? {
              orderClassification,
              waybillNumber
            }
          : null,
        options.source,
        options.publicTrackMode
      ),
    [
      hasDetail,
      orderClassification,
      options.publicTrackMode,
      options.source,
      waybillNumber
    ]
  )

  useEffect(() => {
    let active = true

    setVisible(false)
    setSubmitting(false)

    if (!context) {
      return () => {
        active = false
      }
    }

    void orderPdcFeedbackService
      .queryPending(context)
      .then(response => {
        if (active && response.status && response.result) {
          setVisible(true)
        }
      })
      .catch(() => undefined)

    return () => {
      active = false
    }
  }, [context])

  const close = () => {
    if (!submitting) {
      setVisible(false)
    }
  }

  const submit = async (feedbackResult: OrderPdcFeedbackResult) => {
    if (!context || submitting) {
      return
    }

    setSubmitting(true)

    try {
      const response = await orderPdcFeedbackService.submit(
        context,
        feedbackResult
      )

      if (!response.status) {
        Taro.showToast({
          title: response.message || '反馈提交失败，请稍后再试',
          icon: 'none'
        })
        return
      }

      setVisible(false)
      Taro.showToast({
        title: '感谢您的反馈',
        icon: 'none'
      })
    } catch {
      Taro.showToast({
        title: '反馈提交失败，请检查网络后重试',
        icon: 'none'
      })
    } finally {
      setSubmitting(false)
    }
  }

  return {
    visible,
    submitting,
    close,
    submit
  }
}
