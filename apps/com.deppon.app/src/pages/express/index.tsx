import { Input, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { ExpressContactPanel } from './components/ExpressContactPanel'
import { ExpressGoodsSection } from './components/ExpressGoodsSection'
import { ExpressQuoteSection } from './components/ExpressQuoteSection'
import { ExpressServiceSection } from './components/ExpressServiceSection'
import { contactSelection } from '../../services/contact'
import { customerService } from '../../services/customer'
import {
  createExpressMonthlyPayView,
  createExpressScanContextView,
  createExpressDraft,
  clearExpressScanContext,
  expressDraftBridge,
  expressDraftStorage,
  expressInsuranceRules,
  expressPrivacyStorage,
  getExpressReturnBillOption,
  expressService,
  mapContactToExpressContact,
  markExpressQuoteStale,
  setExpressContact,
  swapExpressContacts,
  validateExpressDraft
} from '../../services/express'
import { templateService } from '../../services/template'
import { AppIcon } from '../../shared/components/AppIcon'
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
  ExpressInsuranceQuote,
  ExpressMonthlyPayView,
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
  const [quotes, setQuotes] = useState<ExpressProductQuote[]>([])
  const [goodsSuggestions, setGoodsSuggestions] = useState<ExpressGoodsItem[]>(
    []
  )
  const [goodsLoading, setGoodsLoading] = useState(false)
  const [goodsMessage, setGoodsMessage] = useState('')
  const [insuranceQuote, setInsuranceQuote] =
    useState<ExpressInsuranceQuote | null>(null)
  const [insuranceLoading, setInsuranceLoading] = useState(false)
  const [insuranceMessage, setInsuranceMessage] = useState('')
  const [quoteStatus, setQuoteStatus] = useState<
    'idle' | 'loading' | 'done' | 'error'
  >('idle')
  const [monthlyCustomer, setMonthlyCustomer] =
    useState<CustomerCenterView | null>(null)
  const [monthlyCustomerLoading, setMonthlyCustomerLoading] = useState(false)
  const [monthlyCustomerChecked, setMonthlyCustomerChecked] = useState(false)
  const [monthlyCustomerMessage, setMonthlyCustomerMessage] = useState('')
  const [submiting, setSubmiting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState('')
  const goodsQueryVersion = useRef(0)
  const monthlyCustomerVersion = useRef(0)
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
  const selectedReturnBillOption = useMemo(
    () => getExpressReturnBillOption(draft.service.returnBillType),
    [draft.service.returnBillType]
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
      setQuotes(carriedDraft.quotes)
      setQuoteStatus(carriedDraft.quotes.length ? 'done' : 'idle')
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
    setDraft(current =>
      markExpressQuoteStale(
        {
          ...current,
          goods: {
            ...current.goods,
            ...patch
          }
        },
        '货物信息变化，请重新获取价格'
      )
    )
  }

  const clearInsuranceQuote = () => {
    setInsuranceQuote(null)
    setInsuranceMessage('')
  }

  const handleGoodsNameInput = (value: string) => {
    goodsQueryVersion.current += 1
    setGoodsSuggestions([])
    setGoodsMessage('')
    updateGoods({ name: value })
  }

  const handleInsuranceGoodsChange = (
    patch: Partial<ExpressDraft['goods']>
  ) => {
    clearInsuranceQuote()
    updateGoods(patch)
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

  const handleQueryInsurancePrice = async () => {
    if (insuranceLoading) {
      return
    }

    setInsuranceLoading(true)
    setInsuranceMessage('')

    try {
      const response = await expressService.queryInsurancePrice(draft)

      if (!response.status || !response.result) {
        setInsuranceQuote(null)
        setInsuranceMessage(response.message || '暂未获取到保价费用')
        Taro.showToast({
          title: response.message || '暂未获取到保价费用',
          icon: 'none'
        })
        return
      }

      setInsuranceQuote(response.result)
    } finally {
      setInsuranceLoading(false)
    }
  }

  const handleOpenInsuranceRules = () => {
    navigateToAppRoute(expressInsuranceRules.createRuleRoute('NORMAL'))
  }

  const updateService = (patch: Partial<ExpressDraft['service']>) => {
    setDraft(current =>
      markExpressQuoteStale(
        {
          ...current,
          service: {
            ...current.service,
            ...patch
          }
        },
        '服务方式变化，请重新获取价格'
      )
    )
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
    setDraft(current => ({
      ...current,
      service: {
        ...current.service,
        privacyProtection: value
      }
    }))
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

  const handleCouponNumberInput = (value: string) => {
    setDraft(current =>
      markExpressQuoteStale(
        {
          ...current,
          couponNumber: value.replace(/\s+/g, '').toUpperCase()
        },
        '优惠券变化，请重新获取价格'
      )
    )
  }

  const handleContactSelect = (target: 'sender' | 'consignee') => {
    const params = contactSelection.createParams(target)
    const url = createAppRouteUrl(APP_ROUTES.contactList, params)

    if (!ensureAuthenticated({ redirectUrl: url })) {
      return
    }

    Taro.navigateTo({
      url
    })
  }

  const handleContactCreate = (target: 'sender' | 'consignee') => {
    const params = contactSelection.createParams(target, 'select', 'EXPRESS', {
      returnDelta: '1'
    })
    const url = createAppRouteUrl(APP_ROUTES.contactEdit, params)

    if (!ensureAuthenticated({ redirectUrl: url })) {
      return
    }

    Taro.navigateTo({
      url
    })
  }

  const handleSwapContacts = () => {
    setDraft(current => swapExpressContacts(current))
  }

  const handleOpenTemplates = () => {
    navigateToAppRoute(APP_ROUTES.expressTemplateList, {
      login: true
    })
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

  const handleQueryPickupTime = async () => {
    const response = await expressService.queryPickupTime(draft)

    if (!response.status || !response.result) {
      Taro.showToast({
        title: response.message || '暂未获取到取件时间',
        icon: 'none'
      })
      return
    }

    const firstDate = response.result.openingList?.find(item =>
      item.dateList.some(dateItem => dateItem.type === 'NORMAL')
    )
    const firstTime = firstDate?.dateList.find(
      dateItem => dateItem.type === 'NORMAL'
    )

    setDraft(current => ({
      ...current,
      pickup: {
        ...current.pickup,
        time:
          response.result?.startTime ||
          (firstDate && firstTime ? `${firstDate.date} ${firstTime.time}` : ''),
        endTime: response.result?.endTime,
        timeSlot: firstTime?.text || response.result?.serviceTime,
        stationCode: response.result?.deptCode || '',
        stationName: response.result?.deptName || '',
        pickPeriodTime: response.result?.pickPeriodTime
      }
    }))

    Taro.showToast({
      title: '已更新取件时间',
      icon: 'none'
    })
  }

  const handleQuote = async () => {
    setQuoteStatus('loading')

    const response = await expressService.quote(draft)

    if (!response.status || !response.result?.length) {
      setQuotes([])
      setQuoteStatus('error')
      Taro.showToast({
        title: response.message || '暂未获取到产品价格',
        icon: 'none'
      })
      return
    }

    setQuotes(response.result)
    const firstProduct = response.result[0] ?? null

    setDraft(current => ({
      ...current,
      selectedProduct: firstProduct,
      service: firstProduct
        ? {
            ...current.service,
            transportMode: firstProduct.omsProductCode
          }
        : current.service,
      quoteStaleReason: ''
    }))
    clearInsuranceQuote()
    setQuoteStatus('done')
  }

  const handleSelectProduct = (product: ExpressProductQuote) => {
    clearInsuranceQuote()
    setDraft(current => ({
      ...current,
      selectedProduct: product,
      service: {
        ...current.service,
        transportMode: product.omsProductCode
      },
      quoteStaleReason: ''
    }))
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
      expressDraftStorage.save(draft)
      ensureAuthenticated({
        redirectUrl: APP_ROUTES.express,
        replace: true,
        message: '请先登录后提交订单'
      })
      return
    }

    setSubmiting(true)

    try {
      const response = await expressService.submitDraft(draft)

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

      Taro.navigateTo({
        url: createAppRouteUrl(APP_ROUTES.expressSuccess, {
          orderNumber,
          waybillNumber
        })
      })
    } finally {
      setSubmiting(false)
    }
  }

  return (
    <>
      <ScrollView className='express-page' scrollY>
        <View className='express-header'>
          <View>
            <Text className='express-header__title'>填写寄件信息</Text>
            <Text className='express-header__label'>上门取件 · 全程可查</Text>
          </View>
          <View className='express-header__tools'>
            <View
              className='express-header__tool'
              onClick={handleOpenTemplates}
            >
              <AppIcon color='#344054' name='fileCheck' size={20} />
              <Text className='express-header__tool-text'>模板</Text>
            </View>
            <View className='express-header__tool' onClick={handleSaveTemplate}>
              <AppIcon color='#344054' name='save' size={20} />
              <Text className='express-header__tool-text'>保存</Text>
            </View>
            {!!draft.selectedProduct && (
              <Text className='express-header__price'>
                {getProductPriceText(draft.selectedProduct)}
              </Text>
            )}
          </View>
        </View>

        <ExpressContactPanel
          draft={draft}
          onCreateContact={handleContactCreate}
          onSelectContact={handleContactSelect}
          onSwapContacts={handleSwapContacts}
        />

        <ExpressGoodsSection
          goods={draft.goods}
          goodsLoading={goodsLoading}
          goodsMessage={goodsMessage}
          goodsSuggestions={goodsSuggestions}
          insuranceLoading={insuranceLoading}
          insuranceMessage={insuranceMessage}
          insuranceQuote={insuranceQuote}
          onGoodsChange={updateGoods}
          onGoodsNameInput={handleGoodsNameInput}
          onInsuranceGoodsChange={handleInsuranceGoodsChange}
          onOpenInsuranceRules={handleOpenInsuranceRules}
          onQueryGoodsNames={handleQueryGoodsNames}
          onQueryInsurancePrice={handleQueryInsurancePrice}
          onSelectGoodsName={handleSelectGoodsName}
        />

        <ExpressServiceSection
          monthlyPayView={monthlyPayView}
          scanContextView={createExpressScanContextView(draft.scanContext)}
          selectedReturnBillOption={selectedReturnBillOption}
          service={draft.service}
          onClearScanContext={() => setDraft(clearExpressScanContext)}
          onMonthlyPayAction={handleOpenMonthlyPayAction}
          onPaymentTypeSelect={handlePaymentTypeSelect}
          onPrivacyProtectionChange={handlePrivacyProtectionChange}
          onServiceChange={updateService}
        />

        <ExpressQuoteSection
          pickup={draft.pickup}
          quoteStaleReason={draft.quoteStaleReason}
          quoteStatus={quoteStatus}
          quotes={quotes}
          selectedProduct={draft.selectedProduct}
          onQueryPickupTime={handleQueryPickupTime}
          onQuote={handleQuote}
          onSelectProduct={handleSelectProduct}
        />

        <View className='express-section'>
          <View className='express-field'>
            <View className='express-field__row'>
              <Text className='express-field__label'>优惠券</Text>
              {draft.couponNumber && (
                <Text
                  className='express-link express-link--quiet'
                  onClick={() => handleCouponNumberInput('')}
                >
                  清除
                </Text>
              )}
            </View>
            <Input
              className='express-input'
              placeholder='可从优惠券列表带入，也可手动输入'
              value={draft.couponNumber}
              onInput={event => handleCouponNumberInput(event.detail.value)}
            />
          </View>

          <View className='express-field'>
            <Text className='express-field__label'>备注</Text>
            <Input
              className='express-input'
              placeholder='选填，交给快递员的信息'
              value={draft.remark}
              onInput={event =>
                setDraft(current => ({
                  ...current,
                  remark: event.detail.value
                }))
              }
            />
          </View>

          <View
            className='express-agreement'
            onClick={() =>
              setDraft(current => ({
                ...current,
                agreementAccepted: !current.agreementAccepted
              }))
            }
          >
            <View
              className={
                draft.agreementAccepted
                  ? 'express-checkbox express-checkbox--checked'
                  : 'express-checkbox'
              }
            >
              <Text className='express-checkbox__text'>
                {draft.agreementAccepted ? '✓' : ''}
              </Text>
            </View>
            <Text className='express-agreement__text'>
              已阅读并同意电子运单协议
            </Text>
          </View>

          {(submitMessage || !validation.valid) && (
            <View className='express-validation'>
              {submitMessage && (
                <Text className='express-validation__message'>
                  {submitMessage}
                </Text>
              )}
              {validation.messages.slice(0, 3).map(message => (
                <Text className='express-validation__message' key={message}>
                  {message}
                </Text>
              ))}
            </View>
          )}
        </View>

        <View className='express-submit' onClick={handleSubmit}>
          <Text className='express-submit__fee'>
            {getProductPriceText(draft.selectedProduct)}
          </Text>
          <Text className='express-submit__text'>
            {submiting ? '提交中' : '立即下单'}
          </Text>
        </View>
      </ScrollView>
    </>
  )
}

export default ExpressPage
