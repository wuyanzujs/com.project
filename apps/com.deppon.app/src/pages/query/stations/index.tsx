import { Input, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { queryService, stationSelection } from '@/services/query'
import type { DispatchAddress, StationItem, StationQueryOptions, StationQueryResult, StationQueryType, StationSubType } from '@/services/query'
import { AppPressable } from '@/shared/components'
import { navigateToAppRoute } from '@/shared/navigation/appNavigation'
import { APP_ROUTES } from '@/shared/navigation/routes'
import { createAppRouteUrl } from '@/shared/navigation/routeUrl'
import { getNativeCapabilityErrorMessage } from '@/shared/platform/capabilities'
import { openMapLocation } from '@/shared/platform/map'
import { PhoneNumberError, dialPhone } from '@/shared/platform/phone'
import { createAppWebUrl } from '@/shared/webview/appWeb'

import { StationQueryFilters } from './components/StationQueryFilters'
import { StationQueryResults } from './components/StationQueryResults'

import './index.scss'
import './content.scss'
import './selection.scss'

const QueryStationsPage = () => {
  const router = useRouter()
  const routeParams = router.params
  const selectionParams = useMemo(() => stationSelection.parseParams(routeParams), [routeParams])
  const selectionMode = Boolean(selectionParams)
  const senderSelection = selectionParams?.source === 'EXPRESS_SERVICE_POINT'
  const [stationType, setStationType] = useState<StationQueryType>(selectionParams ? (stationSelection.createQuery(selectionParams).type ?? 'PICKUP') : 'ALL')
  const [subType, setSubType] = useState<StationSubType>('EXPRESS')
  const [rawText, setRawText] = useState('')
  const [province, setProvince] = useState(selectionParams?.province ?? '')
  const [city, setCity] = useState(selectionParams?.city ?? '')
  const [county, setCounty] = useState(selectionParams?.county ?? '')
  const [address, setAddress] = useState(selectionParams?.address ?? '')
  const [result, setResult] = useState<StationQueryResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const initialSelectionQueryKey = useRef('')

  // 「更多网点」进入时标题为「德邦快递服务点」，网点查询主入口仍用页面配置标题。
  useEffect(() => {
    if (!senderSelection) {
      return
    }

    const pending = Taro.setNavigationBarTitle({ title: '德邦快递服务点' })

    if (pending && typeof pending.catch === 'function') {
      pending.catch(() => undefined)
    }
  }, [senderSelection])

  const createQuery = () => ({
    rawText,
    province,
    city,
    county,
    address,
    type: stationType,
    subType
  })

  const applyResolvedAddress = useCallback((nextAddress: DispatchAddress) => {
    setProvince(nextAddress.province)
    setCity(nextAddress.city)
    setCounty(nextAddress.county)
    setAddress([nextAddress.town, nextAddress.address].filter(Boolean).join(''))
  }, [])

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

  const runQuery = useCallback(
    async (query: StationQueryOptions) => {
      setLoading(true)
      setErrorMessage('')
      setResult(null)

      try {
        const response = await queryService.queryStations(query)

        if (!response.status || !response.result) {
          setErrorMessage(response.message || '暂未查询到网点')
          return
        }

        applyResolvedAddress(response.result.address)
        setResult(selectionParams ? stationSelection.filterResult(selectionParams.source, response.result) : response.result)
      } finally {
        setLoading(false)
      }
    },
    [applyResolvedAddress, selectionParams]
  )

  const handleQuery = () => {
    if (!loading) {
      runQuery(senderSelection && selectionParams ? stationSelection.createQuery(selectionParams) : createQuery())
    }
  }

  useEffect(() => {
    if (!selectionParams) {
      return
    }

    const queryKey = [selectionParams.province, selectionParams.city, selectionParams.county, selectionParams.address].join('|')

    if (initialSelectionQueryKey.current === queryKey) {
      return
    }

    initialSelectionQueryKey.current = queryKey
    runQuery(stationSelection.createQuery(selectionParams))
  }, [runQuery, selectionParams])

  const handleDial = async (item: StationItem) => {
    try {
      await dialPhone(queryService.getStationPrimaryPhone(item.phone))
    } catch (error) {
      Taro.showToast({
        title: error instanceof PhoneNumberError ? error.message : getNativeCapabilityErrorMessage(error),
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

  const handleSelectStation = (item: StationItem | null) => {
    if (!selectionParams) {
      return
    }

    const station = senderSelection && !item ? (result?.list[0] ?? null) : item

    stationSelection.select(selectionParams.source, station, selectionParams)
    Taro.navigateBack()
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
      {!selectionMode && <StationQueryFilters stationType={stationType} subType={subType} onStationTypeChange={setStationType} onSubTypeChange={setSubType} />}

      {!senderSelection && (
        <View className='query-stations-section'>
          {selectionParams && (
            <View className='query-stations-selection'>
              <View className='query-stations-selection__content'>
                <Text className='query-stations-selection__title'>{senderSelection ? '自送服务点' : '收件自提服务点'}</Text>
                <Text className='query-stations-selection__summary'>
                  {senderSelection ? '寄件地址 20 公里内支持自送的服务点' : '20 公里内支持自提的快递网点'}
                </Text>
              </View>
              <AppPressable className='query-stations-selection__nearest' onPress={() => handleSelectStation(null)}>
                <Text className='query-stations-selection__nearest-text'>使用最近服务点</Text>
              </AppPressable>
            </View>
          )}
          <View className='query-stations-section__head'>
            <Text className='query-stations-section__title'>{senderSelection ? '寄件地址' : selectionMode ? '收件地址' : '查询地址'}</Text>
            {!senderSelection && (
              <AppPressable className='query-stations-link' onPress={handleAnalyze}>
                <Text className='query-stations-link__text'>智能识别</Text>
              </AppPressable>
            )}
          </View>

          {!senderSelection && (
            <Input
              className='query-stations-input'
              placeholder='粘贴完整地址，或下方手动填写'
              value={rawText}
              onInput={event => setRawText(event.detail.value)}
            />
          )}

          <View className='query-stations-grid'>
            <Input
              className='query-stations-input query-stations-input--grid'
              placeholder='省'
              value={province}
              disabled={senderSelection}
              onInput={event => setProvince(event.detail.value)}
            />
            <Input
              className='query-stations-input query-stations-input--grid query-stations-input--right'
              placeholder='市'
              value={city}
              disabled={senderSelection}
              onInput={event => setCity(event.detail.value)}
            />
          </View>

          <View className='query-stations-grid'>
            <Input
              className='query-stations-input query-stations-input--grid'
              placeholder='区/县'
              value={county}
              disabled={senderSelection}
              onInput={event => setCounty(event.detail.value)}
            />
            <Input
              className='query-stations-input query-stations-input--grid query-stations-input--right'
              placeholder='详细地址，可选'
              value={address}
              disabled={senderSelection}
              onInput={event => setAddress(event.detail.value)}
            />
          </View>
        </View>
      )}

      {!senderSelection && (
        <AppPressable className='query-stations-submit' onPress={handleQuery}>
          <Text className='query-stations-submit__text'>{loading ? '查询中...' : selectionMode ? '查询自提网点' : '查询网点'}</Text>
        </AppPressable>
      )}

      {errorMessage && (
        <View className='query-stations-message'>
          <Text className='query-stations-message__text'>{errorMessage}</Text>
        </View>
      )}

      {result && (
        <StationQueryResults
          result={result}
          selectionParams={selectionParams}
          onDetail={handleDetail}
          onDial={handleDial}
          onFeedback={handleFeedback}
          onGoExpress={handleGoExpress}
          onOpenMap={handleOpenMap}
          onSelect={handleSelectStation}
        />
      )}
    </ScrollView>
  )
}

export default QueryStationsPage
