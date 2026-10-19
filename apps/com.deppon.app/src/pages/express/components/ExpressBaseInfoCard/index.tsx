import { View } from '@tarojs/components'

import type { PropsWithChildren } from 'react'

import './index.scss'

export function ExpressBaseInfoCard({ children }: PropsWithChildren) {
  return <View className='express-base-info'>{children}</View>
}
