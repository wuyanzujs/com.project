import { Input, ScrollView, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'

import { useCallback, useMemo } from 'react'

import { goodsQueryService } from '@/services/goods'
import type { GoodsCheckStatus, GoodsSuggestionView } from '@/services/goods'
import { AppPressable } from '@/shared/components'

import { useGoodsQuery } from './hooks/useGoodsQuery'

import './index.scss'
import './content.scss'

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

  return `${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const QueryGoodsPage = () => {
  const hotGoods = useMemo(() => goodsQueryService.getHotGoods(), [])
  const showToast = useCallback((title: string) => {
    Taro.showToast({
      title,
      icon: 'none'
    })
  }, [])

  const goods = useGoodsQuery(showToast)
  const canCarryToExpress = !!goods.result?.canExpress

  const handleSuggestionSelect = (item: GoodsSuggestionView) => {
    goods.setKeyword(item.name)
    goods.checkGoodsName(item.name)
  }

  const handleHistorySelect = (item: { goodsName: string }) => {
    goods.setKeyword(item.goodsName)
    goods.checkGoodsName(item.goodsName)
  }

  return (
    <ScrollView className='query-goods-page' scrollY>
      <View className='query-goods-section'>
        <View className='query-goods-section__head'>
          <Text className='query-goods-section__title'>品名</Text>
          <Text className='query-goods-section__hint'>{goods.checking ? '校验中' : goods.searching ? '搜索中' : '必填'}</Text>
        </View>
        <Input
          className='query-goods-input'
          placeholder='如文件、服饰、电子配件'
          value={goods.keyword}
          onInput={event => {
            goods.setKeyword(event.detail.value)
            goods.setResult(null)
            goods.setMessage('')
          }}
        />
        <View className='query-goods-actions'>
          <AppPressable flex className='query-goods-outline-button' onPress={goods.handleSearch}>
            <Text className='query-goods-outline-button__text'>{goods.searching ? '搜索中' : '搜索推荐'}</Text>
          </AppPressable>
          <AppPressable flex className='query-goods-primary-button' onPress={() => goods.checkGoodsName(goods.keyword)}>
            <Text className='query-goods-primary-button__text'>{goods.checking ? '校验中' : '校验货物'}</Text>
          </AppPressable>
        </View>
        {!!goods.message && <Text className='query-goods-message__text'>{goods.message}</Text>}
      </View>

      {goods.suggestions.length > 0 && (
        <View className='query-goods-section'>
          <Text className='query-goods-section__title'>推荐品名</Text>
          {goods.suggestions.map((item, index) => (
            <AppPressable className='query-goods-suggestion' key={getSuggestionKey(item, index)} onPress={() => handleSuggestionSelect(item)}>
              <View>
                <Text className='query-goods-suggestion__name'>{item.name}</Text>
                <Text className='query-goods-suggestion__category'>{item.category}</Text>
              </View>
              <Text className='query-goods-suggestion__action'>校验</Text>
            </AppPressable>
          ))}
        </View>
      )}

      <View className='query-goods-section'>
        <Text className='query-goods-section__title'>热门品名</Text>
        <View className='query-goods-chip-group'>
          {hotGoods.map((item, index) => (
            <AppPressable className='query-goods-chip' key={getSuggestionKey(item, index)} onPress={() => handleSuggestionSelect(item)}>
              <Text className='query-goods-chip__text'>{item.name}</Text>
            </AppPressable>
          ))}
        </View>
      </View>

      {goods.history.length > 0 && (
        <View className='query-goods-section'>
          <View className='query-goods-section__head'>
            <Text className='query-goods-section__title'>最近查询</Text>
            <AppPressable contentElement='text' className='query-goods-link' onPress={goods.handleClearHistory}>
              清空
            </AppPressable>
          </View>
          {goods.history.map(item => (
            <AppPressable className='query-goods-history' key={`${item.goodsName}-${item.checkedAt}`} onPress={() => handleHistorySelect(item)}>
              <View className='query-goods-history__main'>
                <Text className='query-goods-history__name'>{item.goodsName}</Text>
                <Text className='query-goods-history__summary'>
                  {item.title} · {formatHistoryTime(item.checkedAt)}
                </Text>
              </View>
              <Text className={getStatusClassName(item.status)}>{getStatusText(item.status)}</Text>
            </AppPressable>
          ))}
        </View>
      )}

      {goods.result && (
        <View className={getResultClassName(goods.result.status)}>
          <View className='query-goods-result__head'>
            <View>
              <Text className='query-goods-result__name'>{goods.result.goodsName}</Text>
              <Text className='query-goods-result__title'>{goods.result.title}</Text>
            </View>
            <Text className={getStatusClassName(goods.result.status)}>{getStatusText(goods.result.status)}</Text>
          </View>
          <Text className='query-goods-result__message'>{goods.result.message}</Text>

          {goods.result.labels.length > 0 && (
            <View className='query-goods-labels'>
              {goods.result.labels.map((label, index) => (
                <View className='query-goods-label' key={`${label.goodsRemarkCode}-${index}`}>
                  <Text className='query-goods-label__text'>{label.tip || label.goodsRemarkCode || '寄递提示'}</Text>
                </View>
              ))}
            </View>
          )}

          <AppPressable
            className={canCarryToExpress ? 'query-goods-express' : 'query-goods-express query-goods-express--disabled'}
            onPress={goods.handleCarryToExpress}
          >
            <Text className='query-goods-express__text'>带入寄件</Text>
          </AppPressable>
        </View>
      )}
    </ScrollView>
  )
}

export default QueryGoodsPage
