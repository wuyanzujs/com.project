require('../support/register.cjs')
const assert = require('node:assert/strict')
const { test } = require('node:test')

const { expressDraftBridge } = require('@/services/express/draftBridge')
const { templateApi } = require('@/services/template/template.api')
const {
  applyTemplateMetadataUpdate,
  buildTemplateMetadataSaveRequest,
  buildTemplateSaveRequest,
  isTemplateMetadataChanged,
  mapTemplateToExpressDraft,
  normalizeExpressTemplate,
  validateTemplateDraft,
  validateTemplateMeta
} = require('@/services/template/template.mapper')
const { templateService } = require('@/services/template/template.service')

const { createValidExpressDraft } = require('../fixtures/express.cjs')
const { createExpressTemplateRaw } = require('../fixtures/template.cjs')

const cases = [
  {
    name: 'template mapper normalizes saved fields into a fresh express draft',
    run() {
      const draft = mapTemplateToExpressDraft(createExpressTemplateRaw())

      assert.equal(draft.sender.name, '张三')
      assert.equal(draft.consignee.city, '深圳市')
      assert.equal(draft.goods.name, '文件')
      assert.equal(draft.goods.weight, 2.5)
      assert.equal(draft.goods.insuredAmount, 100)
      assert.equal(draft.insurance.type, 'NORMAL')
      assert.equal(draft.insurance.capability.inputKey, '')
      assert.equal(draft.service.paymentType, 'PAY_ARIIVE')
      assert.equal(draft.service.transportMode, 'PACKAGE')
      assert.equal(draft.service.returnBill.type, 'CUSTOMER_SIGNED_FAX')
      assert.equal(draft.service.returnBill.returnCount, 1)
      assert.equal(draft.service.needContact, 'N')
      assert.equal(draft.pickup.time, '')
      assert.equal(draft.selectedProduct, null)
      assert.equal(draft.agreementAccepted, false)
      assert.equal(draft.quoteStaleReason, '模板信息已带入，请重新获取价格')
    }
  },
  {
    name: 'template save rules validate metadata and build the backend payload',
    run() {
      const draft = createValidExpressDraft()
      const request = buildTemplateSaveRequest(
        draft,
        { name: ' 常用件 ', defaultFlag: 1 },
        'APP'
      )

      assert.equal(validateTemplateDraft(draft), '')
      assert.equal(
        validateTemplateMeta({ name: '', defaultFlag: 2 }),
        '请输入模板名称'
      )
      assert.equal(
        validateTemplateMeta({ name: '超过五个字模板', defaultFlag: 2 }),
        '模板名称不能超过5个字'
      )
      assert.equal(request.templateName, '常用件')
      assert.equal(request.defaultFlag, 1)
      assert.equal(request.sysCode, 'APP')
      assert.equal(request.template.sender.telephone, '13800138000')
      assert.equal(request.template.receiver.telephone, '13900139000')
      assert.equal(request.template.goodInfo.goodsName, '文件')
      assert.equal(request.template.payment.paymentType, 'MP')

      const specialInsuranceRequest = buildTemplateSaveRequest(
        {
          ...draft,
          goods: { ...draft.goods, insuredAmount: 500 },
          insurance: { ...draft.insurance, type: 'SXB' }
        },
        { name: '省心件', defaultFlag: 2 },
        'APP'
      )

      assert.deepEqual(specialInsuranceRequest.template.insurance, {
        insuranceAmount: '500'
      })
    }
  },
  {
    name: 'template metadata keeps the full body and one default item',
    run() {
      const first = normalizeExpressTemplate(
        createExpressTemplateRaw({
          id: 'TEMPLATE_001',
          defaultFlag: 1,
          templateName: '原默认'
        })
      )
      const second = normalizeExpressTemplate(
        createExpressTemplateRaw({
          id: 'TEMPLATE_002',
          defaultFlag: 2,
          templateName: '普通件'
        })
      )
      const meta = { name: ' 新默认 ', defaultFlag: 1 }
      const request = buildTemplateMetadataSaveRequest(second, meta, 'APP')

      assert.equal(isTemplateMetadataChanged(second, meta), true)
      assert.equal(request.id, 'TEMPLATE_002')
      assert.equal(request.templateName, '新默认')
      assert.equal(request.defaultFlag, 1)
      assert.equal(request.sysCode, 'APP')
      assert.deepEqual(request.template, second.raw.template)

      const updated = applyTemplateMetadataUpdate(
        [first, second],
        second.id,
        meta
      )

      assert.equal(updated[0].isDefault, false)
      assert.equal(updated[0].raw.defaultFlag, 2)
      assert.equal(updated[1].name, '新默认')
      assert.equal(updated[1].isDefault, true)
      assert.equal(updated[1].raw.templateName, '新默认')
      assert.equal(updated[1].raw.defaultFlag, 1)
      assert.equal(first.isDefault, true)
    }
  },
  {
    name: 'template metadata update skips list limits and preserves failures',
    async run() {
      const originalQuery = templateApi.query
      const originalSave = templateApi.save
      const template = normalizeExpressTemplate(createExpressTemplateRaw())
      let queryCount = 0
      let saveRequest = null

      try {
        templateApi.query = async () => {
          queryCount += 1

          return { status: true, result: [] }
        }
        templateApi.save = async request => {
          saveRequest = request

          return { status: true, result: true }
        }

        const unchanged = await templateService.updateMetadata(template, {
          name: template.name,
          defaultFlag: template.isDefault ? 1 : 2
        })

        assert.equal(unchanged.status, false)
        assert.equal(unchanged.message, '您还没有修改模板信息')
        assert.equal(saveRequest, null)

        const updated = await templateService.updateMetadata(template, {
          name: '新模板',
          defaultFlag: 2
        })

        assert.equal(updated.status, true)
        assert.equal(queryCount, 0)
        assert.equal(saveRequest.id, template.id)
        assert.equal(saveRequest.templateName, '新模板')
        assert.deepEqual(saveRequest.template, template.raw.template)

        templateApi.save = async () => ({
          status: false,
          message: '后端拒绝修改',
          result: false
        })

        const failed = await templateService.updateMetadata(template, {
          name: '失败件',
          defaultFlag: 2
        })

        assert.equal(failed.status, false)
        assert.equal(failed.message, '后端拒绝修改')
      } finally {
        templateApi.query = originalQuery
        templateApi.save = originalSave
      }
    }
  },
  {
    name: 'template bridge always clears stale quote and agreement state',
    run() {
      const templateDraft = {
        ...createValidExpressDraft(),
        quoteStaleReason: ''
      }

      expressDraftBridge.carryFromTemplate(templateDraft)

      const carried = expressDraftBridge.consume()

      assert.equal(carried.source, 'TEMPLATE')
      assert.deepEqual(carried.quotes, [])
      assert.equal(carried.draft.selectedProduct, null)
      assert.equal(carried.draft.agreementAccepted, false)
      assert.equal(
        carried.draft.quoteStaleReason,
        '模板信息已带入，请重新获取价格'
      )
    }
  }
]

for (const { name, run } of cases) {
  test(name, { timeout: 10000 }, run)
}
