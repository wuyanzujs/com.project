import {
  APP_PAGE_PATHS,
  APP_ROUTE_DEFINITIONS
} from './shared/navigation/routeRegistry'
import { APP_NATIVE_TOKENS, APP_STYLE_COLORS } from './styles/nativeTokens'

// tab 页与路由注册表保持同源。底部栏始终由 AppTabBar 组件渲染，内置
// tabBar 保持关闭，这里只声明哪些页面属于 tab 容器：这样主路由切换才能
// 走导航 facade 的 switchTab——既不播放页面栈转场，也不会每次切 tab
// 都往栈里压一层。
const APP_TAB_BAR_LIST = APP_ROUTE_DEFINITIONS.filter(
  item => 'main' in item && item.main
).map(item => ({
  pagePath: item.path,
  text: item.title
}))

// Taro 的 AppConfig 类型是小程序口径，没有 RN 专用的 rn 字段，这里补上本仓库用到的一部分。
interface AppConfigWithRn extends Taro.AppConfig {
  rn?: {
    tabBarOptions?: {
      style?: Record<string, unknown>
    }
    tabOptions?: {
      tabBarVisible?: boolean
    }
  }
}

const APP_CONFIG: AppConfigWithRn = {
  pages: APP_PAGE_PATHS,
  // Taro 的 TabBar 只读 rn.tabOptions，不认 tabBar.custom（且全局 tab 状态会被
  // 多份 router-rn 重复初始化冲掉），所以这里显式关掉它，并用 0 高样式消掉它
  // 额外占用的底栏高度。
  rn: {
    tabBarOptions: {
      style: { borderTopWidth: 0, height: 0, overflow: 'hidden' }
    },
    tabOptions: { tabBarVisible: false }
  },
  tabBar: {
    custom: true,
    list: APP_TAB_BAR_LIST
  },
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: APP_STYLE_COLORS.surface.card,
    navigationBarTitleText: '德邦快递',
    navigationBarTextStyle: APP_NATIVE_TOKENS.navigation.barTextStyle
  }
}

export default defineAppConfig(APP_CONFIG)
