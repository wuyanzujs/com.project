import { Image, ScrollView, Text, View } from '@tarojs/components'

import {
  createExpressProductQuoteView,
  getExpressQuoteTimeProduct
} from '@/services/express'
import type { ExpressProductQuote } from '@/services/express'
import { AppPressable } from '@/shared/components'

import { ExpressSection } from '../ExpressSection'

import './index.scss'

// 高端产品（特快当日/航空类）标题带右端的金冠勋章，与生产端同一素材。
const EXPRESS_MEDAL_ICON = 'https://ca.deppon.com.cn/ows/assets/express/28.png'
const EXPRESS_MEDAL_CODES = ['TKDR', 'TKCR', 'XJTK', 'DJTK']

interface ExpressQuoteSectionProps {
  /** 嵌在基础信息卡内时用行样式（生产端与货物/付款行同卡）。 */
  plain?: boolean
  quoteStaleReason: string
  quoteStatus: 'idle' | 'loading' | 'done' | 'error'
  quotes: ExpressProductQuote[]
  selectedProduct: ExpressProductQuote | null
  onQuote: () => void
  onSelectProduct: (product: ExpressProductQuote) => void
}

// 生产端产品卡：标题坐在卡片顶部的标题带上（未选中浅紫、选中深藏青并带
// 缎带折尾），时效行整行蓝色「运输时效：X」，底部黑色「¥ 运费 起」。
export function ExpressQuoteSection({
  plain = false,
  quoteStaleReason,
  quoteStatus,
  quotes,
  selectedProduct,
  onQuote,
  onSelectProduct
}: ExpressQuoteSectionProps) {
  if (quotes.length === 0) {
    return (
      <ExpressSection plain={plain} title='预计送达时间'>
        <View className='express-quote-status'>
          <Text className='express-quote-status__text'>
            {quoteStatus === 'loading'
              ? '正在获取价格…'
              : quoteStaleReason ||
                (quoteStatus === 'error'
                  ? '获取失败，请检查信息后重试'
                  : '收寄地址与货物齐全后自动试算')}
          </Text>
          {quoteStatus !== 'loading' ? (
            <AppPressable
              accessibilityLabel='重新获取产品价格'
              className='express-quote-status__retry'
              onPress={onQuote}
            >
              <Text className='express-quote-status__retry-text'>重新获取</Text>
            </AppPressable>
          ) : null}
        </View>
      </ExpressSection>
    )
  }

  return (
    <ExpressSection plain={plain} title='预计送达时间'>
      <ScrollView className='express-quote-scroll' scrollX>
        {quotes.map(product => {
          const view = createExpressProductQuoteView(product)
          const selected =
            selectedProduct?.omsProductCode === product.omsProductCode
          const highEnd = EXPRESS_MEDAL_CODES.includes(
            String(getExpressQuoteTimeProduct(product).code)
          )
          const cardClassName = selected
            ? 'express-quote-card express-quote-card--active'
            : 'express-quote-card'
          const bandClassName = selected
            ? 'express-quote-card__band express-quote-card__band--active'
            : 'express-quote-card__band'
          const titleClassName = selected
            ? 'express-quote-card__band-title express-quote-card__band-title--active'
            : 'express-quote-card__band-title'

          return (
            <View className='express-quote-slot' key={view.key}>
              <AppPressable
                accessibilityLabel={`选择产品${view.name}`}
                block
                className={cardClassName}
                selected={selected}
                onPress={() => onSelectProduct(product)}
              >
                {selected ? <View className='express-quote-card__tail' /> : null}
                <View className={bandClassName}>
                  <Text className={titleClassName}>{view.name}</Text>
                </View>
                {!selected && highEnd ? (
                  <Image
                    className='express-quote-card__medal'
                    mode='aspectFit'
                    src={EXPRESS_MEDAL_ICON}
                  />
                ) : null}
                <Text className='express-quote-card__time' numberOfLines={1}>
                  运输时效：{view.timeValue}
                </Text>
                <View className='express-quote-card__price'>
                  {view.freightAmount !== null ? (
                    <>
                      <Text className='express-quote-card__price-mark'>
                        {'¥ '}
                      </Text>
                      <Text className='express-quote-card__price-value'>
                        {view.freightAmount}
                      </Text>
                      <Text className='express-quote-card__price-mark'>
                        {' 起'}
                      </Text>
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
