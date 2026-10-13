require('../support/register.cjs')
const { test } = require('node:test')
const {
  getExpressReturnBillOptions,
  getExpressReturnBillPpcType,
  isExpressCloudSignType,
  normalizeExpressReturnBillDraft,
  normalizeExpressReturnBillForTemplate,
  updateExpressReturnBillDraft,
  validateExpressReturnBill
} = require('@/services/express/valueAdded')
const assert = require('node:assert/strict')
const {
  createExpressDraft,
  selectExpressProduct
} = require('@/services/express/express.draft')
const {
  buildCreateOrderRequest,
  buildFreightRequest
} = require('@/services/express/express.payload')
const {
  buildTemplateSaveRequest,
  mapTemplateToExpressDraft
} = require('@/services/template/template.mapper')
const { appWebMessageBridge } = require('@/shared/webview/appWebMessage')
const {
  createAppWebUrl,
  isAllowedAppWebTargetUrl
} = require('@/shared/webview/appWeb')
const {
  createValidExpressDraft,
  expressProduct
} = require('../fixtures/express.cjs')
const { createExpressTemplateRaw } = require('../fixtures/template.cjs')

const cases = [
  {
    name: 'return bill rules preserve reference OMS PPC and requirement contracts',
    run() {
      const normalized = normalizeExpressReturnBillDraft({
        type: 'CUSTOMER_SIGNED_FAX',
        returnRequirement: ' R8,R1,R8,XX,R2 ',
        customReturnRequirement: ' 其他要求 ',
        returnCount: 100,
        fileCode: 'stale-file'
      })

      assert.deepEqual(normalized, {
        type: 'CUSTOMER_SIGNED_FAX',
        requirements: ['R1', 'R2', 'R8'],
        customRequirement: '其他要求',
        returnCount: 99,
        fileCode: ''
      })
      assert.equal(getExpressReturnBillPpcType('NO_RETURN_SIGNED'), 'NONE')
      assert.equal(getExpressReturnBillPpcType('CUSTOMER_SIGNED_FAX'), 'FAX')
      assert.equal(
        getExpressReturnBillPpcType('CUSTOMER_SIGNED_ORIGINAL'),
        'ORIGINAL'
      )
      assert.equal(
        getExpressReturnBillPpcType('RETURNBILL_TYPE_ONLINE'),
        'ONLINE'
      )
      assert.equal(
        getExpressReturnBillPpcType('ORIGINAL_ONLINE'),
        'ORIGINAL_ONLINE'
      )
      assert.equal(isExpressCloudSignType('RETURNBILL_TYPE_ONLINE'), true)
      assert.equal(isExpressCloudSignType('CUSTOMER_SIGNED_FAX'), false)
      assert.equal(
        getExpressReturnBillOptions('DCZP').some(item =>
          isExpressCloudSignType(item.value)
        ),
        false
      )
    }
  },
  {
    name: 'return bill validation distinguishes paper requirements and cloud sign',
    run() {
      const draft = createExpressDraft().service.returnBill

      assert.equal(
        validateExpressReturnBill({
          ...draft,
          type: 'CUSTOMER_SIGNED_FAX',
          customRequirement: '只有备注不能替代 R1-R8'
        }).includes('请选择至少一种签收单要求'),
        true
      )
      assert.equal(
        validateExpressReturnBill({
          ...draft,
          type: 'CUSTOMER_SIGNED_FAX',
          requirements: ['UNKNOWN']
        }).includes('请选择至少一种签收单要求'),
        true
      )
      assert.deepEqual(
        validateExpressReturnBill({
          ...draft,
          type: 'RETURNBILL_TYPE_ONLINE',
          fileCode: 'FILE-001'
        }),
        []
      )
      assert.equal(
        validateExpressReturnBill({
          ...draft,
          type: 'RETURNBILL_TYPE_ONLINE'
        }).includes('请先完成电子云签'),
        true
      )
      assert.equal(
        validateExpressReturnBill({
          ...draft,
          type: 'ORIGINAL_ONLINE',
          requirements: ['R1'],
          fileCode: 'FILE-001'
        }).length,
        0
      )
      assert.equal(
        validateExpressReturnBill({
          ...draft,
          type: 'ORIGINAL_ONLINE',
          fileCode: 'FILE-001'
        }).includes('请选择至少一种签收单要求'),
        true
      )
      assert.equal(
        validateExpressReturnBill(
          {
            ...draft,
            type: 'RETURNBILL_TYPE_ONLINE',
            fileCode: 'FILE-001'
          },
          'DCZP'
        ).includes('当前产品不支持电子云签'),
        true
      )
    }
  },
  {
    name: 'return bill mutations and payload fail closed across product changes',
    run() {
      const draft = createValidExpressDraft()
      const paperDraft = {
        ...draft,
        service: {
          ...draft.service,
          returnBill: normalizeExpressReturnBillDraft({
            type: 'CUSTOMER_SIGNED_ORIGINAL',
            requirements: ['R1'],
            returnCount: 2
          })
        }
      }
      const paperRequest = buildCreateOrderRequest(paperDraft)

      assert.equal(
        paperRequest.receive[0].returnBillType,
        'CUSTOMER_SIGNED_ORIGINAL'
      )
      assert.equal(
        paperRequest.receive[0].orderExtendFields.some(
          field => field.key === 'returnBillQty' && field.value === 2
        ),
        true
      )

      const singlePaperRequest = buildCreateOrderRequest({
        ...paperDraft,
        service: {
          ...paperDraft.service,
          returnBill: {
            ...paperDraft.service.returnBill,
            returnCount: 1
          }
        }
      })
      assert.equal(
        singlePaperRequest.receive[0].orderExtendFields?.some(
          field => field.key === 'returnBillQty'
        ),
        false
      )

      const cloudDraft = {
        ...draft,
        service: {
          ...draft.service,
          returnBill: normalizeExpressReturnBillDraft({
            type: 'RETURNBILL_TYPE_ONLINE',
            fileCode: 'FILE-ONLINE',
            requirements: ['R1'],
            customRequirement: 'stale paper value'
          })
        }
      }
      const cloudRequest = buildCreateOrderRequest(cloudDraft)

      assert.equal(
        cloudRequest.receive[0].returnBillType,
        'RETURNBILL_TYPE_ONLINE'
      )
      assert.equal(cloudRequest.receive[0].returnRequirement, '')
      assert.equal(cloudRequest.receive[0].customReturnRequirement, '')
      assert.deepEqual(
        cloudRequest.receive[0].orderExtendFields?.filter(
          field => field.key === 'fileCode'
        ),
        [{ key: 'fileCode', value: 'FILE-ONLINE' }]
      )

      const dcCloudDraft = selectExpressProduct(cloudDraft, {
        ...expressProduct,
        omsProductCode: 'DCZP'
      })
      assert.equal(dcCloudDraft.service.returnBill.type, 'NO_RETURN_SIGNED')
      assert.equal(dcCloudDraft.service.returnBill.fileCode, '')
      assert.equal(
        buildCreateOrderRequest(dcCloudDraft).receive[0].returnBillType,
        'NO_RETURN_SIGNED'
      )
      assert.equal(buildFreightRequest(dcCloudDraft).returnBillType, 'NONE')

      const switchedToOnline = updateExpressReturnBillDraft(
        paperDraft.service.returnBill,
        { type: 'RETURNBILL_TYPE_ONLINE' }
      )
      assert.deepEqual(switchedToOnline.requirements, [])
      assert.equal(switchedToOnline.customRequirement, '')
      assert.equal(switchedToOnline.fileCode, '')
    }
  },
  {
    name: 'return bill templates never persist transient cloud sign files',
    run() {
      const cloud = normalizeExpressReturnBillDraft({
        type: 'ORIGINAL_ONLINE',
        requirements: ['R2'],
        returnCount: 3,
        fileCode: 'FILE-TRANSIENT'
      })
      const templateDraft = normalizeExpressReturnBillForTemplate(cloud)

      assert.equal(templateDraft.type, 'ORIGINAL_ONLINE')
      assert.deepEqual(templateDraft.requirements, ['R2'])
      assert.equal(templateDraft.returnCount, 3)
      assert.equal(templateDraft.fileCode, '')

      const saveDraft = {
        ...createValidExpressDraft(),
        service: {
          ...createValidExpressDraft().service,
          returnBill: cloud
        }
      }
      const saved = buildTemplateSaveRequest(
        saveDraft,
        { name: '云签件', defaultFlag: 2 },
        'APP'
      )

      assert.equal(
        saved.template.addedService.returnBillType,
        'ORIGINAL_ONLINE'
      )
      assert.equal(saved.template.addedService.returnRequirement, 'R2')
      assert.equal('fileCode' in saved.template.addedService, false)

      const loaded = mapTemplateToExpressDraft(
        createExpressTemplateRaw({
          template: {
            ...createExpressTemplateRaw().template,
            addedService: {
              returnBillType: 'RETURNBILL_TYPE_ONLINE',
              returnBillName: '电子云签',
              returnRequirement: '',
              customReturnRequirement: ''
            }
          }
        })
      )
      assert.equal(loaded.service.returnBill.type, 'RETURNBILL_TYPE_ONLINE')
      assert.equal(loaded.service.returnBill.fileCode, '')
      assert.equal(
        validateExpressReturnBill(loaded.service.returnBill).includes(
          '请先完成电子云签'
        ),
        true
      )

      const dczpTemplate = mapTemplateToExpressDraft(
        createExpressTemplateRaw({
          template: {
            ...createExpressTemplateRaw().template,
            product: {
              omsProductCode: 'DCZP',
              productCode: 'DCZP'
            },
            addedService: {
              returnBillType: 'RETURNBILL_TYPE_ONLINE',
              returnBillName: '电子云签',
              returnRequirement: '',
              customReturnRequirement: ''
            }
          }
        })
      )
      assert.equal(dczpTemplate.service.returnBill.type, 'NO_RETURN_SIGNED')
    }
  },
  {
    name: 'return bill cloud sign messages require one source context and consume once',
    run() {
      const context = {
        messageContext: 'EXPRESS_RETURN_BILL:001'
      }
      const validMessage = JSON.stringify({
        event: 'ONLINE_SIGN',
        args: { value: ' FILE-CLOUD-001 ' }
      })

      appWebMessageBridge.clear()
      assert.equal(appWebMessageBridge.expectOnlineSign(context), true)
      assert.equal(
        appWebMessageBridge.stage('CUSTOMER_CENTER', validMessage, context)
          .handled,
        false
      )
      assert.equal(
        appWebMessageBridge.stage(
          'EXPRESS_RETURN_BILL_CLOUD_SIGN',
          validMessage,
          { messageContext: 'EXPRESS_RETURN_BILL:WRONG' }
        ).handled,
        false
      )
      assert.equal(
        appWebMessageBridge.stage(
          'EXPRESS_RETURN_BILL_CLOUD_SIGN',
          JSON.stringify({
            event: 'ONLINE_SIGN',
            args: { value: 'FILE', extra: 'reject' }
          }),
          context
        ).handled,
        false
      )
      assert.deepEqual(
        appWebMessageBridge.stage(
          'EXPRESS_RETURN_BILL_CLOUD_SIGN',
          validMessage,
          context
        ),
        { handled: true, closeAfterReceive: true }
      )
      assert.deepEqual(appWebMessageBridge.consumeOnlineSign(context), {
        context,
        fileCode: 'FILE-CLOUD-001'
      })
      assert.equal(appWebMessageBridge.consumeOnlineSign(context), null)

      assert.equal(appWebMessageBridge.expectOnlineSign(context), true)
      appWebMessageBridge.cancelOnlineSign(context)
      assert.equal(
        appWebMessageBridge.stage(
          'EXPRESS_RETURN_BILL_CLOUD_SIGN',
          validMessage,
          context
        ).handled,
        false
      )

      const url = createAppWebUrl({
        source: 'EXPRESS_RETURN_BILL_CLOUD_SIGN',
        uri: '/depponmobile/electronCloudSign/index?fileCode=FILE A+B',
        messageContext: context.messageContext
      })
      assert.equal(url.includes('EXPRESS_RETURN_BILL_CLOUD_SIGN'), true)
      assert.equal(decodeURIComponent(url).includes('fileCode=FILE A+B'), true)
      assert.equal(
        isAllowedAppWebTargetUrl(
          'EXPRESS_RETURN_BILL_CLOUD_SIGN',
          `${globalThis.__APP_RUNTIME_CONFIG__.webBaseURL}/depponmobile/electronCloudSign/index?fileCode=FILE%20A%2BB`
        ),
        true
      )
    }
  }
]

for (const { name, run } of cases) {
  test(name, { timeout: 10000 }, run)
}
