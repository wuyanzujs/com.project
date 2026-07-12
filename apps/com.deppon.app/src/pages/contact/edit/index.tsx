import { Input, ScrollView, Text, Textarea, View } from '@tarojs/components'
import Taro, { useLoad, useRouter } from '@tarojs/taro'

import { useMemo, useState } from 'react'

import {
  contactSelection,
  contactService,
  createEmptyContact,
  validateContact
} from '../../../services/contact'
import { AppPressable, AppFormField } from '../../../shared/components'
import { ensureAuthenticated } from '../../../shared/navigation/authGuard'
import { APP_ROUTES } from '../../../shared/navigation/routes'
import { createAppRouteUrl } from '../../../shared/navigation/routeUrl'

import type { Contact } from '../../../services/contact'

import './index.scss'
import './content.scss'

function getRoleByTarget(target: 'sender' | 'consignee'): Contact['type'] {
  return target === 'sender' ? 0 : 1
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
  const [refiningAddress, setRefiningAddress] = useState(false)
  const [saving, setSaving] = useState(false)
  const validation = useMemo(() => validateContact(contact), [contact])
  const contactEditUrl = useMemo(
    () => createAppRouteUrl(APP_ROUTES.contactEdit, selectionParams),
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
    setContact(current => ({
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

      setContact(current =>
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

  const handleRefineAddress = async () => {
    if (!ensureContactEditAccess() || refiningAddress) {
      return
    }

    if (!contact.address.trim()) {
      Taro.showToast({
        title: '请先填写详细地址',
        icon: 'none'
      })
      return
    }

    setRefiningAddress(true)

    try {
      if (contact.province && contact.city && contact.county) {
        const hintResponse = await contactService.queryAddressHints(contact)
        const hints = (hintResponse.result || [])
          .map(contactService.parseAddressHint)
          .filter(item => item.address)
          .slice(0, 6)

        if (hintResponse.status && hints.length) {
          const selected = await Taro.showActionSheet({
            itemList: hints.map(contactService.getAddressHintLabel)
          }).catch(() => null)

          if (!selected) {
            return
          }

          const hint = hints[selected.tapIndex]

          if (hint) {
            setContact(current =>
              contactService.applyAddressHintToContact(current, hint)
            )
            Taro.showToast({
              title: '已应用地址候选，请核对',
              icon: 'none'
            })
          }
          return
        }
      }

      const response = await contactService.analyze4(contact.address, contact)

      if (!response.status || !response.result) {
        Taro.showToast({
          title: response.message || '暂未识别到更准确地址',
          icon: 'none'
        })
        return
      }

      const analysis = response.result

      setContact(current =>
        contactService.applyAnalysis4ToContact(current, analysis)
      )
      Taro.showToast({
        title: '地址已补全，请核对',
        icon: 'none'
      })
    } finally {
      setRefiningAddress(false)
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
        contactSelection.select(
          selectionParams.target,
          savedContact,
          selectionParams.source
        )
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
      <View className='contact-edit-analysis'>
        <View className='contact-edit-analysis__head'>
          <Text className='contact-edit-analysis__title'>智能识别</Text>
          <AppPressable
            className='contact-edit-analysis__button'
            onPress={handleAnalyze}
          >
            <Text className='contact-edit-analysis__button-text'>
              {analyzing ? '识别中' : '识别'}
            </Text>
          </AppPressable>
        </View>
        <Textarea
          className='contact-edit-analysis__input'
          maxlength={240}
          placeholder='姓名 手机号 省市区 详细地址'
          value={analysisText}
          onInput={event => setAnalysisText(event.detail.value)}
        />
      </View>

      <View className='contact-edit-form'>
        <AppFormField
          className='contact-edit-row'
          inputClassName='contact-edit-input'
          label='联系人'
          labelClassName='contact-edit-row__label'
          placeholder='请输入姓名'
          required
          value={contact.name}
          onChange={name => updateContact({ name })}
        />

        <AppFormField
          className='contact-edit-row'
          inputClassName='contact-edit-input'
          label='手机号'
          labelClassName='contact-edit-row__label'
          placeholder='请输入手机号'
          required
          type='number'
          value={contact.telephone}
          onChange={telephone => updateContact({ telephone })}
        />

        <View className='contact-edit-grid'>
          <View className='contact-edit-grid__item'>
            <Text className='contact-edit-row__label'>省份</Text>
            <Input
              className='contact-edit-input'
              placeholder='省份'
              value={contact.province}
              onInput={event => updateContact({ province: event.detail.value })}
            />
          </View>
          <View className='contact-edit-grid__item contact-edit-grid__item--right'>
            <Text className='contact-edit-row__label'>城市</Text>
            <Input
              className='contact-edit-input'
              placeholder='城市'
              value={contact.city}
              onInput={event => updateContact({ city: event.detail.value })}
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
              onInput={event => updateContact({ county: event.detail.value })}
            />
          </View>
          <View className='contact-edit-grid__item contact-edit-grid__item--right'>
            <Text className='contact-edit-row__label'>乡镇</Text>
            <Input
              className='contact-edit-input'
              placeholder='选填'
              value={contact.town || ''}
              onInput={event => updateContact({ town: event.detail.value })}
            />
          </View>
        </View>

        <View className='contact-edit-row'>
          <Text className='contact-edit-row__label'>详细地址</Text>
          <Input
            className='contact-edit-input'
            placeholder='街道、门牌号等'
            value={contact.address}
            onInput={event => updateContact({ address: event.detail.value })}
          />
        </View>

        <View className='contact-edit-address-tools'>
          <Text className='contact-edit-address-tools__hint'>
            已填写详细地址时，可尝试补全省市区和乡镇街道。
          </Text>
          <AppPressable
            className='contact-edit-address-tools__button'
            onPress={handleRefineAddress}
          >
            <Text className='contact-edit-address-tools__button-text'>
              {refiningAddress ? '补全中' : '补全地址'}
            </Text>
          </AppPressable>
        </View>

        <View className='contact-edit-row'>
          <Text className='contact-edit-row__label'>公司名称</Text>
          <Input
            className='contact-edit-input'
            placeholder='选填'
            value={contact.company || ''}
            onInput={event => updateContact({ company: event.detail.value })}
          />
        </View>

        <View className='contact-edit-switch-row'>
          <Text className='contact-edit-row__label'>地址类型</Text>
          <View className='contact-edit-switch'>
            {([0, 1] as const).map(type => (
              <AppPressable
                className={
                  contact.type === type
                    ? 'contact-edit-chip contact-edit-chip--active'
                    : 'contact-edit-chip'
                }
                key={type}
                onPress={() => updateContact({ type })}
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
              </AppPressable>
            ))}
          </View>
        </View>
      </View>

      {!validation.valid && (
        <View className='contact-edit-check'>
          <Text className='contact-edit-check__title'>待完善</Text>
          {validation.messages.slice(0, 3).map(message => (
            <Text className='contact-edit-check__message' key={message}>
              {message}
            </Text>
          ))}
        </View>
      )}

      <AppPressable className='contact-edit-submit' onPress={handleSave}>
        <Text className='contact-edit-submit__text'>
          {saving ? '保存中' : '保存地址'}
        </Text>
      </AppPressable>
    </ScrollView>
  )
}

export default ContactEditPage
