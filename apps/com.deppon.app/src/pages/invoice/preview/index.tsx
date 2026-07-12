import { Image, Input, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow, useRouter } from '@tarojs/taro'

import { useState } from 'react'

import { CACHE_KEYS, DPCacheExpireType, dpCache } from '../../../cache'
import { invoiceService } from '../../../services/invoice'
import { AppPressable } from '../../../shared/components'
import { ensureAuthenticated } from '../../../shared/navigation/authGuard'
import {
  copyTextToClipboard,
  downloadAppFile,
  getNativeCapabilityErrorMessage,
  openAppFile
} from '../../../shared/platform'

import type {
  InvoicePreviewFile,
  InvoicePreviewView
} from '../../../services/invoice'


import './index.scss'
import './content.scss'

function decodeRouteParam(value?: string) {
  if (!value) {
    return ''
  }

  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

const InvoicePreviewPage = () => {
  const router = useRouter()
  const applyNo = decodeRouteParam(router.params.id || router.params.applyNo)
  const title = decodeRouteParam(router.params.title || router.params.name)
    || '电子发票'
  const routeEmail = decodeRouteParam(router.params.email)
  const [preview, setPreview] = useState<InvoicePreviewView | null>(null)
  const [loadedApplyNo, setLoadedApplyNo] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [email, setEmail] = useState(
    routeEmail || dpCache.get<string>(CACHE_KEYS.invoiceEmail) || ''
  )
  const [message, setMessage] = useState('')

  const loadPreview = async () => {
    if (loading || !applyNo) {
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const response = await invoiceService.queryPreview(applyNo, title)

      if (!response.status || !response.result) {
        setPreview(null)
        setMessage(response.message || '暂未获取到发票预览')
        return
      }

      setPreview(response.result)
      setLoadedApplyNo(applyNo)
    } finally {
      setLoading(false)
    }
  }

  useDidShow(() => {
    if (!ensureAuthenticated({ replace: true })) {
      return
    }

    if (applyNo && loadedApplyNo !== applyNo) {
      loadPreview()
    }
  })

  const showToast = (toastTitle: string) => {
    Taro.showToast({
      title: toastTitle,
      icon: 'none'
    })
  }

  const handleCopy = async (url: string) => {
    try {
      await copyTextToClipboard(url)
      showToast('链接已复制')
    } catch {
      showToast('复制失败，请手动选择链接')
    }
  }

  const handleOpenFile = async (file: InvoicePreviewFile) => {
    const url = file.pdfUrl || file.imageUrl

    if (!url) {
      showToast('暂无可打开的发票链接')
      return
    }

    try {
      const localFile = await downloadAppFile({
        source: 'INVOICE_PREVIEW',
        url,
        fileName: `${preview?.title || 'invoice'}.pdf`
      })

      await openAppFile({
        source: 'INVOICE_PREVIEW',
        file: localFile
      })
    } catch (error) {
      showToast(getNativeCapabilityErrorMessage(error))
    }
  }

  const handleSendEmail = async () => {
    if (sending) {
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
      const response = await invoiceService.sendInvoiceEmail(applyNo, email)

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

  const renderFile = (file: InvoicePreviewFile) => {
    if (!file.displayUrl) {
      return null
    }

    return (
      <View className='invoice-preview-file'>
        <View className='invoice-preview-file__head'>
          <Text className='invoice-preview-file__title'>{file.title}</Text>
          <Text className='invoice-preview-file__tag'>
            {file.hasImage ? '图片' : 'PDF'}
          </Text>
        </View>

        {file.hasImage ? (
          <Image
            className='invoice-preview-file__image'
            mode='widthFix'
            src={file.imageUrl}
          />
        ) : (
          <View className='invoice-preview-file__pdf'>
            <Text className='invoice-preview-file__pdf-text'>PDF</Text>
          </View>
        )}

        <Text className='invoice-preview-file__link' selectable>
          {file.displayUrl}
        </Text>

        <View className='invoice-preview-file__actions'>
          <AppPressable
            className='invoice-preview-file__button invoice-preview-file__button--ghost'
            onPress={() => handleCopy(file.displayUrl)}
          >
            <Text className='invoice-preview-file__button-text invoice-preview-file__button-text--ghost'>
              复制链接
            </Text>
          </AppPressable>
          <AppPressable
            className='invoice-preview-file__button'
            onPress={() => handleOpenFile(file)}
          >
            <Text className='invoice-preview-file__button-text'>下载/打开</Text>
          </AppPressable>
        </View>
      </View>
    )
  }

  if (!applyNo) {
    return (
      <View className='invoice-preview-page invoice-preview-page--empty'>
        <View className='invoice-preview-empty'>
          <Text className='invoice-preview-empty__title'>缺少发票申请号</Text>
          <Text className='invoice-preview-empty__summary'>
            请从发票中心的开票历史进入预览。
          </Text>
        </View>
      </View>
    )
  }

  return (
    <ScrollView className='invoice-preview-page' scrollY>
      <View className='invoice-preview-card'>
        <View className='invoice-preview-card__row'>
          <Text className='invoice-preview-card__label'>申请号</Text>
          <Text className='invoice-preview-card__value'>{applyNo}</Text>
        </View>
        <View className='invoice-preview-card__row'>
          <Text className='invoice-preview-card__label'>发票抬头</Text>
          <Text className='invoice-preview-card__value'>
            {preview?.title || title}
          </Text>
        </View>
        <View className='invoice-preview-card__row'>
          <Text className='invoice-preview-card__label'>发票类型</Text>
          <Text className='invoice-preview-card__value'>
            {preview?.billCategoryText || '--'}
          </Text>
        </View>
      </View>

      {preview?.hasPreview && (
        <View className='invoice-preview-mail'>
          <Text className='invoice-preview-mail__title'>发送至邮箱</Text>
          <Text className='invoice-preview-mail__summary'>
            可将电子发票发送到指定邮箱，邮箱会在本机保留以便下次使用。
          </Text>
          <View className='invoice-preview-mail__row'>
            <Input
              className='invoice-preview-mail__input'
              maxlength={50}
              placeholder='请输入接收邮箱'
              value={email}
              onBlur={(event) => setEmail(event.detail.value.trim())}
              onInput={(event) => setEmail(event.detail.value)}
            />
            <AppPressable
              className={
                sending
                  ? 'invoice-preview-mail__button invoice-preview-mail__button--disabled'
                  : 'invoice-preview-mail__button'
              }
              onPress={handleSendEmail}
            >
              <Text className='invoice-preview-mail__button-text'>
                {sending ? '发送中' : '发送'}
              </Text>
            </AppPressable>
          </View>
        </View>
      )}

      {preview?.hasPreview && (
        <View className='invoice-preview-content'>
          {renderFile(preview.invoice)}
          {renderFile(preview.reversal)}
        </View>
      )}

      {(loading || message) && (
        <View className='invoice-preview-state'>
          <Text className='invoice-preview-state__text'>
            {loading ? '正在加载发票预览...' : message}
          </Text>
        </View>
      )}
    </ScrollView>
  )
}

export default InvoicePreviewPage
