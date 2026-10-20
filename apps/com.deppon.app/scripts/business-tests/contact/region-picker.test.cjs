require('../support/register.cjs')
const assert = require('node:assert/strict')
const { test } = require('node:test')

const regionRules = require('@/services/contact/region.rules')
const nativeTokens = require('@/styles/nativeTokens')

const { createReactHarness, findElement, loadReactModule } = require('../support/react-harness.cjs')

const FIXTURE = [
  {
    nationCode: '100000',
    nationName: '中国',
    province: [
      {
        provinceCode: '310000',
        provinceName: '上海',
        city: [
          {
            cityCode: '310000-1',
            cityName: '上海市',
            county: [{ countyCode: '310120', countyName: '奉贤区' }]
          }
        ]
      },
      {
        provinceCode: '440000',
        provinceName: '广东省',
        city: [
          {
            cityCode: '440100',
            cityName: '广州市',
            county: [
              { countyCode: '440103', countyName: '荔湾区' },
              { countyCode: '440104', countyName: '越秀区' }
            ]
          }
        ]
      }
    ]
  }
]

const PROVINCES = regionRules.normalizeRegionTree(FIXTURE)

function textOf(element) {
  return [element?.props?.children].flat(Infinity).join('')
}

function loadPicker(t, options = {}) {
  const harness = createReactHarness()
  const onSelect = t.mock.fn()
  const onClose = t.mock.fn()
  const fetchRegionTree = options.fetchRegionTree ?? t.mock.fn(async () => PROVINCES)
  const module = loadReactModule('pages/contact/edit/components/RegionPicker/index.tsx', {
    react: harness.react,
    'react/jsx-runtime': require('react/jsx-runtime'),
    '@tarojs/components': { Input: 'Input', ScrollView: 'ScrollView', Text: 'Text', View: 'View' },
    '@/services/contact/region.rules': regionRules,
    '@/services/contact/region.service': { regionService: { loadProvinces: fetchRegionTree } },
    '@/shared/components': { AppPressable: 'AppPressable' },
    '@/shared/components/AppIcon': { AppIcon: 'AppIcon' },
    '@/styles/nativeTokens': nativeTokens,
    './index.scss': {}
  })

  const render = value =>
    harness.render(() =>
      module.RegionPicker({
        onClose,
        onSelect,
        value: { cityName: '', countyName: '', provinceName: '', ...value },
        visible: options.visible ?? true
      })
    )

  return { fetchRegionTree, harness, onClose, onSelect, render }
}

async function flush() {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

test('region picker stays hidden until it is opened', async t => {
  const { render } = loadPicker(t, { visible: false })

  assert.equal(render(), null)
})

test('region picker lists hot cities and every province once the data loads', async t => {
  const { harness, fetchRegionTree, render } = loadPicker(t)
  const view = render()

  assert.ok(findElement(view, element => textOf(element) === '选择城市'))
  assert.ok(findElement(view, element => textOf(element) === '热门城市'))
  assert.equal(fetchRegionTree.mock.callCount(), 1)

  await flush()
  const loaded = render()
  harness.unmount()

  assert.ok(findElement(loaded, element => textOf(element) === '请选择省份'))
  for (const province of ['上海', '广东省']) {
    assert.ok(
      findElement(loaded, element => textOf(element) === province),
      `province row ${province}`
    )
  }
  assert.equal(fetchRegionTree.mock.callCount(), 1, 'region data is loaded only once')
})

test('region picker drills into cities and counties then reports the selection', async t => {
  const { harness, onSelect, render } = loadPicker(t)
  render()
  await flush()
  let view = render()

  await findElement(view, element => element.props?.accessibilityLabel === '选择广东省').props.onPress()
  view = render()

  assert.ok(findElement(view, element => textOf(element) === '请选择城市'))

  await findElement(view, element => element.props?.accessibilityLabel === '选择广州市').props.onPress()
  view = render()

  assert.ok(findElement(view, element => textOf(element) === '请选择区县'))

  await findElement(view, element => element.props?.accessibilityLabel === '选择越秀区').props.onPress()
  harness.unmount()

  assert.equal(onSelect.mock.callCount(), 1)
  assert.equal(onSelect.mock.calls[0].arguments[0].label, '广东省 广州市 越秀区')
  assert.equal(onSelect.mock.calls[0].arguments[0].countyName, '越秀区')
})

test('region picker hot city jumps straight to its counties', async t => {
  const { harness, render } = loadPicker(t)
  render()
  await flush()
  let view = render()

  await findElement(view, element => element.props?.accessibilityLabel === '选择上海市').props.onPress()
  view = render()
  harness.unmount()

  assert.ok(findElement(view, element => textOf(element) === '请选择区县'))
  assert.ok(findElement(view, element => textOf(element) === '奉贤区'))
})

test('region picker search returns county level matches', async t => {
  const { harness, onSelect, render } = loadPicker(t)
  render()
  await flush()
  let view = render()

  const input = findElement(view, element => element.type === 'Input')
  input.props.onInput({ detail: { value: '越秀' } })
  view = render()

  assert.ok(findElement(view, element => textOf(element) === '广东省 广州市 越秀区'))

  await findElement(view, element => element.props?.accessibilityLabel === '选择广东省 广州市 越秀区').props.onPress()
  harness.unmount()

  assert.equal(onSelect.mock.calls[0].arguments[0].cityName, '广州市')
  assert.equal(onSelect.mock.calls[0].arguments[0].countyName, '越秀区')
})

test('region picker reports a load failure instead of showing an empty list', async t => {
  const { harness, render } = loadPicker(t, {
    fetchRegionTree: async () => {
      throw new Error('offline')
    }
  })
  render()
  await flush()
  const view = render()
  harness.unmount()

  assert.ok(findElement(view, element => textOf(element) === '城市数据加载失败，请稍后重试'))
})
