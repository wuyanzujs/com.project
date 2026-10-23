require('../support/register.cjs')
const assert = require('node:assert/strict')
const { test } = require('node:test')

const {
  createExpressProductQuoteView,
  getExpressQuoteKey,
  getExpressQuoteTimeLimit,
  isSameExpressQuote,
  splitExpressQuoteTimeText
} = require('@/services/express/core/express.quoteView')

const { createReactHarness, findElement, loadReactModule } = require('../support/react-harness.cjs')

const baseProduct = {
  productName: '小件标快',
  omsProductCode: 'PACKAGE',
  days: '明天18:00前',
  daysFormat: null,
  arriveDate: null,
  message: null,
  label: '',
  totalfee: 10,
  billWeight: 1,
  detail: [{ priceEntryCode: 'FRT', priceEntryName: '基础运费', caculateFee: 10 }],
  timeProducts: [{ timeProductsCode: 'XJTK', timeProductsName: '小件标快次日' }]
}

test('quote card splits the reference time text into lead, time and trailing segments', () => {
  assert.deepEqual(splitExpressQuoteTimeText('明天18:00前'), { start: '明天', time: '18:00', end: '前' })
  assert.deepEqual(splitExpressQuoteTimeText('22号12:00前'), { start: '22号', time: '12:00', end: '前' })
  assert.deepEqual(splitExpressQuoteTimeText('次日18:00'), { start: '', time: '', end: '' })
  assert.deepEqual(splitExpressQuoteTimeText(''), { start: '', time: '', end: '' })

  const view = createExpressProductQuoteView(baseProduct)
  assert.equal(view.name, '小件标快次日')
  assert.equal(view.longName, true)
  assert.deepEqual(view.timeSegments, { start: '明天', time: '18:00', end: '前' })
  assert.equal(view.timeText, '明天18:00前')
  assert.equal(view.timeLimit, 0)

  const shortNameView = createExpressProductQuoteView({
    ...baseProduct,
    days: '22号12:00前',
    timeProducts: [{ timeProductsCode: 'TKDR', timeProductsName: '特快隔日' }]
  })
  assert.equal(shortNameView.longName, false)
  assert.deepEqual(shortNameView.timeSegments, { start: '22号', time: '12:00', end: '前' })

  // 无法拆分的时效文案保留原文，交给卡片单行展示。
  const arriveDateView = createExpressProductQuoteView({
    ...baseProduct,
    days: null,
    arriveDate: '次日达',
    timeProducts: null
  })
  assert.equal(arriveDateView.timeText, '次日达')
  assert.deepEqual(arriveDateView.timeSegments, { start: '', time: '', end: '' })
})

test('quote card exposes the limited offer discount used by the 惊喜优惠 badge', () => {
  assert.equal(getExpressQuoteTimeLimit(baseProduct), 0)
  assert.equal(getExpressQuoteTimeLimit({ ...baseProduct, discount: [{ marketCode: 'YHJ', reduceFee: 5 }] }), 0, 'coupon discounts do not light the badge')
  assert.equal(getExpressQuoteTimeLimit({ ...baseProduct, discount: [{ marketCode: 'XLYHF', reduceFee: 3 }] }), 3)
})

test('quote identity distinguishes same-code routes and time products while tolerating price changes', () => {
  const first = { ...baseProduct, totalfee: 10, mainRoutePref: 'A', timeProducts: [{ timeProductsCode: 'FAST', timeProductsName: '标快' }] }
  const sameIdentity = { ...first, totalfee: 12 }
  const otherRoute = { ...first, mainRoutePref: 'B' }
  const otherTime = { ...first, timeProducts: [{ timeProductsCode: 'SLOW', timeProductsName: '慢车' }] }
  assert.equal(isSameExpressQuote(first, sameIdentity), true)
  assert.equal(isSameExpressQuote(first, otherRoute), false)
  assert.equal(isSameExpressQuote(first, otherTime), false)
  assert.notEqual(getExpressQuoteKey(first), getExpressQuoteKey(otherRoute))
})

test('quote card renders one-line product name, split time text and limited offer badge', () => {
  const product = {
    ...baseProduct,
    discount: [{ marketCode: 'XLYHF', reduceFee: 3 }]
  }
  const { ExpressQuoteSection } = loadReactModule('pages/express/components/ExpressQuoteSection/index.tsx', {
    'react/jsx-runtime': require('react/jsx-runtime'),
    '@tarojs/components': { Image: 'Image', ScrollView: 'ScrollView', Text: 'Text', View: 'View' },
    '@/assets/express/express_product_bg_l_h.png': 'long-active.png',
    '@/assets/express/express_product_bg_l_n.png': 'long-idle.png',
    '@/assets/express/express_product_bg_s_h.png': 'short-active.png',
    '@/assets/express/express_product_bg_s_n.png': 'short-idle.png',
    '@/services/express': require('@/services/express/core/express.quoteView'),
    '@/shared/components': { AppPressable: 'AppPressable' },
    '../ExpressSection': { ExpressSection: 'ExpressSection' },
    './index.scss': {}
  })
  const harness = createReactHarness()
  const view = harness.render(() =>
    ExpressQuoteSection({
      plain: true,
      quoteStatus: 'done',
      quotes: [product],
      selectedProduct: product,
      onQuote() {},
      onSelectProduct() {}
    })
  )

  const title = findElement(view, element => element.type === 'Text' && element.props?.children === '小件标快次日')
  assert.equal(title.props.numberOfLines, 1, 'product name stays on one line')
  // 渐变书签、折角和描边都在生产原图内，长标题选中态使用对应背景。
  assert.match(String(title.props?.className), /express-quote-card__ribbon-title--active/, 'selected card paints the ribbon title white')
  assert.equal(
    findElement(view, element => element.props?.className === 'express-quote-card__background')?.props.src,
    'long-active.png',
    'selected long-title card uses the production ribbon and corner asset'
  )

  assert.ok(
    findElement(view, element => element.props?.children === '明天'),
    'lead segment rendered'
  )
  assert.ok(
    findElement(view, element => element.props?.children === '18:00'),
    'time segment rendered'
  )
  assert.ok(
    findElement(view, element => element.props?.children === '前'),
    'trailing segment rendered'
  )
  assert.equal(
    findElement(view, element => typeof element.props?.children === 'string' && element.props.children.includes('运输时效')),
    undefined,
    'the invented 运输时效 prefix is not rendered'
  )
  const textOf = element => [element.props?.children].flat(Infinity).join('')

  assert.ok(
    findElement(view, element => textOf(element) === '惊喜优惠¥3'),
    'limited offer badge rendered'
  )
  assert.ok(
    findElement(view, element => element.props?.children === '¥ ' && element.props?.className === 'express-quote-card__price-mark'),
    'price keeps the ¥ prefix'
  )
})
