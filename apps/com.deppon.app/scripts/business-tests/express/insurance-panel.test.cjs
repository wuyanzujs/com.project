require('../support/register.cjs')
const assert = require('node:assert/strict')
const { test } = require('node:test')

const { getExpressQuoteInsurancePremium } = require('@/services/express/core/express.quoteView')
const { createExpressInsuranceCapabilityKey } = require('@/services/express/insurance/insurance.rules')
const { createExpressInsurancePanelView } = require('@/services/express/insurance/insurance.view')

const { createValidExpressDraft } = require('../fixtures/express.cjs')
const { createReactHarness, findElement, loadReactModule } = require('../support/react-harness.cjs')

function textOf(element) {
  return [element.props?.children].flat(Infinity).join('')
}

function hasText(view, text) {
  return Boolean(findElement(view, element => textOf(element) === text))
}

function draftWithCapability(patch) {
  const draft = createValidExpressDraft()

  return {
    ...draft,
    insurance: {
      ...draft.insurance,
      capability: { inputKey: createExpressInsuranceCapabilityKey(draft), fragile: false, worryFree: false, disabled: false, ...patch }
    }
  }
}

test('保价面板按产品与货物能力生成两档：标准件全额保+基础保', () => {
  const view = createExpressInsurancePanelView(createValidExpressDraft())

  assert.equal(view.banner.type, 'QEB')
  assert.equal(view.banner.title, '全额保')
  assert.equal(view.banner.slogan, '专人受理 足额理赔 快速到账')
  assert.equal(view.banner.limit, 1000000)
  assert.equal(view.basicAvailable, true)
  assert.equal(view.disabled, false)
})

test('易碎品横幅换成易碎保且隐藏基础保，省心保横幅限额 500', () => {
  const fragile = createExpressInsurancePanelView(draftWithCapability({ fragile: true }))

  assert.equal(fragile.banner.type, 'NORMAL')
  assert.equal(fragile.banner.title, '易碎保')
  assert.equal(fragile.basicAvailable, false)

  const worryFree = createExpressInsurancePanelView(draftWithCapability({ worryFree: true }))

  assert.equal(worryFree.banner.type, 'SXB')
  assert.equal(worryFree.banner.title, '省心保')
  assert.equal(worryFree.banner.limit, 500)
  assert.equal(worryFree.basicAvailable, true)
})

test('后端标记不可保价时横幅隐藏，物流产品无全额保', () => {
  const disabled = createExpressInsurancePanelView(draftWithCapability({ disabled: true }))

  assert.equal(disabled.disabled, true)
  assert.equal(disabled.banner, null)

  const draft = createValidExpressDraft()
  const logistics = createExpressInsurancePanelView({
    ...draft,
    selectedProduct: { ...draft.selectedProduct, omsProductCode: 'JZKH' }
  })

  assert.equal(logistics.banner, null)
  assert.equal(logistics.basicAvailable, true)
})

function renderInsuranceCard(draft, options = {}) {
  const harness = createReactHarness()
  const commits = []
  const controller = {
    loading: false,
    message: '',
    quote: null,
    onAmountChange() {},
    onCommit: (type, amount) => commits.push([type, amount]),
    onInvalidate() {},
    onOpenRules() {},
    onQuery() {},
    onTypeChange() {}
  }
  const { ExpressInsuranceCard } = loadReactModule('pages/express/components/ExpressInsuranceCard/index.tsx', {
    'react/jsx-runtime': require('react/jsx-runtime'),
    react: harness.react,
    '@tarojs/components': { Image: 'Image', Text: 'Text', View: 'View' },
    '@/services/express': {
      createExpressInsurancePanelView,
      getExpressQuoteInsurancePremium: () => (options.premium === undefined ? null : options.premium)
    },
    '@/shared/components': { AppPressable: 'AppPressable', AppRadio: 'AppRadio' },
    '@/shared/components/AppIcon': {
      APP_IMAGE_ICONS: { arrowRightGrey: 'arrow.png', insuranceFullShield: 'full-shield.png', insuranceBasicShield: 'basic-shield.png' },
      AppIcon: 'AppIcon'
    },
    '@/shared/native': { AppLinearGradient: 'AppLinearGradient' },
    '@/styles/nativeTokens': { APP_STYLE_COLORS: require('@/styles/nativeTokens').APP_STYLE_COLORS },
    '../ExpressInsuranceValueSheet': { ExpressInsuranceValueSheet: 'Sheet' },
    './index.scss': {}
  })

  return { commits, controller, harness, ExpressInsuranceCard }
}

