import { Input, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'

import { useMemo, useState } from 'react'

import { expressDraftStorage } from '../../../../services/express'
import { templateService } from '../../../../services/template'
import { AppPressable } from '../../../../shared/components'
import { navigateToAppRoute } from '../../../../shared/navigation/appNavigation'
import { ensureAuthenticated } from '../../../../shared/navigation/authGuard'
import { APP_ROUTES } from '../../../../shared/navigation/routes'

import type { ExpressDraft } from '../../../../services/express'


import './index.scss'
import './content.scss'

function getDraftSummary(draft: ExpressDraft) {
  return {
    sender: draft.sender
      ? `${draft.sender.name} · ${draft.sender.city || draft.sender.province}`
      : '--',
    receiver: draft.consignee
      ? `${draft.consignee.name} · ${draft.consignee.city || draft.consignee.province}`
      : '--',
    goods: `${draft.goods.name || '--'} · ${draft.goods.weight || 0}kg`
  }
}

const ExpressTemplateCreatePage = () => {
  const [draft] = useState<ExpressDraft | null>(
    () => templateService.consumeStagedDraft() ?? expressDraftStorage.restore()
  )
  const [name, setName] = useState('')
  const [defaultFlag, setDefaultFlag] = useState<1 | 2>(2)
  const [saving, setSaving] = useState(false)
  const summary = useMemo(
    () => (draft ? getDraftSummary(draft) : null),
    [draft]
  )

  useDidShow(() => {
    ensureAuthenticated({
      redirectUrl: APP_ROUTES.expressTemplateCreate,
      replace: true
    })
  })

  const handleSave = async () => {
    if (!draft || saving) {
      return
    }

    setSaving(true)

    try {
      const response = await templateService.saveDraft(draft, {
        name,
        defaultFlag
      })

      if (!response.status) {
        Taro.showToast({
          title: response.message || '保存失败，请稍后再试',
          icon: 'none'
        })
        return
      }

      Taro.showToast({
        title: '保存成功',
        icon: 'success'
      })
      navigateToAppRoute(APP_ROUTES.expressTemplateList, {
        login: true,
        replace: true
      })
    } finally {
      setSaving(false)
    }
  }

  if (!draft || !summary) {
    return (
      <View className='template-create-page template-create-page--empty'>
        <Text className='template-create-empty__title'>
          暂无可保存的寄件信息
        </Text>
        <AppPressable
          className='template-create-empty__button'
          onPress={() => navigateToAppRoute(APP_ROUTES.express)}
        >
          <Text className='template-create-empty__button-text'>返回寄件页</Text>
        </AppPressable>
      </View>
    )
  }

  return (
    <ScrollView className='template-create-page' scrollY>
      <View className='template-create-section'>
        <Text className='template-create-section__title'>模板名称</Text>
        <Input
          className='template-create-input'
          maxlength={5}
          placeholder='最多5个字'
          value={name}
          onInput={event => setName(event.detail.value.slice(0, 5))}
        />
        <Text className='template-create-count'>{name.length}/5</Text>
      </View>

      <View className='template-create-section'>
        <Text className='template-create-section__title'>模板内容</Text>
        <View className='template-create-row'>
          <Text className='template-create-row__label'>寄件人</Text>
          <Text className='template-create-row__value'>{summary.sender}</Text>
        </View>
        <View className='template-create-row'>
          <Text className='template-create-row__label'>收件人</Text>
          <Text className='template-create-row__value'>{summary.receiver}</Text>
        </View>
        <View className='template-create-row'>
          <Text className='template-create-row__label'>货物</Text>
          <Text className='template-create-row__value'>{summary.goods}</Text>
        </View>
      </View>

      <View className='template-create-section'>
        <Text className='template-create-section__title'>默认模板</Text>
        <View className='template-create-segment'>
          {([2, 1] as const).map(value => (
            <AppPressable flex
              className={
                defaultFlag === value
                  ? 'template-create-segment__item template-create-segment__item--active'
                  : 'template-create-segment__item'
              }
              key={value}
              onPress={() => setDefaultFlag(value)}
            >
              <Text
                className={
                  defaultFlag === value
                    ? 'template-create-segment__text template-create-segment__text--active'
                    : 'template-create-segment__text'
                }
              >
                {value === 1 ? '设为默认' : '普通模板'}
              </Text>
            </AppPressable>
          ))}
        </View>
      </View>

      <AppPressable
        className={
          saving
            ? 'template-create-submit template-create-submit--disabled'
            : 'template-create-submit'
        }
        onPress={handleSave}
      >
        <Text className='template-create-submit__text'>
          {saving ? '保存中' : '保存模板'}
        </Text>
      </AppPressable>
    </ScrollView>
  )
}

export default ExpressTemplateCreatePage
