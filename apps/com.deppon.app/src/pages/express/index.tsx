import { ScrollView } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'

import { useCallback, useEffect, useState } from 'react'

import { contactSelection } from '@/services/contact'
import {
  clearExpressScanContext,
  createExpressScanContextView,
  createExpressDraft,
  expressDraftBridge,
  expressDraftStorage,
  expressPrivacyStorage,
  mapContactToExpressContact,
  setExpressContact,
  setExpressPrivacyProtection,
  swapExpressContacts,
  updateExpressPickup,
  updateExpressService
} from '@/services/express'
import type {
  ExpressDraft,
  ExpressMonthlyPayView,
  ExpressProductQuote
} from '@/services/express'
import { AppPage } from '@/shared/components'
import { navigateToAppRoute } from '@/shared/navigation/appNavigation'
import { APP_ROUTES } from '@/shared/navigation/routes'
import { createAppRouteUrl } from '@/shared/navigation/routeUrl'
import { createAppWebUrl } from '@/shared/webview/appWeb'

import { ExpressContactPanel } from './components/ExpressContactPanel'
import { ExpressCouponCard } from './components/ExpressCouponCard'
import { ExpressGoodsSection } from './components/ExpressGoodsSection'
import { ExpressHeader } from './components/ExpressHeader'
import { ExpressInsuranceCard } from './components/ExpressInsuranceCard'
import { ExpressOrderOptionsSection } from './components/ExpressOrderOptionsSection'
import { ExpressPackagingCard } from './components/ExpressPackagingCard'
import { ExpressPickupSection } from './components/ExpressPickupSection'
import { ExpressQuoteSection } from './components/ExpressQuoteSection'
import { ExpressServiceSection } from './components/ExpressServiceSection'
import { ExpressSubmitBar } from './components/ExpressSubmitBar'
import { useExpressCollection } from './hooks/useExpressCollection'
import { useExpressCoupons } from './hooks/useExpressCoupons'
import { useExpressDeliveryPoint } from './hooks/useExpressDeliveryPoint'
import { useExpressDeliveryPreference } from './hooks/useExpressDeliveryPreference'
import { useExpressEntryNavigation } from './hooks/useExpressEntryNavigation'
import { useExpressGoods } from './hooks/useExpressGoods'
import { useExpressInsurance } from './hooks/useExpressInsurance'
import { useExpressMonthlyPay } from './hooks/useExpressMonthlyPay'
import { useExpressPickupTime } from './hooks/useExpressPickupTime'
import { useExpressQuote } from './hooks/useExpressQuote'
import { useExpressReturnBill } from './hooks/useExpressReturnBill'
import { useExpressSubmit } from './hooks/useExpressSubmit'
import { useExpressWarehouse } from './hooks/useExpressWarehouse'

import './index.scss'

function getProductPriceText(product: ExpressProductQuote | null) {
  if (!product || product.totalfee === null || product.totalfee === undefined) {
    return '--'
  }

  return `¥${product.totalfee}`
}

function createInitialDraft() {
  return expressDraftStorage.restore() ?? createExpressDraft()
}

