import { ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'

import { useEffect, useMemo, useRef, useState } from 'react'

import {
  BatchConsigneeSection,
  BatchFooter,
  BatchRecognitionSection,
  BatchSenderSection,
  BatchSettingsSection
} from './components/BatchSections'
import {
  BATCH_MAX_CONSIGNEE_COUNT,
  applyBatchQuoteResults,
  batchDraftStorage,
  batchService,
  createBatchSubmitSummary,
  createBatchConsigneeFromRecognition,
  createBatchDraftFromExpressDraft,
  getBatchContactKey,
  mapContactToBatchContact,
  resetBatchQuotes,
  updateBatchConsigneeGoods
} from '../../services/batch'
import { contactSelection } from '../../services/contact'
import { expressDraftStorage } from '../../services/express'
import { AppPage, AppPressable } from '../../shared/components'
import { navigateToAppRoute } from '../../shared/navigation/appNavigation'
import {
  ensureAuthenticated,
  hasValidSession
} from '../../shared/navigation/authGuard'
import { APP_ROUTES } from '../../shared/navigation/routes'
import { createAppRouteUrl } from '../../shared/navigation/routeUrl'
import { copyTextToClipboard } from '../../shared/platform/clipboard'

import type {
  BatchConsigneeDraft,
  BatchDraft,
  BatchEntryActionView
} from '../../services/batch'

import './index.scss'
import './content.scss'
import './messages.scss'

const BatchPage = () => {
  const entry = useMemo(() => batchService.getEntryView(), [])
  const [draft, setDraft] = useState<BatchDraft>(() =>
    batchDraftStorage.restore() ??
    createBatchDraftFromExpressDraft(expressDraftStorage.restore())
  )
  const [recognitionText, setRecognitionText] = useState('')
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [quoteMessage, setQuoteMessage] = useState('')
  const [submiting, setSubmiting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState('')
  const quoteRequestVersion = useRef(0)
  const recognition = useMemo(
    () => batchService.recognizeAddressText(recognitionText),
    [recognitionText]
  )
  const validation = useMemo(
    () => batchService.validateDraft(draft),
    [draft]
  )
  const submitValidation = useMemo(
    () => batchService.validateSubmitDraft(draft),
    [draft]
  )

  useEffect(() => {
    void batchDraftStorage.save(draft)
  }, [draft])

  useDidShow(() => {
    const selection = contactSelection.consumeSelection('sender', 'BATCH')

    if (!selection) {
      return
    }

    setDraft(current =>
      resetBatchQuotes({
        ...current,
        sender: mapContactToBatchContact(selection.contact)
      })
    )
    quoteRequestVersion.current += 1
    setQuoteMessage('发货人已更新，请重新获取价格')
  })

  const showToast = (title: string) => {
    Taro.showToast({
      title,
      icon: 'none'
    })
  }

  const handleAction = async (action: BatchEntryActionView) => {
    if (action.key === 'addressRecognition') {
      showToast(action.disabledReason || '可在下方粘贴地址文本')
      return
    }

    if (action.route) {
      navigateToAppRoute(action.route)
      return
    }

    if (action.copyText) {
      try {
        await copyTextToClipboard(action.copyText)
        showToast('网址已复制')
      } catch {
        showToast('复制失败，请稍后再试')
      }
      return
    }

    showToast(action.disabledReason || '该服务暂不可用')
  }

  const handleSelectSender = () => {
    const params = contactSelection.createParams('sender', 'select', 'BATCH')

    navigateToAppRoute(createAppRouteUrl(APP_ROUTES.contactList, params), {
      login: true
    })
  }

  const handleAddRecognized = () => {
    const additions = recognition.items
      .map(createBatchConsigneeFromRecognition)
      .filter((item): item is BatchConsigneeDraft => !!item)
    const existingKeys = new Set(draft.consignees.map(getBatchContactKey))
    const uniqueAdditions = additions.filter(item => {
      const key = getBatchContactKey(item)

      if (existingKeys.has(key)) {
        return false
      }

      existingKeys.add(key)
      return true
    })

    if (!uniqueAdditions.length) {
      showToast('请先识别新的收货人地址')
      return
    }

    const remaining = BATCH_MAX_CONSIGNEE_COUNT - draft.consignees.length

    if (remaining <= 0) {
      showToast(`最多只能添加 ${BATCH_MAX_CONSIGNEE_COUNT} 个收货人`)
      return
    }

    if (uniqueAdditions.length > remaining) {
      showToast(`最多还能添加 ${remaining} 个收货人`)
    }

    setDraft(current => ({
      ...current,
      consignees: [
        ...current.consignees,
        ...uniqueAdditions.slice(0, remaining)
      ]
    }))
    quoteRequestVersion.current += 1
    setQuoteMessage('收货清单已更新，请获取价格')
  }

  const handleRemoveConsignee = (index: number) => {
    setDraft(current => ({
      ...current,
      consignees: current.consignees.filter(
        (_, itemIndex) => itemIndex !== index
      )
    }))
    quoteRequestVersion.current += 1
  }

  const handleQuote = async () => {
    if (quoteLoading) {
      return
    }

    if (!validation.valid) {
      showToast(validation.message)
      return
    }

    const requestVersion = quoteRequestVersion.current + 1

    quoteRequestVersion.current = requestVersion
    setQuoteLoading(true)
    setQuoteMessage('')

    try {
      const response = await batchService.quoteDraft(draft)

      if (quoteRequestVersion.current !== requestVersion) {
        return
      }

      if (!response.status || !response.result) {
        const message = response.message || '批量价格获取失败，请稍后重试'

        setQuoteMessage(message)
        showToast(message)
        return
      }

      setDraft(current =>
        applyBatchQuoteResults(current, response.result ?? [])
      )
      setQuoteMessage(`已获取 ${response.result.length} 票产品价格`)
    } finally {
      setQuoteLoading(false)
    }
  }

  const handleSubmit = async () => {
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

      void batchDraftStorage.clear()
      navigateToAppRoute(APP_ROUTES.orderList, { login: true })
    } finally {
      setSubmiting(false)
    }
  }

  return (
    <AppPage
      footer={
        <BatchFooter
          count={draft.consignees.length}
          quoteLoading={quoteLoading}
          submitting={submiting}
          onQuote={handleQuote}
          onSubmit={handleSubmit}
        />
      }
      keyboardAvoiding
      safeArea='bottom'
      surface='page'
    >
      <ScrollView className='batch-page' scrollY style={{ flex: 1 }}>
        <View className='batch-header'>
          <Text className='batch-header__title'>{entry.title}</Text>
          <Text className='batch-header__summary'>{entry.summary}</Text>
        </View>

        <BatchSenderSection
          sender={draft.sender}
          onSelect={handleSelectSender}
        />

        <View className='batch-section'>
          <View className='batch-section__head'>
            <Text className='batch-section__title'>可用服务</Text>
          </View>
          {entry.actions.map(action => (
            <AppPressable
              className={`batch-action batch-action--${action.status}`}
              key={action.key}
              onPress={() => handleAction(action)}
            >
              <View className='batch-action__main'>
                <Text className='batch-action__title'>{action.title}</Text>
                <Text className='batch-action__summary'>{action.summary}</Text>
              </View>
              <Text
                className={`batch-action__status batch-action__status--${action.status}`}
              >
                {action.statusText}
              </Text>
            </AppPressable>
          ))}
        </View>

        <BatchRecognitionSection
          recognition={recognition}
          text={recognitionText}
          onAdd={handleAddRecognized}
          onTextChange={setRecognitionText}
        />

        <BatchConsigneeSection
          consignees={draft.consignees}
          maxCount={BATCH_MAX_CONSIGNEE_COUNT}
          onGoodsChange={(index, patch) =>
            {
              quoteRequestVersion.current += 1
              setQuoteMessage('货物信息已更新，请重新获取价格')
              setDraft(current =>
                updateBatchConsigneeGoods(current, index, patch)
              )
            }
          }
          onRemove={handleRemoveConsignee}
        />

        <BatchSettingsSection
          needContact={draft.needContact}
          pickup={draft.pickup}
          onDispatchChange={dispatch => {
            quoteRequestVersion.current += 1
            setQuoteMessage('寄件设置已更新，请重新获取价格')
            setDraft(current =>
              resetBatchQuotes({
                ...current,
                pickup: { ...current.pickup, dispatch }
              })
            )
          }}
          onNeedContactChange={needContact => {
            quoteRequestVersion.current += 1
            setQuoteMessage('联系设置已更新，请重新获取价格')
            setDraft(current =>
              resetBatchQuotes({ ...current, needContact })
            )
          }}
        />

        {quoteMessage && (
          <View className='batch-quote-message'>
            <Text className='batch-quote-message__text'>{quoteMessage}</Text>
          </View>
        )}

        {submitMessage && (
          <View className='batch-submit-message'>
            <Text className='batch-submit-message__text'>{submitMessage}</Text>
          </View>
        )}

        <View className='batch-section'>
          <View className='batch-section__head'>
            <Text className='batch-section__title'>批量规则</Text>
            <Text className='batch-section__hint'>
              最多 {entry.maxConsigneeCount} 票
            </Text>
          </View>
          {entry.rules.map((rule, index) => (
            <View className='batch-rule' key={rule}>
              <Text className='batch-rule__index'>{index + 1}</Text>
              <Text className='batch-rule__text'>{rule}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </AppPage>
  )
}

export default BatchPage
