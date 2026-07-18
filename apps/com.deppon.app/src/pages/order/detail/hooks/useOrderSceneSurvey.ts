import Taro from '@tarojs/taro'

import { useEffect, useMemo, useRef, useState } from 'react'

import { getCurrentUser } from '../../../../services/auth'
import {
  createOrderSceneSurveyContext,
  orderSceneSurveyOrchestrator
} from '../../../../services/order'
import { APP_RUNTIME_CONFIG } from '../../../../shared/config/runtime'

import type {
  OrderDetail,
  OrderRole,
  OrderSceneSurveyItem,
  OrderSceneSurveySubmitInput
} from '../../../../services/order'

export function useOrderSceneSurvey(options: {
  detail: OrderDetail | null
  role: OrderRole
  source: string
  publicTrackMode: boolean
}) {
  const [items, setItems] = useState<OrderSceneSurveyItem[]>([])
  const [visible, setVisible] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [total, setTotal] = useState(0)
  const [failedCount, setFailedCount] = useState(0)
  const generationRef = useRef(0)
  const submittingRef = useRef(false)
  const currentMobile = getCurrentUser()?.mobile || ''
  const context = useMemo(
    () =>
      createOrderSceneSurveyContext({
        detail: options.detail,
        role: options.role,
        source: options.source,
        publicTrackMode: options.publicTrackMode,
        mobile: currentMobile,
        childChannel: APP_RUNTIME_CONFIG.systemCode
      }),
    [
      currentMobile,
      options.detail,
      options.publicTrackMode,
      options.role,
      options.source
    ]
  )

  useEffect(() => {
    const generation = generationRef.current + 1
    let active = true

    generationRef.current = generation
    submittingRef.current = false
    setItems([])
    setVisible(false)
    setCompleted(false)
    setSubmitting(false)
    setTotal(0)
    setFailedCount(0)

    if (!context) {
      return () => {
        active = false
      }
    }

    void orderSceneSurveyOrchestrator
      .query(context)
      .then(result => {
        if (
          active &&
          generationRef.current === generation &&
          result.items.length
        ) {
          setItems(result.items)
          setTotal(result.items.length)
          setFailedCount(result.failedCount)
          setVisible(true)
        }
      })
      .catch(() => undefined)

    return () => {
      active = false

      if (generationRef.current === generation) {
        generationRef.current += 1
      }
    }
  }, [context])

  const close = () => {
    if (!submittingRef.current) {
      setItems([])
      setVisible(false)
      setCompleted(false)
      setTotal(0)
      setFailedCount(0)
    }
  }

  const submit = async (input: OrderSceneSurveySubmitInput) => {
    const item = items[0]

    if (!context || !item || submittingRef.current) {
      return
    }

    const generation = generationRef.current
    const contextKey = context.key
    const itemKey = item.key

    submittingRef.current = true
    setSubmitting(true)

    try {
      const response = await orderSceneSurveyOrchestrator.submit(
        context,
        item,
        input
      )

      if (
        generationRef.current !== generation ||
        context.key !== contextKey
      ) {
        return
      }

      if (!response.status) {
        Taro.showToast({
          title: response.message || '问卷提交失败，请稍后重试',
          icon: 'none'
        })
        return
      }

      if (items.length === 1) {
        setItems([])
        setCompleted(true)
      } else {
        setItems(current =>
          current[0]?.key === itemKey ? current.slice(1) : current
        )
      }

      Taro.showToast({
        title: '感谢您的反馈',
        icon: 'none'
      })
    } catch {
      if (generationRef.current === generation) {
        Taro.showToast({
          title: '问卷提交失败，请检查网络后重试',
          icon: 'none'
        })
      }
    } finally {
      if (generationRef.current === generation) {
        submittingRef.current = false
        setSubmitting(false)
      }
    }
  }

  return {
    activeItem: items[0] ?? null,
    completed,
    failedCount,
    position: items.length ? total - items.length + 1 : 0,
    submitting,
    total,
    visible,
    close,
    submit
  }
}
