import { Input, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow, useRouter } from '@tarojs/taro'

import { useState } from 'react'

import { CACHE_KEYS, DPCacheExpireType, dpCache } from '../../../cache'
import {
  contactSelection,
  getContactFullAddress
} from '../../../services/contact'
import { invoiceService } from '../../../services/invoice'
import { navigateToAppRoute } from '../../../shared/navigation/appNavigation'
import { ensureAuthenticated } from '../../../shared/navigation/authGuard'
import { APP_ROUTES } from '../../../shared/navigation/routes'
import { createAppRouteUrl } from '../../../shared/navigation/routeUrl'

import type { Contact } from '../../../services/contact'
import type {
  InvoiceHistoryView,
  InvoiceHistoryWaybillView
} from '../../../services/invoice'

import './index.scss'

function parseHistory(value?: string): InvoiceHistoryView | null {
  if (!value) {
    return null
  }

  try {
    return JSON.parse(decodeURIComponent(value)) as InvoiceHistoryView
  } catch {
    return null
  }
}

function getMoneyText(value: number) {
  if (!Number.isFinite(value)) {
    return '¥0'
  }

  return Number.isInteger(value) ? `¥${value}` : `¥${value.toFixed(2)}`
}

function getStatusClassName(statusClass: string) {
  return `invoice-detail-status invoice-detail-status--${statusClass.toLowerCase()}`
}

function createPreviewUrl(invoice: InvoiceHistoryView) {
  return createAppRouteUrl(APP_ROUTES.invoicePreview, {
    id: invoice.id,
    title: invoice.title,
    email: invoice.email
  })
}

function getInvoiceAddressText(invoice: InvoiceHistoryView) {
  return (
    [
      invoice.contactProvince,
      invoice.contactCity,
      invoice.contactCounty,
      invoice.contactAddress
    ]
      .filter(Boolean)
      .join('') || '--'
  )
}

function getContactDetailAddress(contact: Contact) {
  const town = contact.town?.trim() || ''
  const address = contact.address.trim()

  if (town && address && !address.startsWith(town)) {
    return `${town}${address}`
  }

  return address || town
}

function createInvoiceContactPatch(contact: Contact) {
  return {
    contactName: contact.name.trim(),
    contactPhone: contact.telephone.trim(),
    contactProvince: contact.province.trim(),
    contactCity: contact.city.trim(),
    contactCounty: contact.county.trim(),
    contactAddress: getContactDetailAddress(contact)
  }
}

