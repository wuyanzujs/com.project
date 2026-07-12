import { ScrollView } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'

import { useMemo, useState } from 'react'

import { QueryPriceActions } from './components/QueryPriceActions'
import { QueryPriceContactsSection } from './components/QueryPriceContactsSection'
import { QueryPriceGoodsSection } from './components/QueryPriceGoodsSection'
import { QueryPriceResultsState } from './components/QueryPriceResultsState'
import { contactSelection } from '../../../services/contact'
import {
  createExpressDraft,
  expressDraftBridge,
  expressService,
  mapContactToExpressContact,
  markExpressQuoteStale,
  setExpressContact,
  swapExpressContacts,
  validateExpressPriceTimeDraft
} from '../../../services/express'
import { navigateToAppRoute } from '../../../shared/navigation/appNavigation'
import { APP_ROUTES } from '../../../shared/navigation/routes'
import { createAppRouteUrl } from '../../../shared/navigation/routeUrl'

import type {
  ExpressContact,
  ExpressContactTarget,
  ExpressDeliveryMode,
  ExpressDraft,
  ExpressProductQuote
} from '../../../services/express'

import './index.scss'

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
    const url = createAppRouteUrl(APP_ROUTES.contactList, params)

    navigateToAppRoute(url, {
      login: true
    })
  }

  const handleSwapContacts = () => {
    setDraft((current) => swapExpressContacts(current))
  }

  const handleDeliveryChange = (deliveryMode: ExpressDeliveryMode) => {
    setDraft(current =>
      markExpressQuoteStale(
        {
          ...current,
          service: {
            ...current.service,
            deliveryMode
          }
        },
        '服务方式变化，请重新查询'
      )
    )
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

    navigateToAppRoute(
      createAppRouteUrl(APP_ROUTES.express, {
        source: 'QUERY_PRICE_PRODUCT'
      })
    )
  }

  return (
    <ScrollView className='query-price-page' scrollY>
      <QueryPriceContactsSection
        consignee={draft.consignee ?? createEmptyPriceContact('consignee')}
        sender={draft.sender ?? createEmptyPriceContact('sender')}
        onContactChange={updateContact}
        onContactSelect={handleContactSelect}
        onSwap={handleSwapContacts}
      />

      <QueryPriceGoodsSection
        draft={draft}
        onDeliveryChange={handleDeliveryChange}
        onGoodsChange={updateGoods}
      />

      <QueryPriceActions
        loading={quoteStatus === 'loading'}
        messages={validation.valid ? [] : validation.messages.slice(0, 3)}
        onSubmit={handleQuote}
      />

      <QueryPriceResultsState
        quotes={quotes}
        status={quoteStatus}
        onExpress={handleExpress}
      />
    </ScrollView>
  )
}

export default QueryPricePage
