require('../support/register.cjs')
const assert = require('node:assert/strict')
const { test } = require('node:test')

const { dpCache, CACHE_KEYS, clearAccountScopedCache } = require('@/cache')
const { resolveExpressGoodsInput } = require('@/services/express/goods/goodsEditor.rules')
const { expressGoodsHistory } = require('@/services/express/goods/goodsHistory')

const { createValidExpressDraft } = require('../fixtures/express.cjs')
const { createDeferred } = require('../support/deferred.cjs')
const { createReactHarness, loadReactModule, findElement } = require('../support/react-harness.cjs')
const { createStorageFixture } = require('../support/storage-fixture.cjs')

test('goods editor preserves insurance and accepts custom names and decimal weight/volume', () => {
  const initial = { ...createValidExpressDraft().goods, insuredAmount: 300 }
  const { goods, message } = resolveExpressGoodsInput(initial, { name: '  五金工具  ', weight: '2.5', count: '3', volume: '0.12', volumeEnabled: true })
  assert.equal(message, '')
  assert.deepEqual(goods, { ...initial, name: '五金工具', weight: 2.5, count: 3, volume: 0.12 })
})

test('invalid goods never silently become zero volume or rounded package counts', () => {
  const input = { name: '衣物', weight: '1', count: '1', volume: '', volumeEnabled: true }
  for (const patch of [
    { name: ' ' },
    { weight: 'NaN' },
    { weight: '0' },
    { weight: '10001' },
    { count: '1.5' },
    { count: '1000' },
    { volume: '-1' },
    { volume: 'abc' }
  ]) {
    assert.equal(resolveExpressGoodsInput(createValidExpressDraft().goods, { ...input, ...patch }).goods, null, JSON.stringify(patch))
  }
  assert.equal(resolveExpressGoodsInput(createValidExpressDraft().goods, { ...input, volume: '-1', volumeEnabled: false }).goods.volume, 0)
})

test('recent shipping names are trimmed, bounded, separate from contraband history and cleared on account change', async t => {
  createStorageFixture(t)
  await dpCache.set(CACHE_KEYS.goodsQueryHistory, { data: [{ goodsName: '禁寄物品' }] })
  for (let index = 0; index < 10; index++) await expressGoodsHistory.save(`物品${index}`)
  await expressGoodsHistory.save(' 物品5 ')
  assert.equal(await expressGoodsHistory.save('  '), false)
  assert.equal(expressGoodsHistory.get().length, 8)
  assert.equal(expressGoodsHistory.get()[0], '物品5')
  assert.equal(expressGoodsHistory.get().filter(name => name === '物品5').length, 1)
  assert.equal(expressGoodsHistory.get().includes('禁寄物品'), false)
  await clearAccountScopedCache()
  assert.deepEqual(expressGoodsHistory.get(), [])
})

