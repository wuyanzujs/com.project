import { ScrollView, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'

import { useMemo } from 'react'

import { supportService } from '../../../services/support'
import { navigateToAppRoute } from '../../../shared/navigation/appNavigation'
import { ensureAuthenticated } from '../../../shared/navigation/authGuard'
import { APP_ROUTES } from '../../../shared/navigation/routes'
import {
  getNativeCapabilityErrorMessage,
  isNativeCapabilityError
} from '../../../shared/platform/capabilities'
import { dialPhone, PhoneNumberError } from '../../../shared/platform/phone'
import { createAppWebUrl } from '../../../shared/webview/appWeb'

import type { SupportEntryView } from '../../../services/support'

import './index.scss'

function getEntryClassName(entry: SupportEntryView) {
  return `support-entry support-entry--${entry.tone}`
}

function getEntryMarkClassName(entry: SupportEntryView) {
  return `support-entry__mark support-entry__mark--${entry.tone}`
}

const SupportCenterPage = () => {
  const sections = useMemo(() => supportService.getSections(), [])

  const showToast = (title: string) => {
    Taro.showToast({
      title,
      icon: 'none'
    })
  }

  const openWebEntry = (entry: SupportEntryView) => {
    if (entry.loginRequired && !ensureAuthenticated()) {
      return
    }

    const uri = entry.webPath
      ? supportService.createSecureWebUri(
          entry.webPath,
          entry.webParamSource
        )
      : entry.webUri

    navigateToAppRoute(
      createAppWebUrl({
        source: entry.webSource || entry.id,
        uri,
        title: entry.title,
        auth: entry.loginRequired !== false
      }),
      {
        login: entry.loginRequired
      }
    )
  }

  const callHotline = async (entry: SupportEntryView) => {
    try {
      await dialPhone(entry.phoneNumber)
    } catch (error) {
      showToast(
        isNativeCapabilityError(error) || !(error instanceof PhoneNumberError)
          ? getNativeCapabilityErrorMessage(error)
          : error.message
      )
    }
  }

  const openRouteEntry = (entry: SupportEntryView) => {
    if (!entry.route) {
      showToast('该能力后续接入')
      return
    }

    navigateToAppRoute(entry.route, {
      login: entry.loginRequired
    })
  }

  const handleEntry = (entry: SupportEntryView) => {
    if (entry.kind === 'web') {
      openWebEntry(entry)
      return
    }

    if (entry.kind === 'phone') {
      callHotline(entry)
      return
    }

    if (entry.kind === 'route') {
      openRouteEntry(entry)
      return
    }

    showToast('该能力后续接入')
  }

  return (
    <ScrollView className='support-page' scrollY>
      <View className='support-header'>
        <Text className='support-header__label'>Support</Text>
        <Text className='support-header__title'>客服中心</Text>
        <Text className='support-header__summary'>
          首期承接在线客服、95353 热线、投诉理赔和自助查询，复杂售后状态机继续由 H5 或后续原生页承接。
        </Text>
      </View>

      <View className='support-card support-card--hotline'>
        <View>
          <Text className='support-card__label'>服务热线</Text>
          <Text className='support-card__title'>95353</Text>
          <Text className='support-card__summary'>
            电话能力已通过 App 原生 facade 收口，后续可替换为更完整的呼叫组件。
          </Text>
        </View>
        <View
          className='support-card__button'
          onClick={() =>
            callHotline({
              id: 'hotline-card',
              title: '95353 热线',
              summary: '',
              kind: 'phone',
              tone: 'success',
              phoneNumber: '95353'
            })
          }
        >
          <Text className='support-card__button-text'>拨打</Text>
        </View>
      </View>

      {sections.map((section) => (
        <View className='support-section' key={section.title}>
          <View className='support-section__head'>
            <Text className='support-section__title'>{section.title}</Text>
            <Text className='support-section__summary'>{section.summary}</Text>
          </View>
          {section.entries.map((entry) => (
            <View
              className={getEntryClassName(entry)}
              key={entry.id}
              onClick={() => handleEntry(entry)}
            >
              <Text className={getEntryMarkClassName(entry)}>
                {entry.title.slice(0, 1)}
              </Text>
              <View className='support-entry__content'>
                <View className='support-entry__top'>
                  <Text className='support-entry__title'>{entry.title}</Text>
                  {!!entry.badgeText && (
                    <Text className='support-entry__badge'>
                      {entry.badgeText}
                    </Text>
                  )}
                </View>
                <Text className='support-entry__summary'>{entry.summary}</Text>
              </View>
              <Text className='support-entry__arrow'>›</Text>
            </View>
          ))}
        </View>
      ))}

      <View className='support-footer'>
        <Text className='support-footer__title'>还没找到入口？</Text>
        <Text className='support-footer__summary'>
          可先查看订单列表定位运单，再从订单详情进入在线客服。
        </Text>
        <View
          className='support-footer__button'
          onClick={() =>
            navigateToAppRoute(APP_ROUTES.orderList, {
              login: true
            })
          }
        >
          <Text className='support-footer__button-text'>查看订单</Text>
        </View>
      </View>
    </ScrollView>
  )
}

export default SupportCenterPage
