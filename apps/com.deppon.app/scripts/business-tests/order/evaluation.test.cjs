require('../support/register.cjs')
const assert = require('node:assert/strict')
const { test } = require('node:test')

const {
  createOrderDetailActions
} = require('@/services/order/order.detailActions')
const {
  ORDER_EVALUATION_API_ENDPOINTS
} = require('@/services/order/order.evaluation.api')
const {
  getOrderEvaluationLabels
} = require('@/services/order/order.evaluation.catalog')
const {
  ORDER_EVALUATION_SUGGESTION_MAX_LENGTH,
  applyOrderEvaluationSubmission,
  createOrderEvaluationContext,
  createOrderEvaluationDraft,
  createOrderEvaluationFallbackWebUri,
  createOrderEvaluationRoute,
  createOrderEvaluationSubmitRequest,
  createOrderEvaluationView,
  toggleOrderEvaluationLabel,
  updateOrderEvaluationLevel,
  updateOrderEvaluationSuggestion,
  validateOrderEvaluationDraft
} = require('@/services/order/order.evaluation.rules')

const { createOrderDetail } = require('../fixtures/order.cjs')

const cases = [
  {
    name: 'order evaluation maps sender receiver and signed contexts exactly',
    run() {
      const collection = createOrderEvaluationContext(
        createOrderDetail({ orderClassification: '1' }),
        'sender'
      )
      const signed = createOrderEvaluationContext(
        createOrderDetail({ orderClassification: '2' }),
        'sender'
      )
      const delivery = createOrderEvaluationContext(
        createOrderDetail({
          isSender: 'N',
          isReceiver: 'Y',
          orderClassification: '6'
        }),
        'receive'
      )

      assert.deepEqual(collection, {
        orderNumber: 'ORDER_001',
        waybillNumber: 'DPK123456789',
        role: 'sender',
        recordType: 'COLLECTION',
        query: {
          waybillNo: 'DPK123456789',
          cateGory: 1,
          sign: 'N'
        }
      })
      assert.equal(signed.recordType, 'DELIVERY')
      assert.deepEqual(signed.query, {
        waybillNo: 'DPK123456789',
        cateGory: 0,
        sign: 'Y'
      })
      assert.equal(delivery.recordType, 'DELIVERY')
      assert.deepEqual(delivery.query, {
        waybillNo: 'DPK123456789',
        cateGory: 0,
        sign: 'N'
      })
      assert.equal(
        createOrderEvaluationContext(
          createOrderDetail({ orderClassification: '0' }),
          'sender'
        ),
        null
      )
      assert.equal(
        createOrderEvaluationContext(
          createOrderDetail({ waybillNumber: '' }),
          'sender'
        ),
        null
      )
      assert.deepEqual(ORDER_EVALUATION_API_ENDPOINTS, {
        queryDetail:
          '/gwapi/onlineService/eco/online/evaluate/secure/queryEvaluateDetail',
        submit:
          '/gwapi/onlineService/eco/online/courier/evaluation/secure/commit'
      })
    }
  },
  {
    name: 'order evaluation normalizes pending and committed courier identity',
    run() {
      const context = createOrderEvaluationContext(
        createOrderDetail(),
        'sender'
      )
      const pending = createOrderEvaluationView(
        context,
        {
          avgStarLevel: '4.6',
          evaluateType: 'Courier',
          evaluateDetail: null,
          evaluateCourierMessage: {
            courierName: '王师傅',
            courierNo: 'EMP001',
            courierPhone: '13800138000',
            isCourier: 'Y',
            licensePlate: null,
            courierType: 'JD'
          }
        },
        'NOT_EVALUATED'
      )
      const committed = createOrderEvaluationView(
        context,
        {
          avgStarLevel: '7',
          evaluateType: 'Courier',
          evaluateCourierMessage: null,
          evaluateDetail: {
            courierNo: 'EMP002',
            courierName: '李师傅',
            courierPhone: null,
            courierRole: 'Driver',
            starLevel: '4',
            evaluateCode: '服务态度好',
            degree: 4,
            evaluateNpsCode: null,
            licensePlate: null
          }
        },
        'SUCCESS'
      )

      assert.equal(pending.committed, false)
      assert.equal(pending.courierCode, 'EMP001')
      assert.equal(pending.courierCompany, 'JD')
      assert.equal(pending.averageLevel, 4.6)
      assert.equal(pending.level, 5)
      assert.equal(committed.committed, true)
      assert.equal(committed.courierRole, 'Driver')
      assert.equal(committed.averageLevel, 5)
      assert.equal(committed.level, 4)
      assert.equal(committed.label, '服务态度好')
      assert.equal(
        createOrderEvaluationView(
          context,
          {
            avgStarLevel: null,
            evaluateType: 'Courier',
            evaluateDetail: null,
            evaluateCourierMessage: {
              courierName: '王师傅',
              courierNo: '',
              courierPhone: null,
              isCourier: 'Y',
              licensePlate: null
            }
          },
          'NOT_EVALUATED'
        ),
        null
      )
    }
  },
  {
    name: 'order evaluation catalog keeps exact role and sentiment labels',
    run() {
      const collectionNegative = getOrderEvaluationLabels('COLLECTION', 1)
      const collectionPositive = getOrderEvaluationLabels('COLLECTION', 5)
      const deliveryNegative = getOrderEvaluationLabels('DELIVERY', 4)
      const deliveryPositive = getOrderEvaluationLabels('DELIVERY', 5)

      assert.equal(collectionNegative.length, 12)
      assert.equal(collectionPositive.length, 11)
      assert.equal(deliveryNegative.length, 10)
      assert.equal(deliveryPositive.length, 9)
      assert.ok(collectionNegative.includes('小哥让线下转账'))
      assert.ok(collectionPositive.includes('主动上门取件'))
      assert.ok(deliveryNegative.includes('私自签收/放代收点'))
      assert.ok(deliveryPositive.includes('派送前主动联系'))
      assert.deepEqual(
        getOrderEvaluationLabels('COLLECTION', 2),
        collectionNegative
      )
      assert.deepEqual(
        getOrderEvaluationLabels('DELIVERY', 1),
        deliveryNegative
      )
    }
  },
  {
    name: 'order evaluation draft resets labels and maps validated submit payload',
    run() {
      const context = createOrderEvaluationContext(
        createOrderDetail(),
        'sender'
      )
      const view = createOrderEvaluationView(
        context,
        {
          avgStarLevel: '4.8',
          evaluateType: 'Courier',
          evaluateDetail: null,
          evaluateCourierMessage: {
            courierName: '王师傅',
            courierNo: 'EMP001',
            courierPhone: null,
            isCourier: 'Y',
            licensePlate: null
          }
        },
        'NOT_EVALUATED'
      )
      let draft = createOrderEvaluationDraft()

      assert.equal(validateOrderEvaluationDraft(draft).valid, false)
      draft = toggleOrderEvaluationLabel(draft, 'COLLECTION', '服务态度好')
      assert.deepEqual(draft.selectedLabels, ['服务态度好'])
      assert.equal(validateOrderEvaluationDraft(draft).valid, true)
      draft = updateOrderEvaluationSuggestion(draft, '太短')
      assert.equal(validateOrderEvaluationDraft(draft).valid, false)
      draft = updateOrderEvaluationSuggestion(
        draft,
        '服务很专业，取件也非常及时' + '好'.repeat(300)
      )
      assert.equal(
        draft.suggestion.length,
        ORDER_EVALUATION_SUGGESTION_MAX_LENGTH
      )
      assert.equal(validateOrderEvaluationDraft(draft).valid, true)
      assert.deepEqual(createOrderEvaluationSubmitRequest(view, draft), {
        waybillNo: 'DPK123456789',
        recordType: 'COLLECTION',
        courierCode: 'EMP001',
        courierName: '王师傅',
        starLevel: 5,
        suggestion: draft.suggestion,
        evaluationLabels: ['服务态度好']
      })
      assert.equal(applyOrderEvaluationSubmission(view, draft).committed, true)
      assert.deepEqual(updateOrderEvaluationLevel(draft, 4).selectedLabels, [])
    }
  },
  {
    name: 'order evaluation detail action uses App route with controlled web fallback',
    run() {
      const order = createOrderDetail()
      const route = createOrderEvaluationRoute(order, 'sender')
      const action = createOrderDetailActions(order, {
        role: 'sender'
      }).find(item => item.kind === 'evaluate')
      const senderFallback = new URL(
        createOrderEvaluationFallbackWebUri(order, 'sender', '13800138000'),
        'https://owstest.deppon.com'
      )
      const receiverFallback = new URL(
        createOrderEvaluationFallbackWebUri(
          { ...order, isSender: 'N', isReceiver: 'Y' },
          'receive',
          '13900139000'
        ),
        'https://owstest.deppon.com'
      )

      assert.ok(route.startsWith('/pages/order/evaluation/index?'))
      assert.equal(action.target, 'route')
      assert.equal(action.badgeText, 'App')
      assert.equal(action.route, route)
      assert.equal(senderFallback.pathname, '/depponmobile/survey/land')
      assert.equal(senderFallback.searchParams.get('scene'), 'S0505')
      assert.equal(senderFallback.searchParams.get('channel'), 'APP')
      assert.equal(receiverFallback.searchParams.get('scene'), 'S0907')
      assert.deepEqual(JSON.parse(senderFallback.searchParams.get('rowData')), [
        { field: 'orderNumber', data: 'ORDER_001' },
        { field: 'waybillNumber', data: 'DPK123456789' }
      ])
    }
  }
]

for (const { name, run } of cases) {
  test(name, { timeout: 10000 }, run)
}
