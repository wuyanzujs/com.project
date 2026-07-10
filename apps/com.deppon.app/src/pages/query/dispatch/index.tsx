import { Input, ScrollView, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'

import { useState } from 'react'

import {
  createAddressOnlyExpressContact,
  createExpressDraft,
  expressDraftBridge
} from '../../../services/express'
import { queryService } from '../../../services/query'
import { navigateToAppRoute } from '../../../shared/navigation/appNavigation'
import { APP_ROUTES } from '../../../shared/navigation/routes'

import type {
  DispatchAddress,
  DispatchProductType,
  DispatchRangeGroup,
  DispatchRangeResult
} from '../../../services/query'

import './index.scss'

const DISPATCH_PRODUCT_OPTIONS: Array<{
  label: string
  value: DispatchProductType
}> = [
  {
    label: '快递',
    value: 'EXPRESS'
  },
  {
    label: '零担',
    value: 'LOGISTICS'
  }
]

function getStreetKey(group: DispatchRangeGroup, index: number) {
  return `${group.code}-${index}`
}

function getFullRegion(address: DispatchAddress | null) {
  if (!address) {
    return ''
  }

  return [address.province, address.city, address.county]
    .filter(Boolean)
    .join('-')
}

const QueryDispatchPage = () => {
  const [productType, setProductType] =
    useState<DispatchProductType>('EXPRESS')
  const [rawText, setRawText] = useState('')
  const [province, setProvince] = useState('')
  const [city, setCity] = useState('')
  const [county, setCounty] = useState('')
  const [address, setAddress] = useState('')
  const [result, setResult] = useState<DispatchRangeResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const createQuery = () => ({
    rawText,
    province,
    city,
    county,
    address
  })

  const applyResolvedAddress = (nextAddress: DispatchAddress) => {
    setProvince(nextAddress.province)
    setCity(nextAddress.city)
    setCounty(nextAddress.county)
    setAddress([nextAddress.town, nextAddress.address].filter(Boolean).join(''))
  }

  const handleAnalyze = async () => {
    setErrorMessage('')

    const response = await queryService.resolveDispatchAddress(createQuery())

    if (!response.status || !response.result) {
      setErrorMessage(response.message || '地址识别失败')
      Taro.showToast({
        title: response.message || '地址识别失败',
        icon: 'none'
      })
      return
    }

    applyResolvedAddress(response.result)
    Taro.showToast({
      title: '已识别地址',
      icon: 'none'
    })
  }

  const handleQuery = async () => {
    if (loading) {
      return
    }

    setLoading(true)
    setErrorMessage('')
    setResult(null)

    try {
      const response = await queryService.queryDispatchRange(
        productType,
        createQuery()
      )

      if (!response.status || !response.result) {
        setErrorMessage(response.message || '暂未查询到收派范围')
        return
      }

      applyResolvedAddress(response.result.address)
      setResult(response.result)
    } finally {
      setLoading(false)
    }
  }

  const handleGoExpress = () => {
    if (result?.address) {
      expressDraftBridge.carryFromDispatchQuery({
        ...createExpressDraft(),
        consignee: createAddressOnlyExpressContact(result.address)
      })
    }

    navigateToAppRoute(APP_ROUTES.express)
  }

  return (
    <ScrollView className='query-dispatch-page' scrollY>
      <View className='query-dispatch-header'>
        <Text className='query-dispatch-header__label'>Coverage</Text>
        <Text className='query-dispatch-header__title'>收派范围</Text>
        <Text className='query-dispatch-header__summary'>
          App 首期支持手填地址和智能识别查询，不接小程序定位和地图组件。
        </Text>
      </View>

      <View className='query-dispatch-tabs'>
        {DISPATCH_PRODUCT_OPTIONS.map((option) => (
          <View
            className={
              option.value === productType
                ? 'query-dispatch-tab query-dispatch-tab--active'
                : 'query-dispatch-tab'
            }
            key={option.value}
            onClick={() => setProductType(option.value)}
          >
            <Text
              className={
                option.value === productType
                  ? 'query-dispatch-tab__text query-dispatch-tab__text--active'
                  : 'query-dispatch-tab__text'
              }
            >
              {option.label}
            </Text>
          </View>
        ))}
      </View>

      <View className='query-dispatch-section'>
        <View className='query-dispatch-section__head'>
          <Text className='query-dispatch-section__title'>查询地址</Text>
          <View className='query-dispatch-link' onClick={handleAnalyze}>
            <Text className='query-dispatch-link__text'>智能识别</Text>
          </View>
        </View>

        <Input
          className='query-dispatch-input'
          placeholder='粘贴完整地址，例如：上海市青浦区徐泾镇明珠路'
          value={rawText}
          onInput={(event) => setRawText(event.detail.value)}
        />

        <View className='query-dispatch-grid'>
          <Input
            className='query-dispatch-input query-dispatch-input--grid'
            placeholder='省'
            value={province}
            onInput={(event) => setProvince(event.detail.value)}
          />
          <Input
            className='query-dispatch-input query-dispatch-input--grid query-dispatch-input--right'
            placeholder='市'
            value={city}
            onInput={(event) => setCity(event.detail.value)}
          />
        </View>

        <View className='query-dispatch-grid'>
          <Input
            className='query-dispatch-input query-dispatch-input--grid'
            placeholder='区/县'
            value={county}
            onInput={(event) => setCounty(event.detail.value)}
          />
          <Input
            className='query-dispatch-input query-dispatch-input--grid query-dispatch-input--right'
            placeholder='乡镇/详细地址'
            value={address}
            onInput={(event) => setAddress(event.detail.value)}
          />
        </View>
      </View>

      <View className='query-dispatch-submit' onClick={handleQuery}>
        <Text className='query-dispatch-submit__text'>
          {loading ? '查询中...' : '查询收派范围'}
        </Text>
      </View>

      {errorMessage && (
        <View className='query-dispatch-message'>
          <Text className='query-dispatch-message__text'>{errorMessage}</Text>
        </View>
      )}

      {result && (
        <View className='query-dispatch-results'>
          <View className='query-dispatch-result-head'>
            <View>
              <Text className='query-dispatch-result-head__title'>
                {getFullRegion(result.address)}
              </Text>
              <Text className='query-dispatch-result-head__summary'>
                {result.matchedStreet
                  ? `识别乡镇：${result.matchedStreet}`
                  : '未识别到具体乡镇'}
              </Text>
            </View>
            <Text className='query-dispatch-result-head__tag'>
              {result.productType === 'EXPRESS' ? '快递' : '零担'}
            </Text>
          </View>

          <View className='query-dispatch-hint'>
            <Text className='query-dispatch-hint__text'>{result.hint}</Text>
          </View>

          {result.groups.map((group) => (
            <View className='query-dispatch-group' key={group.code}>
              <Text className='query-dispatch-group__title'>{group.name}</Text>
              <View className='query-dispatch-streets'>
                {group.streetList.map((street, index) => (
                  <View
                    className={
                      street.streetName === result.matchedStreet
                        ? 'query-dispatch-street query-dispatch-street--active'
                        : 'query-dispatch-street'
                    }
                    key={getStreetKey(group, index)}
                  >
                    <Text
                      className={
                        street.streetName === result.matchedStreet
                          ? 'query-dispatch-street__text query-dispatch-street__text--active'
                          : 'query-dispatch-street__text'
                      }
                    >
                      {street.streetName}
                    </Text>
                    {street.townName && (
                      <Text className='query-dispatch-street__hint'>
                        {street.townName}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            </View>
          ))}

          {result.canCreateExpress && (
            <View className='query-dispatch-express' onClick={handleGoExpress}>
              <Text className='query-dispatch-express__text'>去寄件</Text>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  )
}

export default QueryDispatchPage
