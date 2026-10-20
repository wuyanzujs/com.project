import { ScrollView, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'

import { useCallback, useEffect, useState } from 'react'

import collectionIcon from '@/assets/express/services/service_icon_collection.png'
import deliveryIcon from '@/assets/express/services/service_icon_delivery.png'
import doubleDeliveryIcon from '@/assets/express/services/service_icon_double_delivery.png'
import packingIcon from '@/assets/express/services/service_icon_packing.png'
import powerCheckIcon from '@/assets/express/services/service_icon_powercheck.png'
import signformIcon from '@/assets/express/services/service_icon_signform.png'
import photoIcon from '@/assets/express/services/service_icon_take_photo.png'
import warehouseIcon from '@/assets/express/services/service_icon_warehouse.png'
import { createExpressDraft, expressDraftBridge, expressDraftStorage, getExpressReturnBillOption } from '@/services/express'
import type { ExpressDraft } from '@/services/express'
import { createExpressValueAddedQuoteView } from '@/services/express/valueAdded.quoteView'
import { updateExpressValueAdded, validateExpressValueAdded } from '@/services/express/valueAdded.rules'
import { AppPage, AppPressable } from '@/shared/components'
import { navigateToAppRoute } from '@/shared/navigation/appNavigation'
import { APP_ROUTES } from '@/shared/navigation/routes'
import { getNativeCapabilityErrorMessage, shareWithApp } from '@/shared/platform'

import { PhotoServiceEditor, PowerMachineEditor, usePowerMachineCategories } from './ExtraServiceEditors'
import { ServiceCard } from './ServiceCard'
import { useValueAddedQuote } from './useValueAddedQuote'
import { ValueAddedFeeSheet } from './ValueAddedFeeSheet'
import { ExpressCollectionCard } from '../components/ExpressCollectionCard'
import { ExpressDeliveryPreferenceCard } from '../components/ExpressDeliveryPreferenceCard'
import { ExpressNavBar } from '../components/ExpressNavBar'
import { ExpressPackagingCard } from '../components/ExpressPackagingCard'
import { ExpressReturnBillCard } from '../components/ExpressReturnBillCard'
import { ExpressWarehouseCard } from '../components/ExpressWarehouseCard'
import { useExpressCollection } from '../hooks/useExpressCollection'
import { useExpressDeliveryPreference } from '../hooks/useExpressDeliveryPreference'
import { useExpressGoods } from '../hooks/useExpressGoods'
import { useExpressReturnBill } from '../hooks/useExpressReturnBill'
import { useExpressWarehouse } from '../hooks/useExpressWarehouse'

import './index.scss'
import './content.scss'
import './cards.scss'

function noopQuotes() {
  // 原配置 hooks 负责清空草稿旧报价；本页 useValueAddedQuote 根据请求条件统一重新询价。
}

function createInitialDraft() {
  return expressDraftStorage.restore() ?? createExpressDraft()
}

/**
 * @description 增值服务专属页：生产端把代收货款、签收单、派送时间、送货进仓、打包服务
 * 等服务项收在这一页里配置，寄件页只保留入口行，不再原地展开。
 */
const ExpressServicesPage = () => {
  const [draft, setDraft] = useState<ExpressDraft>(() => createInitialDraft())
  const [detailVisible, setDetailVisible] = useState(false)
  const [expanded, setExpanded] = useState('')
  const powerCategories = usePowerMachineCategories()
  const categoryMessage =
    draft.valueAdded.powerMachine.enabled && powerCategories.status !== 'done'
      ? '请先获取可验机品类，或取消通电验机'
      : validateExpressValueAdded(draft.valueAdded, { categories: powerCategories.categories })[0] || ''
  const quote = useValueAddedQuote(draft, setDraft, categoryMessage)

  const collectionController = useExpressCollection({ setDraft })
  const returnBillController = useExpressReturnBill({ draft, restoreQuotes: noopQuotes, setDraft })
  const deliveryPreferenceController = useExpressDeliveryPreference({ draft, setDraft })
  const warehouseController = useExpressWarehouse({ draft, setDraft })
  const goods = useExpressGoods({ restoreQuotes: noopQuotes, setDraft })

  const detailView = createExpressValueAddedQuoteView(quote.product)
  const fees = detailView.serviceAmounts
  const toggleExpanded = (key: string) => setExpanded(current => (current === key ? '' : key))

  useEffect(() => {
    if (quote.status !== 'done') setDetailVisible(false)
  }, [quote.status])

  const handleConfirm = useCallback(async () => {
    const message = categoryMessage || validateExpressValueAdded(draft.valueAdded)[0]
    if (message) {
      Taro.showToast({ title: message, icon: 'none' })
      return
    }
    expressDraftStorage.save(draft)
    expressDraftBridge.carryFromValueAdded(draft, quote.product ? [quote.product] : [])

    try {
      await Taro.navigateBack()
    } catch {
      navigateToAppRoute(APP_ROUTES.express, { login: true })
    }
  }, [categoryMessage, draft, quote.product])

  const handleOpenDetail = useCallback(() => {
    if (!detailView.available) {
      Taro.showToast({ title: quote.status === 'loading' ? '正在计算服务费' : '请重新获取服务费', icon: 'none' })
      return
    }

    setDetailVisible(current => !current)
  }, [detailView.available, quote.status])

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
              <Text className='express-services__bar-fee'>{detailView.priceText}</Text>
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
          <AppPressable
            accessibilityLabel='确定增值服务'
            className='express-services__bar-confirm'
            disabled={quote.status === 'loading'}
            onPress={handleConfirm}
          >
            <Text className='express-services__bar-confirm-text'>{quote.status === 'loading' ? '计算中' : '确定'}</Text>
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
        <ServiceCard
          title='代收货款'
          description='由快递员向收件人代收货款并返款'
          icon={collectionIcon}
          selected={Boolean(draft.collection.type)}
          expanded={expanded === 'collection'}
          fee={fees.collection}
          onPress={() => toggleExpanded('collection')}
        >
          <ExpressCollectionCard collection={draft.collection} controller={collectionController} selectedProduct={quote.product} />
        </ServiceCard>
        <ServiceCard
          title='签收单'
          description={
            draft.service.returnBill.type === 'NO_RETURN_SIGNED'
              ? '提供电子或纸质签收单返回服务'
              : getExpressReturnBillOption(draft.service.returnBill.type).label
          }
          icon={signformIcon}
          selected={draft.service.returnBill.type !== 'NO_RETURN_SIGNED'}
          expanded={expanded === 'returnBill'}
          fee={fees.returnBill}
          onPress={() => toggleExpanded('returnBill')}
        >
          <ExpressReturnBillCard
            onChange={returnBillController.onChange}
            onOpenCloudSign={returnBillController.onOpenCloudSign}
            productCode={draft.selectedProduct?.omsProductCode || draft.service.transportMode}
            returnBill={draft.service.returnBill}
          />
        </ServiceCard>
        <ServiceCard
          title='派送时间'
          description='选择预约派送或等通知派送'
          icon={deliveryIcon}
          selected={Boolean(draft.deliveryPreference.type)}
          expanded={expanded === 'delivery'}
          fee={fees.delivery}
          onPress={() => toggleExpanded('delivery')}
        >
          <ExpressDeliveryPreferenceCard controller={deliveryPreferenceController} preference={draft.deliveryPreference} />
        </ServiceCard>
        <ServiceCard
          title='送货进仓'
          description='特殊仓库、机场或物流园区预约派送'
          icon={warehouseIcon}
          selected={draft.warehouse.enabled}
          expanded={expanded === 'warehouse'}
          fee={fees.warehouse}
          onPress={() => toggleExpanded('warehouse')}
        >
          <ExpressWarehouseCard controller={warehouseController} warehouse={draft.warehouse} />
        </ServiceCard>
        <ServiceCard
          title='双人派送'
          description='提供双人派送服务，不适用于自提、外发及进仓'
          icon={doubleDeliveryIcon}
          selected={draft.valueAdded.doubleDelivery}
          fee={fees.doubleDelivery}
          onPress={() => setDraft(current => updateExpressValueAdded(current, { doubleDelivery: !current.valueAdded.doubleDelivery }))}
        />
        <ServiceCard
          title='打包服务'
          description='提供纸箱、木包装及拆包装服务'
          icon={packingIcon}
          selected={Boolean(draft.packaging.cartonCode || draft.packaging.woodenCodes.length || draft.packaging.unpackingCodes.length)}
          expanded={expanded === 'packaging'}
          fee={fees.packaging}
          onPress={() => toggleExpanded('packaging')}
        >
          <ExpressPackagingCard packaging={draft.packaging} onChange={goods.handlePackagingChange} />
        </ServiceCard>
        <ServiceCard
          title='通电验机'
          description={
            draft.valueAdded.powerMachine.enabled
              ? `${draft.valueAdded.powerMachine.category || '待选品类'} · ${draft.valueAdded.powerMachine.count}件`
              : '选择可验机品类、件数与验机环节'
          }
          icon={powerCheckIcon}
          selected={draft.valueAdded.powerMachine.enabled}
          expanded={expanded === 'powerMachine'}
          fee={fees.powerMachine}
          onPress={() => toggleExpanded('powerMachine')}
        >
          <PowerMachineEditor controller={powerCategories} draft={draft} setDraft={setDraft} />
        </ServiceCard>
        <ServiceCard
          title='拍照服务'
          description='可选择揽收拍照及拍照签收'
          icon={photoIcon}
          selected={draft.valueAdded.photo.sign || draft.valueAdded.photo.pickup}
          expanded={expanded === 'photo'}
          fee={fees.photo}
          onPress={() => toggleExpanded('photo')}
        >
          <PhotoServiceEditor draft={draft} setDraft={setDraft} />
        </ServiceCard>
        {quote.message ? (
          <View className='express-services-editor__message'>
            <Text className='express-services__note'>{quote.message}</Text>
            {quote.status === 'error' ? (
              <AppPressable accessibilityLabel='重新计算服务费' onPress={quote.retry}>
                <Text className='express-services-editor__action'>重试</Text>
              </AppPressable>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <ValueAddedFeeSheet view={detailView} visible={detailVisible} onClose={() => setDetailVisible(false)} />
    </AppPage>
  )
}

export default ExpressServicesPage
