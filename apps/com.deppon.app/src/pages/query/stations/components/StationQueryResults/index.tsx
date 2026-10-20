import { Text, View } from '@tarojs/components'

import type { StationItem, StationQueryResult, StationSelectionParams } from '@/services/query'
import { AppPressable } from '@/shared/components'
import { AppIcon } from '@/shared/components/AppIcon'
import { APP_STYLE_COLORS } from '@/styles/nativeTokens'

import './index.scss'

interface StationQueryResultsProps {
  result: StationQueryResult
  selectionParams: StationSelectionParams | null
  onDetail: (item: StationItem) => void
  onDial: (item: StationItem) => void
  onFeedback: (item?: StationItem) => void
  onGoExpress: () => void
  onOpenMap: (item: StationItem) => void
  onSelect: (item: StationItem | null) => void
}

function getStationKey(item: StationItem) {
  return `${item.source}-${item.id}-${item.code}`
}

function getFullRegion(result: StationQueryResult) {
  return [result.address.province, result.address.city, result.address.county].filter(Boolean).join('-')
}

export function StationQueryResults({ result, selectionParams, onDetail, onDial, onFeedback, onGoExpress, onOpenMap, onSelect }: StationQueryResultsProps) {
  const selectionMode = Boolean(selectionParams)
  // 「更多网点」页（德邦快递服务点）只有卡片列表：
  // 网点名 / 地址 / 营业时间 / 电话，右侧两个方按钮为打电话与距离，点击卡片即选中。
  const servicePointMode = selectionParams?.source === 'EXPRESS_SERVICE_POINT'

  return (
    <View className='query-stations-results'>
      {!servicePointMode && (
        <View className='query-stations-result-head'>
          <View>
            <Text className='query-stations-result-head__title'>{getFullRegion(result)}</Text>
            <Text className='query-stations-result-head__summary'>共 {result.totalRows} 个网点</Text>
          </View>
          <Text className='query-stations-result-head__tag'>{result.source === 'Address' ? '地址匹配' : '区县网点'}</Text>
        </View>
      )}

      {result.list.length ? (
        result.list.map(item => {
          const selected = selectionParams?.selectedCode === (selectionParams?.source === 'EXPRESS_SERVICE_POINT' ? item.code : item.id)

          if (servicePointMode) {
            return (
              <AppPressable
                accessibilityLabel={`选择服务点${item.name}`}
                className={selected ? 'query-stations-point query-stations-point--selected' : 'query-stations-point'}
                key={getStationKey(item)}
                onPress={() => onSelect(item)}
              >
                <Text className='query-stations-point__title'>{item.name}</Text>
                <Text className='query-stations-point__address'>{item.address || '暂无地址'}</Text>
                <View className='query-stations-point__body'>
                  <View className='query-stations-point__metas'>
                    <View className='query-stations-point__meta'>
                      <AppIcon color={APP_STYLE_COLORS.text.subdued} name='clock' size={28} strokeWidth={1.8} />
                      <Text className='query-stations-point__meta-text'>{item.time}</Text>
                    </View>
                    {item.phone ? (
                      <View className='query-stations-point__meta'>
                        <AppIcon color={APP_STYLE_COLORS.text.subdued} name='phone' size={28} strokeWidth={1.8} />
                        <Text className='query-stations-point__meta-text'>{item.phone}</Text>
                      </View>
                    ) : null}
                  </View>
                  <View className='query-stations-point__actions'>
                    <AppPressable accessibilityLabel={`拨打${item.name}电话`} className='query-stations-point__action' onPress={() => onDial(item)}>
                      <AppIcon color={APP_STYLE_COLORS.text.heading} name='phone' size={28} strokeWidth={1.8} />
                      <Text className='query-stations-point__action-text'>电话</Text>
                    </AppPressable>
                    <AppPressable accessibilityLabel={`导航到${item.name}`} className='query-stations-point__action' onPress={() => onOpenMap(item)}>
                      <AppIcon color={APP_STYLE_COLORS.text.heading} name='mapPin' size={28} strokeWidth={1.8} />
                      <Text className='query-stations-point__action-text'>{item.distance || '导航'}</Text>
                    </AppPressable>
                  </View>
                </View>
              </AppPressable>
            )
          }

          return (
            <View className='query-stations-card' key={getStationKey(item)}>
              <Text className='query-stations-card__title'>{item.name}</Text>
              <Text className='query-stations-card__address'>{item.address || '暂无地址'}</Text>
              {item.distance && <Text className='query-stations-card__meta'>距离 {item.distance}</Text>}
              {item.phone && <Text className='query-stations-card__meta'>电话 {item.phone}</Text>}
              {item.business && <Text className='query-stations-card__meta'>业务 {item.business}</Text>}
              <Text className='query-stations-card__meta'>营业时间 {item.time}</Text>

              <View className='query-stations-card__actions'>
                {!selectionMode && (
                  <>
                    <AppPressable className='query-stations-card__outline-button' onPress={() => onFeedback(item)}>
                      <Text className='query-stations-card__outline-button-text'>反馈</Text>
                    </AppPressable>
                    <AppPressable className='query-stations-card__outline-button' onPress={() => onOpenMap(item)}>
                      <Text className='query-stations-card__outline-button-text'>导航</Text>
                    </AppPressable>
                    <AppPressable className='query-stations-card__primary-button' onPress={() => onDial(item)}>
                      <Text className='query-stations-card__primary-button-text'>拨打</Text>
                    </AppPressable>
                  </>
                )}
                <AppPressable className='query-stations-card__outline-button' onPress={() => onDetail(item)}>
                  <Text className='query-stations-card__outline-button-text'>详情</Text>
                </AppPressable>
                {selectionParams && (
                  <AppPressable className='query-stations-card__primary-button' selected={selected} onPress={() => onSelect(item)}>
                    <Text className='query-stations-card__primary-button-text'>{selected ? '当前选择' : '选择'}</Text>
                  </AppPressable>
                )}
              </View>
            </View>
          )
        })
      ) : (
        <View className='query-stations-empty'>
          <Text className='query-stations-empty__title'>暂无网点</Text>
          <Text className='query-stations-empty__summary'>
            {selectionParams?.source === 'EXPRESS_SERVICE_POINT'
              ? '当前寄件地址附近暂无支持自送的服务点，可返回寄件页稍后重试。'
              : selectionMode
                ? '当前收件地址附近暂无支持自提的服务点。'
                : '可先预约寄件，等待快递员联系。'}
          </Text>
          <AppPressable className='query-stations-empty__button' onPress={selectionMode ? () => onSelect(null) : onGoExpress}>
            <Text className='query-stations-empty__button-text'>{selectionMode ? '使用最近服务点' : '去寄件'}</Text>
          </AppPressable>
          {!selectionMode && (
            <AppPressable className='query-stations-empty__feedback' onPress={() => onFeedback()}>
              <Text className='query-stations-empty__feedback-text'>找不到网点？</Text>
            </AppPressable>
          )}
        </View>
      )}
    </View>
  )
}