test('goods page keeps the input while typing multiple characters and returns the complete custom name', async t => {
  const harness = createReactHarness()
  const saved = t.mock.fn()
  const saveHistory = t.mock.fn(async () => true)
  const goBack = t.mock.fn(async () => {})
  const suggest = t.mock.fn()
  const page = loadReactModule('pages/express/goods/index.tsx', {
    react: harness.react,
    'react/jsx-runtime': require('react/jsx-runtime'),
    '@tarojs/components': { Input: 'Input', ScrollView: 'ScrollView', Text: 'Text', Textarea: 'Textarea', View: 'View' },
    '@tarojs/taro': { showToast: t.mock.fn(), navigateBack: goBack },
    '@/services/express': {
      createExpressDraft: () => ({ goods: { ...createValidExpressDraft().goods, name: '' } }),
      expressDraftStorage: { restore: () => null },
      expressGoodsBridge: { save: saved }
    },
    '@/services/express/goods/goodsEditor.rules': require('@/services/express/goods/goodsEditor.rules'),
    '@/services/express/goods/goodsHistory': { expressGoodsHistory: { get: () => [], save: saveHistory } },
    '@/services/goods': { goodsQueryService: { getHotGoods: () => [{ name: '文件' }] } },
    '@/shared/components': { AppPage: 'AppPage', AppPressable: 'AppPressable', AppSwitch: 'AppSwitch' },
    '@/shared/components/AppIcon': { AppIcon: 'AppIcon' },
    '@/shared/navigation/appNavigation': { navigateToAppRoute() {} },
    '@/shared/navigation/routes': { APP_ROUTES: {} },
    '@/shared/platform': { getNativeCapabilityErrorMessage: () => '当前不支持', shareWithApp: async () => {} },
    '@/styles/nativeTokens': {
      APP_STYLE_COLORS: { brand: { default: '#1a5eff' }, text: { faint: '#a3a3a3', heading: '#16181a', ink: '#111111', placeholder: '#98a2b3' } }
    },
    '../components/ExpressNavBar': { ExpressNavBar: 'ExpressNavBar' },
    './components/GoodsMediaUploader': { GoodsMediaUploader: 'GoodsMediaUploader' },
    './components/GoodsStepper': { GoodsStepper: 'GoodsStepper' },
    './hooks/useGoodsNameSuggestions': {
      useGoodsNameSuggestions: () => ({ suggestions: [], message: '', loading: false, handleNameInput: suggest, clearSuggestions() {} })
    },
    './index.scss': {},
    './content.scss': {},
    './chips.scss': {}
  }).default
  const render = () => harness.render(page)
  const input = () => findElement(render(), element => element.type === 'Input' && element.props.placeholder === '请输入物品名称')
  input().props.onInput({ detail: { value: '五' } })
  assert.equal(input().props.value, '五')
  input().props.onInput({ detail: { value: '五金工具' } })
  assert.equal(input().props.value, '五金工具')
  const textarea = findElement(render(), element => element.type === 'Textarea' && element.props.placeholder === '其他需求可以留言告诉快递小哥哦~')
  assert.equal(textarea.props.maxlength, 100)
  textarea.props.onInput({ detail: { value: '放门口' } })
  const footer = render().props.footer
  await findElement(footer, element => element.props?.accessibilityLabel === '确认货物信息').props.onPress()
  assert.equal(saved.mock.calls[0].arguments[0].name, '五金工具')
  assert.equal(saved.mock.calls[0].arguments[1], '放门口')
  assert.equal(saveHistory.mock.calls[0].arguments[0], '五金工具')
  assert.equal(goBack.mock.callCount(), 1)
})

test('货物信息页回传的捎话与货物只消费一次，确认后清空', () => {
  const { expressGoodsBridge } = require('@/services/express/goods/goodsBridge')
  const goods = createValidExpressDraft().goods

  expressGoodsBridge.save({ ...goods, name: '衣物' }, ' 放门口 ')
  const payload = expressGoodsBridge.consume()

  assert.equal(payload.goods.name, '衣物')
  assert.equal(payload.remark, ' 放门口 ')
  assert.equal(expressGoodsBridge.consume(), null)
})

test('热门寄件标签按四列三行固定顺序展示', () => {
  const { goodsQueryService } = require('@/services/goods/goods.service')

  assert.deepEqual(
    goodsQueryService.getHotGoods().map(item => item.name),
    ['五金配件', '服装鞋帽', '文件', '化妆品', '行李', '日用品', '礼品', '家电设备', '家具建材', '食品', '特产', '工艺品']
  )
})

test('a late goods suggestion cannot restore old names after new input or unmount', async t => {
  const harness = createReactHarness()
  const requests = []
  const timers = new Map()
  let timerId = 0
  const { useGoodsNameSuggestions } = loadReactModule(
    'pages/express/goods/hooks/useGoodsNameSuggestions.ts',
    {
      react: harness.react,
      '@/services/express': {
        expressService: {
          queryGoodsNames: t.mock.fn(() => {
            const pending = createDeferred()
            requests.push(pending)
            return pending.promise
          })
        }
      }
    },
    {
      setTimeout: callback => {
        timers.set(++timerId, callback)
        return timerId
      },
      clearTimeout: id => timers.delete(id)
    }
  )
  const render = () => harness.render(useGoodsNameSuggestions)
  const fire = () => {
    const callbacks = Array.from(timers.values())
    timers.clear()
    callbacks.forEach(callback => callback())
  }
  render().handleNameInput('旧名')
  fire()
  assert.equal(render().loading, true)
  render().handleNameInput('新名')
  requests[0].resolve({ status: true, result: { list: [{ productKeyWord: '旧名' }] } })
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(render().suggestions.length, 0)
  fire()
  requests[1].reject(new Error('offline'))
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(render().loading, false)
  assert.match(render().message, /手动填写/)
  render().handleNameInput('卸载前')
  fire()
  harness.unmount()
  requests[2].resolve({ status: true, result: { list: [{ productKeyWord: '卸载前' }] } })
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(render().suggestions.length, 0)
})
