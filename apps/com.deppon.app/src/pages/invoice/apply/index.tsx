import { Input, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow, useRouter } from '@tarojs/taro'

import { useMemo, useState } from 'react'

import { CACHE_KEYS, dpCache } from '../../../cache'
import { invoiceService } from '../../../services/invoice'
import { navigateToAppRoute } from '../../../shared/navigation/appNavigation'
import { ensureAuthenticated } from '../../../shared/navigation/authGuard'
import { APP_ROUTES } from '../../../shared/navigation/routes'

import type {
  InvoiceApplyBillCategory,
  InvoiceOrderView,
  InvoiceTaxpayerView
} from '../../../services/invoice'

import './index.scss'

const BILL_CATEGORY_OPTIONS: Array<{
  label: string
  value: InvoiceApplyBillCategory
  summary: string
}> = [
  {
    label: '电子普票',
    value: '06',
    summary: '适合个人或单位抬头'
  },
  {
    label: '电子专票',
    value: '13',
    summary: '仅支持单位抬头'
  }
]

function parseOrder(value?: string): InvoiceOrderView | null {
  if (!value) {
    return null
  }

  try {
    return JSON.parse(decodeURIComponent(value)) as InvoiceOrderView
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

const InvoiceApplyPage = () => {
  const router = useRouter()
  const order = useMemo(() => parseOrder(router.params.order), [
    router.params.order
  ])
  const [taxpayers, setTaxpayers] = useState<InvoiceTaxpayerView[]>([])
  const [selectedTaxpayerId, setSelectedTaxpayerId] =
    useState<number | null>(null)
  const [billCategory, setBillCategory] =
    useState<InvoiceApplyBillCategory>('06')
  const [email, setEmail] = useState(
    () => dpCache.get<string>(CACHE_KEYS.invoiceEmail) || ''
  )
  const [unit, setUnit] = useState('')
  const [remark, setRemark] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  const selectedTaxpayer =
    taxpayers.find((item) => item.id === selectedTaxpayerId) ?? null
  const preview = order
    ? invoiceService.createApplyPreview({
        order,
        taxpayer: selectedTaxpayer,
        billCategory,
        email,
        unit,
        remark
      })
    : null

  const loadTaxpayers = async () => {
    if (loading) {
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const response = await invoiceService.queryTaxpayers()

      if (!response.status || !response.result) {
        setTaxpayers([])
        setMessage(response.message || '暂未获取到发票抬头')
        return
      }

      setTaxpayers(response.result)
      const defaultTaxpayer =
        response.result.find((item) => item.isDefault) ?? response.result[0]

      if (defaultTaxpayer && !selectedTaxpayerId) {
        setSelectedTaxpayerId(defaultTaxpayer.id)
      }
    } finally {
      setLoading(false)
    }
  }

  useDidShow(() => {
    if (
      ensureAuthenticated({
        replace: true
      })
    ) {
      loadTaxpayers()
    }
  })

  const handleSubmit = async () => {
    if (submitting) {
      return
    }

    if (!order) {
      return
    }

    if (!preview?.canSubmit) {
      const nextMessage = preview?.message || '缺少开票信息'

      setMessage(nextMessage)
      Taro.showToast({
        title: nextMessage,
        icon: 'none'
      })
      return
    }

    setSubmitting(true)
    setMessage('')

    try {
      const response = await invoiceService.submitApplyDraft({
        order,
        taxpayer: selectedTaxpayer,
        billCategory,
        email,
        unit,
        remark
      })

      if (!response.status) {
        const nextMessage = response.message || '提交失败，请稍后再试'

        setMessage(nextMessage)
        Taro.showToast({
          title: nextMessage,
          icon: 'none'
        })
        return
      }

      dpCache.set(CACHE_KEYS.invoiceEmail, {
        data: email.trim()
      })
      Taro.showToast({
        title: '提交成功，请在开票历史查看进度',
        icon: 'none'
      })
      navigateToAppRoute(`${APP_ROUTES.invoiceCenter}?tab=history`, {
        login: true,
        replace: true,
        message: false
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (!order) {
    return (
      <View className='invoice-apply-page invoice-apply-page--empty'>
        <View className='invoice-apply-empty'>
          <Text className='invoice-apply-empty__title'>缺少开票运单</Text>
          <Text className='invoice-apply-empty__summary'>
            请从发票中心选择可开票运单后再申请。
          </Text>
          <View
            className='invoice-apply-empty__button'
            onClick={() => navigateToAppRoute(APP_ROUTES.invoiceCenter)}
          >
            <Text className='invoice-apply-empty__button-text'>返回发票中心</Text>
          </View>
        </View>
      </View>
    )
  }

  return (
    <ScrollView className='invoice-apply-page' scrollY>
      <View className='invoice-apply-header'>
        <Text className='invoice-apply-header__label'>Apply</Text>
        <Text className='invoice-apply-header__title'>申请发票</Text>
        <Text className='invoice-apply-header__summary'>
          核对运单、抬头和接收邮箱后提交，开具进展可在发票历史查看。
        </Text>
      </View>

      <View className='invoice-apply-card'>
        <View className='invoice-apply-card__top'>
          <Text className='invoice-apply-card__title'>
            运单 {order.waybillNumber || '--'}
          </Text>
          <Text className='invoice-apply-card__amount'>
            {getMoneyText(order.amount)}
          </Text>
        </View>
        <Text className='invoice-apply-card__meta'>
          {order.senderText || '--'} → {order.consigneeText || '--'}
        </Text>
        <Text className='invoice-apply-card__meta'>{order.businessTime}</Text>
      </View>

      <View className='invoice-apply-section'>
        <View className='invoice-apply-section__head'>
          <Text className='invoice-apply-section__title'>发票类型</Text>
        </View>
        {BILL_CATEGORY_OPTIONS.map((item) => (
          <View
            className={
              item.value === billCategory
                ? 'invoice-apply-option invoice-apply-option--active'
                : 'invoice-apply-option'
            }
            key={item.value}
            onClick={() => setBillCategory(item.value)}
          >
            <View>
              <Text className='invoice-apply-option__title'>{item.label}</Text>
              <Text className='invoice-apply-option__summary'>
                {item.summary}
              </Text>
            </View>
            <Text
              className={
                item.value === billCategory
                  ? 'invoice-apply-option__radio invoice-apply-option__radio--active'
                  : 'invoice-apply-option__radio'
              }
            >
              {item.value === billCategory ? '✓' : ''}
            </Text>
          </View>
        ))}
      </View>

      <View className='invoice-apply-section'>
        <View className='invoice-apply-section__head'>
          <Text className='invoice-apply-section__title'>发票抬头</Text>
          <View
            className='invoice-apply-link'
            onClick={() =>
              navigateToAppRoute(APP_ROUTES.invoiceTaxpayerList, {
                login: true
              })
            }
          >
            <Text className='invoice-apply-link__text'>管理</Text>
          </View>
        </View>

        {taxpayers.map((item) => (
          <View
            className={
              item.id === selectedTaxpayerId
                ? 'invoice-apply-taxpayer invoice-apply-taxpayer--active'
                : 'invoice-apply-taxpayer'
            }
            key={item.id}
            onClick={() => setSelectedTaxpayerId(item.id)}
          >
            <View>
              <Text className='invoice-apply-taxpayer__title'>{item.name}</Text>
              <Text className='invoice-apply-taxpayer__summary'>
                {item.typeText} · {item.taxNumber || '无税号'}
              </Text>
            </View>
            {item.isDefault && (
              <Text className='invoice-apply-taxpayer__tag'>默认</Text>
            )}
          </View>
        ))}

        {!taxpayers.length && !loading && (
          <View className='invoice-apply-empty-block'>
            <Text className='invoice-apply-empty-block__title'>
              暂无发票抬头
            </Text>
            <Text className='invoice-apply-empty-block__summary'>
              请先新增抬头后再申请发票。
            </Text>
          </View>
        )}
      </View>

      <View className='invoice-apply-section'>
        <Text className='invoice-apply-section__title'>接收信息</Text>
        <View className='invoice-apply-field'>
          <Text className='invoice-apply-field__label'>接收邮箱 *</Text>
          <Input
            className='invoice-apply-input'
            placeholder='请输入电子发票接收邮箱'
            value={email}
            onBlur={(event) => setEmail(event.detail.value.trim())}
            onInput={(event) => setEmail(event.detail.value)}
          />
        </View>
        <View className='invoice-apply-field'>
          <Text className='invoice-apply-field__label'>货物单位</Text>
          <Input
            className='invoice-apply-input'
            maxlength={16}
            placeholder='选填'
            value={unit}
            onInput={(event) => setUnit(event.detail.value)}
          />
        </View>
        <View className='invoice-apply-field'>
          <Text className='invoice-apply-field__label'>备注</Text>
          <Input
            className='invoice-apply-input'
            maxlength={80}
            placeholder='选填，展示在发票备注中'
            value={remark}
            onInput={(event) => setRemark(event.detail.value)}
          />
        </View>
      </View>

      <View className='invoice-apply-preview'>
        <Text className='invoice-apply-preview__title'>核对信息</Text>
        <View className='invoice-apply-preview__row'>
          <Text className='invoice-apply-preview__label'>发票类型</Text>
          <Text className='invoice-apply-preview__value'>
            {preview?.billCategoryText || '--'}
          </Text>
        </View>
        <View className='invoice-apply-preview__row'>
          <Text className='invoice-apply-preview__label'>发票金额</Text>
          <Text className='invoice-apply-preview__amount'>
            {getMoneyText(preview?.amount ?? 0)}
          </Text>
        </View>
        <View className='invoice-apply-preview__row'>
          <Text className='invoice-apply-preview__label'>发票抬头</Text>
          <Text className='invoice-apply-preview__value'>
            {preview?.taxpayerName || '--'}
          </Text>
        </View>
        <View className='invoice-apply-preview__row'>
          <Text className='invoice-apply-preview__label'>接收邮箱</Text>
          <Text className='invoice-apply-preview__value'>
            {preview?.email || '--'}
          </Text>
        </View>
        {(message || preview?.message) && (
          <Text className='invoice-apply-preview__message'>
            {message || preview?.message}
          </Text>
        )}
      </View>

      <View
        className={
          submitting
            ? 'invoice-apply-submit invoice-apply-submit--disabled'
            : 'invoice-apply-submit'
        }
        onClick={handleSubmit}
      >
        <Text className='invoice-apply-submit__amount'>
          {getMoneyText(order.amount)}
        </Text>
        <Text className='invoice-apply-submit__text'>
          {submitting ? '提交中...' : '提交申请'}
        </Text>
      </View>
    </ScrollView>
  )
}

export default InvoiceApplyPage
