export default definePageConfig({
  // 页面自带滚动容器（AppPage 内的 ScrollView）。关掉 Taro 的外层页面滚动，
  // 否则整页会连同固定底栏一起滚动，底栏无法固定在视口底部。
  disableScroll: true,
  navigationBarTitleText: '寄快递',
  // 生产 App 的寄件页导航栏右侧有「分享」，Taro 默认头部放不下，改用页面自定义头部。
  navigationStyle: 'custom'
})
