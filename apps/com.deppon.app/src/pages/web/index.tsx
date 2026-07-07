import { Text, View } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'

import { useEffect, useMemo, useState } from 'react'

import { StyleSheet } from 'react-native'
import { WebView } from 'react-native-webview'

import { navigateToAppRoute } from '../../shared/navigation/appNavigation'
import { APP_ROUTES } from '../../shared/navigation/routes'
import {
  isAllowedAppWebUrl,
  resolveAppWebTarget
} from '../../shared/webview/appWeb'

import './index.scss'

const styles = StyleSheet.create({
  page: {
    flex: 1
  },
  webView: {
    flex: 1,
    backgroundColor: '#ffffff'
  }
})

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

  const handleShouldStartLoad = (request: { url: string }) => {
    const allowed = isAllowedAppWebUrl(request.url)

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
      <View className='web-page web-page--fallback' style={styles.page}>
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
    <View className='web-page' style={styles.page}>
      {loading && (
        <View className='web-loading'>
          <Text className='web-loading__text'>加载中</Text>
        </View>
      )}
      <WebView
        domStorageEnabled
        javaScriptEnabled
        sharedCookiesEnabled={target.auth}
        source={{ uri: target.url }}
        startInLoadingState
        style={styles.webView}
        thirdPartyCookiesEnabled={target.auth}
        onError={() => {
          setLoading(false)
          setLoadError(true)
        }}
        onHttpError={() => {
          setLoading(false)
          setLoadError(true)
        }}
        onLoadEnd={() => setLoading(false)}
        onLoadStart={() => setLoading(true)}
        onShouldStartLoadWithRequest={handleShouldStartLoad}
      />
    </View>
  )
}

export default WebPage
