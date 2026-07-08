import { APP_PAGE_PATHS } from './shared/navigation/routeRegistry'

export default defineAppConfig({
  pages: APP_PAGE_PATHS,
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#fff',
    navigationBarTitleText: '德邦快递',
    navigationBarTextStyle: 'black'
  }
})
