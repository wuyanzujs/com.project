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
  getFreshExpressInsuranceCapability,
  isExpressOrderFormReady,
  mapContactToExpressContact,
  setExpressContact,
  swapExpressContacts,
  updateExpressGoods,
  updateExpressPickup,
  updateExpressService
} from '@/services/express'
import type { ExpressDraft, ExpressDraftBridgeSource, ExpressGoods, ExpressMonthlyPayView, ExpressProductQuote } from '@/services/express'
import { AppPage, AppSupportFloat } from '@/shared/components'
import { navigateToAppRoute } from '@/shared/navigation/appNavigation'
import { APP_ROUTES } from '@/shared/navigation/routes'
import { createAppRouteUrl } from '@/shared/navigation/routeUrl'
import { getNativeCapabilityErrorMessage, shareWithApp } from '@/shared/platform'
import { createAppWebUrl } from '@/shared/webview/appWeb'

import { ExpressAgreementSheet } from './components/ExpressAgreementSheet'
import { ExpressBaseInfoCard } from './components/ExpressBaseInfoCard'
import { ExpressContactPanel } from './components/ExpressContactPanel'
import { ExpressCouponCard } from './components/ExpressCouponCard'
import { ExpressGoodsSection } from './components/ExpressGoodsSection'
import { ExpressHeader } from './components/ExpressHeader'
import { ExpressInsuranceCard } from './components/ExpressInsuranceCard'
import { ExpressNavBar } from './components/ExpressNavBar'
import { ExpressOrderOptionsSection } from './components/ExpressOrderOptionsSection'
import { ExpressPaymentRow } from './components/ExpressPaymentRow'
import { ExpressPickupSection } from './components/ExpressPickupSection'
import { ExpressPriceDetailSheet } from './components/ExpressPriceDetailSheet'
import { ExpressPrivacyCard } from './components/ExpressPrivacyCard'
import { ExpressQuoteSection } from './components/ExpressQuoteSection'
import { ExpressServiceSection } from './components/ExpressServiceSection'
import { ExpressSubmitBar } from './components/ExpressSubmitBar'
import { ExpressWeatherBanner } from './components/ExpressWeatherBanner'
import { useExpressAgreement } from './hooks/useExpressAgreement'
import { useExpressAutoQuote } from './hooks/useExpressAutoQuote'
import { useExpressCoupons } from './hooks/useExpressCoupons'
import { useExpressEntryNavigation } from './hooks/useExpressEntryNavigation'
import { useExpressInsurance } from './hooks/useExpressInsurance'
import { useExpressMonthlyPay } from './hooks/useExpressMonthlyPay'
import { useExpressPickupTime } from './hooks/useExpressPickupTime'
import { useExpressPrivacy } from './hooks/useExpressPrivacy'
import { useExpressQuote } from './hooks/useExpressQuote'
import { useExpressRealName } from './hooks/useExpressRealName'
import { useExpressServicePoint } from './hooks/useExpressServicePoint'
import { useExpressSubmit } from './hooks/useExpressSubmit'
import { useExpressWarehouse } from './hooks/useExpressWarehouse'
import { useExpressWeather } from './hooks/useExpressWeather'

import './index.scss'

const EXPRESS_DRAFT_CARRIED_MESSAGES: Partial<Record<ExpressDraftBridgeSource, string>> = {
  ORDER_RESEND: '已带入原订单信息',
  COUPON_LIST: '已带入优惠券',
  GOODS_QUERY: '已带入货物名称',
  BATCH_RECOGNITION: '已带入批量识别结果',
  SCAN_QR_CODE: '已带入扫码寄件信息',
  DISPATCH_QUERY: '已带入收派范围地址',
  COURIER: '已带入专属快递员',
  TEMPLATE: '已带入寄件模板',
  QUERY_PRICE: '已带入查价结果'
}

