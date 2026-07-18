import { ScrollView } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

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
import { useExpressInsurance } from './hooks/useExpressInsurance'
import { useExpressPickupTime } from './hooks/useExpressPickupTime'
import { useExpressQuote } from './hooks/useExpressQuote'
import { useExpressReturnBill } from './hooks/useExpressReturnBill'
import { useExpressWarehouse } from './hooks/useExpressWarehouse'
import { contactSelection } from '../../services/contact'
import { customerService } from '../../services/customer'
import {
  createExpressMonthlyPayView,
  createExpressScanContextView,
  createExpressDraft,
  clearExpressScanContext,
  expressDraftBridge,
  expressDraftStorage,
  expressPrivacyStorage,
  expressService,
  mapContactToExpressContact,
  setExpressContact,
  setExpressPrivacyProtection,
  swapExpressContacts,
  updateExpressGoods,
  updateExpressPackaging,
  updateExpressPickup,
  updateExpressService,
  validateExpressDraft
} from '../../services/express'
import { templateService } from '../../services/template'
import { AppPage } from '../../shared/components'
import { navigateToAppRoute } from '../../shared/navigation/appNavigation'
import {
  ensureAuthenticated,
  hasValidSession
} from '../../shared/navigation/authGuard'
import { APP_ROUTES } from '../../shared/navigation/routes'
import { createAppRouteUrl } from '../../shared/navigation/routeUrl'
import { createAppWebUrl } from '../../shared/webview/appWeb'