const ExpressPage = () => {
  const [draft, setDraft] = useState<ExpressDraft>(() => createInitialDraft())

  const insuranceController = useExpressInsurance({ draft, setDraft })
  const {
    onQuery: handleQuote,
    onSelectProduct: handleSelectProduct,
    quotes,
    restore: restoreQuotes,
    status: quoteStatus
  } = useExpressQuote({
    draft,
    setDraft,
    onProductChange: insuranceController.onInvalidate
  })
  const invalidateCouponQuote = useCallback(
    () => restoreQuotes([]),
    [restoreQuotes]
  )
  const couponController = useExpressCoupons({
    draft,
    setDraft,
    onInvalidateQuote: invalidateCouponQuote
  })
  const returnBillController = useExpressReturnBill({
    draft,
    restoreQuotes,
    setDraft
  })
  const collectionController = useExpressCollection({ setDraft })
  const deliveryPointController = useExpressDeliveryPoint({ draft, setDraft })
  const pickupTimeController = useExpressPickupTime({ draft, setDraft })
  const deliveryPreferenceController = useExpressDeliveryPreference({
    draft,
    setDraft
  })
  const warehouseController = useExpressWarehouse({ draft, setDraft })

  const updateService = useCallback(
    (patch: Partial<ExpressDraft['service']>) => {
      setDraft(current => updateExpressService(current, patch))
    },
    []
  )

  const updatePickup = useCallback((patch: Partial<ExpressDraft['pickup']>) => {
    setDraft(current => updateExpressPickup(current, patch))
  }, [])

  const goods = useExpressGoods({ draft, setDraft, restoreQuotes })
  const monthlyPay = useExpressMonthlyPay({ draft, updateService })
  const submit = useExpressSubmit({ draft, warehouseController })
  const entryNav = useExpressEntryNavigation({ draft })

  useEffect(() => {
    expressDraftStorage.save(draft)
  }, [draft])

  useDidShow(() => {
    const carriedDraft = expressDraftBridge.consume()

    if (carriedDraft) {
      setDraft(carriedDraft.draft)
      restoreQuotes(carriedDraft.quotes)
      Taro.showToast({
        title:
          carriedDraft.source === 'ORDER_RESEND'
            ? '已带入原订单信息'
            : carriedDraft.source === 'COUPON_LIST'
              ? '已带入优惠券'
              : carriedDraft.source === 'GOODS_QUERY'
                ? '已带入货物名称'
                : carriedDraft.source === 'BATCH_RECOGNITION'
                  ? '已带入批量识别结果'
                  : carriedDraft.source === 'SCAN_QR_CODE'
                    ? '已带入扫码寄件信息'
                    : carriedDraft.source === 'DISPATCH_QUERY'
                      ? '已带入收派范围地址'
                      : carriedDraft.source === 'COURIER'
                        ? '已带入专属快递员'
                        : carriedDraft.source === 'TEMPLATE'
                          ? '已带入寄件模板'
                          : '已带入查价结果',
        icon: 'none'
      })
      return
    }

    const selection = contactSelection.consumeSelection()

    if (draft.service.paymentType === 'MONTH_PAY') {
      void monthlyPay.loadMonthlyCustomer()
    }

    if (!selection) {
      return
    }

    setDraft(current =>
      setExpressContact(
        current,
        selection.target,
        mapContactToExpressContact(selection.contact)
      )
    )
  })

  const handlePrivacyProtectionChange = (
    value: ExpressDraft['service']['privacyProtection']
  ) => {
    if (value === 'N') {
      setDraft(current => setExpressPrivacyProtection(current, value))
      return
    }

    if (expressPrivacyStorage.hasConfirmed()) {
      setDraft(current => setExpressPrivacyProtection(current, value))
      return
    }

    Taro.showModal({
      title: '开启隐私面单',
      content:
        '开启后，运单将按后端规则隐藏收寄件手机号等敏感信息。请确认快递员仍可通过系统联系收寄方。',
      confirmText: '开启',
      success: res => {
        if (!res.confirm) {
          return
        }

        expressPrivacyStorage.confirm()
        setDraft(current => setExpressPrivacyProtection(current, value))
      }
    })
  }

  const handleContactSelect = (target: 'sender' | 'consignee') => {
    const params = contactSelection.createParams(target)
    const url = createAppRouteUrl(APP_ROUTES.contactList, params)
    navigateToAppRoute(url, { login: true })
  }

  const handleContactCreate = (target: 'sender' | 'consignee') => {
    const params = contactSelection.createParams(target, 'select', 'EXPRESS', {
      returnDelta: '1'
    })
    const url = createAppRouteUrl(APP_ROUTES.contactEdit, params)
    navigateToAppRoute(url, { login: true })
  }

  const handleSwapContacts = () => {
    setDraft(current => swapExpressContacts(current))
  }

  const handleOpenMonthlyPayAction = (view: ExpressMonthlyPayView) => {
    navigateToAppRoute(createAppWebUrl({ source: view.actionSource }), {
      login: true,
      message: '请先登录后处理客户编码'
    })
  }

  return (
    <AppPage
      footer={
        <ExpressSubmitBar
          priceText={getProductPriceText(draft.selectedProduct)}
          quoteLoading={quoteStatus === 'loading'}
          submitting={submit.submiting}
          onQuote={handleQuote}
          onSubmit={submit.handleSubmit}
        />
      }
      keyboardAvoiding
      safeArea='bottom'
      surface='page'
    >
      <ScrollView className='express-page' scrollY style={{ flex: 1 }}>
        <ExpressHeader
          priceText={
            draft.selectedProduct
              ? getProductPriceText(draft.selectedProduct)
              : ''
          }
          onOpenBatch={entryNav.handleOpenBatch}
          onOpenHelp={entryNav.handleOpenHelp}
          onOpenRealName={entryNav.handleOpenRealName}
          onOpenTemplates={entryNav.handleOpenTemplates}
          onSaveTemplate={entryNav.handleSaveTemplate}
        />

        <ExpressContactPanel
          draft={draft}
          onCreateContact={handleContactCreate}
          onSelectContact={handleContactSelect}
          onSwapContacts={handleSwapContacts}
        />

        <ExpressPickupSection
          needContact={draft.service.needContact}
          pickup={draft.pickup}
          pickupTimeController={pickupTimeController}
          onModeChange={dispatch => updatePickup({ dispatch })}
          onNeedContactChange={needContact => updateService({ needContact })}
          onOpenStations={entryNav.handleOpenStations}
        />

        <ExpressGoodsSection
          goods={draft.goods}
          goodsLoading={goods.goodsLoading}
          goodsMessage={goods.goodsMessage}
          goodsSuggestions={goods.goodsSuggestions}
          onGoodsChange={goods.updateGoods}
          onGoodsNameInput={goods.handleGoodsNameInput}
          onQueryGoodsNames={goods.handleQueryGoodsNames}
          onSelectGoodsName={goods.handleSelectGoodsName}
        />

        <ExpressInsuranceCard controller={insuranceController} draft={draft} />

        <ExpressPackagingCard
          packaging={draft.packaging}
          onChange={goods.handlePackagingChange}
        />

        <ExpressServiceSection
          collection={draft.collection}
          collectionController={collectionController}
          deliveryPreference={draft.deliveryPreference}
          deliveryPreferenceController={deliveryPreferenceController}
          deliveryPoint={draft.deliveryPoint}
          monthlyPayView={monthlyPay.monthlyPayView}
          scanContextView={createExpressScanContextView(draft.scanContext)}
          selectedProduct={draft.selectedProduct}
          service={draft.service}
          warehouse={draft.warehouse}
          warehouseController={warehouseController}
          onClearScanContext={() => setDraft(clearExpressScanContext)}
          onOpenDeliveryPoints={deliveryPointController.onOpen}
          onMonthlyPayAction={handleOpenMonthlyPayAction}
          onPaymentTypeSelect={monthlyPay.handlePaymentTypeSelect}
          onReturnBillChange={returnBillController.onChange}
          onOpenReturnBillCloudSign={returnBillController.onOpenCloudSign}
          onPrivacyProtectionChange={handlePrivacyProtectionChange}
          onServiceChange={updateService}
        />

        <ExpressQuoteSection
          pickup={draft.pickup}
          quoteStaleReason={draft.quoteStaleReason}
          quoteStatus={quoteStatus}
          quotes={quotes}
          selectedProduct={draft.selectedProduct}
          onQueryPickupTime={pickupTimeController.onQuery}
          onQuote={handleQuote}
          onSelectProduct={handleSelectProduct}
        />

        <ExpressCouponCard
          controller={couponController}
          couponNumber={draft.couponNumber}
        />

        <ExpressOrderOptionsSection
          agreementAccepted={draft.agreementAccepted}
          remark={draft.remark}
          submitMessage={submit.submitMessage}
          validationMessages={
            submit.validation.valid ? [] : submit.validation.messages
          }
          onRemarkInput={value =>
            setDraft(current => ({
              ...current,
              remark: value
            }))
          }
          onToggleAgreement={() =>
            setDraft(current => ({
              ...current,
              agreementAccepted: !current.agreementAccepted
            }))
          }
        />
      </ScrollView>
    </AppPage>
  )
}

export default ExpressPage
