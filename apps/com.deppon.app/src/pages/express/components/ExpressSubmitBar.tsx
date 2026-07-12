import { Text, View } from '@tarojs/components'

import { AppPressable } from '../../../shared/components'

import './ExpressSubmitBar.scss'

interface ExpressSubmitBarProps {
  priceText: string
  quoteLoading: boolean
  submitting: boolean
  onQuote: () => void
  onSubmit: () => void
}

export function ExpressSubmitBar({
  priceText,
  quoteLoading,
  submitting,
  onQuote,
  onSubmit
}: ExpressSubmitBarProps) {
  return (
    <View className='express-submit'>
      <AppPressable
        accessibilityLabel={quoteLoading ? '正在获取价格' : '获取产品价格'}
        className='express-submit__summary'
        disabled={quoteLoading}
        layout='column-start'
        onPress={onQuote}
      >
        <View className='express-submit__price-row'>
          <Text className='express-submit__label'>预估总价</Text>
          <Text className='express-submit__fee'>{priceText}</Text>
          <Text className='express-submit__detail'>
            {quoteLoading ? '计费中' : '明细'}
          </Text>
        </View>
        <Text className='express-submit__note'>费用以快递员核实为准</Text>
      </AppPressable>
      <AppPressable
        accessibilityLabel={submitting ? '订单提交中' : '立即下单'}
        className='express-submit__action'
        disabled={submitting}
        onPress={onSubmit}
      >
        <Text className='express-submit__text'>
          {submitting ? '提交中' : '立即下单'}
        </Text>
      </AppPressable>
    </View>
  )
}
