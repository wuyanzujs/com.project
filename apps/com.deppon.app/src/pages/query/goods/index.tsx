import { Input, ScrollView, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'

import { useMemo, useState } from 'react'

import {
  createExpressDraft,
  expressDraftBridge,
  expressDraftStorage,
  markExpressQuoteStale
} from '../../../services/express'
import { goodsQueryService } from '../../../services/goods'
import { navigateToAppRoute } from '../../../shared/navigation/appNavigation'
import { APP_ROUTES } from '../../../shared/navigation/routes'
import { createAppRouteUrl } from '../../../shared/navigation/routeUrl'

import type {
  GoodsCheckResult,
  GoodsCheckStatus,
  GoodsHistoryItem,
  GoodsSuggestionView
} from '../../../services/goods'

import './index.scss'

function getSuggestionKey(item: GoodsSuggestionView, index: number) {
  return `${item.name}-${item.firstCategory}-${item.secondCategory}-${index}`
}

function getStatusText(status: GoodsCheckStatus) {
  switch (status) {
    case 'forbid':
      return '不可寄'
    case 'unknown':
      return '需确认'
    case 'risk':
      return '有提示'
    default:
      return '可寄'
  }
}

function getStatusClassName(status: GoodsCheckStatus) {
  return `query-goods-status query-goods-status--${status}`
}

function getResultClassName(status: GoodsCheckStatus) {
  return `query-goods-result query-goods-result--${status}`
}

function formatHistoryTime(value: number) {
  const date = new Date(value)

  if (!Number.isFinite(date.getTime())) {
    return ''
  }

  const pad = (item: number) => String(item).padStart(2, '0')

  return `${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`
}

const QueryGoodsPage = () => {
  const hotGoods = useMemo(() => goodsQueryService.getHotGoods(), [])
  const [keyword, setKeyword] = useState('')
  const [suggestions, setSuggestions] = useState<GoodsSuggestionView[]>([])
  const [history, setHistory] = useState<GoodsHistoryItem[]>(() =>
    goodsQueryService.getHistory()
  )
  const [result, setResult] = useState<GoodsCheckResult | null>(null)
  const [message, setMessage] = useState('')
  const [searching, setSearching] = useState(false)
  const [checking, setChecking] = useState(false)
  const canCarryToExpress = !!result?.canExpress

  const showToast = (title: string) => {
    Taro.showToast({
      title,
      icon: 'none'
    })
  }

  const checkGoodsName = async (goodsName: string) => {
    const nextName = goodsName.trim()

    if (!nextName) {
      showToast('请输入货物名称')
      return
    }

    if (checking) {
      return
    }

    setChecking(true)
    setMessage('')

    try {
      const response = await goodsQueryService.checkGoods({
        goodsName: nextName
      })

      if (!response.status || !response.result) {
        const nextMessage = response.message || '暂未完成货物校验'

        setResult(null)
        setMessage(nextMessage)
        showToast(nextMessage)
        return
      }

      setKeyword(response.result.goodsName)
      setResult(response.result)
      setSuggestions([])
      setHistory(goodsQueryService.getHistory())
    } finally {
      setChecking(false)
    }
  }

  const handleSearch = async () => {
    const nextKeyword = keyword.trim()

    if (!nextKeyword) {
      showToast('请输入货物名称关键词')
      return
    }

    if (searching) {
      return
    }

    setSearching(true)
    setMessage('')
    setResult(null)

    try {
      const response = await goodsQueryService.searchGoods(nextKeyword)

      if (!response.status || !response.result) {
        const nextMessage = response.message || '暂未获取到品名推荐'

        setSuggestions([])
        setMessage(nextMessage)
        showToast(nextMessage)
        return
      }

      setSuggestions(response.result)
      setMessage(response.result.length ? '' : '未找到匹配品名，可直接校验')
    } finally {
      setSearching(false)
    }
  }

  const handleSuggestionSelect = (item: GoodsSuggestionView) => {
    setKeyword(item.name)
    checkGoodsName(item.name)
  }

  const handleHistorySelect = (item: GoodsHistoryItem) => {
    setKeyword(item.goodsName)
    checkGoodsName(item.goodsName)
  }

  const handleClearHistory = () => {
    goodsQueryService.clearHistory()
    setHistory([])
  }

  const handleCarryToExpress = () => {
    if (!result) {
      showToast('请先校验货物名称')
      return
    }

    if (!result.canExpress) {
      showToast('该货物暂不支持寄递')
      return
    }

    const draft = expressDraftStorage.restore() ?? createExpressDraft()
    const nextDraft = markExpressQuoteStale(
      {
        ...draft,
        goods: {
          ...draft.goods,
          name: result.goodsName
        }
      },
      '货物名称来自违禁品查询，请重新获取价格'
    )

    expressDraftBridge.carryFromGoodsQuery(nextDraft)
    navigateToAppRoute(
      createAppRouteUrl(APP_ROUTES.express, {
        source: 'GOODS_QUERY'
      })
    )
  }

  return (
    <ScrollView className='query-goods-page' scrollY>
      <View className='query-goods-section'>
        <View className='query-goods-section__head'>
          <Text className='query-goods-section__title'>品名</Text>
          <Text className='query-goods-section__hint'>
            {checking ? '校验中' : searching ? '搜索中' : '必填'}
          </Text>
        </View>
        <Input
          className='query-goods-input'
          placeholder='如文件、服饰、电子配件'
          value={keyword}
          onInput={(event) => {
            setKeyword(event.detail.value)
            setResult(null)
            setMessage('')
          }}
        />
        <View className='query-goods-actions'>
          <View className='query-goods-outline-button' onClick={handleSearch}>
            <Text className='query-goods-outline-button__text'>
              {searching ? '搜索中' : '搜索推荐'}
            </Text>
          </View>
          <View
            className='query-goods-primary-button'
            onClick={() => checkGoodsName(keyword)}
          >
            <Text className='query-goods-primary-button__text'>
              {checking ? '校验中' : '校验货物'}
            </Text>
          </View>
        </View>
        {!!message && (
          <Text className='query-goods-message__text'>{message}</Text>
        )}
      </View>

      {suggestions.length > 0 && (
        <View className='query-goods-section'>
          <Text className='query-goods-section__title'>推荐品名</Text>
          {suggestions.map((item, index) => (
            <View
              className='query-goods-suggestion'
              key={getSuggestionKey(item, index)}
              onClick={() => handleSuggestionSelect(item)}
            >
              <View>
                <Text className='query-goods-suggestion__name'>
                  {item.name}
                </Text>
                <Text className='query-goods-suggestion__category'>
                  {item.category}
                </Text>
              </View>
              <Text className='query-goods-suggestion__action'>校验</Text>
            </View>
          ))}
        </View>
      )}

      <View className='query-goods-section'>
        <Text className='query-goods-section__title'>热门品名</Text>
        <View className='query-goods-chip-group'>
          {hotGoods.map((item, index) => (
            <View
              className='query-goods-chip'
              key={getSuggestionKey(item, index)}
              onClick={() => handleSuggestionSelect(item)}
            >
              <Text className='query-goods-chip__text'>{item.name}</Text>
            </View>
          ))}
        </View>
      </View>

      {history.length > 0 && (
        <View className='query-goods-section'>
          <View className='query-goods-section__head'>
            <Text className='query-goods-section__title'>最近查询</Text>
            <Text className='query-goods-link' onClick={handleClearHistory}>
              清空
            </Text>
          </View>
          {history.map((item) => (
            <View
              className='query-goods-history'
              key={`${item.goodsName}-${item.checkedAt}`}
              onClick={() => handleHistorySelect(item)}
            >
              <View className='query-goods-history__main'>
                <Text className='query-goods-history__name'>
                  {item.goodsName}
                </Text>
                <Text className='query-goods-history__summary'>
                  {item.title} · {formatHistoryTime(item.checkedAt)}
                </Text>
              </View>
              <Text className={getStatusClassName(item.status)}>
                {getStatusText(item.status)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {result && (
        <View className={getResultClassName(result.status)}>
          <View className='query-goods-result__head'>
            <View>
              <Text className='query-goods-result__name'>
                {result.goodsName}
              </Text>
              <Text className='query-goods-result__title'>
                {result.title}
              </Text>
            </View>
            <Text className={getStatusClassName(result.status)}>
              {getStatusText(result.status)}
            </Text>
          </View>
          <Text className='query-goods-result__message'>{result.message}</Text>

          {result.labels.length > 0 && (
            <View className='query-goods-labels'>
              {result.labels.map((label, index) => (
                <View
                  className='query-goods-label'
                  key={`${label.goodsRemarkCode}-${index}`}
                >
                  <Text className='query-goods-label__text'>
                    {label.tip || label.goodsRemarkCode || '寄递提示'}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <View
            className={
              canCarryToExpress
                ? 'query-goods-express'
                : 'query-goods-express query-goods-express--disabled'
            }
            onClick={handleCarryToExpress}
          >
            <Text className='query-goods-express__text'>带入寄件</Text>
          </View>
        </View>
      )}
    </ScrollView>
  )
}

export default QueryGoodsPage
