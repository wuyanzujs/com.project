import { Image, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'

import { useCallback, useRef, useState } from 'react'

import {
  EXPRESS_TEMPLATE_LIMIT,
  templateService
} from '../../../../services/template'
import { navigateToAppRoute } from '../../../../shared/navigation/appNavigation'
import { ensureAuthenticated } from '../../../../shared/navigation/authGuard'
import { APP_ROUTES } from '../../../../shared/navigation/routes'

import type { ExpressTemplateView } from '../../../../services/template'

import './index.scss'

const TEMPLATE_IMAGE = 'https://ca.deppon.com.cn/ows/template/images/6.png'

const ExpressTemplateListPage = () => {
  const [templates, setTemplates] = useState<ExpressTemplateView[]>([])
  const [loading, setLoading] = useState(false)
  const [processingId, setProcessingId] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const loadingRef = useRef(false)

  const loadTemplates = useCallback(async () => {
    if (loadingRef.current) {
      return
    }

    loadingRef.current = true
    setLoading(true)
    setErrorMessage('')

    try {
      const response = await templateService.queryList()

      if (!response.status || !response.result) {
        setTemplates([])
        setErrorMessage(response.message || '暂未获取到寄件模板')
        return
      }

      setTemplates(response.result)
    } finally {
      loadingRef.current = false
      setLoading(false)
    }
  }, [])

  useDidShow(() => {
    if (
      ensureAuthenticated({
        redirectUrl: APP_ROUTES.expressTemplateList,
        replace: true
      })
    ) {
      loadTemplates()
    }
  })

  const handleUse = (template: ExpressTemplateView) => {
    templateService.prepareExpress(template)
    navigateToAppRoute(APP_ROUTES.express, {
      login: true
    })
  }

  const handleSetDefault = async (template: ExpressTemplateView) => {
    if (processingId) {
      return
    }

    setProcessingId(template.id)

    try {
      const response = await templateService.setDefault(template)

      if (!response.status) {
        Taro.showToast({
          title: response.message || '修改失败，请稍后再试',
          icon: 'none'
        })
        return
      }

      await loadTemplates()
      Taro.showToast({
        title: template.isDefault ? '已取消默认' : '已设为默认',
        icon: 'success'
      })
    } finally {
      setProcessingId('')
    }
  }

  const handleDelete = async (template: ExpressTemplateView) => {
    if (processingId) {
      return
    }

    const confirm = await Taro.showModal({
      title: '删除模板',
      content: `删除后不可恢复，确定删除“${template.name}”吗？`,
      confirmText: '确认删除',
      confirmColor: '#b42318'
    })

    if (!confirm.confirm) {
      return
    }

    setProcessingId(template.id)

    try {
      const response = await templateService.delete(template.id)

      if (!response.status) {
        Taro.showToast({
          title: response.message || '删除失败，请稍后再试',
          icon: 'none'
        })
        return
      }

      setTemplates(current => current.filter(item => item.id !== template.id))
      Taro.showToast({
        title: '删除成功',
        icon: 'success'
      })
    } finally {
      setProcessingId('')
    }
  }

  const handleCreate = () => {
    if (templates.length >= EXPRESS_TEMPLATE_LIMIT) {
      Taro.showToast({
        title: `最多只能添加${EXPRESS_TEMPLATE_LIMIT}个模板`,
        icon: 'none'
      })
      return
    }

    navigateToAppRoute(APP_ROUTES.express, {
      login: true
    })
  }

  return (
    <ScrollView className='template-list-page' scrollY>
      <View className='template-list-header'>
        <Text className='template-list-header__label'>Template</Text>
        <Text className='template-list-header__title'>寄件模板</Text>
        <Text className='template-list-header__summary'>
          {templates.length}/{EXPRESS_TEMPLATE_LIMIT}
        </Text>
      </View>

      <View className='template-list-toolbar'>
        <View
          className='template-list-toolbar__button template-list-toolbar__button--quiet'
          onClick={loadTemplates}
        >
          <Text className='template-list-toolbar__text template-list-toolbar__text--quiet'>
            {loading ? '同步中' : '刷新'}
          </Text>
        </View>
        <View className='template-list-toolbar__button' onClick={handleCreate}>
          <Text className='template-list-toolbar__text'>新建模板</Text>
        </View>
      </View>

      <View className='template-list-content'>
        {templates.map(template => (
          <View className='template-card' key={template.id}>
            <View className='template-card__head'>
              <Image className='template-card__image' src={TEMPLATE_IMAGE} />
              <View className='template-card__head-body'>
                <View className='template-card__title-row'>
                  <Text className='template-card__title'>{template.name}</Text>
                  {template.isDefault && (
                    <Text className='template-card__badge'>默认</Text>
                  )}
                </View>
                <Text className='template-card__goods'>
                  {template.goodsText} · {template.weightText}
                </Text>
              </View>
            </View>

            <View className='template-card__route'>
              <View className='template-card__contact'>
                <Text className='template-card__contact-label'>寄</Text>
                <Text className='template-card__contact-value'>
                  {template.senderText}
                </Text>
              </View>
              <Text className='template-card__route-arrow'>→</Text>
              <View className='template-card__contact template-card__contact--end'>
                <Text className='template-card__contact-label template-card__contact-label--receive'>
                  收
                </Text>
                <Text className='template-card__contact-value'>
                  {template.receiverText}
                </Text>
              </View>
            </View>

            {!!template.tags.length && (
              <View className='template-card__tags'>
                {template.tags.map(tag => (
                  <Text className='template-card__tag' key={tag}>
                    {tag}
                  </Text>
                ))}
              </View>
            )}

            <View className='template-card__actions'>
              <View
                className='template-card__button template-card__button--danger'
                onClick={() => handleDelete(template)}
              >
                <Text className='template-card__button-text template-card__button-text--danger'>
                  删除
                </Text>
              </View>
              <View
                className='template-card__button template-card__button--quiet'
                onClick={() => handleSetDefault(template)}
              >
                <Text className='template-card__button-text template-card__button-text--quiet'>
                  {processingId === template.id
                    ? '处理中'
                    : template.isDefault
                      ? '取消默认'
                      : '设为默认'}
                </Text>
              </View>
              <View
                className='template-card__button'
                onClick={() => handleUse(template)}
              >
                <Text className='template-card__button-text'>使用模板</Text>
              </View>
            </View>
          </View>
        ))}

        {!templates.length && !loading && (
          <View className='template-list-empty'>
            <Image
              className='template-list-empty__image'
              src={TEMPLATE_IMAGE}
            />
            <Text className='template-list-empty__title'>
              {errorMessage || '暂无寄件模板'}
            </Text>
            <View
              className='template-list-empty__button'
              onClick={handleCreate}
            >
              <Text className='template-list-empty__button-text'>去新建</Text>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  )
}

export default ExpressTemplateListPage
