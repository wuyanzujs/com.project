import { ScrollView } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'

import { useCallback, useEffect, useState } from 'react'

import { contactSelection } from '@/services/contact'
import {
  clearExpressScanContext,
  createExpressProductQuoteView,
  createExpressScanContextView,
  createExpressDraft,
  expressDraftBridge,
  expressDraftStorage,
  expressGoodsBridge,
  mapContactToExpressContact,
  setExpressContact,
  swapExpressContacts,
  updateExpressGoods,
  updateExpressPickup,
  updateExpressService
} from '@/services/express'
import type { ExpressDraft, ExpressMonthlyPayView, ExpressProductQuote } from '@/services/express'
import { AppPage, AppSupportFloat } from '@/shared/components'
import { navigateToAppRoute } from '@/shared/navigation/appNavigation'
import { APP_ROUTES } from '@/shared/navigation/routes'
import { createAppRouteUrl } from '@/shared/navigation/routeUrl'
import { getNativeCapabilityErrorMessage, shareWithApp } from '@/shared/platform'
import { createAppWebUrl } from '@/shared/webview/appWeb'

import { ExpressBaseInfoCard } from './components/ExpressBaseInfoCard'
import { ExpressContactPanel } from './components/ExpressContactPanel'
import { ExpressCouponCard } from './components/ExpressCouponCard'
import { ExpressGoodsSection } from './components/ExpressGoodsSection'
import { ExpressHeader } from './components/ExpressHeader'
import { ExpressNavBar } from './components/ExpressNavBar'
import { ExpressOrderOptionsSection } from './components/ExpressOrderOptionsSection'
import { ExpressPaymentRow } from './components/ExpressPaymentRow'
import { ExpressPickupSection } from './components/ExpressPickupSection'
import { ExpressPrivacyCard } from './components/ExpressPrivacyCard'
import { ExpressQuoteSection } from './components/ExpressQuoteSection'
import { ExpressServiceSection } from './components/ExpressServiceSection'
import { ExpressSubmitBar } from './components/ExpressSubmitBar'
import { ExpressWeatherBanner } from './components/ExpressWeatherBanner'
import { useExpressAutoQuote } from './hooks/useExpressAutoQuote'
import { useExpressCollection } from './hooks/useExpressCollection'
import { useExpressCoupons } from './hooks/useExpressCoupons'
import { useExpressDeliveryPoint } from './hooks/useExpressDeliveryPoint'
import { useExpressDeliveryPreference } from './hooks/useExpressDeliveryPreference'
import { useExpressEntryNavigation } from './hooks/useExpressEntryNavigation'
import { useExpressGoods } from './hooks/useExpressGoods'
import { useExpressInsurance } from './hooks/useExpressInsurance'
import { useExpressMonthlyPay } from './hooks/useExpressMonthlyPay'
import { useExpressPickupTime } from './hooks/useExpressPickupTime'
import { useExpressPrivacy } from './hooks/useExpressPrivacy'
import { useExpressQuote } from './hooks/useExpressQuote'
import { useExpressReturnBill } from './hooks/useExpressReturnBill'
import { useExpressSubmit } from './hooks/useExpressSubmit'
import { useExpressWarehouse } from './hooks/useExpressWarehouse'
import { useExpressWeather } from './hooks/useExpressWeather'

import './index.scss'

