import { Image, Text, View } from '@tarojs/components'

import { useState } from 'react'

import type { ExpressProductQuoteView } from '@/services/express'
import { AppPressable } from '@/shared/components'
import { APP_IMAGE_ICONS } from '@/shared/components/AppIcon'

import { ExpressPriceDetailPanel } from '../ExpressPriceDetailPanel'

import './index.scss'

interface ExpressSubmitBarProps {
  priceText: string
  quoteLoading: boolean
  submitting: boolean
  /** 已选产品的计费明细；没询到价时为 null，此时不展示展开面板。 */
  detailView: ExpressProductQuoteView | null
  onQuote: () => void
  onSubmit: () => void
}

export function ExpressSubmitBar({
  detailView,
  priceText,
  quoteLoading,
  submitting,
  onQuote,
  onSubmit
}: ExpressSubmitBarProps) {
  const [detailVisible, setDetailVisible] = useState(false)
  const canExpand = Boolean(detailView)

  return (
    <View className='express-submit'>
      {detailVisible && detailView ? (
        <ExpressPriceDetailPanel
          view={detailView}
          onClose={() => setDetailVisible(false)}
        />
      ) : null}
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
              accessibilityLabel={
                canExpand ? '展开费用明细' : '获取产品价格'
              }
              className='express-submit__detail-toggle'
              layout='row-center'
              onPress={() => {
                if (!canExpand) {
                  onQuote()
                  return
                }

                setDetailVisible(current => !current)
              }}
            >
              <Text className='express-submit__detail'>明细</Text>
              <Image
                className={
                  detailVisible
                    ? 'express-submit__detail-icon express-submit__detail-icon--open'
                    : 'express-submit__detail-icon'
                }
                mode='aspectFit'
                src={APP_IMAGE_ICONS.arrowUpGrey}
              />
            </AppPressable>
          </View>
          <Text className='express-submit__note'>费用以快递员核实为准</Text>
        </View>
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
    </View>
  )
}
