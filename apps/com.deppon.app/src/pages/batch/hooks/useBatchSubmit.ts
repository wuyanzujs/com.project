import Taro from '@tarojs/taro'

import { useCallback, useState } from 'react'

import {
  batchDraftStorage,
  batchService,
  createBatchSubmitSummary
} from '@/services/batch'
import type { BatchDraft } from '@/services/batch'
import { navigateToAppRoute } from '@/shared/navigation/appNavigation'
import {
  ensureAuthenticated,
  hasValidSession
} from '@/shared/navigation/authGuard'
import { APP_ROUTES } from '@/shared/navigation/routes'

interface UseBatchSubmitParams {
  draft: BatchDraft
  submitValidation: { valid: boolean; message: string }
  showToast: (title: string) => void
}

interface UseBatchSubmitResult {
  submiting: boolean
  submitMessage: string
  setSubmitMessage: (next: string) => void
  handleSubmit: () => Promise<void>
}

export function useBatchSubmit({
  draft,
  submitValidation,
  showToast
}: UseBatchSubmitParams): UseBatchSubmitResult {
  const [submiting, setSubmiting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState('')

  const handleSubmit = useCallback(async () => {
    if (submiting) {
      return
    }

    setSubmitMessage('')

    if (!submitValidation.valid) {
      showToast(submitValidation.message)
      return
    }

    if (!hasValidSession()) {
      await batchDraftStorage.preserveForLogin(draft)
      ensureAuthenticated({
        redirectUrl: APP_ROUTES.batchExpress,
        replace: true,
        message: '请先登录后提交批量订单'
      })
      return
    }

    setSubmiting(true)

    try {
      const response = await batchService.submitDraft(draft)

      if (!response.status || !response.result) {
        const message = response.message || '批量订单提交失败，请稍后重试'

        setSubmitMessage(message)
        showToast(message)
        return
      }

      const summary = createBatchSubmitSummary(response.result)

      if (summary.status === 'failure') {
        setSubmitMessage(summary.message)
        showToast(summary.message)
        return
      }

      if (summary.status === 'partial') {
        await Taro.showModal({
          title: '部分订单未创建',
          content: summary.message,
          showCancel: false,
          confirmText: '查看订单'
        })
      } else {
        showToast(summary.message)
      }

      await batchDraftStorage.clear()
      navigateToAppRoute(APP_ROUTES.orderList, { login: true })
    } finally {
      setSubmiting(false)
    }
  }, [
    draft,
    showToast,
    submitValidation.message,
    submitValidation.valid,
    submiting
  ])

  return {
    submiting,
    submitMessage,
    setSubmitMessage,
    handleSubmit
  }
}
