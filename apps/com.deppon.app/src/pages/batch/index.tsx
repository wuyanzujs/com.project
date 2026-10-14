import { ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'

import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  BATCH_MAX_CONSIGNEE_COUNT,
  batchDraftStorage,
  batchService,
  createBatchConsigneeFromRecognition,
  createBatchDraftFromExpressDraft,
  getBatchContactKey,
  mapContactToBatchContact,
  resetBatchQuotes,
  updateBatchConsigneeGoods
} from '@/services/batch'
import type { BatchConsigneeDraft, BatchDraft, BatchEntryActionView } from '@/services/batch'
import { contactSelection } from '@/services/contact'
import { expressDraftStorage } from '@/services/express'
import { AppPage, AppPressable } from '@/shared/components'
import { navigateToAppRoute } from '@/shared/navigation/appNavigation'
import { APP_ROUTES } from '@/shared/navigation/routes'
import { createAppRouteUrl } from '@/shared/navigation/routeUrl'
import { copyTextToClipboard } from '@/shared/platform/clipboard'

import { BatchConsigneeSection, BatchFooter, BatchRecognitionSection, BatchSenderSection, BatchSettingsSection } from './components/BatchSections'
import { useBatchQuote } from './hooks/useBatchQuote'
import { useBatchSubmit } from './hooks/useBatchSubmit'

import './index.scss'
import './content.scss'
import './messages.scss'

const BatchPage = () => {
  const entry = useMemo(() => batchService.getEntryView(), [])
  const [draft, setDraft] = useState<BatchDraft>(() => batchDraftStorage.restore() ?? createBatchDraftFromExpressDraft(expressDraftStorage.restore()))
  const [recognitionText, setRecognitionText] = useState('')
  const recognition = useMemo(() => batchService.recognizeAddressText(recognitionText), [recognitionText])
  const validation = useMemo(() => batchService.validateDraft(draft), [draft])
  const submitValidation = useMemo(() => batchService.validateSubmitDraft(draft), [draft])

  const showToast = useCallback((title: string) => {
    Taro.showToast({
      title,
      icon: 'none'
    })
  }, [])

  const quote = useBatchQuote({ draft, setDraft, validation, showToast })
  const submit = useBatchSubmit({
    draft,
    submitValidation,
    showToast
  })

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
    quote.quoteRequestVersion.current += 1
    quote.setQuoteMessage('发货人已更新，请重新获取价格')
  })

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
    const additions = recognition.items.map(createBatchConsigneeFromRecognition).filter((item): item is BatchConsigneeDraft => !!item)
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
      consignees: [...current.consignees, ...uniqueAdditions.slice(0, remaining)]
    }))
    quote.quoteRequestVersion.current += 1
    quote.setQuoteMessage('收货清单已更新，请获取价格')
  }

  const handleRemoveConsignee = (index: number) => {
    setDraft(current => ({
      ...current,
      consignees: current.consignees.filter((_, itemIndex) => itemIndex !== index)
    }))
    quote.quoteRequestVersion.current += 1
  }

  return (
    <AppPage
      footer={
        <BatchFooter
          count={draft.consignees.length}
          quoteLoading={quote.quoteLoading}
          submitting={submit.submiting}
          onQuote={quote.handleQuote}
          onSubmit={submit.handleSubmit}
        />
      }
      keyboardAvoiding
      safeArea='bottom'
      statusBar='dark'
      surface='page'
    >
      <ScrollView className='batch-page' scrollY style={{ flex: 1 }}>
        <View className='batch-header'>
          <Text className='batch-header__title'>{entry.title}</Text>
          <Text className='batch-header__summary'>{entry.summary}</Text>
        </View>

        <BatchSenderSection sender={draft.sender} onSelect={handleSelectSender} />

        <View className='batch-section'>
          <View className='batch-section__head'>
            <Text className='batch-section__title'>可用服务</Text>
          </View>
          {entry.actions.map(action => (
            <AppPressable className={`batch-action batch-action--${action.status}`} key={action.key} onPress={() => handleAction(action)}>
              <View className='batch-action__main'>
                <Text className='batch-action__title'>{action.title}</Text>
                <Text className='batch-action__summary'>{action.summary}</Text>
              </View>
              <Text className={`batch-action__status batch-action__status--${action.status}`}>{action.statusText}</Text>
            </AppPressable>
          ))}
        </View>

        <BatchRecognitionSection recognition={recognition} text={recognitionText} onAdd={handleAddRecognized} onTextChange={setRecognitionText} />

        <BatchConsigneeSection
          consignees={draft.consignees}
          maxCount={BATCH_MAX_CONSIGNEE_COUNT}
          onGoodsChange={(index, patch) => {
            quote.quoteRequestVersion.current += 1
            quote.setQuoteMessage('货物信息已更新，请重新获取价格')
            setDraft(current => updateBatchConsigneeGoods(current, index, patch))
          }}
          onRemove={handleRemoveConsignee}
        />

        <BatchSettingsSection
          needContact={draft.needContact}
          pickup={draft.pickup}
          onDispatchChange={dispatch => {
            quote.quoteRequestVersion.current += 1
            quote.setQuoteMessage('寄件设置已更新，请重新获取价格')
            setDraft(current =>
              resetBatchQuotes({
                ...current,
                pickup: { ...current.pickup, dispatch }
              })
            )
          }}
          onNeedContactChange={needContact => {
            quote.quoteRequestVersion.current += 1
            quote.setQuoteMessage('联系设置已更新，请重新获取价格')
            setDraft(current => resetBatchQuotes({ ...current, needContact }))
          }}
        />

        {quote.quoteMessage && (
          <View className='batch-quote-message'>
            <Text className='batch-quote-message__text'>{quote.quoteMessage}</Text>
          </View>
        )}

        {submit.submitMessage && (
          <View className='batch-submit-message'>
            <Text className='batch-submit-message__text'>{submit.submitMessage}</Text>
          </View>
        )}

        <View className='batch-section'>
          <View className='batch-section__head'>
            <Text className='batch-section__title'>批量规则</Text>
            <Text className='batch-section__hint'>最多 {entry.maxConsigneeCount} 票</Text>
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