function getProductPriceText(product: ExpressProductQuote | null) {
  if (!product || product.totalfee === null || product.totalfee === undefined) {
    return '¥--'
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
  const invalidateCouponQuote = useCallback(() => restoreQuotes([]), [restoreQuotes])
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
  const privacyController = useExpressPrivacy(setDraft)

  const updateService = useCallback((patch: Partial<ExpressDraft['service']>) => {
    setDraft(current => updateExpressService(current, patch))
  }, [])

  const updatePickup = useCallback((patch: Partial<ExpressDraft['pickup']>) => {
    setDraft(current => updateExpressPickup(current, patch))
  }, [])

  const goods = useExpressGoods({ setDraft, restoreQuotes })
  const monthlyPay = useExpressMonthlyPay({ draft, updateService })
  const submit = useExpressSubmit({ draft, warehouseController })
  const entryNav = useExpressEntryNavigation({ draft })
  const { weatherText } = useExpressWeather({ draft })

  useExpressAutoQuote({
    draft,
    quotes,
    quoteStatus,
    onQuote: handleQuote
  })

  const handleOpenGoods = useCallback(() => {
    navigateToAppRoute(APP_ROUTES.expressGoods)
  }, [])

  useEffect(() => {
    expressDraftStorage.save(draft)
  }, [draft])

  useDidShow(() => {
    // 读取物品信息页回传的货物并重算价格。
    const goodsPayload = expressGoodsBridge.consume()

    if (goodsPayload) {
      restoreQuotes([])
      setDraft(current => updateExpressGoods(current, goodsPayload.goods))
    }

    const carriedDraft = expressDraftBridge.consume()

    if (carriedDraft) {
      setDraft(carriedDraft.draft)
      restoreQuotes(carriedDraft.quotes)

      // 全新寄件是静默重置,其余带入来源都提示用户已带入内容。
      if (carriedDraft.source !== 'FRESH_SEND') {
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
      }
      return
    }

    const selection = contactSelection.consumeSelection()

    if (draft.service.paymentType === 'MONTH_PAY') {
      void monthlyPay.loadMonthlyCustomer()
    }

    if (!selection) {
      return
    }

    setDraft(current => setExpressContact(current, selection.target, mapContactToExpressContact(selection.contact)))
  })

  const handleShare = () => {
    void shareWithApp({
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

  const selectedProductDetailView = draft.selectedProduct ? createExpressProductQuoteView(draft.selectedProduct) : null

  return (
    <AppPage
      footer={
        <ExpressSubmitBar
          detailView={selectedProductDetailView}
          priceText={getProductPriceText(draft.selectedProduct)}
          quoteLoading={quoteStatus === 'loading'}
          submitting={submit.submiting}
          onQuote={handleQuote}
          onSubmit={submit.handleSubmit}
        />
      }
      header={<ExpressNavBar title='寄快递' onShare={handleShare} />}
      keyboardAvoiding
      safeArea='both'
      statusBar='dark'
      surface='page'
    >
      <ScrollView className='express-page' scrollY style={{ flex: 1 }}>
        <ExpressHeader onOpenRealName={entryNav.handleOpenRealName} />

        <ExpressContactPanel draft={draft} onCreateContact={handleContactCreate} onSelectContact={handleContactSelect} onSwapContacts={handleSwapContacts} />

        <ExpressPickupSection
          hasSenderAddress={Boolean(draft.sender)}
          needContact={draft.service.needContact}
          pickup={draft.pickup}
          pickupTimeController={pickupTimeController}
          onModeChange={dispatch => updatePickup({ dispatch })}
          onNeedContactChange={needContact => updateService({ needContact })}
          onOpenStations={entryNav.handleOpenStations}
        />

        <ExpressBaseInfoCard>
          <ExpressGoodsSection goods={draft.goods} onPress={handleOpenGoods} />

          <ExpressPaymentRow
            monthlyPayView={monthlyPay.monthlyPayView}
            value={draft.service.paymentType}
            onMonthlyPayAction={handleOpenMonthlyPayAction}
            onSelect={monthlyPay.handlePaymentTypeSelect}
          />

          {quotes.length > 0 || quoteStatus === 'loading' || draft.quoteStaleReason ? (
            <ExpressQuoteSection
              plain
              quoteStaleReason={draft.quoteStaleReason}
              quoteStatus={quoteStatus}
              quotes={quotes}
              selectedProduct={draft.selectedProduct}
              onQuote={handleQuote}
              onSelectProduct={handleSelectProduct}
            />
          ) : null}

          <ExpressWeatherBanner text={weatherText} onPress={handleOpenGoods} />

          <ExpressCouponCard controller={couponController} couponNumber={draft.couponNumber} />
        </ExpressBaseInfoCard>

        <ExpressServiceSection
          collection={draft.collection}
          collectionController={collectionController}
          deliveryPoint={draft.deliveryPoint}
          deliveryPreference={draft.deliveryPreference}
          deliveryPreferenceController={deliveryPreferenceController}
          draft={draft}
          insuranceController={insuranceController}
          packaging={draft.packaging}
          remark={draft.remark}
          scanContextView={createExpressScanContextView(draft.scanContext)}
          selectedProduct={draft.selectedProduct}
          service={draft.service}
          warehouse={draft.warehouse}
          warehouseController={warehouseController}
          onClearScanContext={() => setDraft(clearExpressScanContext)}
          onOpenDeliveryPoints={deliveryPointController.onOpen}
          onOpenReturnBillCloudSign={returnBillController.onOpenCloudSign}
          onPackagingChange={goods.handlePackagingChange}
          onRemarkInput={value =>
            setDraft(current => ({
              ...current,
              remark: value
            }))
          }
          onReturnBillChange={returnBillController.onChange}
          onServiceChange={updateService}
        />

        <ExpressPrivacyCard value={draft.service.privacyProtection} onChange={privacyController.onChange} onOpenTerms={privacyController.onOpenTerms} />

        {draft.goods.name && draft.sender?.address && draft.consignee?.address ? (
          <ExpressOrderOptionsSection
            agreementAccepted={draft.agreementAccepted}
            submitMessage={submit.submitMessage}
            validationMessages={submit.validation.valid ? [] : submit.validation.messages}
            onToggleAgreement={() =>
              setDraft(current => ({
                ...current,
                agreementAccepted: !current.agreementAccepted
              }))
            }
          />
        ) : null}
      </ScrollView>
      <AppSupportFloat label='客服' onPress={() => navigateToAppRoute(APP_ROUTES.supportCenter)} />
    </AppPage>
  )
}

export default ExpressPage
