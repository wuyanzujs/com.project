import { Input, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'

import { useMemo, useState } from 'react'

import { contactSelection } from '../../../services/contact'
import {
  createExpressDraft,
  expressDraftBridge,
  expressService,
  getExpressContactFullAddress,
  mapContactToExpressContact,
  markExpressQuoteStale,
  setExpressContact,
  swapExpressContacts,
  validateExpressPriceTimeDraft
} from '../../../services/express'
import { navigateToAppRoute } from '../../../shared/navigation/appNavigation'
import { APP_ROUTES } from '../../../shared/navigation/routes'

import type {
  ExpressContact,
  ExpressContactTarget,
  ExpressDeliveryMode,
  ExpressDraft,
  ExpressProductQuote
} from '../../../services/express'

import './index.scss'

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

function createEmptyPriceContact(target: ExpressContactTarget): ExpressContact {
  return {
    name: target === 'sender' ? '寄件人' : '收件人',
    mobile: '',
    province: '',
    city: '',
    county: '',
    address: '',
    company: ''
  }
}

function getProductKey(product: ExpressProductQuote) {
  return `${product.omsProductCode || product.productName}-${product.totalfee ?? ''}`
}

function getProductPriceText(product: ExpressProductQuote) {
  if (product.totalfee === null || product.totalfee === undefined) {
    return '待确认'
  }

  return `¥${product.totalfee}起`
}

function getProductTimeText(product: ExpressProductQuote) {
  return product.daysFormat || product.days || product.arriveDate || '时效待确认'
}

function hasBillWeight(product: ExpressProductQuote) {
  return product.billWeight !== null && product.billWeight !== undefined
}

function createPriceDraft(): ExpressDraft {
  const draft = createExpressDraft()

  return {
    ...draft,
    goods: {
      ...draft.goods,
      name: '文件',
      weight: 1,
      count: 1
    }
  }
}

const QueryPricePage = () => {
  const [draft, setDraft] = useState<ExpressDraft>(() => createPriceDraft())
  const [quotes, setQuotes] = useState<ExpressProductQuote[]>([])
  const [quoteStatus, setQuoteStatus] = useState<
    'idle' | 'loading' | 'done' | 'error'
  >('idle')
  const validation = useMemo(
    () => validateExpressPriceTimeDraft(draft),
    [draft]
  )

  useDidShow(() => {
    const selection = contactSelection.consumeSelection()

    if (!selection) {
      return
    }

    setDraft((current) =>
      setExpressContact(
        current,
        selection.target,
        mapContactToExpressContact(selection.contact)
      )
    )
  })

  const updateContact = (
    target: ExpressContactTarget,
    patch: Partial<ExpressContact>
  ) => {
    setDraft((current) => {
      const contact = current[target] ?? createEmptyPriceContact(target)

      return setExpressContact(current, target, {
        ...contact,
        ...patch
      })
    })
  }

  const updateGoods = (patch: Partial<ExpressDraft['goods']>) => {
    setDraft((current) =>
      markExpressQuoteStale(
        {
          ...current,
          goods: {
            ...current.goods,
            ...patch
          }
        },
        '货物信息变化，请重新查询'
      )
    )
  }

  const handleContactSelect = (target: ExpressContactTarget) => {
    const params = contactSelection.createParams(
      target,
      'select',
      'QUERY_PRICE'
    )
    const url = `${APP_ROUTES.contactList}?${createQuery(params)}`

    navigateToAppRoute(url, {
      login: true
    })
  }

  const handleSwapContacts = () => {
    setDraft((current) => swapExpressContacts(current))
  }

  const handleQuote = async () => {
    if (!validation.valid) {
      Taro.showToast({
        title: validation.messages[0],
        icon: 'none'
      })
      return
    }

    setQuoteStatus('loading')

    const response = await expressService.quotePriceTime(draft)

    if (!response.status || !response.result?.length) {
      setQuotes([])
      setQuoteStatus('error')
      Taro.showToast({
        title: response.message || '暂未查询到价格时效',
        icon: 'none'
      })
      return
    }

    setQuotes(response.result)
    setQuoteStatus('done')
  }

  const handleExpress = (product: ExpressProductQuote) => {
    expressDraftBridge.carryFromQueryPrice(draft, product)

    navigateToAppRoute(`${APP_ROUTES.express}?source=QUERY_PRICE_PRODUCT`)
  }

  const renderContactForm = (
    target: ExpressContactTarget,
    title: string,
    mark: string
  ) => {
    const contact = draft[target] ?? createEmptyPriceContact(target)

    return (
      <View className='query-price-contact'>
        <View className='query-price-contact__head'>
          <View className='query-price-contact__title-row'>
            <View
              className={
                target === 'sender'
                  ? 'query-price-contact__mark query-price-contact__mark--sender'
                  : 'query-price-contact__mark query-price-contact__mark--consignee'
              }
            >
              <Text className='query-price-contact__mark-text'>{mark}</Text>
            </View>
            <Text className='query-price-contact__title'>{title}</Text>
          </View>
          <Text
            className='query-price-link'
            onClick={() => handleContactSelect(target)}
          >
            地址簿
          </Text>
        </View>

        {contact.province && contact.city && contact.county && (
          <Text className='query-price-contact__summary'>
            {getExpressContactFullAddress(contact)}
          </Text>
        )}

        <View className='query-price-grid'>
          <Input
            className='query-price-input query-price-input--grid'
            placeholder='省份'
            value={contact.province}
            onInput={(event) =>
              updateContact(target, { province: event.detail.value })
            }
          />
          <Input
            className='query-price-input query-price-input--grid query-price-input--right'
            placeholder='城市'
            value={contact.city}
            onInput={(event) =>
              updateContact(target, { city: event.detail.value })
            }
          />
        </View>
        <View className='query-price-grid'>
          <Input
            className='query-price-input query-price-input--grid'
            placeholder='区县'
            value={contact.county}
            onInput={(event) =>
              updateContact(target, { county: event.detail.value })
            }
          />
          <Input
            className='query-price-input query-price-input--grid query-price-input--right'
            placeholder='乡镇，选填'
            value={contact.town || ''}
            onInput={(event) =>
              updateContact(target, { town: event.detail.value })
            }
          />
        </View>
        <Input
          className='query-price-input'
          placeholder='街道、门牌号等'
          value={contact.address}
          onInput={(event) =>
            updateContact(target, { address: event.detail.value })
          }
        />
      </View>
    )
  }

  return (
    <ScrollView className='query-price-page' scrollY>
      <View className='query-price-header'>
        <Text className='query-price-header__label'>Price</Text>
        <Text className='query-price-header__title'>价格时效</Text>
        <Text className='query-price-header__summary'>
          按 App 首期主链路重建查询页，复用寄件报价服务，不承载小程序语音、定位和营销分支。
        </Text>
      </View>

      <View className='query-price-section'>
        {renderContactForm('sender', '寄件地址', '寄')}
        <View className='query-price-swap' onClick={handleSwapContacts}>
          <Text className='query-price-swap__text'>互换地址</Text>
        </View>
        {renderContactForm('consignee', '收件地址', '收')}
      </View>

      <View className='query-price-section'>
        <View className='query-price-section__head'>
          <Text className='query-price-section__title'>货物与服务</Text>
          {draft.quoteStaleReason && (
            <Text className='query-price-section__hint'>
              {draft.quoteStaleReason}
            </Text>
          )}
        </View>

        <View className='query-price-field'>
          <Text className='query-price-field__label'>货物名称</Text>
          <Input
            className='query-price-input'
            placeholder='如文件、服饰、配件'
            value={draft.goods.name}
            onInput={(event) => updateGoods({ name: event.detail.value })}
          />
        </View>

        <View className='query-price-grid'>
          <View className='query-price-field query-price-field--grid'>
            <Text className='query-price-field__label'>重量 kg</Text>
            <Input
              className='query-price-input'
              placeholder='1'
              type='digit'
              value={String(draft.goods.weight)}
              onInput={(event) =>
                updateGoods({ weight: parseNumber(event.detail.value, 0) })
              }
            />
          </View>
          <View className='query-price-field query-price-field--grid query-price-field--right'>
            <Text className='query-price-field__label'>件数</Text>
            <Input
              className='query-price-input'
              placeholder='1'
              type='number'
              value={String(draft.goods.count)}
              onInput={(event) =>
                updateGoods({ count: parseNumber(event.detail.value, 1) })
              }
            />
          </View>
        </View>

        <Text className='query-price-option-title'>送货方式</Text>
        <View className='query-price-chip-group'>
          {DELIVERY_OPTIONS.map((option) => (
            <View
              className={
                option.value === draft.service.deliveryMode
                  ? 'query-price-chip query-price-chip--active'
                  : 'query-price-chip'
              }
              key={option.value}
              onClick={() =>
                setDraft((current) =>
                  markExpressQuoteStale(
                    {
                      ...current,
                      service: {
                        ...current.service,
                        deliveryMode: option.value
                      }
                    },
                    '服务方式变化，请重新查询'
                  )
                )
              }
            >
              <Text
                className={
                  option.value === draft.service.deliveryMode
                    ? 'query-price-chip__text query-price-chip__text--active'
                    : 'query-price-chip__text'
                }
              >
                {option.label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {!validation.valid && (
        <View className='query-price-validation'>
          {validation.messages.slice(0, 3).map((message) => (
            <Text className='query-price-validation__message' key={message}>
              {message}
            </Text>
          ))}
        </View>
      )}

      <View className='query-price-submit' onClick={handleQuote}>
        <Text className='query-price-submit__text'>
          {quoteStatus === 'loading' ? '查询中' : '查询价格时效'}
        </Text>
      </View>

      {quotes.length > 0 && (
        <View className='query-price-results'>
          <Text className='query-price-results__title'>可选产品</Text>
          {quotes.map((product) => (
            <View className='query-price-product' key={getProductKey(product)}>
              <View className='query-price-product__main'>
                <Text className='query-price-product__name'>
                  {product.productName || product.omsProductCode || '德邦快递'}
                </Text>
                <Text className='query-price-product__time'>
                  {getProductTimeText(product)}
                </Text>
                {hasBillWeight(product) && (
                  <Text className='query-price-product__weight'>
                    计费重量 {product.billWeight}kg
                  </Text>
                )}
              </View>
              <View className='query-price-product__side'>
                <Text className='query-price-product__price'>
                  {getProductPriceText(product)}
                </Text>
                <View
                  className='query-price-product__button'
                  onClick={() => handleExpress(product)}
                >
                  <Text className='query-price-product__button-text'>
                    去寄件
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {quoteStatus === 'error' && (
        <View className='query-price-empty'>
          <Text className='query-price-empty__title'>暂无报价结果</Text>
          <Text className='query-price-empty__summary'>
            可调整地址、重量或送货方式后重新查询。
          </Text>
        </View>
      )}
    </ScrollView>
  )
}

export default QueryPricePage
