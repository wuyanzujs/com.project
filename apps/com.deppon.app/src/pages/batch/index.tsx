import { ScrollView, Text, Textarea, View } from '@tarojs/components'
import Taro from '@tarojs/taro'

import { useMemo, useState } from 'react'

import { batchService } from '../../services/batch'
import {
  createExpressDraft,
  expressDraftBridge,
  expressDraftStorage
} from '../../services/express'
import { navigateToAppRoute } from '../../shared/navigation/appNavigation'
import { APP_ROUTES } from '../../shared/navigation/routes'
import { copyTextToClipboard } from '../../shared/platform/clipboard'

import type {
  BatchEntryActionView,
  BatchRecognizedConsignee
} from '../../services/batch'

import './index.scss'

function getActionClassName(action: BatchEntryActionView) {
  return `batch-action batch-action--${action.status}`
}

function getActionStatusClassName(action: BatchEntryActionView) {
  return `batch-action__status batch-action__status--${action.status}`
}

function createDraftFromRecognizedItem(item: BatchRecognizedConsignee) {
  const baseDraft = expressDraftStorage.restore() ?? createExpressDraft()

  if (!item.contact) {
    return baseDraft
  }

  return {
    ...baseDraft,
    consignee: {
      name: item.contact.name,
      mobile: item.contact.mobile,
      province: item.contact.province,
      city: item.contact.city,
      county: item.contact.county,
      address: item.contact.address
    },
    goods: {
      ...baseDraft.goods,
      name: item.goodsName || baseDraft.goods.name
    },
    selectedProduct: null,
    agreementAccepted: false,
    quoteStaleReason: '批量识别带入，请重新获取价格'
  }
}

const BatchPage = () => {
  const entry = useMemo(() => batchService.getEntryView(), [])
  const [recognitionText, setRecognitionText] = useState('')
  const recognition = useMemo(
    () => batchService.recognizeAddressText(recognitionText),
    [recognitionText]
  )
  const firstReadyItem = recognition.items.find(
    (item) => item.status === 'ready'
  )

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

  const handleCarryFirstRecognized = () => {
    if (!firstReadyItem) {
      showToast('请先粘贴并识别可用收货人')
      return
    }

    expressDraftBridge.carryFromBatchRecognition(
      createDraftFromRecognizedItem(firstReadyItem)
    )
    navigateToAppRoute(APP_ROUTES.express)
  }

  return (
    <ScrollView className='batch-page' scrollY>
      <View className='batch-header'>
        <Text className='batch-header__title'>{entry.title}</Text>
        <Text className='batch-header__summary'>{entry.summary}</Text>
      </View>

      <View className='batch-section'>
        <View className='batch-section__head'>
          <Text className='batch-section__title'>可用服务</Text>
        </View>
        {entry.actions.map((action) => (
          <View
            className={getActionClassName(action)}
            key={action.key}
            onClick={() => handleAction(action)}
          >
            <View className='batch-action__main'>
              <Text className='batch-action__title'>{action.title}</Text>
              <Text className='batch-action__summary'>{action.summary}</Text>
            </View>
            <Text className={getActionStatusClassName(action)}>
              {action.statusText}
            </Text>
          </View>
        ))}
      </View>

      <View className='batch-section'>
        <View className='batch-section__head'>
          <Text className='batch-section__title'>批量识别</Text>
          <Text className='batch-section__hint'>
            已识别 {recognition.acceptedCount} 条
          </Text>
        </View>
        <Textarea
          className='batch-recognition__input'
          maxlength={2000}
          placeholder={'每行一票，例如：\n李四 13900139000 广东省 深圳市 南山区 科技园科苑路200号 文件'}
          value={recognitionText}
          onInput={(event) => setRecognitionText(event.detail.value)}
        />
        <View className='batch-recognition__summary'>
          <Text className='batch-recognition__summary-text'>
            共 {recognition.totalLines} 行，可用 {recognition.acceptedCount} 行，异常{' '}
            {recognition.rejectedCount} 行
            {recognition.ignoredCount
              ? `，超出上限忽略 ${recognition.ignoredCount} 行`
              : ''}
          </Text>
        </View>
        <View
          className={
            firstReadyItem
              ? 'batch-recognition__carry'
              : 'batch-recognition__carry batch-recognition__carry--disabled'
          }
          onClick={handleCarryFirstRecognized}
        >
          <Text
            className={
              firstReadyItem
                ? 'batch-recognition__carry-text'
                : 'batch-recognition__carry-text batch-recognition__carry-text--disabled'
            }
          >
            带入首条寄件
          </Text>
        </View>
        {recognition.items.map((item) => (
          <View
            className={
              item.status === 'ready'
                ? 'batch-recognized'
                : 'batch-recognized batch-recognized--error'
            }
            key={`${item.lineNumber}-${item.rawText}`}
          >
            <View className='batch-recognized__head'>
              <Text className='batch-recognized__title'>
                第 {item.lineNumber} 行
              </Text>
              <Text
                className={
                  item.status === 'ready'
                    ? 'batch-recognized__status'
                    : 'batch-recognized__status batch-recognized__status--error'
                }
              >
                {item.message}
              </Text>
            </View>
            {item.contact ? (
              <>
                <Text className='batch-recognized__text'>
                  {item.contact.name} {item.contact.mobile}
                </Text>
                <Text className='batch-recognized__text'>
                  {item.contact.province} {item.contact.city}{' '}
                  {item.contact.county} {item.contact.address}
                </Text>
                <Text className='batch-recognized__text'>
                  货物：{item.goodsName}
                </Text>
              </>
            ) : (
              <Text className='batch-recognized__text'>{item.rawText}</Text>
            )}
          </View>
        ))}
        {!recognition.items.length && (
          <Text className='batch-recognition__empty'>
            先粘贴地址文本，App 会在本地做格式识别和基础校验。
          </Text>
        )}
      </View>

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
  )
}

export default BatchPage
