import { Input, ScrollView, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'

import { useState } from 'react'

import { queryService } from '../../../services/query'
import { navigateToAppRoute } from '../../../shared/navigation/appNavigation'
import { APP_ROUTES } from '../../../shared/navigation/routes'
import { createAppRouteUrl } from '../../../shared/navigation/routeUrl'
import { getNativeCapabilityErrorMessage } from '../../../shared/platform/capabilities'
import { openMapLocation } from '../../../shared/platform/map'
import { PhoneNumberError, dialPhone } from '../../../shared/platform/phone'
import { createAppWebUrl } from '../../../shared/webview/appWeb'

import type {
  DispatchAddress,
  StationItem,
  StationQueryResult,
  StationQueryType,
  StationSubType
} from '../../../services/query'

import './index.scss'

const STATION_TYPE_OPTIONS: Array<{
  label: string
  value: StationQueryType
}> = [
  {
    label: '全部',
    value: 'ALL'
  },
  {
    label: '发货',
    value: 'LEAVE'
  },
  {
    label: '提货',
    value: 'PICKUP'
  },
  {
    label: '送货',
    value: 'DELIVERY'
  }
]

const STATION_SUB_TYPE_OPTIONS: Array<{
  label: string
  value: StationSubType
}> = [
  {
    label: '快递网点',
    value: 'EXPRESS'
  },
  {
    label: '零担网点',
    value: 'LOGISTICS'
  }
]

function getStationKey(item: StationItem) {
  return `${item.source}-${item.id}-${item.code}`
}

function getFullRegion(address: DispatchAddress | null) {
  if (!address) {
    return ''
  }

  return [address.province, address.city, address.county]
    .filter(Boolean)
    .join('-')
}

const QueryStationsPage = () => {
  const [stationType, setStationType] = useState<StationQueryType>('ALL')
  const [subType, setSubType] = useState<StationSubType>('EXPRESS')
  const [rawText, setRawText] = useState('')
  const [province, setProvince] = useState('')
  const [city, setCity] = useState('')
  const [county, setCounty] = useState('')
  const [address, setAddress] = useState('')
  const [result, setResult] = useState<StationQueryResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const createQuery = () => ({
    rawText,
    province,
    city,
    county,
    address,
    type: stationType,
    subType
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
      const response = await queryService.queryStations(createQuery())

      if (!response.status || !response.result) {
        setErrorMessage(response.message || '暂未查询到网点')
        return
      }

      applyResolvedAddress(response.result.address)
      setResult(response.result)
    } finally {
      setLoading(false)
    }
  }

  const handleDial = async (item: StationItem) => {
    try {
      await dialPhone(queryService.getStationPrimaryPhone(item.phone))
    } catch (error) {
      Taro.showToast({
        title:
          error instanceof PhoneNumberError
            ? error.message
            : getNativeCapabilityErrorMessage(error),
        icon: 'none'
      })
    }
  }

  const handleDetail = (item: StationItem) => {
    const route = queryService.createStationDetailRoute(item)

    if (!route) {
      Taro.showToast({
        title: '缺少网点编码，暂无法查看详情',
        icon: 'none'
      })
      return
    }

    navigateToAppRoute(route)
  }

  const handleGoExpress = () => {
    navigateToAppRoute(
      createAppRouteUrl(APP_ROUTES.express, {
        source: 'QUERY_STATION_EMPTY'
      })
    )
  }

  const handleFeedback = (item?: StationItem) => {
    navigateToAppRoute(
      createAppWebUrl({
        source: 'STATION_FEEDBACK',
        uri: queryService.createStationFeedbackWebUri(item, result?.address),
        title: '网点反馈',
        auth: false
      })
    )
  }

  const handleOpenMap = async (item: StationItem) => {
    try {
      await openMapLocation({
        source: 'QUERY_STATION',
        location: {
          latitude: Number(item.lat),
          longitude: Number(item.lng),
          name: item.name,
          address: item.address,
          coordinateSystem: item.source === 'Address' ? 'bd09' : 'unknown'
        }
      })
    } catch (error) {
      Taro.showToast({
        title: getNativeCapabilityErrorMessage(error),
        icon: 'none'
      })
    }
  }

  return (
    <ScrollView className='query-stations-page' scrollY>
      <View className='query-stations-filter'>
        <Text className='query-stations-filter__label'>网点类型</Text>
        <View className='query-stations-chip-group'>
          {STATION_TYPE_OPTIONS.map((option) => (
            <View
              className={
                option.value === stationType
                  ? 'query-stations-chip query-stations-chip--active'
                  : 'query-stations-chip'
              }
              key={option.value}
              onClick={() => setStationType(option.value)}
            >
              <Text
                className={
                  option.value === stationType
                    ? 'query-stations-chip__text query-stations-chip__text--active'
                    : 'query-stations-chip__text'
                }
              >
                {option.label}
              </Text>
            </View>
          ))}
        </View>

        <Text className='query-stations-filter__label'>业务类型</Text>
        <View className='query-stations-chip-group'>
          {STATION_SUB_TYPE_OPTIONS.map((option) => (
            <View
              className={
                option.value === subType
                  ? 'query-stations-chip query-stations-chip--active'
                  : 'query-stations-chip'
              }
              key={option.value}
              onClick={() => setSubType(option.value)}
            >
              <Text
                className={
                  option.value === subType
                    ? 'query-stations-chip__text query-stations-chip__text--active'
                    : 'query-stations-chip__text'
                }
              >
                {option.label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View className='query-stations-section'>
        <View className='query-stations-section__head'>
          <Text className='query-stations-section__title'>查询地址</Text>
          <View className='query-stations-link' onClick={handleAnalyze}>
            <Text className='query-stations-link__text'>智能识别</Text>
          </View>
        </View>

        <Input
          className='query-stations-input'
          placeholder='粘贴完整地址，或下方手动填写'
          value={rawText}
          onInput={(event) => setRawText(event.detail.value)}
        />

        <View className='query-stations-grid'>
          <Input
            className='query-stations-input query-stations-input--grid'
            placeholder='省'
            value={province}
            onInput={(event) => setProvince(event.detail.value)}
          />
          <Input
            className='query-stations-input query-stations-input--grid query-stations-input--right'
            placeholder='市'
            value={city}
            onInput={(event) => setCity(event.detail.value)}
          />
        </View>

        <View className='query-stations-grid'>
          <Input
            className='query-stations-input query-stations-input--grid'
            placeholder='区/县'
            value={county}
            onInput={(event) => setCounty(event.detail.value)}
          />
          <Input
            className='query-stations-input query-stations-input--grid query-stations-input--right'
            placeholder='详细地址，可选'
            value={address}
            onInput={(event) => setAddress(event.detail.value)}
          />
        </View>
      </View>

      <View className='query-stations-submit' onClick={handleQuery}>
        <Text className='query-stations-submit__text'>
          {loading ? '查询中...' : '查询网点'}
        </Text>
      </View>

      {errorMessage && (
        <View className='query-stations-message'>
          <Text className='query-stations-message__text'>{errorMessage}</Text>
        </View>
      )}

      {result && (
        <View className='query-stations-results'>
          <View className='query-stations-result-head'>
            <View>
              <Text className='query-stations-result-head__title'>
                {getFullRegion(result.address)}
              </Text>
              <Text className='query-stations-result-head__summary'>
                共 {result.totalRows} 个网点
              </Text>
            </View>
            <Text className='query-stations-result-head__tag'>
              {result.source === 'Address' ? '地址匹配' : '区县网点'}
            </Text>
          </View>

          {result.list.length ? (
            result.list.map((item) => (
              <View className='query-stations-card' key={getStationKey(item)}>
                <Text className='query-stations-card__title'>{item.name}</Text>
                <Text className='query-stations-card__address'>
                  {item.address || '暂无地址'}
                </Text>
                {item.distance && (
                  <Text className='query-stations-card__meta'>
                    距离 {item.distance}
                  </Text>
                )}
                {item.phone && (
                  <Text className='query-stations-card__meta'>
                    电话 {item.phone}
                  </Text>
                )}
                {item.business && (
                  <Text className='query-stations-card__meta'>
                    业务 {item.business}
                  </Text>
                )}
                <Text className='query-stations-card__meta'>
                  营业时间 {item.time}
                </Text>

                <View className='query-stations-card__actions'>
                  <View
                    className='query-stations-card__outline-button'
                    onClick={() => handleFeedback(item)}
                  >
                    <Text className='query-stations-card__outline-button-text'>
                      反馈
                    </Text>
                  </View>
                  <View
                    className='query-stations-card__outline-button'
                    onClick={() => handleOpenMap(item)}
                  >
                    <Text className='query-stations-card__outline-button-text'>
                      导航
                    </Text>
                  </View>
                  <View
                    className='query-stations-card__primary-button'
                    onClick={() => handleDial(item)}
                  >
                    <Text className='query-stations-card__primary-button-text'>
                      拨打
                    </Text>
                  </View>
                  <View
                    className='query-stations-card__primary-button'
                    onClick={() => handleDetail(item)}
                  >
                    <Text className='query-stations-card__primary-button-text'>
                      详情
                    </Text>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <View className='query-stations-empty'>
              <Text className='query-stations-empty__title'>暂无网点</Text>
              <Text className='query-stations-empty__summary'>
                可先预约寄件，等待快递员联系。
              </Text>
              <View
                className='query-stations-empty__button'
                onClick={handleGoExpress}
              >
                <Text className='query-stations-empty__button-text'>去寄件</Text>
              </View>
              <View
                className='query-stations-empty__feedback'
                onClick={() => handleFeedback()}
              >
                <Text className='query-stations-empty__feedback-text'>
                  找不到网点？
                </Text>
              </View>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  )
}

export default QueryStationsPage
