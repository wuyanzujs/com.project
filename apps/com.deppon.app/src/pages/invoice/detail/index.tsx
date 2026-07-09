import { ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow, useRouter } from '@tarojs/taro'

import { useState } from 'react'

import { invoiceService } from '../../../services/invoice'
import { navigateToAppRoute } from '../../../shared/navigation/appNavigation'
import { ensureAuthenticated } from '../../../shared/navigation/authGuard'
import { APP_ROUTES } from '../../../shared/navigation/routes'
import { createAppRouteUrl } from '../../../shared/navigation/routeUrl'

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

const InvoiceDetailPage = () => {
  const router = useRouter()
  const invoice = parseHistory(router.params.data)
  const [waybills, setWaybills] = useState<InvoiceHistoryWaybillView[]>([])
  const [loadedApplyNo, setLoadedApplyNo] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

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

  useDidShow(() => {
    if (!ensureAuthenticated({ replace: true })) {
      return
    }

    if (invoice?.id && loadedApplyNo !== invoice.id) {
      loadWaybills()
    }
  })

  const showToast = (title: string) => {
    Taro.showToast({
      title,
      icon: 'none'
    })
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
            <Text className='invoice-detail-empty__button-text'>返回发票中心</Text>
          </View>
        </View>
      </View>
    )
  }

  return (
    <ScrollView className='invoice-detail-page' scrollY>
      <View className='invoice-detail-header'>
        <Text className='invoice-detail-header__label'>Detail</Text>
        <Text className='invoice-detail-header__title'>发票详情</Text>
        <Text className='invoice-detail-header__summary'>
          首期展示开票记录和包含运单，作废、撤销和纸票寄送后续拆分。
        </Text>
      </View>

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
        </View>
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
