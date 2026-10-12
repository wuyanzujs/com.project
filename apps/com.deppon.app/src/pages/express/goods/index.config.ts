export default definePageConfig({
  // 页面自带滚动容器（AppPage 内的 ScrollView），关掉外层页面滚动让底部
  // 确定栏固定在视口底部；自定义头部与寄快递页同款。
  disableScroll: true,
  navigationBarTitleText: '物品信息',
  navigationStyle: 'custom'
})