test('价值行点击打开弹层，确认与不保价都走一次性提交', () => {
  const { commits, controller, harness, ExpressInsuranceCard } = renderInsuranceCard(createValidExpressDraft())
  const draft = createValidExpressDraft()
  let view = harness.render(() => ExpressInsuranceCard({ children: null, controller, draft, selectedProduct: null }))

  findElement(view, element => element.props?.accessibilityLabel === '填写全额保物品价值').props.onPress()
  view = harness.render(() => ExpressInsuranceCard({ children: null, controller, draft, selectedProduct: null }))

  const sheet = findElement(view, element => element.type === 'Sheet')
  assert.equal(sheet.props.visible, true)
  assert.equal(sheet.props.tierTitle, '全额保')
  assert.equal(sheet.props.limit, 1000000)
  assert.equal(sheet.props.insured, false)

  sheet.props.onConfirm(300)
  view = harness.render(() => ExpressInsuranceCard({ children: null, controller, draft, selectedProduct: null }))

  assert.deepEqual(commits, [['QEB', 300]])
  assert.equal(findElement(view, element => element.type === 'Sheet').props.visible, false)

  findElement(view, element => element.props?.accessibilityLabel === '填写基础保物品价值').props.onPress()
  view = harness.render(() => ExpressInsuranceCard({ children: null, controller, draft, selectedProduct: null }))
  findElement(view, element => element.type === 'Sheet').props.onDecline()

  assert.deepEqual(commits, [
    ['QEB', 300],
    ['NORMAL', 0]
  ])
})

test('已填金额时横幅行展示保价金额与保费，未选档保持空态', () => {
  const base = createValidExpressDraft()
  const draft = { ...base, goods: { ...base.goods, insuredAmount: 300 }, insurance: { ...base.insurance, type: 'QEB' } }
  const { controller, harness, ExpressInsuranceCard } = renderInsuranceCard(draft, { premium: 2.5 })
  const view = harness.render(() =>
    ExpressInsuranceCard({ children: null, controller, draft, selectedProduct: { detail: [{ priceEntryCode: 'BF', caculateFee: '2.5' }] } })
  )

  assert.equal(hasText(view, '保价金额'), true)
  assert.equal(hasText(view, '¥300'), true)
  assert.equal(hasText(view, '¥2.5'), true)
  assert.equal(hasText(view, '自定义物品价值'), true, 'basic row stays empty')
})

test('保费从报价明细的 BF 口径提取，缺失返回 null', () => {
  assert.equal(getExpressQuoteInsurancePremium({ detail: [{ priceEntryCode: 'FRT', caculateFee: '10' }] }), null)
  assert.equal(getExpressQuoteInsurancePremium({ detail: [{ priceEntryCode: 'bf', caculateFee: '2.5' }] }), 2.5)
  assert.equal(getExpressQuoteInsurancePremium({ detail: [{ priceEntryCode: 'BF', caculateFee: '0' }] }), 0)
})

function loadSheet(harness, taro, history) {
  const { ExpressInsuranceValueSheet } = loadReactModule('pages/express/components/ExpressInsuranceValueSheet/index.tsx', {
    'react/jsx-runtime': require('react/jsx-runtime'),
    react: harness.react,
    '@tarojs/components': { Input: 'Input', ScrollView: 'ScrollView', Text: 'Text', View: 'View' },
    '@tarojs/taro': taro,
    '@/shared/components': { AppPressable: 'AppPressable' },
    '@/shared/components/AppIcon': { AppIcon: 'AppIcon' },
    '@/shared/native': {
      AppLinearGradient: 'AppLinearGradient',
      AppNativeModalSheet: 'AppNativeModalSheet',
      AppNativePressable: 'AppNativePressable'
    },
    '@/shared/platform': { dialPhone: async number => calls.push(number) },
    '@/services/express': { expressRealPriceHistory: history },
    '@/styles/nativeTokens': { APP_STYLE_COLORS: require('@/styles/nativeTokens').APP_STYLE_COLORS },
    './index.scss': {}
  })

  return ExpressInsuranceValueSheet
}

