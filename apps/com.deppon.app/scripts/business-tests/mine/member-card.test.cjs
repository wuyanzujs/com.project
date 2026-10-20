require('../support/register.cjs')
const assert = require('node:assert/strict')
const { test } = require('node:test')

const mineModel = require('@/pages/mine/mine.model')

const { createReactHarness, findElement, loadReactModule } = require('../support/react-harness.cjs')

const MEMBER = {
  levelName: '普通会员',
  levelCode: 0,
  growthValue: 0,
  maxGrowthValue: 85,
  points: 60
}

function loadCard(harness) {
  return loadReactModule('pages/mine/components/MineMemberCard/index.tsx', {
    react: harness.react,
    'react/jsx-runtime': require('react/jsx-runtime'),
    '@tarojs/components': { Image: 'Image', Text: 'Text', View: 'View' },
    'react-native-svg': {
      Defs: 'Defs',
      LinearGradient: 'LinearGradient',
      Rect: 'Rect',
      Stop: 'Stop',
      Svg: 'Svg'
    },
    '@/shared/components': { AppPressable: 'AppPressable' },
    '@/styles/nativeTokens': {
      APP_STYLE_COLORS: { member: { svipGradientStart: '#fff', svipGradientMid: '#fff', svipGradientEnd: '#fff' } }
    },
    '../../mine.model': mineModel,
    './index.scss': {}
  }).MineMemberCard
}

// 递归收集文本，会员卡里文案被多层 Text 包裹
function collectText(node, out = []) {
  if (node === null || node === undefined) return out
  if (typeof node === 'string' || typeof node === 'number') {
    out.push(String(node))
    return out
  }
  if (typeof node !== 'object') return out
  const children = node.props?.children

  if (Array.isArray(children)) {
    children.forEach(child => collectText(child, out))
  } else {
    collectText(children, out)
  }
  return out
}

test('expire coupon badge text matches the expected copy and stays hidden at zero', () => {
  assert.equal(mineModel.getExpireCouponBadgeText(2), '2张快过期啦')
  assert.equal(mineModel.getExpireCouponBadgeText(1), '1张快过期啦')
  assert.equal(mineModel.getExpireCouponBadgeText(0), '')
  assert.equal(mineModel.getExpireCouponBadgeText(-3), '')
})

test('member card renders the growth text and rights count', () => {
  const harness = createReactHarness()
  const MineMemberCard = loadCard(harness)
  const view = harness.render(() => MineMemberCard({ levelCode: 0, member: MEMBER, couponCount: 5, onOpen: () => undefined }))
  const text = collectText(view).join('')

  // 会员卡文案：普通会员 / 2项权益 / 当前成长值 0/85
  assert.ok(text.includes('普通会员'), text)
  assert.ok(text.includes('2项权益'), text)
  assert.ok(text.includes('当前成长值 0/85'), text)
  assert.ok(text.includes('我的积分60'), text)
})

test('member card shows the expiring coupon badge only when the count is positive', () => {
  const harness = createReactHarness()
  const MineMemberCard = loadCard(harness)

  const withBadge = harness.render(() => MineMemberCard({ levelCode: 0, member: MEMBER, couponCount: 5, expireCouponCount: 2, onOpen: () => undefined }))
  assert.ok(collectText(withBadge).includes('2张快过期啦'))

  const withoutBadge = harness.render(() => MineMemberCard({ levelCode: 0, member: MEMBER, couponCount: 5, expireCouponCount: 0, onOpen: () => undefined }))
  assert.ok(!collectText(withoutBadge).join('|').includes('快过期'))
})

test('member card falls back to a placeholder when the max growth value is missing', () => {
  const harness = createReactHarness()
  const MineMemberCard = loadCard(harness)
  const view = harness.render(() =>
    MineMemberCard({
      levelCode: 0,
      member: { ...MEMBER, maxGrowthValue: 0 },
      couponCount: 0,
      onOpen: () => undefined
    })
  )
  const growthText = findElement(view, element => element.props?.className === 'mine-member-card__growth')

  assert.ok(collectText(growthText).join('').includes('当前成长值 0/--'))
})