import type { CustomerCenterView } from '../../services/customer'
import type {
  ExpressDraft,
  ExpressGoodsItem,
  ExpressMonthlyPayView,
  ExpressPackagingDraft,
  ExpressPaymentType,
  ExpressProductQuote
} from '../../services/express'

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
  const [goodsSuggestions, setGoodsSuggestions] = useState<ExpressGoodsItem[]>(
    []
  )
  const [goodsLoading, setGoodsLoading] = useState(false)
  const [goodsMessage, setGoodsMessage] = useState('')
  const [monthlyCustomer, setMonthlyCustomer] =
    useState<CustomerCenterView | null>(null)
  const [monthlyCustomerLoading, setMonthlyCustomerLoading] = useState(false)
  const [monthlyCustomerChecked, setMonthlyCustomerChecked] = useState(false)
  const [monthlyCustomerMessage, setMonthlyCustomerMessage] = useState('')
  const [submiting, setSubmiting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState('')
  const goodsQueryVersion = useRef(0)
  const monthlyCustomerVersion = useRef(0)
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
  const validation = useMemo(
    () =>
      validateExpressDraft(draft, {
        requireAgreement: true,
        requireProduct: true
      }),
    [draft]
  )
  const monthlyPayView = useMemo(
    () =>
      createExpressMonthlyPayView({
        paymentType: draft.service.paymentType,
        customer: monthlyCustomer,
        loading: monthlyCustomerLoading,
        checked: monthlyCustomerChecked,
        errorMessage: monthlyCustomerMessage
      }),
    [
      draft.service.paymentType,
      monthlyCustomer,
      monthlyCustomerChecked,
      monthlyCustomerLoading,
      monthlyCustomerMessage
    ]
  )
  useEffect(() => {
    expressDraftStorage.save(draft)
    setSubmitMessage('')
  }, [draft])

  const loadMonthlyCustomer = useCallback(async () => {
    const requestVersion = monthlyCustomerVersion.current + 1

    monthlyCustomerVersion.current = requestVersion
    setMonthlyCustomerChecked(true)

    if (!hasValidSession()) {
      setMonthlyCustomer(null)
      setMonthlyCustomerLoading(false)
      setMonthlyCustomerMessage('请先登录后确认客户编码')
      return
    }

    setMonthlyCustomerLoading(true)
    setMonthlyCustomerMessage('')

    try {
      const response = await customerService.queryCustomerCenter()

      if (monthlyCustomerVersion.current !== requestVersion) {
        return
      }

      if (!response.status || !response.result) {
        setMonthlyCustomer(null)
        setMonthlyCustomerMessage(response.message || '暂未获取到客户信息')
        return
      }

      setMonthlyCustomer(response.result)
    } finally {
      if (monthlyCustomerVersion.current === requestVersion) {
        setMonthlyCustomerLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    if (draft.service.paymentType !== 'MONTH_PAY') {
      return
    }

    void loadMonthlyCustomer()
  }, [draft.service.paymentType, loadMonthlyCustomer])

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
      void loadMonthlyCustomer()
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

  const updateGoods = (patch: Partial<ExpressDraft['goods']>) => {
    setDraft(current => updateExpressGoods(current, patch))
  }

  const handlePackagingChange = (patch: Partial<ExpressPackagingDraft>) => {
    restoreQuotes([])
    setDraft(current => updateExpressPackaging(current, patch))
  }

  const handleGoodsNameInput = (value: string) => {
    goodsQueryVersion.current += 1
    setGoodsSuggestions([])
    setGoodsMessage('')
    updateGoods({ name: value })
  }

  const handleQueryGoodsNames = async () => {
    const keyword = draft.goods.name.trim()

    if (!keyword) {
      setGoodsSuggestions([])
      setGoodsMessage('')
      Taro.showToast({
        title: '请输入货物名称关键词',
        icon: 'none'
      })
      return
    }

    if (goodsLoading) {
      return
    }

    const requestVersion = goodsQueryVersion.current + 1

    goodsQueryVersion.current = requestVersion
    setGoodsLoading(true)
    setGoodsMessage('')

    try {
      const response = await expressService.queryGoodsNames(keyword, 1, 8)

      if (goodsQueryVersion.current !== requestVersion) {
        return
      }

      if (!response.status) {
        const message = response.message || '暂未获取到品名推荐'

        setGoodsSuggestions([])
        setGoodsMessage(message)
        Taro.showToast({
          title: message,
          icon: 'none'
        })
        return
      }

      const suggestions =
        response.result?.list?.filter(item => !!item.productKeyWord) ?? []

      setGoodsSuggestions(suggestions)
      setGoodsMessage(
        suggestions.length ? '' : '未找到匹配品名，可继续手动填写'
      )
    } finally {
      if (goodsQueryVersion.current === requestVersion) {
        setGoodsLoading(false)
      }
    }
  }

  const handleSelectGoodsName = (item: ExpressGoodsItem) => {
    updateGoods({ name: item.productKeyWord })
    setGoodsSuggestions([])
    setGoodsMessage('')
  }

  const updateService = (patch: Partial<ExpressDraft['service']>) => {
    setDraft(current => updateExpressService(current, patch))
  }

  const updatePickup = (patch: Partial<ExpressDraft['pickup']>) => {
    setDraft(current => updateExpressPickup(current, patch))
  }

  const handlePaymentTypeSelect = (paymentType: ExpressPaymentType) => {
    updateService({ paymentType })

    if (paymentType === 'MONTH_PAY') {
      void loadMonthlyCustomer()
    }
  }

  const handleOpenMonthlyPayAction = (view: ExpressMonthlyPayView) => {
    navigateToAppRoute(createAppWebUrl({ source: view.actionSource }), {
      login: true,
      message: '请先登录后处理客户编码'
    })
  }

  const setPrivacyProtection = (
    value: ExpressDraft['service']['privacyProtection']
  ) => {
    setDraft(current => setExpressPrivacyProtection(current, value))
  }

  const handlePrivacyProtectionChange = (
    value: ExpressDraft['service']['privacyProtection']
  ) => {
    if (value === 'N') {
      setPrivacyProtection(value)
      return
    }

    if (expressPrivacyStorage.hasConfirmed()) {
      setPrivacyProtection(value)
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
        setPrivacyProtection(value)
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

  const handleOpenTemplates = () => {
    navigateToAppRoute(APP_ROUTES.expressTemplateList, {
      login: true
    })
  }

  const handleOpenRealName = () => {
    navigateToAppRoute(APP_ROUTES.realNameCenter, { login: true })
  }

  const handleOpenBatch = () => {
    navigateToAppRoute(APP_ROUTES.batchExpress, { login: true })
  }

  const handleOpenHelp = () => {
    navigateToAppRoute(APP_ROUTES.supportCenter)
  }

  const handleOpenStations = () => {
    navigateToAppRoute(APP_ROUTES.stationQuery)
  }

  const handleSaveTemplate = () => {
    if (!hasValidSession()) {
      ensureAuthenticated({
        redirectUrl: APP_ROUTES.express,
        message: '请先登录后保存寄件模板'
      })
      return
    }

    const message = templateService.stageDraft(draft)

    if (message) {
      Taro.showToast({
        title: message,
        icon: 'none'
      })
      return
    }

    navigateToAppRoute(APP_ROUTES.expressTemplateCreate, {
      login: true
    })
  }

  const handleSubmit = async () => {
    if (submiting) {
      return
    }

    setSubmitMessage('')

    if (!validation.valid) {
      Taro.showToast({
        title: validation.messages[0],
        icon: 'none'
      })
      return
    }

    if (!hasValidSession()) {
      await expressDraftStorage.preserveForLogin(draft)
      ensureAuthenticated({
        redirectUrl: APP_ROUTES.express,
        replace: true,
        message: '请先登录后提交订单'
      })
      return
    }

    setSubmiting(true)

    try {
      const preparation = await warehouseController.prepareForSubmit()

      if (!preparation || !preparation.proceed) {
        return
      }

      const preparedValidation = validateExpressDraft(preparation.draft, {
        requireAgreement: true,
        requireProduct: true,
        requireWarehouseScreening: true
      })

      if (!preparedValidation.valid) {
        Taro.showToast({
          title: preparedValidation.messages[0],
          icon: 'none'
        })
        return
      }

      const response = await expressService.submitDraft(preparation.draft)

      if (!response.status || !response.result) {
        const message = response.message || '提交失败，请稍后重试'

        setSubmitMessage(message)
        Taro.showToast({
          title: message,
          icon: 'none'
        })
        return
      }

      const orderNumber = response.result.orderNumbers?.[0] || ''
      const waybillNumber =
        response.result.waybillNumber ||
        response.result.waybillNumbers?.[0] ||
        ''

      expressDraftStorage.clear()

      navigateToAppRoute(
        createAppRouteUrl(APP_ROUTES.expressSuccess, {
          orderNumber,
          waybillNumber
        }),
        { login: true }
      )
    } finally {
      setSubmiting(false)
    }
  }

  return (
    <AppPage
      footer={
        <ExpressSubmitBar
          priceText={getProductPriceText(draft.selectedProduct)}
          quoteLoading={quoteStatus === 'loading'}
          submitting={submiting}
          onQuote={handleQuote}
          onSubmit={handleSubmit}
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
          onOpenBatch={handleOpenBatch}
          onOpenHelp={handleOpenHelp}
          onOpenRealName={handleOpenRealName}
          onOpenTemplates={handleOpenTemplates}
          onSaveTemplate={handleSaveTemplate}
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
          onOpenStations={handleOpenStations}
        />

        <ExpressGoodsSection
          goods={draft.goods}
          goodsLoading={goodsLoading}
          goodsMessage={goodsMessage}
          goodsSuggestions={goodsSuggestions}
          onGoodsChange={updateGoods}
          onGoodsNameInput={handleGoodsNameInput}
          onQueryGoodsNames={handleQueryGoodsNames}
          onSelectGoodsName={handleSelectGoodsName}
        />

        <ExpressInsuranceCard
          controller={insuranceController}
          draft={draft}
        />

        <ExpressPackagingCard
          packaging={draft.packaging}
          onChange={handlePackagingChange}
        />

        <ExpressServiceSection
          collection={draft.collection}
          collectionController={collectionController}
          deliveryPreference={draft.deliveryPreference}
          deliveryPreferenceController={deliveryPreferenceController}
          deliveryPoint={draft.deliveryPoint}
          monthlyPayView={monthlyPayView}
          scanContextView={createExpressScanContextView(draft.scanContext)}
          selectedProduct={draft.selectedProduct}
          service={draft.service}
          warehouse={draft.warehouse}
          warehouseController={warehouseController}
          onClearScanContext={() => setDraft(clearExpressScanContext)}
          onOpenDeliveryPoints={deliveryPointController.onOpen}
          onMonthlyPayAction={handleOpenMonthlyPayAction}
          onPaymentTypeSelect={handlePaymentTypeSelect}
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
          submitMessage={submitMessage}
          validationMessages={validation.valid ? [] : validation.messages}
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
