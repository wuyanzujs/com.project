import { View } from '@tarojs/components'

import type { PropsWithChildren } from 'react'

import './index.scss'

// 生产 App 把货物信息、付款方式、优惠券放在同一张卡片里，各占一行。
export function ExpressBaseInfoCard({ children }: PropsWithChildren) {
  return <View className='express-base-info'>{children}</View>
}
