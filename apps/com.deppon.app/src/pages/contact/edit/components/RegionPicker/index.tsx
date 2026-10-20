import { Input, ScrollView, Text, View } from '@tarojs/components'

import { useEffect, useMemo, useState } from 'react'

import { createRegionSelection, findHotCity, REGION_HOT_CITIES, searchRegions } from '@/services/contact/region.rules'
import { regionService } from '@/services/contact/region.service'
import type { RegionProvince, RegionSearchResult, RegionSelection } from '@/services/contact/region.types'
import { AppPressable } from '@/shared/components'
import { AppIcon } from '@/shared/components/AppIcon'
import { APP_STYLE_COLORS } from '@/styles/nativeTokens'

import './index.scss'

interface RegionPickerProps {
  onClose: () => void
  onSelect: (selection: RegionSelection) => void
  value: Pick<RegionSelection, 'cityName' | 'countyName' | 'provinceName'>
  visible: boolean
}

// 「创建新地址 / 编辑联系人」点击「地区/城市」后的弹层：标题 + 搜索 + 热门城市 + 省/市/区逐级列表。
const RegionPicker = ({ onClose, onSelect, value, visible }: RegionPickerProps) => {
  const [provinces, setProvinces] = useState<RegionProvince[]>([])
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [provinceName, setProvinceName] = useState(value.provinceName)
  const [cityName, setCityName] = useState(value.cityName)

  useEffect(() => {
    if (!visible) {
      return
    }

    setProvinceName(value.provinceName)
    setCityName(value.cityName)
    setKeyword('')
  }, [value.cityName, value.provinceName, visible])

  useEffect(() => {
    if (!visible || provinces.length > 0 || loading) {
      return
    }

    setLoading(true)
    setFailed(false)

    regionService
      .loadProvinces()
      .then(tree => setProvinces(tree))
      .catch(() => setFailed(true))
      .finally(() => setLoading(false))
  }, [loading, provinces.length, visible])

  const activeProvince = useMemo(() => provinces.find(item => item.name === provinceName) ?? null, [provinceName, provinces])
  const activeCity = useMemo(() => activeProvince?.cities.find(item => item.name === cityName) ?? null, [activeProvince, cityName])
  const level = provinceName ? (cityName ? 'county' : 'city') : 'province'
  const prompt = level === 'province' ? '请选择省份' : level === 'city' ? '请选择城市' : '请选择区县'
  const rows =
    level === 'province'
      ? provinces.map(item => item.name)
      : level === 'city'
        ? (activeProvince?.cities.map(item => item.name) ?? [])
        : (activeCity?.counties.map(item => item.name) ?? [])
  const searchResults: RegionSearchResult[] = useMemo(() => searchRegions(provinces, keyword), [keyword, provinces])

  if (!visible) {
    return null
  }

  const handlePickProvince = (name: string) => {
    setProvinceName(name)
    setCityName('')
  }

  const handlePickCity = (name: string) => {
    setCityName(name)
  }

  const handlePickCounty = (name: string) => {
    onSelect(createRegionSelection(provinces, provinceName, cityName, name))
  }

  const handlePickHotCity = (name: string) => {
    const hit = findHotCity(provinces, name)

    if (!hit) {
      return
    }

    setProvinceName(hit.province.name)
    setCityName(hit.city.name)

    if (hit.city.counties.length === 0) {
      onSelect(createRegionSelection(provinces, hit.province.name, hit.city.name, ''))
    }
  }

  const handlePickSearchResult = (result: RegionSearchResult) => {
    onSelect(createRegionSelection(provinces, result.provinceName, result.cityName, result.countyName))
  }

  const handleRowPress = (name: string) => {
    if (level === 'province') {
      handlePickProvince(name)
      return
    }

    if (level === 'city') {
      handlePickCity(name)
      return
    }

    handlePickCounty(name)
  }

  return (
    <View className='region-picker'>
      <AppPressable accessibilityLabel='关闭城市选择' className='region-picker__mask' onPress={onClose} />
      <View className='region-picker__sheet'>
        <View className='region-picker__header'>
          <Text className='region-picker__title'>选择城市</Text>
          <AppPressable accessibilityLabel='关闭城市选择' className='region-picker__close' onPress={onClose}>
            <AppIcon color={APP_STYLE_COLORS.text.supporting} name='close' size={34} />
          </AppPressable>
        </View>

        <View className='region-picker__search'>
          <AppIcon color={APP_STYLE_COLORS.text.supporting} name='search' size={30} />
          <Input
            className='region-picker__search-input'
            placeholder='请输入省份/城市/区县搜索'
            value={keyword}
            onInput={event => setKeyword(event.detail.value)}
          />
        </View>

        {loading && <Text className='region-picker__tip'>加载中…</Text>}
        {failed && <Text className='region-picker__tip'>城市数据加载失败，请稍后重试</Text>}

        {!loading && !failed && keyword.trim().length > 0 && (
          <ScrollView className='region-picker__list' scrollY>
            {searchResults.length === 0 && <Text className='region-picker__tip'>没有找到匹配的城市</Text>}
            {searchResults.map(item => (
              <AppPressable
                accessibilityLabel={`选择${item.label}`}
                className='region-picker__row'
                key={`${item.kind}-${item.label}`}
                onPress={() => handlePickSearchResult(item)}
              >
                <Text className='region-picker__row-text'>{item.label}</Text>
              </AppPressable>
            ))}
          </ScrollView>
        )}

        {!loading && !failed && keyword.trim().length === 0 && (
          <>
            {!provinceName && (
              <>
                <Text className='region-picker__section'>热门城市</Text>
                <View className='region-picker__hot'>
                  {REGION_HOT_CITIES.map(name => (
                    <AppPressable accessibilityLabel={`选择${name}`} className='region-picker__chip' key={name} onPress={() => handlePickHotCity(name)}>
                      <Text className='region-picker__chip-text'>{name}</Text>
                    </AppPressable>
                  ))}
                </View>
              </>
            )}

            <View className='region-picker__tabs'>
              {provinceName ? (
                <AppPressable
                  accessibilityLabel='返回省份列表'
                  className='region-picker__tab'
                  onPress={() => {
                    setProvinceName('')
                    setCityName('')
                  }}
                >
                  <Text className='region-picker__tab-text'>{provinceName}</Text>
                </AppPressable>
              ) : null}
              {cityName ? (
                <AppPressable
                  accessibilityLabel='返回城市列表'
                  className='region-picker__tab'
                  onPress={() => {
                    setCityName('')
                  }}
                >
                  <Text className='region-picker__tab-text'>{cityName}</Text>
                </AppPressable>
              ) : null}
              <View className='region-picker__tab region-picker__tab--active'>
                <Text className='region-picker__tab-text region-picker__tab-text--active'>{prompt}</Text>
              </View>
            </View>

            <ScrollView className='region-picker__list' scrollY>
              {rows.map(name => (
                <AppPressable accessibilityLabel={`选择${name}`} className='region-picker__row' key={name} onPress={() => handleRowPress(name)}>
                  <Text className='region-picker__row-text'>{name}</Text>
                </AppPressable>
              ))}
            </ScrollView>
          </>
        )}
      </View>
    </View>
  )
}

export { RegionPicker }
