import { Input, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'

import { useState } from 'react'

import { APP_ROUTES } from '../../../../shared/navigation/routes'
import { getNativeCapabilityErrorMessage } from '../../../../shared/platform/capabilities'
import {
  ScanCodeParseError,
  scanWaybillCode
} from '../../../../shared/platform/scan'

import './index.scss'

function createQuery(params: Record<string, string>) {
  return Object.entries(params)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&')
}

function normalizeWaybillNumber(value: string) {
  return value.replace(/\s/g, '').toUpperCase()
}

function isValidWaybillNumber(value: string) {
  return /^[A-Z0-9]{6,32}$/.test(value)
}

const Search = () => {
  const [keyword, setKeyword] = useState('')

  const navigateToWaybillDetail = (value: string, source = 'HOME_SEARCH') => {
    const waybillNumber = normalizeWaybillNumber(value)

    if (!isValidWaybillNumber(waybillNumber)) {
      Taro.showToast({
        title: '请输入正确的运单号',
        icon: 'none'
      })
      return
    }

    Taro.navigateTo({
      url: `${APP_ROUTES.orderDetail}?${createQuery({
        waybillNumber,
        source
      })}`
    })
  }

  const handleSearch = () => {
    navigateToWaybillDetail(keyword)
  }

  const handleScan = async () => {
    try {
      const result = await scanWaybillCode('HOME_SEARCH')

      setKeyword(result.waybillNumber)
      navigateToWaybillDetail(result.waybillNumber, 'HOME_SCAN')
    } catch (error) {
      Taro.showToast({
        title:
          error instanceof ScanCodeParseError
            ? error.message
            : getNativeCapabilityErrorMessage(error),
        icon: 'none'
      })
    }
  }

  return (
    <View className='home-search'>
      <View className='home-search__input-wrap'>
        <Text className='home-search__label'>运单查询</Text>
        <Input
          className='home-search__input'
          confirmType='search'
          placeholder='输入运单号'
          value={keyword}
          onConfirm={handleSearch}
          onInput={(event) =>
            setKeyword(normalizeWaybillNumber(event.detail.value))
          }
        />
      </View>
      <View className='home-search__scan' onClick={handleScan}>
        <Text className='home-search__scan-text'>扫码</Text>
      </View>
      <View className='home-search__button' onClick={handleSearch}>
        <Text className='home-search__button-text'>查询</Text>
      </View>
    </View>
  )
}

export default Search
