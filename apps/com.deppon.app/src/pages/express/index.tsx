import { Input, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'

import { useEffect, useMemo, useRef, useState } from 'react'

import { contactSelection } from '../../services/contact'
import {
  createExpressDraft,
  expressDraftBridge,
  expressDraftStorage,
  expressInsuranceRules,
  expressPrivacyStorage,
  expressService,
  getExpressContactFullAddress,
  mapContactToExpressContact,
  markExpressQuoteStale,
  setExpressContact,
  swapExpressContacts,
  validateExpressDraft
} from '../../services/express'
import AppTabBar from '../../shared/components/AppTabBar'
import { navigateToAppRoute } from '../../shared/navigation/appNavigation'
import {
  ensureAuthenticated,
  hasValidSession
} from '../../shared/navigation/authGuard'
import { APP_ROUTES } from '../../shared/navigation/routes'

import type {
  ExpressDeliveryMode,
  ExpressDraft,
  ExpressGoodsItem,
  ExpressInsuranceQuote,
  ExpressPaymentType,
  ExpressProductQuote
} from '../../services/express'

import './index.scss'

const PAYMENT_OPTIONS: Array<{ label: string; value: ExpressPaymentType }> = [
  {
    label: '寄付现结',
    value: 'MP'
  },
  {
    label: '到付',
    value: 'PAY_ARIIVE'
  },
  {
    label: '月结',
    value: 'MONTH_PAY'
  }
]

const DELIVERY_OPTIONS: Array<{ label: string; value: ExpressDeliveryMode }> = [
  {
    label: '送货上门',
    value: 'PICKNOTUPSTAIRS'
  },
  {
    label: '自提',
    value: 'PICKSELF'
  },
  {
    label: '送货上楼',
    value: 'PICKUPSTAIRS'
  }
]

function createQuery(params: Record<string, string>) {
  return Object.entries(params)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&')
}

function parseNumber(value: string, fallback = 0) {
  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : fallback
}

function getProductKey(product: ExpressProductQuote) {
  return `${product.omsProductCode || product.productName}-${product.totalfee ?? ''}`
}

function getProductPriceText(product: ExpressProductQuote | null) {
  if (!product || product.totalfee === null || product.totalfee === undefined) {
    return '--'
  }

  return `¥${product.totalfee}`
}

function getMoneyText(value: number) {
  if (!Number.isFinite(value)) {
    return '¥0'
  }

  return Number.isInteger(value) ? `¥${value}` : `¥${value.toFixed(2)}`
}

function getGoodsCategoryText(item: ExpressGoodsItem) {
  return [item.firstCategory, item.secondCategory].filter(Boolean).join(' / ')
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
  const [submiting, setSubmiting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState('')
  const goodsQueryVersion = useRef(0)
  const validation = useMemo(
    () =>
      validateExpressDraft(draft, {
        requireAgreement: true,
        requireProduct: true
      }),
    [draft]
  )

  useEffect(() => {
    expressDraftStorage.save(draft)
    setSubmitMessage('')
  }, [draft])

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
                : '已带入查价结果',
        icon: 'none'
      })
      return
    }

    const selection = contactSelection.consumeSelection()

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
    const url = `${APP_ROUTES.contactList}?${createQuery(params)}`

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
    const url = `${APP_ROUTES.contactEdit}?${createQuery(params)}`

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
        url: `${APP_ROUTES.expressSuccess}?${createQuery({
          orderNumber,
          waybillNumber
        })}`
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
            <Text className='express-header__label'>Express</Text>
            <Text className='express-header__title'>预约寄件</Text>
          </View>
          <Text className='express-header__price'>
            {getProductPriceText(draft.selectedProduct)}
          </Text>
        </View>

        <View className='express-contact-panel'>
          <View className='express-contact-card'>
            <View className='express-contact-card__mark express-contact-card__mark--sender'>
              <Text className='express-contact-card__mark-text'>寄</Text>
            </View>
            <View className='express-contact-card__content'>
              {draft.sender ? (
                <>
                  <Text className='express-contact-card__name'>
                    {draft.sender.name} {draft.sender.mobile}
                  </Text>
                  <Text className='express-contact-card__address'>
                    {getExpressContactFullAddress(draft.sender)}
                  </Text>
                </>
              ) : (
                <>
                  <Text className='express-contact-card__name'>寄件人</Text>
                  <Text className='express-contact-card__address'>
                    请选择寄件地址
                  </Text>
                </>
              )}
            </View>
            <View className='express-contact-card__actions'>
              <Text
                className='express-link'
                onClick={() => handleContactSelect('sender')}
              >
                地址簿
              </Text>
              <Text
                className='express-link express-link--quiet'
                onClick={() => handleContactCreate('sender')}
              >
                新增
              </Text>
            </View>
          </View>

          <View className='express-swap' onClick={handleSwapContacts}>
            <Text className='express-swap__text'>互换</Text>
          </View>

          <View className='express-contact-card'>
            <View className='express-contact-card__mark express-contact-card__mark--consignee'>
              <Text className='express-contact-card__mark-text'>收</Text>
            </View>
            <View className='express-contact-card__content'>
              {draft.consignee ? (
                <>
                  <Text className='express-contact-card__name'>
                    {draft.consignee.name} {draft.consignee.mobile}
                  </Text>
                  <Text className='express-contact-card__address'>
                    {getExpressContactFullAddress(draft.consignee)}
                  </Text>
                </>
              ) : (
                <>
                  <Text className='express-contact-card__name'>收件人</Text>
                  <Text className='express-contact-card__address'>
                    请选择收件地址
                  </Text>
                </>
              )}
            </View>
            <View className='express-contact-card__actions'>
              <Text
                className='express-link'
                onClick={() => handleContactSelect('consignee')}
              >
                地址簿
              </Text>
              <Text
                className='express-link express-link--quiet'
                onClick={() => handleContactCreate('consignee')}
              >
                新增
              </Text>
            </View>
          </View>
        </View>

        <View className='express-section'>
          <View className='express-section__head'>
            <Text className='express-section__title'>物品信息</Text>
            <Text className='express-section__hint'>必填</Text>
          </View>

          <View className='express-field'>
            <View className='express-field__row'>
              <Text className='express-field__label'>货物名称</Text>
              <View
                className='express-field__button'
                onClick={handleQueryGoodsNames}
              >
                <Text className='express-field__button-text'>
                  {goodsLoading ? '查询中' : '推荐'}
                </Text>
              </View>
            </View>
            <Input
              className='express-input'
              placeholder='如文件、服饰、配件'
              value={draft.goods.name}
              onInput={event => handleGoodsNameInput(event.detail.value)}
            />
            {goodsSuggestions.length > 0 && (
              <View className='express-goods-suggestions'>
                {goodsSuggestions.map((item, index) => (
                  <View
                    className='express-goods-suggestion'
                    key={`${item.productKeyWord}-${item.secondCategory}-${index}`}
                    onClick={() => handleSelectGoodsName(item)}
                  >
                    <Text className='express-goods-suggestion__name'>
                      {item.productKeyWord}
                    </Text>
                    <Text className='express-goods-suggestion__desc'>
                      {getGoodsCategoryText(item) || '常用品名'}
                    </Text>
                  </View>
                ))}
              </View>
            )}
            {goodsMessage && (
              <Text className='express-goods-message'>{goodsMessage}</Text>
            )}
          </View>

          <View className='express-field-grid'>
            <View className='express-field express-field--grid'>
              <Text className='express-field__label'>重量 kg</Text>
              <Input
                className='express-input'
                placeholder='1'
                type='digit'
                value={String(draft.goods.weight)}
                onInput={event =>
                  handleInsuranceGoodsChange({
                    weight: parseNumber(event.detail.value, 0)
                  })
                }
              />
            </View>
            <View className='express-field express-field--grid express-field--grid-right'>
              <Text className='express-field__label'>件数</Text>
              <Input
                className='express-input'
                placeholder='1'
                type='number'
                value={String(draft.goods.count)}
                onInput={event =>
                  updateGoods({ count: parseNumber(event.detail.value, 1) })
                }
              />
            </View>
          </View>

          <View className='express-field-grid'>
            <View className='express-field express-field--grid express-field--grid-right'>
              <Text className='express-field__label'>体积 m³</Text>
              <Input
                className='express-input'
                placeholder='选填'
                type='digit'
                value={String(draft.goods.volume || '')}
                onInput={event =>
                  handleInsuranceGoodsChange({
                    volume: parseNumber(event.detail.value, 0)
                  })
                }
              />
            </View>
            <View className='express-field express-field--grid'>
              <View className='express-field__row'>
                <Text className='express-field__label'>保价金额</Text>
                <View className='express-field__actions'>
                  <View
                    className='express-field__button express-field__button--compact'
                    onClick={handleOpenInsuranceRules}
                  >
                    <Text className='express-field__button-text'>规则</Text>
                  </View>
                  <View
                    className='express-field__button express-field__button--compact'
                    onClick={handleQueryInsurancePrice}
                  >
                    <Text className='express-field__button-text'>
                      {insuranceLoading ? '试算中' : '试算'}
                    </Text>
                  </View>
                </View>
              </View>
              <Input
                className='express-input'
                placeholder='0'
                type='digit'
                value={String(draft.goods.insuredAmount || '')}
                onInput={event =>
                  handleInsuranceGoodsChange({
                    insuredAmount: parseNumber(event.detail.value, 0)
                  })
                }
              />
              {insuranceQuote && (
                <Text className='express-insurance-message'>
                  {insuranceQuote.name || '保价费'}约
                  {getMoneyText(insuranceQuote.price)}
                </Text>
              )}
              {insuranceMessage && (
                <Text className='express-insurance-message express-insurance-message--error'>
                  {insuranceMessage}
                </Text>
              )}
            </View>
          </View>
        </View>

        <View className='express-section'>
          <View className='express-section__head'>
            <Text className='express-section__title'>服务方式</Text>
          </View>

          <Text className='express-option-title'>付款方式</Text>
          <View className='express-chip-group'>
            {PAYMENT_OPTIONS.map(option => (
              <View
                className={
                  option.value === draft.service.paymentType
                    ? 'express-chip express-chip--active'
                    : 'express-chip'
                }
                key={option.value}
                onClick={() => updateService({ paymentType: option.value })}
              >
                <Text
                  className={
                    option.value === draft.service.paymentType
                      ? 'express-chip__text express-chip__text--active'
                      : 'express-chip__text'
                  }
                >
                  {option.label}
                </Text>
              </View>
            ))}
          </View>

          <Text className='express-option-title'>送货方式</Text>
          <View className='express-chip-group'>
            {DELIVERY_OPTIONS.map(option => (
              <View
                className={
                  option.value === draft.service.deliveryMode
                    ? 'express-chip express-chip--active'
                    : 'express-chip'
                }
                key={option.value}
                onClick={() => updateService({ deliveryMode: option.value })}
              >
                <Text
                  className={
                    option.value === draft.service.deliveryMode
                      ? 'express-chip__text express-chip__text--active'
                      : 'express-chip__text'
                  }
                >
                  {option.label}
                </Text>
              </View>
            ))}
          </View>

          <View className='express-service-row'>
            <Text className='express-option-title'>取件前电话联系</Text>
            <View className='express-toggle-group'>
              {(['Y', 'N'] as const).map(value => (
                <View
                  className={
                    value === draft.service.needContact
                      ? 'express-toggle express-toggle--active'
                      : 'express-toggle'
                  }
                  key={value}
                  onClick={() =>
                    setDraft(current => ({
                      ...current,
                      service: {
                        ...current.service,
                        needContact: value
                      }
                    }))
                  }
                >
                  <Text
                    className={
                      value === draft.service.needContact
                        ? 'express-toggle__text express-toggle__text--active'
                        : 'express-toggle__text'
                    }
                  >
                    {value === 'Y' ? '联系' : '不联系'}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View className='express-service-row express-service-row--stack'>
            <View className='express-service-row__content'>
              <Text className='express-option-title'>隐私面单</Text>
              <Text className='express-service-row__summary'>
                隐藏收寄件敏感号码，保护寄递隐私
              </Text>
            </View>
            <View className='express-toggle-group'>
              {(['Y', 'N'] as const).map(value => (
                <View
                  className={
                    value === draft.service.privacyProtection
                      ? 'express-toggle express-toggle--active'
                      : 'express-toggle'
                  }
                  key={value}
                  onClick={() => handlePrivacyProtectionChange(value)}
                >
                  <Text
                    className={
                      value === draft.service.privacyProtection
                        ? 'express-toggle__text express-toggle__text--active'
                        : 'express-toggle__text'
                    }
                  >
                    {value === 'Y' ? '开启' : '关闭'}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View className='express-section'>
          <View className='express-section__head'>
            <Text className='express-section__title'>产品价格</Text>
            {draft.quoteStaleReason && (
              <Text className='express-section__hint'>
                {draft.quoteStaleReason}
              </Text>
            )}
          </View>

          <View className='express-actions'>
            <View
              className='express-secondary-button'
              onClick={handleQueryPickupTime}
            >
              <Text className='express-secondary-button__text'>
                {draft.pickup.time ? '更新取件时间' : '获取取件时间'}
              </Text>
            </View>
            <View className='express-primary-button' onClick={handleQuote}>
              <Text className='express-primary-button__text'>
                {quoteStatus === 'loading' ? '获取中' : '获取价格'}
              </Text>
            </View>
          </View>

          {draft.pickup.time && (
            <View className='express-pickup'>
              <Text className='express-pickup__label'>预计取件</Text>
              <Text className='express-pickup__value'>
                {draft.pickup.timeSlot || draft.pickup.time}
              </Text>
            </View>
          )}

          {quotes.length > 0 && (
            <View className='express-product-list'>
              {quotes.map(product => (
                <View
                  className={
                    draft.selectedProduct?.omsProductCode ===
                    product.omsProductCode
                      ? 'express-product express-product--active'
                      : 'express-product'
                  }
                  key={getProductKey(product)}
                  onClick={() => handleSelectProduct(product)}
                >
                  <View>
                    <Text className='express-product__name'>
                      {product.productName ||
                        product.omsProductCode ||
                        '德邦快递'}
                    </Text>
                    <Text className='express-product__desc'>
                      {product.daysFormat ||
                        product.days ||
                        product.arriveDate ||
                        '时效待确认'}
                    </Text>
                  </View>
                  <Text className='express-product__price'>
                    {getProductPriceText(product)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

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
      <AppTabBar active='express' />
    </>
  )
}

export default ExpressPage
