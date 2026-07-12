import { StyleSheet } from 'react-native'
import { WebView } from 'react-native-webview'

import { APP_STYLE_COLORS } from '../../styles/nativeTokens'

interface AppWebViewProps {
  authenticated: boolean
  uri: string
  onError: () => void
  onLoadEnd: () => void
  onLoadStart: () => void
  onShouldStartLoad: (url: string) => boolean
}

const styles = StyleSheet.create({
  webView: {
    flex: 1,
    backgroundColor: APP_STYLE_COLORS.surface.card
  }
})

export function AppWebView({
  authenticated,
  uri,
  onError,
  onLoadEnd,
  onLoadStart,
  onShouldStartLoad
}: AppWebViewProps) {
  return (
    <WebView
      domStorageEnabled
      javaScriptEnabled
      sharedCookiesEnabled={authenticated}
      source={{ uri }}
      startInLoadingState
      style={styles.webView}
      thirdPartyCookiesEnabled={authenticated}
      onError={onError}
      onHttpError={onError}
      onLoadEnd={onLoadEnd}
      onLoadStart={onLoadStart}
      onShouldStartLoadWithRequest={(request) =>
        onShouldStartLoad(request.url)
      }
    />
  )
}
