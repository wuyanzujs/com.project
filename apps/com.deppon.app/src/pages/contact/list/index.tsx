import { Input, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow, useLoad, useRouter } from '@tarojs/taro'

import { useCallback, useMemo, useState } from 'react'

import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { contactSelection, contactService, getContactFullAddress } from '@/services/contact'
import type { Contact } from '@/services/contact'
import { maskExpressContactMobile } from '@/services/express'
import { AppPressable } from '@/shared/components'
import { AppIcon } from '@/shared/components/AppIcon'
import { navigateToAppRoute } from '@/shared/navigation/appNavigation'
import { ensureAuthenticated } from '@/shared/navigation/authGuard'
import { APP_ROUTES } from '@/shared/navigation/routes'
import { createAppRouteUrl } from '@/shared/navigation/routeUrl'
import { copyTextToClipboard } from '@/shared/platform'
import { APP_STYLE_COLORS } from '@/styles/nativeTokens'

import { useContactAddressIntegrity } from '../hooks/useContactAddressIntegrity'

import './index.scss'
import './content.scss'

const PAGE_SIZE = 20

const PAGE_TITLE_BY_TARGET = {
  consignee: '选择收件人',
  sender: '选择寄件人'
} as const

const ContactListPage = () => {
  const router = useRouter()
  const selectionParams = useMemo(() => contactSelection.parseParams(router.params as Record<string, string | undefined>), [router.params])
  const [keyword, setKeyword] = useState('')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [pageIndex, setPageIndex] = useState(1)
  const [totalPage, setTotalPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [processingContactId, setProcessingContactId] = useState('')
  // 生产 App 的「管理」是批量删除态：卡片动作行切换为「选择删除」，底部为「取消/立即删除」。
  const [deleting, setDeleting] = useState(false)
  const [deletingIds, setDeletingIds] = useState<string[]>([])
  const { checkingKey, checkAddressIntegrity } = useContactAddressIntegrity()
  const insets = useSafeAreaInsets()
  const pageTitle = selectionParams.mode === 'select' ? PAGE_TITLE_BY_TARGET[selectionParams.target] : '地址簿'
  const contactListUrl = useMemo(() => createAppRouteUrl(APP_ROUTES.contactList, selectionParams), [selectionParams])
  const ensureContactAccess = useCallback(
    () =>
      ensureAuthenticated({
        redirectUrl: contactListUrl,
        replace: true
      }),
    [contactListUrl]
  )

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

        setContacts(current => (nextPage === 1 ? nextList : [...current, ...nextList]))
        setPageIndex(response.result.pageNum || nextPage)
        setTotalPage(response.result.totalPage || 1)
      } finally {
        setLoading(false)
      }
    },
    [keyword, loading]
  )

  useLoad(() => {
    Taro.setNavigationBarTitle({ title: pageTitle })
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

    navigateToAppRoute(createAppRouteUrl(APP_ROUTES.contactEdit, selectionParams), { login: true })
  }

  const handleEdit = (contact: Contact) => {
    if (!ensureContactAccess()) {
      return
    }

    contactSelection.setEditingContact(contact)
    navigateToAppRoute(createAppRouteUrl(APP_ROUTES.contactEdit, selectionParams), { login: true })
  }

  const handleCopy = (contact: Contact) => {
    copyTextToClipboard([contact.name, contact.telephone, getContactFullAddress(contact)].filter(Boolean).join(' '))
      .then(() =>
        Taro.showToast({
          title: '已复制联系人信息',
          icon: 'none'
        })
      )
      .catch(() =>
        Taro.showToast({
          title: '复制失败，请重试',
          icon: 'none'
        })
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

    contactSelection.select(selectionParams.target, contact, selectionParams.source)
    Taro.navigateBack()
  }

  const exitDeleting = () => {
    setDeleting(false)
    setDeletingIds([])
  }

  const toggleDeletingId = (contact: Contact) => {
    const key = contact.id || contact.telephone

    setDeletingIds(current => (current.includes(key) ? current.filter(item => item !== key) : [...current, key]))
  }

  const handleBatchDelete = async () => {
    if (!deletingIds.length) {
      Taro.showToast({
        title: '请先勾选要删除的地址',
        icon: 'none'
      })
      return
    }

    if (processingContactId) {
      return
    }

    const modal = await Taro.showModal({
      title: '批量删除地址',
      content: `确定删除选中的 ${deletingIds.length} 个地址吗？`,
      confirmText: '删除',
      cancelText: '取消'
    })

    if (!modal.confirm) {
      return
    }

    setProcessingContactId('batch')

    try {
      const targets = contacts.filter(item => deletingIds.includes(item.id || item.telephone))
      const results = await Promise.all(targets.map(item => contactService.remove(item.id || '')))
      const failedCount = results.filter(item => !item.status).length

      if (failedCount) {
        Taro.showToast({
          title: `${results.length - failedCount} 个已删除，${failedCount} 个失败`,
          icon: 'none'
        })
      } else {
        Taro.showToast({
          title: '已删除地址',
          icon: 'none'
        })
      }

      exitDeleting()
      loadContacts(1)
    } finally {
      setProcessingContactId('')
    }
  }

  return (
    <View className='contact-list-page'>
      <ScrollView className='contact-list-scroll' onScrollToLower={handleLoadMore} scrollY>
        <View className='contact-list-search'>
          <View className='contact-list-search__field'>
            <View className='contact-list-search__icon'>
              <AppIcon color={APP_STYLE_COLORS.text.subdued} name='search' size={24} strokeWidth={2.4} />
            </View>
            <Input
              className='contact-list-search__input'
              confirmType='search'
              onConfirm={handleSearch}
              onInput={event => setKeyword(event.detail.value)}
              placeholder='请输入姓名/手机号/地址/公司名称'
              placeholderTextColor={APP_STYLE_COLORS.text.subdued}
              value={keyword}
            />
          </View>
        </View>

        <View className='contact-list-body'>
          {contacts.map(contact => {
            const contactKey = contact.id || contact.telephone
            const checked = contact.defaultAddress === '1'
            const selected = deletingIds.includes(contactKey)

            return (
              <View className='contact-card' key={contactKey}>
                <AppPressable
                  block
                  className='contact-card__body'
                  disabled={deleting || (selectionParams.mode === 'select' && !!checkingKey)}
                  layout='column-start'
                  onPress={() => handleSelect(contact)}
                >
                  <View className='contact-card__identity'>
                    <Text className='contact-card__name' numberOfLines={1}>
                      {contact.name}
                    </Text>
                    <Text className='contact-card__phone'>{maskExpressContactMobile(contact.telephone)}</Text>
                  </View>
                  <Text className='contact-card__address'>{getContactFullAddress(contact)}</Text>
                </AppPressable>
                <View className='contact-card__divider' />
                <View className='contact-card__footer'>
                  {deleting ? (
                    <AppPressable className='contact-card__default' layout='row-start' onPress={() => toggleDeletingId(contact)}>
                      <View className={selected ? 'contact-card__radio contact-card__radio--checked' : 'contact-card__radio'}>
                        {selected && <AppIcon color={APP_STYLE_COLORS.text.inverse} name='check' size={24} strokeWidth={3.2} />}
                      </View>
                      <Text className='contact-card__default-label'>选择删除</Text>
                    </AppPressable>
                  ) : (
                    <>
                      <AppPressable className='contact-card__default' layout='row-start' onPress={() => handleSetDefault(contact)}>
                        <View className={checked ? 'contact-card__radio contact-card__radio--checked' : 'contact-card__radio'}>
                          {checked && <AppIcon color={APP_STYLE_COLORS.text.inverse} name='check' size={24} strokeWidth={3.2} />}
                        </View>
                        <Text className='contact-card__default-label'>默认地址</Text>
                      </AppPressable>
                      <View className='contact-card__actions'>
                        <AppPressable className='contact-card__action' layout='row-start' onPress={() => handleCopy(contact)}>
                          <AppIcon color={APP_STYLE_COLORS.text.neutral} name='copy' size={22} />
                          <Text className='contact-card__action-text'>复制</Text>
                        </AppPressable>
                        <AppPressable className='contact-card__action' layout='row-start' onPress={() => handleEdit(contact)}>
                          <AppIcon color={APP_STYLE_COLORS.text.neutral} name='edit' size={22} />
                          <Text className='contact-card__action-text'>编辑</Text>
                        </AppPressable>
                        <AppPressable className='contact-card__action' layout='row-start' onPress={() => handleDelete(contact)}>
                          <AppIcon color={APP_STYLE_COLORS.text.neutral} name='trash' size={22} />
                          <Text className='contact-card__action-text'>删除</Text>
                        </AppPressable>
                      </View>
                    </>
                  )}
                </View>
              </View>
            )
          })}

          {!contacts.length && !loading && (
            <View className='contact-list-empty'>
              <Text className='contact-list-empty__title'>{errorMessage || '暂无地址'}</Text>
              <Text className='contact-list-empty__summary'>可先新增地址，或登录后同步常用地址簿。</Text>
            </View>
          )}

          {loading && <Text className='contact-list-loading'>{contacts.length ? '加载更多地址...' : '正在加载地址...'}</Text>}
        </View>
      </ScrollView>

      <View className='contact-list-footer' style={{ paddingBottom: insets.bottom + 16 }}>
        {deleting ? (
          <>
            <AppPressable contentElement='text' className='contact-list-footer__button contact-list-footer__button--ghost' onPress={exitDeleting}>
              取消
            </AppPressable>
            <AppPressable
              contentElement='text'
              className='contact-list-footer__button contact-list-footer__button--danger'
              disabled={processingContactId === 'batch'}
              onPress={handleBatchDelete}
            >
              立即删除
            </AppPressable>
          </>
        ) : (
          <>
            <AppPressable contentElement='text' className='contact-list-footer__button contact-list-footer__button--ghost' onPress={() => setDeleting(true)}>
              管理
            </AppPressable>
            <AppPressable contentElement='text' className='contact-list-footer__button contact-list-footer__button--primary' onPress={handleCreate}>
              创建新地址
            </AppPressable>
          </>
        )}
      </View>
    </View>
  )
}

export default ContactListPage
