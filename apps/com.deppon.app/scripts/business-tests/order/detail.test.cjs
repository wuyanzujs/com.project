require('../support/register.cjs')
const assert = require('node:assert/strict')
const { test } = require('node:test')

const {
  createOrderDetailViewModel,
  getOrderDetailRouteParams
} = require('@/pages/order/detail/orderDetailViewModel')
const {
  createOrderDetailActions,
  createOrderUrgeContext
} = require('@/services/order/order.detailActions')
const {
  resolveOrderUrgeMenuAction
} = require('@/services/order/order.detailUseCases')
const {
  formatAmount,
  formatMeasure,
  maskMobile,
  toDisplayText
} = require('@/services/order/order.display')
const {
  createOrderPdcFeedbackContext,
  createOrderPdcFeedbackRequest
} = require('@/services/order/order.pdcFeedback')
const {
  ORDER_PDC_FEEDBACK_API_ENDPOINTS
} = require('@/services/order/order.pdcFeedback.api')
const {
  createOrderSubscriptionAction,
  normalizeWaybillSubscription
} = require('@/services/order/order.subscription')

const { createOrderDetail, getActionKinds } = require('../fixtures/order.cjs')

const cases = [
  {
    name: 'order display helpers normalize money, measures and masked mobile',
    run() {
      assert.equal(formatAmount(12), '¥12.00')
      assert.equal(formatAmount(0), '')
      assert.equal(formatMeasure('3.5', 'kg'), '3.5kg')
      assert.equal(formatMeasure(0, 'kg'), '--')
      assert.equal(toDisplayText('  hello  '), 'hello')
      assert.equal(toDisplayText(''), '--')
      assert.equal(maskMobile('13800138000'), '138****8000')
      assert.equal(maskMobile('13****8000'), '13****8000')
    }
  },
  {
    name: 'order subscription mapper normalizes role, status and waybill fields',
    run() {
      const subscription = normalizeWaybillSubscription({
        sender: ' 张三 ',
        sendCity: ' 上海 ',
        consignee: ' 李四 ',
        consignCity: ' 深圳 ',
        wayBillNo: ' DPK123456789 ',
        tableType: 'EXPRESS',
        statusType: '派送中',
        orderClassification: '6',
        createWaybillTime: 'invalid-time',
        isSender: 'N',
        isReceiver: 'Y'
      })

      assert.deepEqual(subscription, {
        id: 'DPK123456789',
        role: 'receive',
        senderName: '张三',
        senderCity: '上海',
        consigneeName: '李四',
        consigneeCity: '深圳',
        waybillNumber: 'DPK123456789',
        statusText: '派送中',
        createdAt: 'invalid-time',
        isExpress: true
      })
      assert.equal(normalizeWaybillSubscription({ wayBillNo: ' ' }), null)
    }
  },
  {
    name: 'order subscription action reflects loading and followed state',
    run() {
      assert.equal(createOrderSubscriptionAction(null), null)
      assert.equal(createOrderSubscriptionAction(false).title, '关注运单')
      assert.equal(createOrderSubscriptionAction(true).title, '取消关注')
      assert.equal(createOrderSubscriptionAction(true, true).title, '处理中')
      assert.equal(createOrderSubscriptionAction(false).target, 'subscription')
    }
  },
  {
    name: 'order detail actions hide secure actions in public track mode',
    run() {
      assert.deepEqual(
        createOrderDetailActions(createOrderDetail(), {
          publicTrackMode: true,
          role: 'sender'
        }),
        []
      )
    }
  },
  {
    name: 'order detail view model normalizes public and secure route state',
    run() {
      const publicView = createOrderDetailViewModel(
        getOrderDetailRouteParams({ waybillNo: 'DPK123456789' }),
        null
      )

      assert.equal(publicView.publicTrackMode, true)
      assert.equal(publicView.detailRole, 'sender')
      assert.equal(publicView.cancelable, false)
      assert.equal(publicView.deletable, false)

      const secureView = createOrderDetailViewModel(
        getOrderDetailRouteParams({
          orderNo: 'ORDER_001',
          role: 'receive',
          view: 'secure'
        }),
        createOrderDetail({
          isSender: 'N',
          isReceiver: 'Y',
          orderClassification: '0',
          waybillNumber: null
        })
      )

      assert.equal(secureView.publicTrackMode, false)
      assert.equal(secureView.detailRole, 'receive')
      assert.equal(secureView.cancelable, true)
      assert.equal(secureView.deletable, false)
      assert.equal(secureView.resendActionText, '一键回寄')
    }
  },
  {
    name: 'order PDC feedback stays signed source gated and maps exact payload',
    run() {
      const signedOrder = {
        orderClassification: '2',
        waybillNumber: 'DP123456789'
      }
      const first = createOrderPdcFeedbackContext(
        signedOrder,
        'APP_PDC_KDYZJO_ENTRY'
      )
      const second = createOrderPdcFeedbackContext(
        signedOrder,
        'APP_PDC_KDYZJT_ENTRY'
      )

      assert.deepEqual(first, {
        waybillNumber: 'DP123456789',
        source: 'APP_PDC_KDYZJO_ENTRY',
        sendFrequency: 'ONE'
      })
      assert.deepEqual(second, {
        waybillNumber: 'DP123456789',
        source: 'APP_PDC_KDYZJT_ENTRY',
        sendFrequency: 'TWO'
      })
      assert.deepEqual(createOrderPdcFeedbackRequest(second, 'N'), {
        waybillNo: 'DP123456789',
        sendFrequency: 'TWO',
        feedbackResult: 'N'
      })
      assert.deepEqual(ORDER_PDC_FEEDBACK_API_ENDPOINTS, {
        query: '/gwapi/commentService/eco/comment/secure/queryFeedback',
        submit: '/gwapi/commentService/eco/comment/secure/submitFeedback'
      })
      assert.equal(
        createOrderPdcFeedbackContext(
          { ...signedOrder, orderClassification: '1' },
          'PDC_KDYZJO'
        ),
        null
      )
      assert.equal(
        createOrderPdcFeedbackContext(signedOrder, 'ORDER_DETAIL'),
        null
      )
      assert.equal(
        createOrderPdcFeedbackContext(signedOrder, 'PDC_KDYZJO', true),
        null
      )
    }
  },
  {
    name: 'order detail routes wait-allot edits to App and transit edits to H5',
    run() {
      const waitActions = createOrderDetailActions(
        createOrderDetail({
          orderClassification: '0',
          orderClassName: '待揽件',
          orderStatus: '待揽件',
          waybillNumber: '',
          modifyFlag: true
        }),
        {
          role: 'sender'
        }
      )
      const transitActions = createOrderDetailActions(createOrderDetail(), {
        role: 'sender'
      })
      const modifyOrder = waitActions.find(item => item.kind === 'modifyOrder')
      const modifyWaybill = transitActions.find(
        item => item.kind === 'modifyWaybill'
      )

      assert.ok(modifyOrder)
      assert.equal(modifyOrder.target, 'route')
      assert.ok(modifyOrder.route.includes('/pages/order/edit/index'))
      assert.ok(modifyOrder.route.includes('orderNumber=ORDER_001'))
      assert.equal(
        waitActions.some(item => item.kind === 'modifyWaybill'),
        false
      )
      assert.ok(modifyWaybill)
      assert.equal(modifyWaybill.target, 'web')
    }
  },
  {
    name: 'order detail actions expose sender transit action set',
    run() {
      // 投诉动作有 90 天下单时间窗，用相对时间避免夹具日期过期。
      const order = createOrderDetail({
        orderTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      })
      const kinds = getActionKinds(
        createOrderDetailActions(order, {
          role: 'sender'
        })
      )
      const urge = createOrderUrgeContext(order, {
        role: 'sender'
      })

      assert.deepEqual(kinds, [
        'service',
        'notifyDeliver',
        'invalidWaybill',
        'evaluate',
        'complaint',
        'claim',
        'modifyWaybill'
      ])
      assert.deepEqual(urge, {
        voucherNumber: 'DPK123456789',
        voucherType: '1',
        urgeType: 'URGE_BILL_NO',
        buttonCode: '',
        contactPhone: '95353'
      })
    }
  },
  {
    name: 'order detail actions expose receiver delivery preference without sender-only actions',
    run() {
      const actions = createOrderDetailActions(
        createOrderDetail({
          isSender: 'N',
          isReceiver: 'Y'
        }),
        {
          role: 'receive'
        }
      )
      const kinds = getActionKinds(actions)

      assert.ok(kinds.includes('deliveryPreference'))
      assert.ok(!kinds.includes('notifyDeliver'))
      assert.ok(!kinds.includes('invalidWaybill'))
      assert.ok(!kinds.includes('modifyWaybill'))
    }
  },
  {
    name: 'order detail actions expose signed invoice route and invalid department phone',
    run() {
      const signedActions = createOrderDetailActions(
        createOrderDetail({
          orderClassification: '2',
          orderClassName: '已签收',
          orderStatus: '已签收'
        }),
        {
          role: 'sender'
        }
      )
      const invoiceAction = signedActions.find(item => item.kind === 'invoice')
      const departmentAction = createOrderDetailActions(
        createOrderDetail({
          orderClassification: '5',
          orderClassName: '已取消',
          orderStatus: '已取消',
          stationCode: '021A001',
          stationPhone: '021-12345678'
        }),
        {
          role: 'sender'
        }
      ).find(item => item.kind === 'departmentPhone')

      assert.ok(invoiceAction)
      assert.equal(invoiceAction.target, 'route')
      assert.ok(invoiceAction.route.includes('waybillNumber=DPK123456789'))
      assert.deepEqual(departmentAction.departmentPhone, {
        stationCode: '021A001',
        phoneNumber: '021-12345678'
      })
    }
  },
  {
    name: 'order urge menu resolver opens progress web target from modal button',
    run() {
      const webUri =
        '/depponmobile/mow/order/urgeProgress?voucherType=1&voucherNumber=DPK123456789'
      const action = {
        kind: 'urge',
        title: '我要催单',
        summary: '催促当前订单尽快处理',
        target: 'urge',
        tone: 'warning',
        webSource: 'ORDER_DETAIL_URGE_PROGRESS',
        webUri,
        urge: {
          voucherNumber: 'DPK123456789',
          voucherType: '1',
          urgeType: 'URGE_BILL_NO',
          buttonCode: 'FOLLOW_UP',
          contactPhone: '95353'
        },
        loginRequired: true
      }

      assert.deepEqual(
        resolveOrderUrgeMenuAction(
          {
            buttonCode: 'VIEW_PROGRESS',
            buttonName: '查看进度'
          },
          action
        ),
        {
          kind: 'progress',
          webSource: 'ORDER_DETAIL_URGE_PROGRESS',
          webUri,
          title: '查看进度'
        }
      )
    }
  }
]

for (const { name, run } of cases) {
  test(name, { timeout: 10000 }, run)
}
