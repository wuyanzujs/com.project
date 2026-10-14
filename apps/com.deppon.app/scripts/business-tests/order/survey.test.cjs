require('../support/register.cjs')
const assert = require('node:assert/strict')
const { test } = require('node:test')

const { ORDER_NPS_SURVEY_API_ENDPOINTS, orderNpsSurveyApi } = require('@/services/order/order.npsSurvey.api')
const {
  createOrderNpsDraft,
  createOrderNpsLabelContent,
  createOrderNpsSubmitRequest,
  toggleOrderNpsReason,
  updateOrderNpsCategory,
  updateOrderNpsScore
} = require('@/services/order/order.npsSurvey.rules')
const { ORDER_SCENE_SURVEY_API_ENDPOINTS, orderSceneSurveyApi } = require('@/services/order/order.sceneSurvey.api')
const { orderSceneSurveyOrchestrator } = require('@/services/order/order.sceneSurvey.orchestrator')
const {
  ORDER_SCENE_SURVEY_WINDOW_MS,
  createOrderSceneLabelSubmitRequest,
  createOrderSceneScoreSubmitRequest,
  createOrderSceneSurveyContext,
  getOrderSceneScoreLabels,
  normalizeOrderSceneSurveyQuestion,
  parseOrderSceneSurveyTime,
  validateOrderSceneScoreDraft
} = require('@/services/order/order.sceneSurvey.rules')

const { createOrderDetail } = require('../fixtures/order.cjs')