const calls = []

test('弹层确认校验空值与上限，上限弹窗可转 95353', async () => {
  const harness = createReactHarness()
  const toasts = []
  const modals = []
  const taro = {
    showToast: options => toasts.push(options.title),
    showModal: async options => {
      modals.push(options)

      return { confirm: true }
    }
  }
  const saved = []
  const history = {
    get: () => [...saved].reverse(),
    save: async value => {
      saved.push(value)

      return true
    }
  }
  const ExpressInsuranceValueSheet = loadSheet(harness, taro, history)
  const confirmed = []
  const props = {
    visible: true,
    tierTitle: '全额保',
    limit: 1000000,
    initialAmount: 0,
    insured: false,
    onClose() {},
    onConfirm: amount => confirmed.push(amount),
    onDecline() {}
  }
  let view = harness.render(() => ExpressInsuranceValueSheet(props))
  const typeInput = value => {
    findElement(view, element => element.type === 'Input').props.onInput({ detail: { value } })
    view = harness.render(() => ExpressInsuranceValueSheet(props))
  }
  const pressConfirm = async () => {
    await findElement(view, element => element.props?.accessibilityLabel === '确认保价').props.onPress()
    view = harness.render(() => ExpressInsuranceValueSheet(props))
  }

  typeInput('')
  await pressConfirm()
  assert.deepEqual(toasts, ['建议您如实填写物品价值'])
  assert.deepEqual(confirmed, [])

  typeInput('2000000')
  await pressConfirm()
  assert.match(modals[0].content, /上限为1000000元/)
  assert.deepEqual(calls, ['95353'])
  assert.deepEqual(confirmed, [])

  typeInput('600')
  await pressConfirm()
  assert.deepEqual(confirmed, [600])
  assert.deepEqual(saved, [600])
})

test('弹层未保价时展示风险提醒与不保价出口，历史金额可回填', async () => {
  const harness = createReactHarness()
  const taro = {
    showToast() {},
    showModal: async () => ({ confirm: false })
  }
  const history = { get: () => ['500', '300', '200', '100', '50'], save: async () => true }
  const ExpressInsuranceValueSheet = loadSheet(harness, taro, history)
  const confirmed = []
  const props = {
    visible: true,
    tierTitle: '基础保',
    limit: 1000000,
    initialAmount: 0,
    insured: false,
    onClose() {},
    onConfirm: amount => confirmed.push(amount),
    onDecline() {}
  }
  let view = harness.render(() => ExpressInsuranceValueSheet(props))
  // harness 的 effect 在首次渲染时执行，重渲染一次才能看到回填的历史与初始金额。
  view = harness.render(() => ExpressInsuranceValueSheet(props))

  assert.equal(hasText(view, '风险提醒'), true)
  assert.equal(hasText(view, '最近使用'), true)
  assert.equal(hasText(view, '知悉风险，不保价'), true)

  findElement(view, element => element.props?.accessibilityLabel === '使用历史金额500元').props.onPress()
  view = harness.render(() => ExpressInsuranceValueSheet(props))
  await findElement(view, element => element.props?.accessibilityLabel === '确认保价').props.onPress()

  assert.deepEqual(confirmed, [500])
})

test('已保价时弹层主按钮为确定且无风险提醒', () => {
  const harness = createReactHarness()
  const taro = { showToast() {}, showModal: async () => ({ confirm: false }) }
  const ExpressInsuranceValueSheet = loadSheet(harness, taro, { get: () => [], save: async () => true })
  const view = harness.render(() =>
    ExpressInsuranceValueSheet({
      visible: true,
      tierTitle: '全额保',
      limit: 1000000,
      initialAmount: 300,
      insured: true,
      onClose() {},
      onConfirm() {},
      onDecline() {}
    })
  )

  assert.equal(hasText(view, '风险提醒'), false)
  assert.equal(hasText(view, '确定'), true)
  assert.equal(hasText(view, '知悉风险，不保价'), false)
})
