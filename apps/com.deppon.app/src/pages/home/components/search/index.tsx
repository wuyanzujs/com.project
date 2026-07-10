import { Input, View } from '@tarojs/components'
import Taro from '@tarojs/taro'

import { useState } from 'react'

import {
  applyExpressScanContext,
  createExpressDraft,
  expressDraftBridge
} from '../../../../services/express'
import { AppIcon } from '../../../../shared/components/AppIcon'
import { navigateToAppRoute } from '../../../../shared/navigation/appNavigation'
import { APP_ROUTES } from '../../../../shared/navigation/routes'
import { createAppRouteUrl } from '../../../../shared/navigation/routeUrl'
import { getNativeCapabilityErrorMessage } from '../../../../shared/platform/capabilities'
import { scanAppCode } from '../../../../shared/platform/scan'

import './index.scss'

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

    navigateToAppRoute(
      createAppRouteUrl(APP_ROUTES.orderDetail, {
        waybillNumber,
        source
      })
    )
  }

  const handleSearch = () => {
    navigateToWaybillDetail(keyword)
  }

  const handleScan = async () => {
    try {
      const result = await scanAppCode('HOME_SEARCH')

      if (result.kind === 'waybill') {
        setKeyword(result.waybillNumber)
        navigateToWaybillDetail(result.waybillNumber, 'HOME_SCAN')
        return
      }

      if (result.kind === 'printCode') {
        navigateToAppRoute(
          createAppRouteUrl(APP_ROUTES.printCenter, {
            source: 'HOME_SCAN',
            printId: result.printId
          }),
          {
            message: '请先登录后使用面单打印'
          }
        )
        return
      }

      if (
        result.kind === 'unsupported' &&
        result.reason === 'sendQrCode' &&
        result.role &&
        result.value
      ) {
        expressDraftBridge.carryFromScanQrCode(
          applyExpressScanContext(createExpressDraft(), {
            role: result.role,
            value: result.value,
            sceneId: result.sceneId,
            expressRole: result.expressRole
          })
        )
        navigateToAppRoute(APP_ROUTES.express, {
          message: '请先登录后继续寄件'
        })
        return
      }

      Taro.showToast({
        title: result.message,
        icon: 'none'
      })
    } catch (error) {
      Taro.showToast({
        title: getNativeCapabilityErrorMessage(error),
        icon: 'none'
      })
    }
  }

  return (
    <View className='home-search'>
      <View className='home-search__input-wrap'>
        <AppIcon color='#667085' name='search' size={24} />
        <Input
          className='home-search__input'
          confirmType='search'
          placeholder='输入运单号查询物流'
          value={keyword}
          onConfirm={handleSearch}
          onInput={event =>
            setKeyword(normalizeWaybillNumber(event.detail.value))
          }
        />
      </View>
      <View className='home-search__scan' onClick={handleScan}>
        <AppIcon color='#344054' name='scan' size={25} />
      </View>
      <View className='home-search__button' onClick={handleSearch}>
        <AppIcon color='#ffffff' name='search' size={24} strokeWidth={2.5} />
      </View>
    </View>
  )
}

export default Search