const cases = [
  {
    name: 'order scene survey selects exact role state source and seven day plans',
    run() {
      const now = new Date(2026, 6, 15, 12, 0, 0).getTime()
      const createContext = (detail, role = 'sender', source = 'ORDER_DETAIL', mobile = '13800138000', publicTrackMode = false) =>
        createOrderSceneSurveyContext({
          detail,
          role,
          source,
          publicTrackMode,
          mobile,
          childChannel: 'APP',
          now
        })
      const getCodes = context => context?.plan.map(item => item.code) ?? []
      const sameDay = createContext(
        createOrderDetail({
          orderTime: new Date(2026, 6, 15, 8, 0, 0).getTime()
        })
      )
      const earlierSender = createContext(createOrderDetail({ orderTime: now - 24 * 60 * 60 * 1000 }))
      const transitReceiver = createContext(createOrderDetail({ orderTime: now - 24 * 60 * 60 * 1000 }), 'receive')
      const signedSender = createContext(
        createOrderDetail({
          orderClassification: '2',
          signTime: now - 60 * 60 * 1000
        })
      )
      const signedReceiver = createContext(
        createOrderDetail({
          orderClassification: '2',
          signTime: now - 60 * 60 * 1000
        }),
        'receive'
      )
      const pdc = createContext(
        createOrderDetail({
          orderClassification: '2',
          signTime: now - 60 * 60 * 1000
        }),
        'sender',
        'PDC_KDYZJO'
      )
      const npsWithoutCachedMobile = createContext(
        createOrderDetail({
          orderClassification: '2',
          signTime: now - 60 * 60 * 1000
        }),
        'receive',
        'ECS_MESSAGE',
        ''
      )

      assert.deepEqual(getCodes(sameDay), ['S0206', 'T0101', 'T0401'])
      assert.deepEqual(getCodes(earlierSender), ['S0601', 'T0101', 'T0401'])
      assert.deepEqual(getCodes(transitReceiver), ['S0601'])
      assert.deepEqual(getCodes(signedSender), ['N0101', 'S0908'])
      assert.deepEqual(getCodes(signedReceiver), ['N0101', 'T0201', 'S0907_1', 'T0501'])
      assert.deepEqual(getCodes(pdc), ['N0101'])
      assert.deepEqual(getCodes(npsWithoutCachedMobile), ['N0101'])
      assert.equal(
        createContext(
          createOrderDetail({
            orderClassification: '2',
            signTime: now - ORDER_SCENE_SURVEY_WINDOW_MS
          })
        ),
        null
      )
      assert.equal(
        createContext(
          createOrderDetail({
            orderClassification: '2',
            signTime: now + 1000
          })
        ),
        null
      )
      assert.equal(createContext(createOrderDetail(), 'sender', 'ORDER_DETAIL', '', true), null)
      assert.equal(parseOrderSceneSurveyTime(Math.floor(now / 1000)), now)
      assert.equal(parseOrderSceneSurveyTime('2026年07月15日 12:00'), now)
      assert.equal(parseOrderSceneSurveyTime('not-a-time'), null)
    }
  },
  {
    name: 'order scene survey normalizes first question and exact endpoints',
    run() {
      const scoreItem = normalizeOrderSceneSurveyQuestion(
        { code: 'S0206', kind: 'SCORE' },
        {
          questionId: 'QUESTION_SCORE',
          title: '您对本次揽收服务满意吗？',
          labelList: [
            {
              id: 'LABEL_NEGATIVE',
              labelName: '上门不及时',
              starMin: '1',
              starMax: '3'
            },
            {
              id: 'LABEL_POSITIVE',
              labelName: '服务专业',
              starMin: '4',
              starMax: '5'
            },
            {
              id: '',
              labelName: '无效标签',
              starMin: '1',
              starMax: '5'
            }
          ]
        }
      )

      assert.equal(scoreItem.kind, 'SCORE')
      assert.equal(scoreItem.labels.length, 2)
      assert.deepEqual(
        getOrderSceneScoreLabels(scoreItem, 5).map(item => item.id),
        ['LABEL_POSITIVE']
      )
      assert.equal(
        normalizeOrderSceneSurveyQuestion(
          { code: 'S0206', kind: 'SCORE' },
          {
            questionId: 'QUESTION_INVALID_RANGE',
            title: '无效评分范围不应生成问卷',
            labelList: [
              {
                id: 'LABEL_OUT_OF_RANGE',
                labelName: '越界标签',
                starMin: '0',
                starMax: '6'
              },
              {
                id: 'LABEL_FRACTIONAL',
                labelName: '小数标签',
                starMin: '1.5',
                starMax: '5'
              }
            ]
          }
        ),
        null
      )
      assert.equal(
        normalizeOrderSceneSurveyQuestion(
          { code: 'T0101', kind: 'LABEL' },
          {
            questionId: 'QUESTION_LABEL',
            title: '请选择原因',
            labelList: []
          }
        ),
        null
      )
      assert.deepEqual(ORDER_SCENE_SURVEY_API_ENDPOINTS, {
        query: '/gwapi/commentService/eco/comment/queryComment',
        definition: '/gwapi/commentService/eco/comment/queryCommentScene',
        submit: '/gwapi/commentService/eco/comment/insertComment'
      })
    }
  },
  {
    name: 'order scene score and label submissions keep distinct payload rules',
    run() {
      const context = {
        key: 'DPK123456789|sender',
        waybillNumber: 'DPK123456789',
        mobile: '13800138000',
        childChannel: 'APP',
        role: 'sender',
        source: 'ORDER_DETAIL',
        plan: []
      }
      const scoreItem = {
        key: 'SCORE:S0206',
        id: 'QUESTION_SCORE',
        code: 'S0206',
        title: '您对本次服务满意吗？',
        kind: 'SCORE',
        labels: [
          { id: 'NEGATIVE', name: '上门不及时', min: 1, max: 3 },
          { id: 'POSITIVE', name: '服务专业', min: 4, max: 5 }
        ]
      }
      const labelItem = {
        key: 'LABEL:T0101',
        id: 'QUESTION_LABEL',
        code: 'T0101',
        title: '请选择主要原因',
        kind: 'LABEL',
        labels: [{ id: 'LABEL_01', name: '服务专业', min: 4, max: 5 }]
      }
      const draft = {
        score: 5,
        selectedLabelIds: ['NEGATIVE', 'POSITIVE'],
        content: ' 服务很好 '
      }
      const scoreRequest = createOrderSceneScoreSubmitRequest(context, scoreItem, draft)
      const labelRequest = createOrderSceneLabelSubmitRequest(context, labelItem, 'LABEL_01')

      assert.equal(validateOrderSceneScoreDraft(scoreItem, draft), '')
      assert.equal(
        validateOrderSceneScoreDraft(scoreItem, {
          score: 5,
          selectedLabelIds: [],
          content: ''
        }),
        '请选择评价标签或填写补充说明'
      )
      assert.deepEqual(scoreRequest.question, [
        {
          star: '5',
          questionId: 'QUESTION_SCORE',
          labelIds: ['POSITIVE']
        }
      ])
      assert.equal(scoreRequest.content, '服务很好')
      assert.equal(scoreRequest.channel, 'OWS')
      assert.equal(scoreRequest.childChannel, 'APP')
      assert.deepEqual(scoreRequest.additionalData, [{ field: 'waybillNumber', data: 'DPK123456789' }])
      assert.deepEqual(labelRequest.question, [
        {
          star: '5',
          questionId: 'QUESTION_LABEL',
          labelIds: ['LABEL_01']
        }
      ])
      assert.equal(labelRequest.content, '')
    }
  },
  {
    name: 'order NPS keeps zero to ten cascade catalog and submit contract',
    run() {
      const context = {
        key: 'DPK123456789|receive',
        waybillNumber: 'DPK123456789',
        mobile: '',
        childChannel: 'APP',
        role: 'receive',
        source: 'ORDER_DETAIL',
        plan: []
      }
      let draft = updateOrderNpsScore(createOrderNpsDraft(), 9)

      draft = updateOrderNpsCategory(draft, '价格')
      draft = toggleOrderNpsReason(draft, '不会乱收费')
      draft = toggleOrderNpsReason(draft, '运费明细清晰')
      draft = toggleOrderNpsReason(draft, '实际运费与预估一致')
      const maxedDraft = toggleOrderNpsReason(draft, '不会私自保价')
      const labelContent = createOrderNpsLabelContent(draft)
      const request = createOrderNpsSubmitRequest(context, {
        ...draft,
        content: ' 继续保持 '
      })

      assert.equal(maxedDraft, draft)
      assert.equal(labelContent.type, 'CASCADE')
      assert.equal(labelContent.option[0].level, 1)
      assert.equal(labelContent.option[0].name, '价格')
      assert.deepEqual(
        labelContent.option.slice(1).map(item => item.level),
        [2, 2, 2]
      )
      assert.deepEqual(request, {
        sysCode: 'OWS',
        sceneCode: 'N0101',
        childSysCode: 'APP',
        commentCode: 'DPK123456789',
        commentType: 'WaybillNumber',
        content: '继续保持',
        labelName: '9',
        labelContent,
        personType: 'consignee'
      })
      assert.deepEqual(updateOrderNpsScore(draft, 8), {
        score: 8,
        category: '',
        reasons: [],
        content: ''
      })
      assert.deepEqual(ORDER_NPS_SURVEY_API_ENDPOINTS, {
        query: '/gwapi/commentService/eco/comment/queryCustomerQuestionnaire',
        submit: '/gwapi/commentService/eco/comment/addCustomerQuestionnaire'
      })
    }
  },
  {
    name: 'order scene survey keeps valid items when one scene query fails',
    async run() {
      const originalNpsQuery = orderNpsSurveyApi.query
      const originalSceneQuery = orderSceneSurveyApi.query
      const originalDefinitionQuery = orderSceneSurveyApi.queryDefinition
      const now = new Date(2026, 6, 15, 12, 0, 0).getTime()
      const context = createOrderSceneSurveyContext({
        detail: createOrderDetail({
          orderClassification: '2',
          signTime: now - 60 * 60 * 1000
        }),
        role: 'receive',
        source: 'ORDER_DETAIL',
        publicTrackMode: false,
        mobile: '13900139000',
        childChannel: 'APP',
        now
      })

      try {
        orderNpsSurveyApi.query = async () => ({
          status: true,
          result: false
        })
        orderSceneSurveyApi.query = async request => {
          if (request.sceneCode === 'S0907_1') {
            throw new Error('mock scene failure')
          }

          if (request.sceneCode === 'T0501') {
            return { status: true, result: null }
          }

          return { status: false, result: null }
        }
        orderSceneSurveyApi.queryDefinition = async sceneCode => ({
          status: true,
          result: {
            sceneCode,
            questionList: [
              {
                questionId: `QUESTION_${sceneCode}`,
                title: `问题 ${sceneCode}`,
                labelList: [
                  {
                    id: `LABEL_${sceneCode}`,
                    labelName: '服务专业',
                    starMin: '1',
                    starMax: '5'
                  }
                ]
              }
            ]
          }
        })

        const result = await orderSceneSurveyOrchestrator.query(context)

        assert.deepEqual(
          result.items.map(item => item.code),
          ['N0101', 'T0201']
        )
        assert.equal(result.failedCount, 1)
      } finally {
        orderNpsSurveyApi.query = originalNpsQuery
        orderSceneSurveyApi.query = originalSceneQuery
        orderSceneSurveyApi.queryDefinition = originalDefinitionQuery
      }
    }
  }
]

for (const { name, run } of cases) {
  test(name, { timeout: 10000 }, run)
}
