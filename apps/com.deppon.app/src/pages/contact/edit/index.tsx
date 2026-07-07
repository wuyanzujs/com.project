import { Input, ScrollView, Text, Textarea, View } from '@tarojs/components'
import Taro, { useLoad, useRouter } from '@tarojs/taro'

import { useMemo, useState } from 'react'

import {
  contactSelection,
  contactService,
  createEmptyContact,
  validateContact
} from '../../../services/contact'
import { ensureAuthenticated } from '../../../shared/navigation/authGuard'
import { APP_ROUTES } from '../../../shared/navigation/routes'

import type { Contact } from '../../../services/contact'

import './index.scss'

function getRoleByTarget(target: 'sender' | 'consignee'): Contact['type'] {
  return target === 'sender' ? 0 : 1
}

function createQuery(params: Record<string, string>) {
  return Object.entries(params)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&')
}

const ContactEditPage = () => {
  const router = useRouter()
  const selectionParams = useMemo(
    () =>
      contactSelection.parseParams(
        router.params as Record<string, string | undefined>
      ),
    [router.params]
  )
  const [contact, setContact] = useState<Contact>(() =>
    createEmptyContact(getRoleByTarget(selectionParams.target))
  )
  const [analysisText, setAnalysisText] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [saving, setSaving] = useState(false)
  const validation = useMemo(() => validateContact(contact), [contact])
  const contactEditUrl = useMemo(
    () => `${APP_ROUTES.contactEdit}?${createQuery(selectionParams)}`,
    [selectionParams]
  )
  const ensureContactEditAccess = () =>
    ensureAuthenticated({
      redirectUrl: contactEditUrl,
      replace: true
    })

  useLoad(() => {
    if (!ensureContactEditAccess()) {
      return
    }

    const editingContact = contactSelection.consumeEditingContact()

    if (editingContact) {
      setContact(editingContact)
      return
    }

    setContact(createEmptyContact(getRoleByTarget(selectionParams.target)))
  })

  const updateContact = (patch: Partial<Contact>) => {
    setContact((current) => ({
      ...current,
      ...patch
    }))
  }

  const handleAnalyze = async () => {
    if (!ensureContactEditAccess() || analyzing) {
      return
    }

    const value = analysisText.trim()

    if (!value) {
      Taro.showToast({
        title: '请先粘贴地址文本',
        icon: 'none'
      })
      return
    }

    setAnalyzing(true)

    try {
      const response = await contactService.analyze(value)

      if (!response.status || !response.result) {
        Taro.showToast({
          title: response.message || '识别失败，请手动填写',
          icon: 'none'
        })
        return
      }

      const analysis = response.result

      setContact((current) =>
        contactService.applyAnalysisToContact(current, analysis)
      )
      Taro.showToast({
        title: '识别成功，请核对',
        icon: 'none'
      })
    } finally {
      setAnalyzing(false)
    }
  }

  const handleSave = async () => {
    if (!ensureContactEditAccess()) {
      return
    }

    if (!validation.valid) {
      Taro.showToast({
        title: validation.messages[0],
        icon: 'none'
      })
      return
    }

    setSaving(true)

    try {
      const response = await contactService.save(contact)

      if (!response.status) {
        Taro.showToast({
          title: response.message || '保存地址失败',
          icon: 'none'
        })
        return
      }

      const savedContact = response.result ?? contact

      if (selectionParams.mode === 'select') {
        contactSelection.select(selectionParams.target, savedContact)
        Taro.navigateBack({ delta: Number(selectionParams.returnDelta) })
        return
      }

      Taro.navigateBack()
    } finally {
      setSaving(false)
    }
  }

  return (
    <ScrollView className='contact-edit-page' scrollY>
      <View className='contact-edit-header'>
        <Text className='contact-edit-header__label'>Contact</Text>
        <Text className='contact-edit-header__title'>
          {contact.id ? '编辑地址' : '新增地址'}
        </Text>
        <Text className='contact-edit-header__summary'>
          先用可保存的基础表单承接地址能力，城市选择器、通讯录和地图定位后续接入。
        </Text>
      </View>

      <View className='contact-edit-analysis'>
        <View className='contact-edit-analysis__head'>
          <Text className='contact-edit-analysis__title'>智能识别</Text>
          <View className='contact-edit-analysis__button' onClick={handleAnalyze}>
            <Text className='contact-edit-analysis__button-text'>
              {analyzing ? '识别中' : '识别'}
            </Text>
          </View>
        </View>
        <Textarea
          className='contact-edit-analysis__input'
          maxlength={240}
          placeholder='姓名 手机号 省市区 详细地址'
          value={analysisText}
          onInput={(event) => setAnalysisText(event.detail.value)}
        />
      </View>

      <View className='contact-edit-form'>
        <View className='contact-edit-row'>
          <Text className='contact-edit-row__label'>联系人</Text>
          <Input
            className='contact-edit-input'
            placeholder='请输入姓名'
            value={contact.name}
            onInput={(event) => updateContact({ name: event.detail.value })}
          />
        </View>

        <View className='contact-edit-row'>
          <Text className='contact-edit-row__label'>手机号</Text>
          <Input
            className='contact-edit-input'
            placeholder='请输入手机号'
            type='number'
            value={contact.telephone}
            onInput={(event) =>
              updateContact({ telephone: event.detail.value })
            }
          />
        </View>

        <View className='contact-edit-grid'>
          <View className='contact-edit-grid__item'>
            <Text className='contact-edit-row__label'>省份</Text>
            <Input
              className='contact-edit-input'
              placeholder='省份'
              value={contact.province}
              onInput={(event) =>
                updateContact({ province: event.detail.value })
              }
            />
          </View>
          <View className='contact-edit-grid__item contact-edit-grid__item--right'>
            <Text className='contact-edit-row__label'>城市</Text>
            <Input
              className='contact-edit-input'
              placeholder='城市'
              value={contact.city}
              onInput={(event) => updateContact({ city: event.detail.value })}
            />
          </View>
        </View>

        <View className='contact-edit-grid'>
          <View className='contact-edit-grid__item'>
            <Text className='contact-edit-row__label'>区县</Text>
            <Input
              className='contact-edit-input'
              placeholder='区县'
              value={contact.county}
              onInput={(event) => updateContact({ county: event.detail.value })}
            />
          </View>
          <View className='contact-edit-grid__item contact-edit-grid__item--right'>
            <Text className='contact-edit-row__label'>乡镇</Text>
            <Input
              className='contact-edit-input'
              placeholder='选填'
              value={contact.town || ''}
              onInput={(event) => updateContact({ town: event.detail.value })}
            />
          </View>
        </View>

        <View className='contact-edit-row'>
          <Text className='contact-edit-row__label'>详细地址</Text>
          <Input
            className='contact-edit-input'
            placeholder='街道、门牌号等'
            value={contact.address}
            onInput={(event) => updateContact({ address: event.detail.value })}
          />
        </View>

        <View className='contact-edit-row'>
          <Text className='contact-edit-row__label'>公司名称</Text>
          <Input
            className='contact-edit-input'
            placeholder='选填'
            value={contact.company || ''}
            onInput={(event) => updateContact({ company: event.detail.value })}
          />
        </View>

        <View className='contact-edit-switch-row'>
          <Text className='contact-edit-row__label'>地址类型</Text>
          <View className='contact-edit-switch'>
            {([0, 1] as const).map((type) => (
              <View
                className={
                  contact.type === type
                    ? 'contact-edit-chip contact-edit-chip--active'
                    : 'contact-edit-chip'
                }
                key={type}
                onClick={() => updateContact({ type })}
              >
                <Text
                  className={
                    contact.type === type
                      ? 'contact-edit-chip__text contact-edit-chip__text--active'
                      : 'contact-edit-chip__text'
                  }
                >
                  {type === 0 ? '寄件人' : '收件人'}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {!validation.valid && (
        <View className='contact-edit-check'>
          <Text className='contact-edit-check__title'>待完善</Text>
          {validation.messages.slice(0, 3).map((message) => (
            <Text className='contact-edit-check__message' key={message}>
              {message}
            </Text>
          ))}
        </View>
      )}

      <View className='contact-edit-submit' onClick={handleSave}>
        <Text className='contact-edit-submit__text'>
          {saving ? '保存中' : '保存地址'}
        </Text>
      </View>
    </ScrollView>
  )
}

export default ContactEditPage
