import { Image, Input, ScrollView, Text, Textarea, View } from '@tarojs/components'
import Taro, { useLoad, useRouter } from '@tarojs/taro'

import { useCallback, useMemo, useState } from 'react'

import contactBookIcon from '@/assets/contact/contact_icon_book.png'
import contactCameraIcon from '@/assets/contact/contact_icon_camera.png'
import contactSpeechIcon from '@/assets/contact/contact_icon_speech.png'
import { contactSelection, contactService, createEmptyContact, formatRegionLabel, validateContact } from '@/services/contact'
import type { Contact, RegionSelection } from '@/services/contact'
import { AppPage, AppPressable } from '@/shared/components'
import { AppIcon } from '@/shared/components/AppIcon'
import { ensureAuthenticated } from '@/shared/navigation/authGuard'
import { APP_ROUTES } from '@/shared/navigation/routes'
import { createAppRouteUrl } from '@/shared/navigation/routeUrl'
import { getNativeCapabilityErrorMessage, shareWithApp } from '@/shared/platform'
import { APP_STYLE_COLORS } from '@/styles/nativeTokens'

import { ContactNavBar } from '../components/ContactNavBar'
import { useContactAddressActions } from '../hooks/useContactAddressActions'
import { useContactAddressIntegrity } from '../hooks/useContactAddressIntegrity'
import { RegionPicker } from './components/RegionPicker'

import './index.scss'
import './content.scss'

function getRoleByTarget(target: 'sender' | 'consignee'): Contact['type'] {
  return target === 'sender' ? 0 : 1
}

