import { ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'

import { useCallback, useState } from 'react'

import { invoiceService } from '../../../services/invoice'
import { navigateToAppRoute } from '../../../shared/navigation/appNavigation'
import { ensureAuthenticated } from '../../../shared/navigation/authGuard'
import { APP_ROUTES } from '../../../shared/navigation/routes'

import type { InvoiceTaxpayerView } from '../../../services/invoice'

import './index.scss'

const InvoiceTaxpayerListPage = () => {
  const [taxpayers, setTaxpayers] = useState<InvoiceTaxpayerView[]>([])
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const ensureTaxpayerAccess = useCallback(
    () =>
      ensureAuthenticated({
        redirectUrl: APP_ROUTES.invoiceTaxpayerList,
        replace: true
      }),
    []
  )

  const loadTaxpayers = useCallback(async () => {
    if (loading) {
      return
    }

    setLoading(true)
    setErrorMessage('')

    try {
      const response = await invoiceService.queryTaxpayers()

      if (!response.status || !response.result) {
        setTaxpayers([])
        setErrorMessage(response.message || '暂未获取到发票抬头')
        return
      }

      setTaxpayers(response.result)
    } finally {
      setLoading(false)
    }
  }, [loading])

  useDidShow(() => {
    if (ensureTaxpayerAccess()) {
      loadTaxpayers()
    }
  })

  const handleCreate = () => {
    navigateToAppRoute(APP_ROUTES.invoiceTaxpayerEdit, {
      login: true
    })
  }

  const handleEdit = (item: InvoiceTaxpayerView) => {
    const data = encodeURIComponent(JSON.stringify(item))
    const url = `${APP_ROUTES.invoiceTaxpayerEdit}?data=${data}`

    navigateToAppRoute(url, {
      login: true
    })
  }

  const handleDelete = async (item: InvoiceTaxpayerView) => {
    const confirm = await Taro.showModal({
      title: '删除抬头',
      content: `确定删除“${item.name || '发票抬头'}”吗？`,
      cancelText: '取消',
      confirmText: '删除'
    })

    if (!confirm.confirm) {
      return
    }

    const response = await invoiceService.deleteTaxpayer(item.id)

    if (!response.status) {
      Taro.showToast({
        title: response.message || '删除失败',
        icon: 'none'
      })
      return
    }

    setTaxpayers((current) => current.filter((next) => next.id !== item.id))
    Taro.showToast({
      title: '删除成功',
      icon: 'none'
    })
  }

  const handleToggleDefault = async (item: InvoiceTaxpayerView) => {
    const form = invoiceService.createTaxpayerForm({
      ...item,
      isDefault: !item.isDefault
    })
    const response = await invoiceService.saveTaxpayer(form)

    if (!response.status) {
      Taro.showToast({
        title: response.message || '设置失败',
        icon: 'none'
      })
      return
    }

    setTaxpayers((current) =>
      current
        .map((next) => ({
          ...next,
          isDefault:
            next.id === item.id
              ? !item.isDefault
              : item.isDefault
                ? next.isDefault
                : false
        }))
        .sort((left, right) => Number(right.isDefault) - Number(left.isDefault))
    )
    Taro.showToast({
      title: '设置成功',
      icon: 'none'
    })
  }

  return (
    <ScrollView className='invoice-taxpayer-page' scrollY>
      <View className='invoice-taxpayer-header'>
        <Text className='invoice-taxpayer-header__label'>Taxpayer</Text>
        <Text className='invoice-taxpayer-header__title'>发票抬头</Text>
        <Text className='invoice-taxpayer-header__summary'>
          App 首期支持抬头新增、编辑、删除和默认抬头设置。
        </Text>
      </View>

      <View className='invoice-taxpayer-toolbar'>
        <View>
          <Text className='invoice-taxpayer-toolbar__title'>抬头列表</Text>
          <Text className='invoice-taxpayer-toolbar__summary'>
            共 {taxpayers.length} 条，最多建议保留 20 条
          </Text>
        </View>
        <View className='invoice-taxpayer-toolbar__button' onClick={handleCreate}>
          <Text className='invoice-taxpayer-toolbar__button-text'>新增</Text>
        </View>
      </View>

      <View className='invoice-taxpayer-content'>
        {taxpayers.map((item) => (
          <View className='invoice-taxpayer-card' key={item.id}>
            <View className='invoice-taxpayer-card__top'>
              <Text className='invoice-taxpayer-card__title'>
                {item.name || '--'}
              </Text>
              {item.isDefault && (
                <Text className='invoice-taxpayer-card__tag'>默认</Text>
              )}
            </View>
            <Text className='invoice-taxpayer-card__meta'>{item.typeText}</Text>
            <Text className='invoice-taxpayer-card__meta'>
              税号 {item.taxNumber || '--'}
            </Text>
            {item.phone && (
              <Text className='invoice-taxpayer-card__meta'>
                电话 {item.phone}
              </Text>
            )}
            {item.address && (
              <Text className='invoice-taxpayer-card__meta'>
                地址 {item.address}
              </Text>
            )}
            {(item.bank || item.bankAccount) && (
              <Text className='invoice-taxpayer-card__meta'>
                银行 {item.bank || '--'} {item.bankAccount || ''}
              </Text>
            )}

            <View className='invoice-taxpayer-card__actions'>
              <View
                className='invoice-taxpayer-card__outline-button'
                onClick={() => handleToggleDefault(item)}
              >
                <Text className='invoice-taxpayer-card__outline-button-text'>
                  {item.isDefault ? '取消默认' : '设为默认'}
                </Text>
              </View>
              <View
                className='invoice-taxpayer-card__outline-button'
                onClick={() => handleEdit(item)}
              >
                <Text className='invoice-taxpayer-card__outline-button-text'>
                  编辑
                </Text>
              </View>
              <View
                className='invoice-taxpayer-card__danger-button'
                onClick={() => handleDelete(item)}
              >
                <Text className='invoice-taxpayer-card__danger-button-text'>
                  删除
                </Text>
              </View>
            </View>
          </View>
        ))}

        {!taxpayers.length && !loading && (
          <View className='invoice-taxpayer-empty'>
            <Text className='invoice-taxpayer-empty__title'>
              {errorMessage || '暂无发票抬头'}
            </Text>
            <Text className='invoice-taxpayer-empty__summary'>
              新增抬头后，可在发票申请链路中复用。
            </Text>
          </View>
        )}

        {loading && (
          <Text className='invoice-taxpayer-loading'>正在加载发票抬头...</Text>
        )}
      </View>
    </ScrollView>
  )
}

export default InvoiceTaxpayerListPage