// 全新寄件与增值服务回填不打扰用户，其余带入来源提示一句。
function getExpressDraftCarriedMessage(source: ExpressDraftBridgeSource) {
  return EXPRESS_DRAFT_CARRIED_MESSAGES[source] ?? ''
}

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
  const [detailVisible, setDetailVisible] = useState(false)

  useExpressServicePoint({ draft, setDraft })

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
  const pickupTimeController = useExpressPickupTime({ draft, setDraft })
  const warehouseController = useExpressWarehouse({ draft, setDraft })
  const privacyController = useExpressPrivacy(setDraft)
  const agreement = useExpressAgreement({ accepted: draft.agreementAccepted, setDraft })

  const updateService = useCallback((patch: Partial<ExpressDraft['service']>) => {
    setDraft(current => updateExpressService(current, patch))
  }, [])

  const updatePickup = useCallback((patch: Partial<ExpressDraft['pickup']>) => {
    setDraft(current => updateExpressPickup(current, patch))
  }, [])

  const monthlyPay = useExpressMonthlyPay({ draft, updateService })
  const submit = useExpressSubmit({ draft, warehouseController })
  const entryNav = useExpressEntryNavigation({ draft })
  const realName = useExpressRealName()
  const { weatherText } = useExpressWeather({ draft })

  useExpressAutoQuote({
    draft,
    quotes,
    quoteStatus,
    onQuote: handleQuote
  })

  const formReady = isExpressOrderFormReady(draft)
  const insuranceVisible = formReady && Boolean(getFreshExpressInsuranceCapability(draft))

  const handleOpenGoods = useCallback(() => {
    navigateToAppRoute(APP_ROUTES.expressGoods)
  }, [])

  const handleOpenServices = useCallback(() => {
    navigateToAppRoute(APP_ROUTES.expressServices, { login: true })
  }, [])

  useEffect(() => {
    expressDraftStorage.save(draft)
  }, [draft])

  useDidShow(() => {
    // 读取物品信息页回传的货物与捎话；只有货物变化才需要重新报价。
    const goodsPayload = expressGoodsBridge.consume()

    if (goodsPayload) {
      const goodsChanged = (Object.keys(goodsPayload.goods) as Array<keyof ExpressGoods>).some(key => goodsPayload.goods[key] !== draft.goods[key])

      if (goodsChanged) {
        restoreQuotes([])
      }

      setDraft(current => {
        const next = goodsChanged ? updateExpressGoods(current, goodsPayload.goods) : current

        return next.remark === goodsPayload.remark ? next : { ...next, remark: goodsPayload.remark }
      })
    }

    const carriedDraft = expressDraftBridge.consume()

    if (carriedDraft) {
      setDraft(carriedDraft.draft)
      restoreQuotes(carriedDraft.quotes, carriedDraft.draft)

      const carriedMessage = getExpressDraftCarriedMessage(carriedDraft.source)

      if (carriedMessage) {
        Taro.showToast({
          title: carriedMessage,
          icon: 'none'
        })
      }
      return
    }

    const selection = contactSelection.consumeSelection()

    if (draft.service.paymentType === 'MONTH_PAY') {
      monthlyPay.loadMonthlyCustomer()
    }

    if (!selection) {
      return
    }

    setDraft(current => setExpressContact(current, selection.target, mapContactToExpressContact(selection.contact)))
  })

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

  const handleOpenAgreement = useCallback(() => {
    navigateToAppRoute(createAppWebUrl({ source: 'EXPRESS_SERVICE_PROTOCOL' }))
  }, [])

  const selectedProductDetailView = draft.selectedProduct ? createExpressProductQuoteView(draft.selectedProduct) : null
  const selectedCoupon = draft.couponNumber ? couponController.available.find(coupon => coupon.code === draft.couponNumber) : undefined
  const couponDiscountText = selectedCoupon?.raw.optimalFee ? `-¥${selectedCoupon.raw.optimalFee / 100}` : ''

  return (
    <AppPage
      footer={
        <ExpressSubmitBar
          detailAvailable={Boolean(selectedProductDetailView)}
          detailVisible={detailVisible && Boolean(selectedProductDetailView)}
          priceText={getProductPriceText(draft.selectedProduct)}
          quoteLoading={quoteStatus === 'loading'}
          submitting={submit.submiting}
          onSubmit={submit.handleSubmit}
          onToggleDetail={() => setDetailVisible(current => !current)}
        />
      }
      header={<ExpressNavBar title='寄快递' onShare={handleShare} />}
      keyboardAvoiding
      safeArea='both'
      statusBar='dark'
      surface='page'
    >
      <ScrollView className='express-page' scrollY style={{ flex: 1 }}>
        {realName.visible ? <ExpressHeader onOpenRealName={entryNav.handleOpenRealName} /> : null}

        <ExpressContactPanel draft={draft} onCreateContact={handleContactCreate} onSelectContact={handleContactSelect} onSwapContacts={handleSwapContacts} />

        <ExpressPickupSection
          hasSenderAddress={Boolean(draft.sender?.address)}
          needContact={draft.service.needContact}
          pickup={draft.pickup}
          pickupTimeController={pickupTimeController}
          pickupTimeReady={formReady}
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

          {quotes.length > 0 || draft.quoteStaleReason || quoteStatus === 'loading' || (formReady && quoteStatus === 'error') ? (
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

          {couponController.showRow ? <ExpressCouponCard controller={couponController} couponNumber={draft.couponNumber} /> : null}
        </ExpressBaseInfoCard>

        {insuranceVisible ? <ExpressInsuranceCard controller={insuranceController} draft={draft} /> : null}

        <ExpressServiceSection
          draft={draft}
          scanContextView={createExpressScanContextView(draft.scanContext)}
          onClearScanContext={() => setDraft(clearExpressScanContext)}
          onOpenServices={handleOpenServices}
        />

        <ExpressPrivacyCard value={draft.service.privacyProtection} onChange={privacyController.onChange} onOpenTerms={privacyController.onOpenTerms} />

        <ExpressOrderOptionsSection
          agreementAccepted={draft.agreementAccepted}
          submitMessage={submit.submitMessage}
          validationMessages={submit.attempted && !submit.validation.valid ? submit.validation.messages : []}
          onOpenAgreement={handleOpenAgreement}
          onToggleAgreement={agreement.onToggleAgreement}
        />
      </ScrollView>

      {selectedProductDetailView ? (
        <ExpressPriceDetailSheet
          couponDiscountText={couponDiscountText}
          view={selectedProductDetailView}
          visible={detailVisible}
          onClose={() => setDetailVisible(false)}
          onOpenBillingRules={() => navigateToAppRoute(createAppWebUrl({ source: 'EXPRESS_BILLING_RULES' }))}
        />
      ) : null}

      <ExpressAgreementSheet visible={agreement.sheetVisible} onAgree={agreement.onAgree} onClose={agreement.onCloseSheet} />

      <AppSupportFloat label='客服' onPress={() => navigateToAppRoute(APP_ROUTES.supportCenter)} />
    </AppPage>
  )
}

export default ExpressPage
