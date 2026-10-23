import { Image, ScrollView, Text, View } from '@tarojs/components'

import productLongActive from '@/assets/express/express_product_bg_l_h.png'
import productLongIdle from '@/assets/express/express_product_bg_l_n.png'
import productShortActive from '@/assets/express/express_product_bg_s_h.png'
import productShortIdle from '@/assets/express/express_product_bg_s_n.png'
import { createExpressProductQuoteView, getExpressQuoteTimeProduct, isSameExpressQuote } from '@/services/express'
import type { ExpressProductQuote } from '@/services/express'
import { AppPressable } from '@/shared/components'

import { ExpressSection } from '../ExpressSection'

import './index.scss'

const EXPRESS_MEDAL_ICON = 'https://ca.deppon.com.cn/ows/assets/express/28.png'
const EXPRESS_MEDAL_CODES = ['TKDR', 'TKCR', 'XJTK', 'DJTK']

interface ExpressQuoteSectionProps {
  /** 嵌入基础信息卡时使用行样式。 */
  plain?: boolean
  quoteStaleReason: string
  quoteStatus: 'idle' | 'loading' | 'done' | 'error'
  quotes: ExpressProductQuote[]
  selectedProduct: ExpressProductQuote | null
  onQuote: () => void
  onSelectProduct: (product: ExpressProductQuote) => void
}

export function ExpressQuoteSection({
  plain = false,
  quoteStaleReason,
  quoteStatus,
  quotes,
  selectedProduct,
  onQuote,
  onSelectProduct
}: ExpressQuoteSectionProps) {
  if (quotes.length === 0 || quoteStaleReason || quoteStatus === 'loading') {
    // 条件未齐或变化后等待自动计价，只有请求失败才提供重试入口。
    if (quoteStatus !== 'error') {
      return null
    }

    return (
      <ExpressSection plain={plain} title='预计送达时间'>
        <View className='express-quote-status'>
          <Text className='express-quote-status__text'>获取失败，请检查信息后重试</Text>
          <AppPressable accessibilityLabel='重新获取产品价格' className='express-quote-status__retry' onPress={onQuote}>
            <Text className='express-quote-status__retry-text'>重新获取</Text>
          </AppPressable>
        </View>
      </ExpressSection>
    )
  }

  return (
    <ExpressSection plain={plain} title='预计送达时间'>
      <ScrollView className='express-quote-scroll' scrollX>
        {quotes.map(product => {
          const view = createExpressProductQuoteView(product)
          const selected = isSameExpressQuote(selectedProduct, product)
          const highEnd = EXPRESS_MEDAL_CODES.includes(String(getExpressQuoteTimeProduct(product).code))
          const cardClassName = selected ? 'express-quote-card express-quote-card--active' : 'express-quote-card'
          const background = view.longName ? (selected ? productLongActive : productLongIdle) : selected ? productShortActive : productShortIdle
          const ribbonClassName = view.longName ? 'express-quote-card__ribbon express-quote-card__ribbon--long' : 'express-quote-card__ribbon'
          const ribbonTitleClassName = selected
            ? 'express-quote-card__ribbon-title express-quote-card__ribbon-title--active'
            : 'express-quote-card__ribbon-title'
          const { start, time, end } = view.timeSegments

          return (
            <View className='express-quote-slot' key={view.key}>
              <AppPressable
                accessibilityLabel={`选择产品${view.name}`}
                block
                className={cardClassName}
                selected={selected}
                onPress={() => onSelectProduct(product)}
              >
                {/* APK 原图内已包含渐变书签、折角和描边，保留长/短标题与选中变体。 */}
                <Image className='express-quote-card__background' mode='scaleToFill' src={background} />
                <View className={ribbonClassName}>
                  <Text className={ribbonTitleClassName} numberOfLines={1}>
                    {view.name}
                  </Text>
                </View>
                {!selected && highEnd ? <Image className='express-quote-card__medal' mode='aspectFit' src={EXPRESS_MEDAL_ICON} /> : null}
                {view.timeLimit > 0 ? (
                  <View className='express-quote-card__limit'>
                    <Text className='express-quote-card__limit-text'>惊喜优惠¥{view.timeLimit}</Text>
                  </View>
                ) : null}
                <View className='express-quote-card__time'>
                  {time ? (
                    <>
                      <Text className='express-quote-card__time-label'>{start}</Text>
                      <Text className='express-quote-card__time-value'>{time}</Text>
                      <Text className='express-quote-card__time-label'>{end}</Text>
                    </>
                  ) : (
                    <Text className='express-quote-card__time-label' numberOfLines={1}>
                      {view.timeText}
                    </Text>
                  )}
                </View>
                <View className='express-quote-card__price'>
                  {view.freightAmount !== null ? (
                    <>
                      <Text className='express-quote-card__price-mark'>{'¥ '}</Text>
                      <Text className='express-quote-card__price-value'>{view.freightAmount}</Text>
                      <Text className='express-quote-card__price-mark'>{' 起'}</Text>
                    </>
                  ) : (
                    <Text className='express-quote-card__price-mark'>--</Text>
                  )}
                </View>
              </AppPressable>
            </View>
          )
        })}
      </ScrollView>
    </ExpressSection>
  )
}
