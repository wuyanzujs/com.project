import { Image, Text, View } from '@tarojs/components'

import { AppPressable } from '@/shared/components'
import { APP_IMAGE_ICONS } from '@/shared/components/AppIcon'

import './index.scss'

interface ExpressSubmitBarProps {
  priceText: string
  quoteLoading: boolean
  submitting: boolean
  /** 已选产品的计费明细是否可用；不可用时点「明细」重新询价。 */
  detailAvailable: boolean
  detailVisible: boolean
  onQuote: () => void
  onSubmit: () => void
  onToggleDetail: () => void
}

export function ExpressSubmitBar({
  detailAvailable,
  detailVisible,
  priceText,
  quoteLoading,
  submitting,
  onQuote,
  onSubmit,
  onToggleDetail
}: ExpressSubmitBarProps) {
  return (
    <View className='express-submit'>
      <View className='express-submit__main'>
        <View className='express-submit__summary'>
          <View className='express-submit__price-row'>
            <AppPressable
              accessibilityLabel={quoteLoading ? '正在获取价格' : '获取产品价格'}
              className='express-submit__quote'
              disabled={quoteLoading}
              layout='row-center'
              onPress={onQuote}
            >
              <Text className='express-submit__label'>预估总价</Text>
              <Text className='express-submit__fee'>{priceText}</Text>
            </AppPressable>
            <View className='express-submit__divider' />
            <AppPressable
              accessibilityLabel={detailVisible ? '收起费用明细' : detailAvailable ? '展开费用明细' : '获取产品价格'}
              className='express-submit__detail-toggle'
              layout='row-center'
              onPress={() => {
                if (!detailAvailable) {
                  onQuote()
                  return
                }

                onToggleDetail()
              }}
            >
              <Text className='express-submit__detail'>明细</Text>
              <Image
                className={detailVisible ? 'express-submit__detail-icon express-submit__detail-icon--open' : 'express-submit__detail-icon'}
                mode='aspectFit'
                src={APP_IMAGE_ICONS.arrowUpGrey}
              />
            </AppPressable>
          </View>
          <Text className='express-submit__note'>费用以快递员核实为准</Text>
        </View>
        <AppPressable accessibilityLabel={submitting ? '订单提交中' : '立即下单'} className='express-submit__action' disabled={submitting} onPress={onSubmit}>
          <Text className='express-submit__text'>{submitting ? '提交中' : '立即下单'}</Text>
        </AppPressable>
      </View>
    </View>
  )
}
