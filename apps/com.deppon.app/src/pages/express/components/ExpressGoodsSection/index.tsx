import type { ExpressDraft } from '@/services/express'

import { ExpressSection } from '../ExpressSection'

import './index.scss'

interface ExpressGoodsSectionProps {
  goods: ExpressDraft['goods']
  onPress: () => void
}

// 生产端把名称截断到 5 个字后再拼进摘要。
function cutGoodsName(name: string) {
  return Array.from(name).slice(0, 5).join('')
}

// 生产端点击「货物信息」整行跳转独立物品信息页（/pages/sendService/goods），
// 行内只展示摘要：名称、重量，有体积时追加 /体积m³。
export function ExpressGoodsSection({ goods, onPress }: ExpressGoodsSectionProps) {
  const trimmedName = goods.name.trim()
  const goodsFilled = Boolean(trimmedName && goods.weight > 0)
  const summary = goodsFilled
    ? goods.volume > 0
      ? `${cutGoodsName(trimmedName)}、${goods.weight}kg/${goods.volume}m³`
      : `${cutGoodsName(trimmedName)}、${goods.weight}kg`
    : '请完善货物名称、重量'

  return (
    <ExpressSection expanded={false} hint='必填' plain summary={summary} summaryMuted={!goodsFilled} title='货物信息' onHeaderPress={onPress}>
      {null}
    </ExpressSection>
  )
}
