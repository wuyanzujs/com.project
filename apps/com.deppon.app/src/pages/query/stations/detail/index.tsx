import { ScrollView, Text, View } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'

import { useEffect, useState } from 'react'

import { queryService } from '../../../../services/query'
import { getNativeCapabilityErrorMessage } from '../../../../shared/platform/capabilities'
import { openMapLocation } from '../../../../shared/platform/map'
import { PhoneNumberError, dialPhone } from '../../../../shared/platform/phone'

import type { StationDetailView } from '../../../../services/query'

import './index.scss'

function decodeParam(value?: string) {
  if (!value) {
    return ''
  }

  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function isValidCoordinate(detail: StationDetailView) {
  const latitude = Number(detail.lat)
  const longitude = Number(detail.lng)

  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180
  )
}

function renderInfo(label: string, value?: string) {
  if (!value) {
    return null
  }

  return (
    <View className='station-detail-info-row' key={label}>
      <Text className='station-detail-info-row__label'>{label}</Text>
      <Text className='station-detail-info-row__value'>{value}</Text>
    </View>
  )
}

const QueryStationDetailPage = () => {
  const router = useRouter()
  const [detail, setDetail] = useState<StationDetailView | null>(null)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const code = decodeParam(router.params.code)
  const distance = decodeParam(router.params.distance)

  useEffect(() => {
    let canceled = false

    async function loadDetail() {
      setLoading(true)
      setErrorMessage('')
      setDetail(null)

      try {
        const response = await queryService.queryStationDetail(code, {
          distance
        })

        if (canceled) {
          return
        }

        if (!response.status || !response.result) {
          setErrorMessage(response.message || '未查询到网点信息')
          return
        }

        setDetail(response.result)
      } finally {
        if (!canceled) {
          setLoading(false)
        }
      }
    }

    loadDetail()

    return () => {
      canceled = true
    }
  }, [code, distance])

  const handleDial = async () => {
    if (!detail) {
      return
    }

    try {
      await dialPhone(queryService.getStationPrimaryPhone(detail.phone))
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

  const handleOpenMap = async () => {
    if (!detail) {
      return
    }

    if (!isValidCoordinate(detail)) {
      Taro.showToast({
        title: '未获取到网点经纬度',
        icon: 'none'
      })
      return
    }

    try {
      await openMapLocation({
        source: 'QUERY_STATION_DETAIL',
        location: {
          latitude: Number(detail.lat),
          longitude: Number(detail.lng),
          name: detail.name,
          address: detail.address,
          coordinateSystem: detail.coordinateSystem
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
    <ScrollView className='station-detail-page' scrollY>
      <View className='station-detail-header'>
        <Text className='station-detail-header__label'>Station</Text>
        <Text className='station-detail-header__title'>
          {detail?.name || '网点详情'}
        </Text>
        <Text className='station-detail-header__summary'>
          {detail?.address || '正在读取网点地址、营业时间和联系方式'}
        </Text>
      </View>

      {loading && !detail && (
        <Text className='station-detail-loading'>正在加载网点详情...</Text>
      )}

      {!loading && !detail && (
        <View className='station-detail-empty'>
          <Text className='station-detail-empty__title'>
            {errorMessage || '暂未获取到网点信息'}
          </Text>
          <Text className='station-detail-empty__summary'>
            可返回网点查询页，补充地址后重新查询。
          </Text>
        </View>
      )}

      {detail && (
        <>
          <View className='station-detail-map-panel'>
            <Text className='station-detail-map-panel__title'>
              {isValidCoordinate(detail) ? '网点位置' : '暂无坐标'}
            </Text>
            <Text className='station-detail-map-panel__address'>
              {detail.address || '暂无地址'}
            </Text>
            {isValidCoordinate(detail) && (
              <Text className='station-detail-map-panel__coord'>
                {detail.lat}, {detail.lng}
              </Text>
            )}
          </View>

          <View className='station-detail-actions'>
            <View
              className='station-detail-action station-detail-action--outline'
              onClick={handleOpenMap}
            >
              <Text className='station-detail-action__outline-text'>导航</Text>
            </View>
            <View
              className='station-detail-action station-detail-action--primary'
              onClick={handleDial}
            >
              <Text className='station-detail-action__primary-text'>拨打电话</Text>
            </View>
          </View>

          <View className='station-detail-section'>
            <Text className='station-detail-section__title'>网点信息</Text>
            {[
              renderInfo('网点编码', detail.code),
              renderInfo('网点地址', detail.address),
              renderInfo('联系电话', detail.phone),
              renderInfo('业务范围', detail.business),
              renderInfo('营业时间', detail.time),
              renderInfo('距离', detail.distance)
            ]}
          </View>
        </>
      )}
    </ScrollView>
  )
}

export default QueryStationDetailPage
