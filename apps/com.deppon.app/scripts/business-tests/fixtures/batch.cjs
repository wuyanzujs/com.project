require('../support/register.cjs')
const { createBatchConsigneeDraft, createBatchDraft } = require('@/services/batch')

function createBatchContact(patch = {}) {
  return {
    name: '张三',
    mobile: '13800138000',
    province: '上海市',
    city: '上海市',
    county: '青浦区',
    address: '徐泾镇明珠路100号',
    ...patch
  }
}

function createValidBatchDraft(patch = {}) {
  const draft = createBatchDraft()
  const consignee = createBatchConsigneeDraft(
    createBatchContact({
      id: 'CONSIGNEE_001',
      name: '李四',
      mobile: '13900139000',
      province: '广东省',
      city: '深圳市',
      county: '南山区',
      address: '科技园科苑路200号'
    }),
    '文件'
  )

  consignee.productCode = 'PACKAGE'
  consignee.productName = '大件快递'
  consignee.estimatedFee = 18

  return {
    ...draft,
    sender: createBatchContact({ id: 'SENDER_001' }),
    consignees: [consignee],
    pickup: {
      ...draft.pickup,
      time: '2026-07-13 10:00:00',
      stationCode: '021A001',
      stationName: '上海青浦营业部'
    },
    ...patch
  }
}

module.exports = { createBatchContact, createValidBatchDraft }