const ContactEditPage = () => {
  const router = useRouter()
  const selectionParams = useMemo(() => contactSelection.parseParams(router.params as Record<string, string | undefined>), [router.params])
  const [contact, setContact] = useState<Contact>(() => createEmptyContact(getRoleByTarget(selectionParams.target)))
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [analysisFocused, setAnalysisFocused] = useState(false)
  const [regionPickerVisible, setRegionPickerVisible] = useState(false)
  const { checkingKey, checkAddressIntegrity } = useContactAddressIntegrity()
  const validation = useMemo(() => validateContact(contact), [contact])
  const contactEditUrl = useMemo(() => createAppRouteUrl(APP_ROUTES.contactEdit, selectionParams), [selectionParams])
  const pageTitle = editing ? '编辑联系人' : '创建新地址'
  const ensureContactEditAccess = useCallback(
    () =>
      ensureAuthenticated({
        redirectUrl: contactEditUrl,
        replace: true
      }),
    [contactEditUrl]
  )

  const addressActions = useContactAddressActions({
    contact,
    setContact,
    ensureAccess: ensureContactEditAccess
  })

  useLoad(() => {
    if (!ensureContactEditAccess()) {
      return
    }

    const editingContact = contactSelection.consumeEditingContact()

    if (editingContact) {
      setContact(editingContact)
      setEditing(true)
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

  const handleSave = async () => {
    if (!ensureContactEditAccess() || saving || checkingKey) {
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
      const integrityAction = await checkAddressIntegrity(contact, {
        confirmText: '继续修改',
        cancelText: '仍然保存'
      })

      if (integrityAction !== 'continue') {
        return
      }

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
        contactSelection.select(selectionParams.target, savedContact, selectionParams.source)
        Taro.navigateBack({ delta: Number(selectionParams.returnDelta) })
        return
      }

      Taro.navigateBack()
    } finally {
      setSaving(false)
    }
  }

  const showPendingToast = (title: string) => Taro.showToast({ title, icon: 'none' })
  const handleShare = () => {
    shareWithApp({
      source: 'CONTACT_EDIT',
      title: '德邦快递',
      description: '德邦快递地址簿'
    }).catch(error => {
      Taro.showToast({
        title: getNativeCapabilityErrorMessage(error),
        icon: 'none'
      })
    })
  }
  const clearContact = () => {
    addressActions.setAnalysisText('')
    updateContact({
      name: '',
      telephone: '',
      extension: '',
      province: '',
      city: '',
      county: '',
      town: '',
      address: '',
      company: '',
      defaultAddress: '0'
    })
  }
  // 输入框聚焦时隐藏底部确定栏，失焦后恢复。
  const editFooter = analysisFocused ? undefined : (
    <View className='contact-edit-footer'>
      <AppPressable className='contact-edit-footer__button' disabled={saving} onPress={handleSave}>
        <Text className='contact-edit-footer__button-text'>{saving ? '保存中' : '确定'}</Text>
      </AppPressable>
    </View>
  )
  const placeholderSoft = `color: ${APP_STYLE_COLORS.text.placeholderSoft}`
  // 新建地址显示「分机号」列，编辑已有联系人时该列收起。
  const showExtension = editing ? Boolean(contact.extension) : true

  return (
    <AppPage
      className='contact-edit-page'
      footer={editFooter}
      header={<ContactNavBar onShare={handleShare} title={pageTitle} />}
      safeArea='both'
      statusBar='dark'
      surface='card'
    >
      <ScrollView className='contact-edit-scroll' scrollY>
        <View className={analysisFocused ? 'contact-edit-warning contact-edit-warning--example' : 'contact-edit-warning'}>
          <Text className='contact-edit-warning__text' numberOfLines={1}>
            {analysisFocused ? '示例：德兴邦，159xxxxxxxxx，上海市青浦区xx路xx号' : '根据国家法律法规要求，寄件人姓名须与您提供的实名信息一致'}
          </Text>
        </View>

        <View className={analysisFocused ? 'contact-edit-recognition contact-edit-recognition--focused' : 'contact-edit-recognition'}>
          <Textarea
            className={analysisFocused ? 'contact-edit-recognition__input contact-edit-recognition__input--focused' : 'contact-edit-recognition__input'}
            confirmType='done'
            maxlength={240}
            placeholder='粘贴或输入文本后，点击“粘贴并识别”，自动识别填充姓名、电话和地址'
            placeholderStyle={placeholderSoft}
            value={addressActions.analysisText}
            onBlur={() => setAnalysisFocused(false)}
            onFocus={() => setAnalysisFocused(true)}
            onInput={event => addressActions.setAnalysisText(event.detail.value)}
          />
          <View className='contact-edit-recognition__actions'>
            <AppPressable className='contact-edit-recognition__action' onPress={() => showPendingToast('语音识别暂未开放')}>
              <Image className='contact-edit-recognition__icon' mode='aspectFit' src={contactSpeechIcon} />
              <Text className='contact-edit-recognition__action-text'>语音识别</Text>
            </AppPressable>
            <AppPressable className='contact-edit-recognition__action' onPress={() => showPendingToast('图片识别暂未开放')}>
              <Image className='contact-edit-recognition__icon' mode='aspectFit' src={contactCameraIcon} />
              <Text className='contact-edit-recognition__action-text'>图片识别</Text>
            </AppPressable>
            <AppPressable className='contact-edit-recognition__paste' onPress={addressActions.handleAnalyze}>
              <Text className='contact-edit-recognition__paste-text'>{addressActions.analyzing ? '识别中' : '粘贴并识别'}</Text>
            </AppPressable>
          </View>
        </View>

        <View className='contact-edit-card'>
          <View className='contact-edit-inline-row'>
            <View className='contact-edit-inline-field contact-edit-inline-field--name'>
              <Input
                className='contact-edit-value-input contact-edit-value-input--strong'
                placeholder='真实姓名'
                value={contact.name}
                placeholderStyle={placeholderSoft}
                onInput={event => updateContact({ name: event.detail.value })}
              />
            </View>
            <View className='contact-edit-inline-field contact-edit-inline-field--phone'>
              <Input
                className='contact-edit-value-input contact-edit-value-input--strong contact-edit-phone-input'
                placeholder='固话/手机号'
                type='number'
                value={contact.telephone}
                placeholderStyle={placeholderSoft}
                onInput={event => updateContact({ telephone: event.detail.value })}
              />
            </View>
            {showExtension ? (
              <View className='contact-edit-inline-field contact-edit-inline-field--extension'>
                <Input
                  className='contact-edit-value-input contact-edit-extension-input'
                  placeholder='分机号'
                  type='number'
                  value={contact.extension || ''}
                  placeholderStyle={placeholderSoft}
                  onInput={event => updateContact({ extension: event.detail.value })}
                />
              </View>
            ) : null}
            <AppPressable className='contact-edit-side-action' onPress={() => showPendingToast('通讯录能力暂未开放')}>
              <Image className='contact-edit-side-action__icon' mode='aspectFit' src={contactBookIcon} />
              <Text className='contact-edit-side-action__text'>通讯录</Text>
            </AppPressable>
          </View>

          <View className='contact-edit-region-row'>
            <AppPressable accessibilityLabel='选择地区城市' className='contact-edit-region-picker' onPress={() => setRegionPickerVisible(true)}>
              <Text
                className={
                  contact.province || contact.city || contact.county
                    ? 'contact-edit-region-picker__value'
                    : 'contact-edit-region-picker__value contact-edit-region-picker__value--placeholder'
                }
              >
                {formatRegionLabel(contact.province, contact.city, contact.county) || '地区/城市'}
              </Text>
              <AppIcon color={APP_STYLE_COLORS.text.supporting} name='chevronRight' size={28} />
            </AppPressable>
            <AppPressable className='contact-edit-locate' onPress={() => showPendingToast('定位能力暂未开放')}>
              <AppIcon color={APP_STYLE_COLORS.text.heading} name='mapPinned' size={30} />
              <Text className='contact-edit-locate__text'>定位</Text>
            </AppPressable>
          </View>

          <View className='contact-edit-detail-row'>
            <Input
              className='contact-edit-value-input'
              placeholder='详细地址（如街道、门牌号、小区等）'
              value={contact.address}
              placeholderStyle={placeholderSoft}
              onInput={event => updateContact({ address: event.detail.value })}
            />
          </View>

          <View className='contact-edit-company-row'>
            <Input
              className='contact-edit-value-input'
              placeholder='公司名称（选填）'
              value={contact.company || ''}
              placeholderStyle={placeholderSoft}
              onInput={event => updateContact({ company: event.detail.value })}
            />
          </View>

          <View className='contact-edit-default-row'>
            <AppPressable className='contact-edit-default-toggle' onPress={() => updateContact({ defaultAddress: contact.defaultAddress === '1' ? '0' : '1' })}>
              <View className={contact.defaultAddress === '1' ? 'contact-edit-default-dot contact-edit-default-dot--checked' : 'contact-edit-default-dot'}>
                {contact.defaultAddress === '1' ? <AppIcon color={APP_STYLE_COLORS.text.inverse} name='check' size={14} strokeWidth={3} /> : null}
              </View>
              <Text className='contact-edit-default-toggle__text'>设为默认地址</Text>
            </AppPressable>
            <AppPressable contentElement='text' className='contact-edit-clear' onPress={clearContact}>
              清空
            </AppPressable>
          </View>
        </View>
      </ScrollView>

      <RegionPicker
        value={{ cityName: contact.city, countyName: contact.county, provinceName: contact.province }}
        visible={regionPickerVisible}
        onClose={() => setRegionPickerVisible(false)}
        onSelect={(selection: RegionSelection) => {
          updateContact({ city: selection.cityName, county: selection.countyName, province: selection.provinceName })
          setRegionPickerVisible(false)
        }}
      />
    </AppPage>
  )
}

export default ContactEditPage
