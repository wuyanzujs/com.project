import { ScrollView, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'

import { useCallback, useEffect, useState } from 'react'

import {
  createExpressDraft,
  createExpressProductQuoteView,
  expressDraftBridge,
  expressDraftStorage,
  getExpressDeliveryPreferenceOption,
  getExpressReturnBillOption
} from '@/services/express'
import type { ExpressDraft, ExpressProductQuote } from '@/services/express'
import { AppPage, AppPressable } from '@/shared/components'
import { navigateToAppRoute } from '@/shared/navigation/appNavigation'
import { APP_ROUTES } from '@/shared/navigation/routes'
import { getNativeCapabilityErrorMessage, shareWithApp } from '@/shared/platform'

import { ExpressCollectionCard } from '../components/ExpressCollectionCard'
import { ExpressDeliveryPreferenceCard } from '../components/ExpressDeliveryPreferenceCard'
import { ExpressNavBar } from '../components/ExpressNavBar'
import { ExpressPackagingCard } from '../components/ExpressPackagingCard'
import { ExpressPriceDetailSheet } from '../components/ExpressPriceDetailSheet'
import { ExpressReturnBillCard } from '../components/ExpressReturnBillCard'
import { ExpressWarehouseCard } from '../components/ExpressWarehouseCard'
import { useExpressCollection } from '../hooks/useExpressCollection'
import { useExpressDeliveryPreference } from '../hooks/useExpressDeliveryPreference'
import { useExpressGoods } from '../hooks/useExpressGoods'
import { useExpressReturnBill } from '../hooks/useExpressReturnBill'
import { useExpressWarehouse } from '../hooks/useExpressWarehouse'

import './index.scss'
import './content.scss'

function noopQuotes() {
  // 增值服务页不做询价，报价统一回寄件页重新获取。
}

function createInitialDraft() {
  return expressDraftStorage.restore() ?? createExpressDraft()
}

function getProductPriceText(product: ExpressProductQuote | null) {
  if (!product || product.totalfee === null || product.totalfee === undefined) {
    return '¥--'
  }

  return `¥${product.totalfee}`
}

/**
 * @description 增值服务专属页：生产端把代收货款、签收单、派送时间、送货进仓、打包服务
 * 等服务项收在这一页里配置，寄件页只保留入口行，不再原地展开。
 */
const ExpressServicesPage = () => {
  const [draft, setDraft] = useState<ExpressDraft>(() => createInitialDraft())
  const [detailVisible, setDetailVisible] = useState(false)

  const collectionController = useExpressCollection({ setDraft })
  const returnBillController = useExpressReturnBill({ draft, restoreQuotes: noopQuotes, setDraft })
  const deliveryPreferenceController = useExpressDeliveryPreference({ draft, setDraft })
  const warehouseController = useExpressWarehouse({ draft, setDraft })
  const goods = useExpressGoods({ restoreQuotes: noopQuotes, setDraft })

  useEffect(() => {
    expressDraftStorage.save(draft)
  }, [draft])

  const detailView = draft.selectedProduct ? createExpressProductQuoteView(draft.selectedProduct) : null

  const summaryParts = [
    draft.service.deliveryMode !== 'PICKNOTUPSTAIRS' && '送货方式',
    Boolean(draft.packaging.cartonCode || draft.packaging.woodenCodes.length || draft.packaging.unpackingCodes.length) && '包装服务',
    draft.service.passwordSigning === 'Y' && '签收密码',
    draft.service.returnBill.type !== 'NO_RETURN_SIGNED' && getExpressReturnBillOption(draft.service.returnBill.type).label,
    Boolean(draft.collection.type) && '代收货款',
    Boolean(draft.deliveryPreference.type) && getExpressDeliveryPreferenceOption(draft.deliveryPreference.type).label,
    draft.warehouse.enabled && '送货进仓'
  ].filter(Boolean) as string[]

  const handleConfirm = useCallback(async () => {
    expressDraftStorage.save(draft)
    expressDraftBridge.carryFromValueAdded(draft)

    try {
      await Taro.navigateBack()
    } catch {
      navigateToAppRoute(APP_ROUTES.express, { login: true })
    }
  }, [draft])

  const handleOpenDetail = useCallback(() => {
    if (!detailView) {
      Taro.showToast({ title: '请返回寄件页获取价格', icon: 'none' })
      return
    }

    setDetailVisible(current => !current)
  }, [detailView])

  const handleShare = () => {
    shareWithApp({
      source: 'EXPRESS_SUBMIT',
      title: '德邦快递寄件',
      description: '在线寄快递，1小时上门取件'
    }).catch(error => {
      Taro.showToast({
        title: getNativeCapabilityErrorMessage(error),
        icon: 'none'
      })
    })
  }

  return (
    <AppPage
      footer={
        <View className='express-services__bar'>
          <View className='express-services__summary'>
            <View className='express-services__price-row'>
              <Text className='express-services__bar-label'>费用合计</Text>
              <Text className='express-services__bar-fee'>{getProductPriceText(draft.selectedProduct)}</Text>
            </View>
            <View className='express-services__bar-divider' />
            <AppPressable
              accessibilityLabel={detailVisible ? '收起费用明细' : '展开费用明细'}
              className='express-services__bar-detail'
              layout='row-center'
              onPress={handleOpenDetail}
            >
              <Text className='express-services__bar-detail-text'>明细</Text>
              <Text className='express-services__bar-detail-arrow'>{detailVisible ? '˅' : '^'}</Text>
            </AppPressable>
          </View>
          <AppPressable accessibilityLabel='确定增值服务' className='express-services__bar-confirm' onPress={handleConfirm}>
            <Text className='express-services__bar-confirm-text'>确定</Text>
          </AppPressable>
        </View>
      }
      header={<ExpressNavBar title='增值服务' onShare={handleShare} />}
      keyboardAvoiding
      safeArea='both'
      statusBar='dark'
      surface='page'
    >
      <ScrollView className='express-services' scrollY style={{ flex: 1 }}>
        <View className='express-services__card'>
          <ExpressCollectionCard collection={draft.collection} controller={collectionController} selectedProduct={draft.selectedProduct} />
        </View>
        <View className='express-services__card'>
          <ExpressReturnBillCard
            onChange={returnBillController.onChange}
            onOpenCloudSign={returnBillController.onOpenCloudSign}
            productCode={draft.selectedProduct?.omsProductCode || draft.service.transportMode}
            returnBill={draft.service.returnBill}
          />
        </View>
        <View className='express-services__card'>
          <ExpressDeliveryPreferenceCard controller={deliveryPreferenceController} preference={draft.deliveryPreference} />
        </View>
        <View className='express-services__card'>
          <ExpressWarehouseCard controller={warehouseController} warehouse={draft.warehouse} />
        </View>
        <View className='express-services__card'>
          <ExpressPackagingCard packaging={draft.packaging} onChange={goods.handlePackagingChange} />
        </View>
        <Text className='express-services__note'>{summaryParts.length ? `已选：${summaryParts.join('、')}` : '暂未选择增值服务'}</Text>
      </ScrollView>

      {detailView ? <ExpressPriceDetailSheet view={detailView} visible={detailVisible} onClose={() => setDetailVisible(false)} /> : null}
    </AppPage>
  )
}

export default ExpressServicesPage
