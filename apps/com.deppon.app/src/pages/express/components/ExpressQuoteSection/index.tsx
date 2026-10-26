import { Image, ScrollView, Text, View } from '@tarojs/components'

import productLongActive from '@/assets/express/express_product_bg_l_h.png'
import productLongIdle from '@/assets/express/express_product_bg_l_n.png'
import productShortActive from '@/assets/express/express_product_bg_s_h.png'
import productShortIdle from '@/assets/express/express_product_bg_s_n.png'
import { createExpressProductQuoteView, getExpressQuoteTimeProduct, isSameExpressQuote } from '@/services/express'
import type { ExpressProductQuote } from '@/services/express'
import { AppPressable } from '@/shared/components'
import { AppLinearGradient } from '@/shared/native'
import { APP_STYLE_COLORS } from '@/styles/nativeTokens'

import { ExpressSection } from '../ExpressSection'

import './index.scss'

const EXPRESS_MEDAL_ICON = 'https://ca.deppon.com.cn/ows/assets/express/28.png'
const EXPRESS_MEDAL_CODES = ['TKDR', 'TKCR', 'XJTK', 'DJTK']

interface ExpressQuoteSectionProps {
  /** 嵌入基础信息卡时使用行样式。 */
  plain?: boolean
  quotes: ExpressProductQuote[]
  selectedProduct: ExpressProductQuote | null
  onSelectProduct: (product: ExpressProductQuote) => void
}

export function ExpressQuoteSection({ plain = false, quotes, selectedProduct, onSelectProduct }: ExpressQuoteSectionProps) {
  if (quotes.length === 0) {
    return null
  }

  return (
    <ExpressSection plain={plain} title='预计送达时间'>
      <ScrollView className='express-quote-scroll' scrollX>
        {quotes.map(product => {
          const view = createExpressProductQuoteView(product)
          const selected = isSameExpressQuote(selectedProduct, product)
          const highEnd = EXPRESS_MEDAL_CODES.includes(String(getExpressQuoteTimeProduct(product).code))
          const background = view.longName ? (selected ? productLongActive : productLongIdle) : selected ? productShortActive : productShortIdle
          const ribbonClassName = view.longName ? 'express-quote-card__ribbon express-quote-card__ribbon--long' : 'express-quote-card__ribbon'
          const ribbonTitleClassName = selected
            ? 'express-quote-card__ribbon-title express-quote-card__ribbon-title--active'
            : 'express-quote-card__ribbon-title'
          const { start, time, end } = view.timeSegments

          return (
            <AppPressable
              accessibilityLabel={`选择产品${view.name}`}
              block
              className='express-quote-slot'
              key={view.key}
              onPress={() => onSelectProduct(product)}
            >
              <View className='express-quote-card'>
                <Image className='express-quote-card__background' mode='scaleToFill' src={background} />
                {highEnd ? <Image className='express-quote-card__medal' mode='aspectFit' src={EXPRESS_MEDAL_ICON} /> : null}
                <View className={ribbonClassName}>
                  <Text className={ribbonTitleClassName} numberOfLines={1}>
                    {view.name}
                  </Text>
                </View>
                <View className='express-quote-card__time'>
                  {time ? (
                    <>
                      <Text className='express-quote-card__time-label'>{start}</Text>
                      <Text className='express-quote-card__time-value'>{time}</Text>
                      <Text className='express-quote-card__time-label'>{end}</Text>
                    </>
                  ) : (
                    <Text className='express-quote-card__time-text' numberOfLines={1}>
                      {view.timeText}
                    </Text>
                  )}
                </View>
                <View className='express-quote-card__price'>
                  {view.freightAmount !== null ? (
                    <>
                      <Text className='express-quote-card__price-text'>¥{view.freightAmount}</Text>
                      <Text className='express-quote-card__price-suffix'>起</Text>
                    </>
                  ) : (
                    <Text className='express-quote-card__price-text'>--</Text>
                  )}
                </View>
              </View>
              {view.timeLimit > 0 ? (
                <View className='express-quote-card__limit'>
                  <AppLinearGradient
                    className='express-quote-card__limit-bg'
                    colors={[APP_STYLE_COLORS.quote.limitGradientStart, APP_STYLE_COLORS.quote.limitGradientEnd]}
                    start={{ x: 1, y: 0 }}
                    end={{ x: 0, y: 0 }}
                  />
                  <Text className='express-quote-card__limit-text'>惊喜优惠¥{view.timeLimit}</Text>
                </View>
              ) : null}
            </AppPressable>
          )
        })}
        <View className='express-quote-scroll-end' />
      </ScrollView>
    </ExpressSection>
  )
}
