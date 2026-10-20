const assert = require('node:assert/strict')
const { test } = require('node:test')

const { createReactHarness, findElement, loadReactModule } = require('../support/react-harness.cjs')

test('support capsule and click target are both inside the draggable node', () => {
  const click = () => {}
  const { AppSupportFloat } = loadReactModule('shared/components/AppSupportFloat/index.tsx', {
    'react/jsx-runtime': require('react/jsx-runtime'),
    '@tarojs/components': { Image: 'Image', Text: 'Text', View: 'View' },
    '@/assets/express/customer_icon_service.png': 'production-customer.png',
    '@/shared/components': { AppPressable: 'AppPressable' },
    '@/shared/native': { AppNativeDraggable: 'Draggable', designPxToDp: px => px / 2 },
    './index.scss': {}
  })
  const view = AppSupportFloat({ label: '客服', onPress: click })
  assert.equal(view.type, 'Draggable', 'the positioned node itself moves, keeping the hit region aligned')
  assert.equal(view.props.style.position, 'absolute')
  const capsule = findElement(view.props.children, node => node.props?.className?.includes('app-support-float--compact'))
  assert.ok(capsule, 'the white capsule is a child of the moving node')
  assert.equal(findElement(capsule, node => node.type === 'AppPressable').props.onPress, click)
})

test('vertical dragging keeps offset across gestures, clamps bounds and survives interruption', () => {
  class Value {
    constructor(value) {
      this.value = value
      this.offset = 0
    }
    setValue(value) {
      this.value = value
    }
    setOffset(value) {
      this.offset = value
    }
    flattenOffset() {
      this.value += this.offset
      this.offset = 0
    }
    stopAnimation() {}
    get current() {
      return this.value + this.offset
    }
  }
  const harness = createReactHarness()
  let handlers
  const { AppNativeDraggable } = loadReactModule('shared/native/AppNativeDraggable.tsx', {
    'react/jsx-runtime': require('react/jsx-runtime'),
    react: harness.react,
    'react-native': {
      Animated: { Value, View: 'Animated.View' },
      PanResponder: {
        create: next => {
          handlers = next
          return { panHandlers: {} }
        }
      }
    },
    './AppDesignUnits': { designPxToDp: px => px / 2 }
  })
  const view = harness.render(() => AppNativeDraggable({ children: 'capsule', maxUp: 100, maxDown: 20 }))
  const value = view.props.style[1].transform[0].translateY
  assert.equal(handlers.onStartShouldSetPanResponder(), false, 'a tap remains a click')
  assert.equal(handlers.onMoveShouldSetPanResponder(null, { dx: 0, dy: 3 }), false)
  assert.equal(handlers.onMoveShouldSetPanResponder(null, { dx: 30, dy: 5 }), false, 'horizontal gestures are not captured')
  assert.equal(handlers.onMoveShouldSetPanResponder(null, { dx: 1, dy: 10 }), true)

  handlers.onPanResponderGrant()
  handlers.onPanResponderMove(null, { dy: -30 })
  handlers.onPanResponderRelease(null, { dy: -30 })
  assert.equal(value.current, -30)
  handlers.onPanResponderGrant()
  handlers.onPanResponderMove(null, { dy: -30 })
  handlers.onPanResponderTerminate(null, { dy: -30 })
  assert.equal(value.current, -50, 'upward movement clamps and commits even on termination')
  handlers.onPanResponderGrant()
  handlers.onPanResponderMove(null, { dy: 200 })
  handlers.onPanResponderRelease(null, { dy: 200 })
  assert.equal(value.current, 10, 'the next gesture begins from the committed offset')
})
