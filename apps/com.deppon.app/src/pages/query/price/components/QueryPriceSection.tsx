import { View } from '@tarojs/components'

import type { ReactNode } from 'react'

import './QueryPriceSection.scss'

interface QueryPriceSectionProps {
  children: ReactNode
  className?: string
}

export function QueryPriceSection(props: QueryPriceSectionProps) {
  const className = props.className
    ? `query-price-section ${props.className}`
    : 'query-price-section'

  return <View className={className}>{props.children}</View>
}
