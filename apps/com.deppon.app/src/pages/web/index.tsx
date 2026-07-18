import { Text, View } from '@tarojs/components'
import Taro, { useDidShow, useRouter } from '@tarojs/taro'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { AppPressable } from '../../shared/components'
import { AppWebView } from '../../shared/native'
import { navigateToAppRoute } from '../../shared/navigation/appNavigation'
import {
  ensureAuthenticated,
  getCurrentRouteUrl,
  hasValidSession
} from '../../shared/navigation/authGuard'
import { APP_ROUTES } from '../../shared/navigation/routes'
import {
  getAppWebWarehouseStagingId,
  isAllowedAppWebTargetUrl,
  requiresAppWebLogin,
  resolveAppWebTarget
} from '../../shared/webview/appWeb'
import { appWebMessageBridge } from '../../shared/webview/appWebMessage'
import './index.scss'
import './content.scss'

const WebPage = () => {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const target = useMemo(
    () => resolveAppWebTarget(router.params),
    [router.params]
  )
  const activeWebUrl = useRef(target.url)
  const loginRequired = requiresAppWebLogin(target, hasValidSession())

  const handleRequireLogin = useCallback(() => {
    ensureAuthenticated({
      redirectUrl: getCurrentRouteUrl(APP_ROUTES.home),
      replace: true,
      message: false
    })
  }, [])

  useDidShow(() => {
    if (requiresAppWebLogin(target, hasValidSession())) {
      handleRequireLogin()
    }
  })

  useEffect(() => {
    activeWebUrl.current = target.url
    Taro.setNavigationBarTitle({
      title: target.title
    })
  }, [target.title, target.url])

  const handleBack = () => {
    if (Taro.getCurrentPages().length > 1) {
      Taro.navigateBack()
      return
    }

    navigateToAppRoute(APP_ROUTES.home)
  }

  const handleShouldStartLoad = (url: string) => {
    const allowed = isAllowedAppWebTargetUrl(target.source, url)

    if (!allowed) {
      Taro.showToast({
        title: '已拦截未授权链接',
        icon: 'none'
      })
    } else {
      activeWebUrl.current = url
    }

    return allowed
  }

  const handleMessage = (data: string) => {
    const context =
      target.source === 'EXPRESS_WAREHOUSE'
        ? { stagingId: getAppWebWarehouseStagingId(activeWebUrl.current) }
        : target.messageContext
          ? { messageContext: target.messageContext }
          : undefined
    const result = appWebMessageBridge.stage(target.source, data, context)

    if (result.closeAfterReceive) {
      handleBack()
    }
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
          <AppPressable className='web-fallback__button' onPress={handleBack}>
            <Text className='web-fallback__button-text'>返回</Text>
          </AppPressable>
        </View>
      </View>
    )
  }

  if (loginRequired) {
    return (
      <View className='web-page web-page--fallback' style={{ flex: 1 }}>
        <View className='web-fallback'>
          <Text className='web-fallback__label'>Web</Text>
          <Text className='web-fallback__title'>请先登录</Text>
          <Text className='web-fallback__summary'>登录后继续访问当前服务</Text>
          <AppPressable
            className='web-fallback__button'
            onPress={handleRequireLogin}
          >
            <Text className='web-fallback__button-text'>去登录</Text>
          </AppPressable>
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
        onMessage={handleMessage}
        onShouldStartLoad={handleShouldStartLoad}
      />
    </View>
  )
}

export default WebPage