const InvoiceDetailPage = () => {
  const router = useRouter()
  const [invoice, setInvoice] = useState<InvoiceHistoryView | null>(() =>
    parseHistory(router.params.data)
  )
  const [waybills, setWaybills] = useState<InvoiceHistoryWaybillView[]>([])
  const [loadedApplyNo, setLoadedApplyNo] = useState('')
  const [email, setEmail] = useState(
    () => invoice?.email || dpCache.get<string>(CACHE_KEYS.invoiceEmail) || ''
  )
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [processingAction, setProcessingAction] = useState('')
  const [modifyingAddress, setModifyingAddress] = useState(false)
  const [message, setMessage] = useState('')

  const showToast = (title: string) => {
    Taro.showToast({
      title,
      icon: 'none'
    })
  }

  const loadWaybills = async () => {
    if (!invoice?.id || loading) {
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const response = await invoiceService.queryHistoryWaybills(invoice.id)

      if (!response.status || !response.result) {
        setWaybills([])
        setMessage(response.message || '暂未获取到开票运单信息')
        return
      }

      setWaybills(response.result)
      setLoadedApplyNo(invoice.id)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectedInvoiceContact = async (contact: Contact) => {
    if (!invoice || modifyingAddress) {
      return
    }

    if (!invoice.canModifyAddress) {
      showToast('当前状态不可修改收票地址')
      return
    }

    const confirm = await Taro.showModal({
      title: '修改收票地址',
      content: `确认将收票地址修改为 ${contact.name} ${contact.telephone} ${getContactFullAddress(contact)} 吗？`,
      confirmText: '确认修改',
      confirmColor: '#1a5eff'
    })

    if (!confirm.confirm) {
      return
    }

    setModifyingAddress(true)
    setMessage('')

    try {
      const response = await invoiceService.modifyAddress(invoice.id, contact)

      if (!response.status) {
        const nextMessage = response.message || '修改收票地址失败'

        setMessage(nextMessage)
        showToast(nextMessage)
        return
      }

      setInvoice(current =>
        current
          ? {
              ...current,
              ...createInvoiceContactPatch(contact)
            }
          : current
      )
      showToast('修改成功')
    } finally {
      setModifyingAddress(false)
    }
  }

  useDidShow(() => {
    if (!ensureAuthenticated({ replace: true })) {
      return
    }

    const selection = contactSelection.consumeSelection(
      'consignee',
      'INVOICE_DETAIL'
    )

    if (selection) {
      handleSelectedInvoiceContact(selection.contact)
    }

    if (invoice?.id && loadedApplyNo !== invoice.id) {
      loadWaybills()
    }
  })

  const handleSendEmail = async () => {
    if (!invoice || sending) {
      return
    }

    if (!invoice.canSendEmail) {
      showToast('当前状态不可发送邮件')
      return
    }

    const validationMessage = invoiceService.validateEmail(email)

    if (validationMessage) {
      showToast(validationMessage)
      return
    }

    setSending(true)
    setMessage('')

    try {
      const response = await invoiceService.sendInvoiceEmail(invoice.id, email)

      if (!response.status) {
        const nextMessage = response.message || '发送失败，请稍后再试'

        setMessage(nextMessage)
        showToast(nextMessage)
        return
      }

      dpCache.set(CACHE_KEYS.invoiceEmail, {
        data: email.trim(),
        expire: {
          type: DPCacheExpireType.INFINITY
        }
      })
      showToast('发送成功')
    } finally {
      setSending(false)
    }
  }

  const handleSelectInvoiceAddress = () => {
    if (!invoice || modifyingAddress) {
      return
    }

    if (!invoice.canModifyAddress) {
      showToast('当前状态不可修改收票地址')
      return
    }

    const params = contactSelection.createParams(
      'consignee',
      'select',
      'INVOICE_DETAIL',
      {
        returnDelta: '2'
      }
    )

    navigateToAppRoute(createAppRouteUrl(APP_ROUTES.contactList, params), {
      login: true
    })
  }

  const handleInvoiceAction = async (action: 'cancel' | 'reverse') => {
    if (!invoice || processingAction) {
      return
    }

    const isCancel = action === 'cancel'
    const allowed = isCancel ? invoice.canCancel : invoice.canReverse

    if (!allowed) {
      showToast(isCancel ? '当前状态不可撤销' : '当前状态不可作废')
      return
    }

    const confirm = await Taro.showModal({
      title: isCancel ? '撤销申请' : '作废发票',
      content: isCancel
        ? '确定要撤销当前发票申请吗？'
        : '确定要将当前发票作废吗？作废后请在开票历史查看处理结果。',
      confirmText: isCancel ? '确认撤销' : '确认作废',
      confirmColor: '#b42318'
    })

    if (!confirm.confirm) {
      return
    }

    setProcessingAction(action)
    setMessage('')

    try {
      const response = isCancel
        ? await invoiceService.cancelApply(invoice.id)
        : await invoiceService.reverseInvoice(invoice.id)

      if (!response.status) {
        const nextMessage =
          response.message || (isCancel ? '撤销失败' : '作废失败')

        setMessage(nextMessage)
        showToast(nextMessage)
        return
      }

      showToast(isCancel ? '撤销成功' : '作废成功')
      navigateToAppRoute(
        createAppRouteUrl(APP_ROUTES.invoiceCenter, {
          tab: 'history'
        }),
        {
          login: true,
          replace: true,
          message: false
        }
      )
    } finally {
      setProcessingAction('')
    }
  }

  if (!invoice) {
    return (
      <View className='invoice-detail-page invoice-detail-page--empty'>
        <View className='invoice-detail-empty'>
          <Text className='invoice-detail-empty__title'>缺少发票信息</Text>
          <Text className='invoice-detail-empty__summary'>
            请从发票中心的开票历史进入详情。
          </Text>
          <View
            className='invoice-detail-empty__button'
            onClick={() => navigateToAppRoute(APP_ROUTES.invoiceCenter)}
          >
            <Text className='invoice-detail-empty__button-text'>
              返回发票中心
            </Text>
          </View>
        </View>
      </View>
    )
  }

  return (
    <ScrollView className='invoice-detail-page' scrollY>
      <View className='invoice-detail-card'>
        <View className='invoice-detail-card__top'>
          <Text className='invoice-detail-card__title'>{invoice.title}</Text>
          <Text className={getStatusClassName(invoice.statusClass)}>
            {invoice.statusText}
          </Text>
        </View>

        <View className='invoice-detail-row'>
          <Text className='invoice-detail-row__label'>申请号</Text>
          <Text className='invoice-detail-row__value'>{invoice.id}</Text>
        </View>
        <View className='invoice-detail-row'>
          <Text className='invoice-detail-row__label'>发票类型</Text>
          <Text className='invoice-detail-row__value'>{invoice.typeText}</Text>
        </View>
        <View className='invoice-detail-row'>
          <Text className='invoice-detail-row__label'>发票金额</Text>
          <Text className='invoice-detail-row__amount'>
            {getMoneyText(invoice.amount)}
          </Text>
        </View>
        <View className='invoice-detail-row'>
          <Text className='invoice-detail-row__label'>纳税人识别号</Text>
          <Text className='invoice-detail-row__value'>
            {invoice.taxNumber || '--'}
          </Text>
        </View>
        <View className='invoice-detail-row'>
          <Text className='invoice-detail-row__label'>接收邮箱</Text>
          <Text className='invoice-detail-row__value'>
            {invoice.email || '--'}
          </Text>
        </View>
        <View className='invoice-detail-row'>
          <Text className='invoice-detail-row__label'>申请时间</Text>
          <Text className='invoice-detail-row__value'>{invoice.applyTime}</Text>
        </View>
        {!!invoice.remark && (
          <View className='invoice-detail-row'>
            <Text className='invoice-detail-row__label'>备注</Text>
            <Text className='invoice-detail-row__value'>{invoice.remark}</Text>
          </View>
        )}

        <View className='invoice-detail-actions'>
          <View
            className={
              invoice.canPreview
                ? 'invoice-detail-action'
                : 'invoice-detail-action invoice-detail-action--disabled'
            }
            onClick={() =>
              invoice.canPreview
                ? navigateToAppRoute(createPreviewUrl(invoice), {
                    login: true
                  })
                : showToast('暂无预览信息')
            }
          >
            <Text
              className={
                invoice.canPreview
                  ? 'invoice-detail-action__text'
                  : 'invoice-detail-action__text invoice-detail-action__text--disabled'
              }
            >
              预览/发送邮箱
            </Text>
          </View>
          {invoice.canCancel && (
            <View
              className={
                processingAction === 'cancel'
                  ? 'invoice-detail-action invoice-detail-action--disabled'
                  : 'invoice-detail-action invoice-detail-action--danger'
              }
              onClick={() => handleInvoiceAction('cancel')}
            >
              <Text className='invoice-detail-action__text'>
                {processingAction === 'cancel' ? '撤销中' : '撤销申请'}
              </Text>
            </View>
          )}
          {invoice.canReverse && (
            <View
              className={
                processingAction === 'reverse'
                  ? 'invoice-detail-action invoice-detail-action--disabled'
                  : 'invoice-detail-action invoice-detail-action--danger'
              }
              onClick={() => handleInvoiceAction('reverse')}
            >
              <Text className='invoice-detail-action__text'>
                {processingAction === 'reverse' ? '作废中' : '作废发票'}
              </Text>
            </View>
          )}
        </View>
      </View>

      {invoice.billCategory === '01' && (
        <View className='invoice-detail-section'>
          <View className='invoice-detail-section__head'>
            <Text className='invoice-detail-section__title'>收票地址</Text>
            {invoice.canModifyAddress && (
              <View
                className={
                  modifyingAddress
                    ? 'invoice-detail-section__button invoice-detail-section__button--disabled'
                    : 'invoice-detail-section__button'
                }
                onClick={handleSelectInvoiceAddress}
              >
                <Text className='invoice-detail-section__button-text'>
                  {modifyingAddress ? '修改中' : '修改'}
                </Text>
              </View>
            )}
          </View>

          {invoice.contactName ||
          invoice.contactPhone ||
          invoice.contactAddress ? (
            <>
              <View className='invoice-detail-row'>
                <Text className='invoice-detail-row__label'>收票人</Text>
                <Text className='invoice-detail-row__value'>
                  {[invoice.contactName, invoice.contactPhone]
                    .filter(Boolean)
                    .join(' ') || '--'}
                </Text>
              </View>
              <View className='invoice-detail-row invoice-detail-row--address'>
                <Text className='invoice-detail-row__label'>收票地址</Text>
                <Text className='invoice-detail-row__value invoice-detail-row__value--address'>
                  {getInvoiceAddressText(invoice)}
                </Text>
              </View>
            </>
          ) : (
            <View className='invoice-detail-empty-block'>
              <Text className='invoice-detail-empty-block__title'>
                暂无收票地址
              </Text>
            </View>
          )}
        </View>
      )}

      <View className='invoice-detail-section'>
        <Text className='invoice-detail-section__title'>发送至邮箱</Text>
        <Text className='invoice-detail-section__summary invoice-detail-section__summary--block'>
          可发送状态由发票网关状态决定，邮箱会在本机保留以便下次使用。
        </Text>
        <View className='invoice-detail-mail'>
          <Input
            className='invoice-detail-mail__input'
            maxlength={50}
            placeholder='请输入接收邮箱'
            value={email}
            onBlur={event => setEmail(event.detail.value.trim())}
            onInput={event => setEmail(event.detail.value)}
          />
          <View
            className={
              invoice.canSendEmail && !sending
                ? 'invoice-detail-mail__button'
                : 'invoice-detail-mail__button invoice-detail-mail__button--disabled'
            }
            onClick={handleSendEmail}
          >
            <Text className='invoice-detail-mail__button-text'>
              {sending ? '发送中' : '发送'}
            </Text>
          </View>
        </View>
        {!invoice.canSendEmail && (
          <Text className='invoice-detail-mail__hint'>当前状态暂不可发送</Text>
        )}
      </View>

      <View className='invoice-detail-section'>
        <View className='invoice-detail-section__head'>
          <Text className='invoice-detail-section__title'>包含运单</Text>
          <Text className='invoice-detail-section__summary'>
            共 {waybills.length} 条
          </Text>
        </View>

        {waybills.map((item, index) => (
          <View className='invoice-detail-waybill' key={item.waybillNumber}>
            <View>
              <Text className='invoice-detail-waybill__index'>
                {index + 1}. 运单
              </Text>
              <Text className='invoice-detail-waybill__number'>
                {item.waybillNumber}
              </Text>
            </View>
            <Text className='invoice-detail-waybill__amount'>
              {getMoneyText(item.amount)}
            </Text>
          </View>
        ))}

        {!waybills.length && !loading && (
          <View className='invoice-detail-empty-block'>
            <Text className='invoice-detail-empty-block__title'>
              {message || '暂无包含运单信息'}
            </Text>
          </View>
        )}
      </View>

      {loading && (
        <Text className='invoice-detail-loading'>正在加载包含运单...</Text>
      )}
    </ScrollView>
  )
}

export default InvoiceDetailPage
