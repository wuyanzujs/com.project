require('../support/register.cjs')
const assert = require('node:assert/strict')
const { test } = require('node:test')

const { createExpressInsurancePanelView } = require('@/services/express/insurance/insurance.view')

const { createValidExpressDraft } = require('../fixtures/express.cjs')
const { createReactHarness, findElement, loadReactModule } = require('../support/react-harness.cjs')

function textOf(element) {
  return [element.props?.children].flat(Infinity).join('')
}

function hasText(view, text) {
  return Boolean(findElement(view, element => textOf(element) === text))
}

function renderPickupSection(options = {}) {
  const harness = createReactHarness()
  const { ExpressPickupSection } = loadReactModule('pages/express/components/ExpressPickupSection/index.tsx', {
    'react/jsx-runtime': require('react/jsx-runtime'),
    react: harness.react,
    '@tarojs/components': { Image: 'Image', Text: 'Text', View: 'View' },
    '@/shared/components': { AppPressable: 'AppPressable' },
    '@/shared/components/AppIcon': { APP_IMAGE_ICONS: { arrowRightGrey: 'arrow.png' } },
    '../ExpressPickupTimeSheet': { ExpressPickupTimeSheet: 'ExpressPickupTimeSheet' },
    '../ExpressServicePointCard': { ExpressServicePointCard: 'ExpressServicePointCard' },
    './index.scss': {}
  })
  const view = harness.render(() =>
    ExpressPickupSection({
      pickup: { dispatch: 'Y', time: '', type: 'NORMAL', stationCode: '', stationName: '', nightNoticeAccepted: false },
      pickupTimeController: {
        dateOptions: [],
        loading: false,
        message: '',
        selectedDate: '',
        selectedTime: '',
        showNightNotice: false,
        onAcceptNightNotice() {},
        onDateChange() {},
        onQuery() {},
        onTimeChange() {}
      },
      needContact: 'Y',
      hasSenderAddress: options.hasSenderAddress ?? true,
      pickupTimeReady: options.pickupTimeReady ?? true,
      onModeChange() {},
      onNeedContactChange() {},
      onOpenStations() {}
    })
  )

  return { hasText: text => hasText(view, text), view }
}

test('取件模式切换和期望上门时间分别按寄件地址与表单齐备门控', () => {
  const empty = renderPickupSection({ hasSenderAddress: false, pickupTimeReady: false })
  assert.equal(empty.hasText('上门取件'), false)
  assert.equal(empty.hasText('期望上门时间'), false)
  assert.equal(empty.hasText('提前电话联系'), true)

  const senderOnly = renderPickupSection({ hasSenderAddress: true, pickupTimeReady: false })
  assert.equal(senderOnly.hasText('上门取件'), true)
  assert.equal(senderOnly.hasText('期望上门时间'), false)
  assert.equal(senderOnly.hasText('提前电话联系'), true)

  const ready = renderPickupSection({ hasSenderAddress: true, pickupTimeReady: true })
  assert.equal(ready.hasText('上门取件'), true)
  assert.equal(ready.hasText('期望上门时间'), true)
  assert.equal(ready.hasText('今天 一小时内'), true)
})

test('保价面板渲染生产端两档结构且不渲染选填角标', () => {
  const harness = createReactHarness()
  const { ExpressInsuranceCard } = loadReactModule('pages/express/components/ExpressInsuranceCard/index.tsx', {
    'react/jsx-runtime': require('react/jsx-runtime'),
    react: harness.react,
    '@tarojs/components': { Image: 'Image', Text: 'Text', View: 'View' },
    '@/services/express': { createExpressInsurancePanelView, getExpressQuoteInsurancePremium: () => null },
    '@/shared/components': { AppPressable: 'AppPressable', AppRadio: 'AppRadio' },
    '@/shared/components/AppIcon': {
      APP_IMAGE_ICONS: { arrowRightGrey: 'arrow.png', insuranceFullShield: 'full-shield.png', insuranceBasicShield: 'basic-shield.png' },
      AppIcon: 'AppIcon'
    },
    '@/shared/native': { AppLinearGradient: 'AppLinearGradient' },
    '@/styles/nativeTokens': { APP_STYLE_COLORS: require('@/styles/nativeTokens').APP_STYLE_COLORS },
    '../ExpressInsuranceValueSheet': { ExpressInsuranceValueSheet: 'ExpressInsuranceValueSheet' },
    './index.scss': {}
  })
  const controller = {
    loading: false,
    message: '',
    quote: null,
    onAmountChange() {},
    onCommit() {},
    onInvalidate() {},
    onOpenRules() {},
    onQuery() {},
    onTypeChange() {}
  }
  const view = harness.render(() => ExpressInsuranceCard({ controller, draft: createValidExpressDraft(), selectedProduct: null }))

  assert.equal(hasText(view, '保价'), true)
  assert.equal(hasText(view, '未保价物品最高赔付3倍运费'), true, 'header shows the production tip')
  assert.equal(hasText(view, '全额保'), true, 'banner tier renders')
  assert.equal(hasText(view, '专人受理 足额理赔 快速到账'), true, 'banner slogan renders')
  assert.equal(hasText(view, '基础保'), true, 'basic tier renders')
  assert.equal(hasText(view, '自定义物品价值'), true, 'empty value row renders')
  assert.equal(hasText(view, '填写实际价值'), true, 'empty value hint renders')
  assert.equal(hasText(view, '必填'), false, 'no required badge on collapsed panel')
})
