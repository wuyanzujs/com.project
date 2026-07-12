import { APP_PAGE_PATHS } from './shared/navigation/routeRegistry'
import { APP_NATIVE_TOKENS, APP_STYLE_COLORS } from './styles/nativeTokens'

export default defineAppConfig({
  pages: APP_PAGE_PATHS,
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: APP_STYLE_COLORS.surface.card,
    navigationBarTitleText: '德邦快递',
    navigationBarTextStyle: APP_NATIVE_TOKENS.navigation.barTextStyle
  }
})
