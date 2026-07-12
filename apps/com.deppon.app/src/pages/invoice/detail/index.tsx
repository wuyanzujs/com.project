import { ScrollView, View } from '@tarojs/components'
import Taro, { useDidShow, useRouter } from '@tarojs/taro'

import { useState } from 'react'

import { InvoiceDetailOverviewCard } from './components/InvoiceDetailOverviewCard'
import {
  InvoiceDetailLoadingState,
  InvoiceDetailMissingState
} from './components/InvoiceDetailStates'
import { InvoiceDetailSupplementarySections } from './components/InvoiceDetailSupplementarySections'
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
import { APP_STYLE_COLORS } from '../../../styles/nativeTokens'

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
      confirmColor: APP_STYLE_COLORS.brand.default
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

  const handleEmailBlur = (value: string) => {
    setEmail(value.trim())
  }

  const handleEmailInput = (value: string) => {
    setEmail(value)
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
      confirmColor: APP_STYLE_COLORS.status.dangerTextStrong
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

  const handlePreviewInvoice = () => {
    if (!invoice) {
      return
    }

    if (!invoice.canPreview) {
      showToast('暂无预览信息')
      return
    }

    navigateToAppRoute(createPreviewUrl(invoice), {
      login: true
    })
  }

  if (!invoice) {
    return (
      <View className='invoice-detail-page invoice-detail-page--empty'>
        <InvoiceDetailMissingState
          onBack={() => navigateToAppRoute(APP_ROUTES.invoiceCenter)}
        />
      </View>
    )
  }

  return (
    <ScrollView className='invoice-detail-page' scrollY>
      <InvoiceDetailOverviewCard
        invoice={invoice}
        processingAction={processingAction}
        onCancel={() => handleInvoiceAction('cancel')}
        onPreview={handlePreviewInvoice}
        onReverse={() => handleInvoiceAction('reverse')}
      />

      <InvoiceDetailSupplementarySections
        addressText={getInvoiceAddressText(invoice)}
        email={email}
        invoice={invoice}
        loading={loading}
        message={message}
        modifyingAddress={modifyingAddress}
        sending={sending}
        waybills={waybills}
        onEmailBlur={handleEmailBlur}
        onEmailInput={handleEmailInput}
        onSelectAddress={handleSelectInvoiceAddress}
        onSendEmail={handleSendEmail}
      />

      {loading && <InvoiceDetailLoadingState />}
    </ScrollView>
  )
}

export default InvoiceDetailPage
