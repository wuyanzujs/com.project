import { Image, ScrollView, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'

import { useEffect, useState } from 'react'

import { supportService } from '@/services/support'
import type { SupportEntryView } from '@/services/support'
import { AppPressable } from '@/shared/components'
import { AppIcon } from '@/shared/components/AppIcon'
import { APP_IMAGE_ICONS } from '@/shared/components/AppIcon/images'
import { navigateToAppRoute } from '@/shared/navigation/appNavigation'
import { ensureAuthenticated } from '@/shared/navigation/authGuard'
import { createAppWebUrl } from '@/shared/webview/appWeb'
import { APP_STYLE_COLORS } from '@/styles/nativeTokens'

import './index.scss'
import './content.scss'

function getEntryClassName(entry: SupportEntryView) {
  return `support-entry support-entry--${entry.tone}`
}

function getEntryMarkClassName(entry: SupportEntryView) {
  return `support-entry__mark support-entry__mark--${entry.tone}`
}

const SupportCenterPage = () => {
  const [sections, setSections] = useState(() => supportService.getSections())

  useEffect(() => {
    let mounted = true

    async function loadSurveyEntries() {
      const surveyEntries = await supportService.querySurveyEntries()

      if (mounted && surveyEntries.length) {
        setSections(supportService.getSections(surveyEntries))
      }
    }

    loadSurveyEntries()

    return () => {
      mounted = false
    }
  }, [])

  const openWebEntry = (entry: SupportEntryView) => {
    if (entry.loginRequired && !ensureAuthenticated()) {
      return
    }

    if (!entry.webSource) {
      Taro.showToast({ title: '该服务暂不可用', icon: 'none' })
      return
    }

    const uri = entry.webPath ? supportService.createSecureWebUri(entry.webPath, entry.webParamSource) : entry.webUri

    navigateToAppRoute(
      createAppWebUrl({
        source: entry.webSource,
        uri,
        title: entry.title,
        auth: entry.loginRequired !== false
      }),
      {
        login: entry.loginRequired
      }
    )
  }

  const openRouteEntry = (entry: SupportEntryView) => {
    if (!entry.route) {
      Taro.showToast({ title: '该服务暂不可用', icon: 'none' })
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

    if (entry.kind === 'route') {
      openRouteEntry(entry)
      return
    }

    Taro.showToast({ title: '该服务暂不可用', icon: 'none' })
  }

  return (
    <ScrollView className='support-page' scrollY>
      <View className='support-welcome'>
        <Text className='support-welcome__text'>亲爱的德邦会员您好，欢迎进入客服中心</Text>
      </View>

      {sections.map(section => (
        <View className='support-section' key={section.title}>
          <View className='support-section__head'>
            <Text className='support-section__title'>{section.title}</Text>
            {section.summary ? <Text className='support-section__summary'>{section.summary}</Text> : null}
          </View>
          {section.entries.map(entry => (
            <AppPressable className={getEntryClassName(entry)} key={entry.id} onPress={() => handleEntry(entry)}>
              {entry.icon ? (
                <View className={getEntryMarkClassName(entry)}>
                  <AppIcon color={APP_STYLE_COLORS.brand.default} name={entry.icon} size={34} />
                </View>
              ) : null}
              <View className='support-entry__content'>
                <View className='support-entry__top'>
                  <Text className='support-entry__title'>{entry.title}</Text>
                  {!!entry.badgeText && <Text className='support-entry__badge'>{entry.badgeText}</Text>}
                </View>
                {entry.summary ? <Text className='support-entry__summary'>{entry.summary}</Text> : null}
              </View>
              <Image className='support-entry__arrow' mode='aspectFit' src={APP_IMAGE_ICONS.arrowRightGrey} />
            </AppPressable>
          ))}
        </View>
      ))}
    </ScrollView>
  )
}

export default SupportCenterPage
