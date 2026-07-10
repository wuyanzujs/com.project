import { Text, View } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'

import { useEffect, useMemo, useState } from 'react'

import { AppWebView } from '../../shared/native'
import { navigateToAppRoute } from '../../shared/navigation/appNavigation'
import { APP_ROUTES } from '../../shared/navigation/routes'
import {
  isAllowedAppWebUrl,
  resolveAppWebTarget
} from '../../shared/webview/appWeb'

import './index.scss'

const WebPage = () => {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const target = useMemo(
    () => resolveAppWebTarget(router.params),
    [router.params]
  )

  useEffect(() => {
    Taro.setNavigationBarTitle({
      title: target.title
    })
  }, [target.title])

  const handleBack = () => {
    if (Taro.getCurrentPages().length > 1) {
      Taro.navigateBack()
      return
    }

    navigateToAppRoute(APP_ROUTES.home)
  }

  const handleShouldStartLoad = (url: string) => {
    const allowed = isAllowedAppWebUrl(url)

    if (!allowed) {
      Taro.showToast({
        title: '已拦截未授权链接',
        icon: 'none'
      })
    }

    return allowed
  }

  if (!target.url || !target.allowed || loadError) {
    return (
      <View className='web-page web-page--fallback' style={{ flex: 1 }}>
        <View className='web-fallback'>
          <Text className='web-fallback__label'>Web</Text>
          <Text className='web-fallback__title'>
            {loadError ? '页面加载失败' : target.message}
          </Text>
          <Text className='web-fallback__summary'>
            来源：{target.source}
          </Text>
          <View className='web-fallback__button' onClick={handleBack}>
            <Text className='web-fallback__button-text'>返回</Text>
          </View>
        </View>
      </View>
    )
  }

  return (
    <View className='web-page' style={{ flex: 1 }}>
      {loading && (
        <View className='web-loading'>
          <Text className='web-loading__text'>加载中</Text>
        </View>
      )}
      <AppWebView
        authenticated={target.auth}
        uri={target.url}
        onError={() => {
          setLoading(false)
          setLoadError(true)
        }}
        onLoadEnd={() => setLoading(false)}
        onLoadStart={() => setLoading(true)}
        onShouldStartLoad={handleShouldStartLoad}
      />
    </View>
  )
}

export default WebPage
