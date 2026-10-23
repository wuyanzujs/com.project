require('../support/register.cjs')
const assert = require('node:assert/strict')
const { test } = require('node:test')

const { createExpressInsuranceView } = require('@/services/express/insurance/insurance.view')

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

test('保价卡折叠摘要使用生产端文案且不再渲染选填角标', () => {
  const harness = createReactHarness()
  const { ExpressInsuranceCard } = loadReactModule('pages/express/components/ExpressInsuranceCard/index.tsx', {
    'react/jsx-runtime': require('react/jsx-runtime'),
    react: harness.react,
    '@tarojs/components': { Input: 'Input', Text: 'Text', View: 'View' },
    '@/services/express': { createExpressInsuranceView },
    '@/shared/components': { AppPressable: 'AppPressable' },
    '@/styles/nativeTokens': { APP_NATIVE_TOKENS: { touch: { minimum: 44 } } },
    '../ExpressSection': { ExpressSection: props => ({ type: 'ExpressSection', props }) },
    './index.scss': {}
  })
  const controller = {
    loading: false,
    message: '',
    quote: null,
    onAmountChange() {},
    onInvalidate() {},
    onOpenRules() {},
    onQuery() {},
    onTypeChange() {}
  }
  const view = harness.render(() => ExpressInsuranceCard({ controller, draft: createValidExpressDraft() }))
  const section = findElement(view, element => element.props?.title)

  assert.equal(section.props.title, '保价')
  assert.equal(section.props.summary, '未保价物品最高赔付3倍运费')
  assert.equal(section.props.hint, undefined)
})
