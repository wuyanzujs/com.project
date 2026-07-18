import { Input, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow, useLoad, useRouter } from '@tarojs/taro'

import { useCallback, useMemo, useState } from 'react'

import {
  contactSelection,
  contactService,
  getContactFullAddress
} from '../../../services/contact'
import { AppPressable } from '../../../shared/components'
import { navigateToAppRoute } from '../../../shared/navigation/appNavigation'
import { ensureAuthenticated } from '../../../shared/navigation/authGuard'
import { APP_ROUTES } from '../../../shared/navigation/routes'
import { createAppRouteUrl } from '../../../shared/navigation/routeUrl'
import { useContactAddressIntegrity } from '../hooks/useContactAddressIntegrity'

import type { Contact } from '../../../services/contact'


import './index.scss'
import './content.scss'

const PAGE_SIZE = 20

function getRoleLabel(contact: Contact) {
  return contact.type === 0 ? '寄件人' : '收件人'
}

const ContactListPage = () => {
  const router = useRouter()
  const selectionParams = useMemo(
    () =>
      contactSelection.parseParams(
        router.params as Record<string, string | undefined>
      ),
    [router.params]
  )
  const [keyword, setKeyword] = useState('')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [pageIndex, setPageIndex] = useState(1)
  const [totalPage, setTotalPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [processingContactId, setProcessingContactId] = useState('')
  const { checkingKey, checkAddressIntegrity } =
    useContactAddressIntegrity()
  const contactListUrl = useMemo(
    () => createAppRouteUrl(APP_ROUTES.contactList, selectionParams),
    [selectionParams]
  )
  const ensureContactAccess = useCallback(
    () =>
      ensureAuthenticated({
        redirectUrl: contactListUrl,
        replace: true
      }),
    [contactListUrl]
  )
  const selectSummary =
    selectionParams.source === 'INVOICE_DETAIL'
      ? '选择后会回填为纸质发票收票地址，请在发票详情页确认后提交。'
      : selectionParams.source === 'QUERY_PRICE'
        ? '选择后会回填到价格时效页，并触发对应报价依赖清理。'
        : selectionParams.source === 'BATCH'
          ? '选择后会回填为批量寄件发货人。'
        : '选择后会回填到寄件页，并触发对应报价和取件依赖清理。'

  const loadContacts = useCallback(
    async (nextPage = 1, nextKeyword = keyword) => {
      if (loading) {
        return
      }

      setLoading(true)
      setErrorMessage('')

      try {
        const response = await contactService.queryList({
          pageIndex: nextPage,
          pageSize: PAGE_SIZE,
          keyword: nextKeyword
        })

        if (!response.status || !response.result) {
          setErrorMessage(response.message || '暂未获取到地址簿')
          if (nextPage === 1) {
            setContacts([])
          }
          return
        }

        const nextList = response.result.list ?? []

        setContacts(current =>
          nextPage === 1 ? nextList : [...current, ...nextList]
        )
        setPageIndex(response.result.pageNum || nextPage)
        setTotalPage(response.result.totalPage || 1)
      } finally {
        setLoading(false)
      }
    },
    [keyword, loading]
  )

  useLoad(() => {
    if (ensureContactAccess()) {
      loadContacts(1)
    }
  })

  useDidShow(() => {
    if (ensureContactAccess()) {
      loadContacts(1)
    }
  })

  const handleSearch = () => {
    if (!ensureContactAccess()) {
      return
    }

    loadContacts(1, keyword)
  }

  const handleLoadMore = () => {
    if (!ensureContactAccess()) {
      return
    }

    if (pageIndex >= totalPage || loading) {
      return
    }

    loadContacts(pageIndex + 1)
  }

  const handleCreate = () => {
    if (!ensureContactAccess()) {
      return
    }

    navigateToAppRoute(
      createAppRouteUrl(APP_ROUTES.contactEdit, selectionParams),
      { login: true }
    )
  }

  const handleEdit = (contact: Contact) => {
    if (!ensureContactAccess()) {
      return
    }

    contactSelection.setEditingContact(contact)
    navigateToAppRoute(
      createAppRouteUrl(APP_ROUTES.contactEdit, selectionParams),
      { login: true }
    )
  }

  const handleSetDefault = async (contact: Contact) => {
    if (!ensureContactAccess() || processingContactId) {
      return
    }

    if (contact.defaultAddress === '1') {
      Taro.showToast({
        title: '已是默认地址',
        icon: 'none'
      })
      return
    }

    setProcessingContactId(contact.id || contact.telephone)

    try {
      const response = await contactService.setDefault(contact)

      if (!response.status) {
        Taro.showToast({
          title: response.message || '设置默认地址失败',
          icon: 'none'
        })
        return
      }

      setContacts(current =>
        current.map(item => ({
          ...item,
          defaultAddress: item.id === contact.id ? '1' : '0'
        }))
      )
      Taro.showToast({
        title: '已设为默认地址',
        icon: 'none'
      })
    } finally {
      setProcessingContactId('')
    }
  }

  const handleDelete = async (contact: Contact) => {
    if (!ensureContactAccess() || processingContactId) {
      return
    }

    const modal = await Taro.showModal({
      title: '删除地址',
      content: `确定删除 ${contact.name || '该联系人'} 的地址吗？`,
      confirmText: '删除',
      cancelText: '取消'
    })

    if (!modal.confirm) {
      return
    }

    setProcessingContactId(contact.id || contact.telephone)

    try {
      const response = await contactService.remove(contact.id || '')

      if (!response.status) {
        Taro.showToast({
          title: response.message || '删除地址失败',
          icon: 'none'
        })
        return
      }

      setContacts(current => current.filter(item => item.id !== contact.id))
      Taro.showToast({
        title: '已删除地址',
        icon: 'none'
      })
    } finally {
      setProcessingContactId('')
    }
  }

  const handleSelect = async (contact: Contact) => {
    if (selectionParams.mode === 'manage') {
      handleEdit(contact)
      return
    }

    if (!ensureContactAccess()) {
      return
    }

    const integrityAction = await checkAddressIntegrity(contact, {
      confirmText: '修改地址',
      cancelText: '继续使用'
    })

    if (integrityAction === 'review') {
      handleEdit(contact)
      return
    }

    if (integrityAction !== 'continue') {
      return
    }

    contactSelection.select(
      selectionParams.target,
      contact,
      selectionParams.source
    )
    Taro.navigateBack()
  }

  return (
    <ScrollView
      className='contact-list-page'
      onScrollToLower={handleLoadMore}
      scrollY
    >
      {selectionParams.mode === 'select' && (
        <View className='contact-list-selection'>
          <Text className='contact-list-selection__text'>{selectSummary}</Text>
        </View>
      )}

      <View className='contact-list-search'>
        <Input
          className='contact-list-search__input'
          placeholder='姓名、手机号、地址'
          value={keyword}
          onInput={event => setKeyword(event.detail.value)}
        />
        <AppPressable className='contact-list-search__button' onPress={handleSearch}>
          <Text className='contact-list-search__button-text'>搜索</Text>
        </AppPressable>
      </View>

      <View className='contact-list-toolbar'>
        <Text className='contact-list-toolbar__title'>常用地址</Text>
        <AppPressable className='contact-list-toolbar__button' onPress={handleCreate}>
          <Text className='contact-list-toolbar__button-text'>新增</Text>
        </AppPressable>
      </View>

      <View className='contact-list-content'>
        {contacts.map(contact => (
          <View className='contact-card' key={contact.id || contact.telephone}>
            <AppPressable
              className='contact-card__body'
              disabled={selectionParams.mode === 'select' && !!checkingKey}
              onPress={() => handleSelect(contact)}
            >
              <View className='contact-card__top'>
                <Text className='contact-card__name'>{contact.name}</Text>
                <Text className='contact-card__phone'>{contact.telephone}</Text>
              </View>
              <Text className='contact-card__address'>
                {getContactFullAddress(contact)}
              </Text>
              <View className='contact-card__meta'>
                <Text className='contact-card__tag'>
                  {getRoleLabel(contact)}
                </Text>
                {contact.defaultAddress === '1' && (
                  <Text className='contact-card__tag contact-card__tag--primary'>
                    默认
                  </Text>
                )}
              </View>
            </AppPressable>
            <View className='contact-card__footer'>
              {selectionParams.mode === 'manage' && (
                <AppPressable contentElement='text'
                  className={
                    contact.defaultAddress === '1'
                      ? 'contact-card__action contact-card__action--disabled'
                      : 'contact-card__action'
                  }
                  onPress={() => handleSetDefault(contact)}
                >
                  {contact.defaultAddress === '1' ? '默认地址' : '设为默认'}
                </AppPressable>
              )}
              <AppPressable contentElement='text'
                className='contact-card__action'
                onPress={() => handleEdit(contact)}
              >
                编辑
              </AppPressable>
              {selectionParams.mode === 'manage' && (
                <AppPressable contentElement='text'
                  className='contact-card__action contact-card__action--danger'
                  onPress={() => handleDelete(contact)}
                >
                  删除
                </AppPressable>
              )}
              {selectionParams.mode === 'select' && (
                <AppPressable contentElement='text'
                  className='contact-card__action contact-card__action--primary'
                  disabled={!!checkingKey}
                  onPress={() => handleSelect(contact)}
                >
                  {checkingKey ===
                  (contact.id || `${contact.telephone}-${contact.address}`)
                    ? '校验中'
                    : '选择'}
                </AppPressable>
              )}
            </View>
          </View>
        ))}

        {!contacts.length && !loading && (
          <View className='contact-list-empty'>
            <Text className='contact-list-empty__title'>
              {errorMessage || '暂无地址'}
            </Text>
            <Text className='contact-list-empty__summary'>
              可先新增地址，或登录后同步常用地址簿。
            </Text>
          </View>
        )}

        {loading && (
          <Text className='contact-list-loading'>
            {contacts.length ? '加载更多地址...' : '正在加载地址...'}
          </Text>
        )}
      </View>
    </ScrollView>
  )
}

export default ContactListPage
