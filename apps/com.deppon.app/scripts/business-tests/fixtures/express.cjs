require('../support/register.cjs')
const { createExpressDraft } = require('@/services/express/core/express.draft')

const senderContact = {
  name: '张三',
  mobile: '13800138000',
  province: '上海市',
  city: '上海市',
  county: '青浦区',
  address: '徐泾镇明珠路100号'
}

const consigneeContact = {
  name: '李四',
  mobile: '13900139000',
  province: '广东省',
  city: '深圳市',
  county: '南山区',
  address: '科技园科苑路200号'
}

const expressProduct = {
  productName: '精准卡航',
  omsProductCode: 'PACKAGE',
  days: '1',
  arriveDate: null,
  message: null,
  label: '推荐',
  totalfee: 28,
  detail: null,
  billWeight: 1
}

function createValidExpressDraft() {
  const draft = createExpressDraft()

  return {
    ...draft,
    sender: { ...senderContact },
    consignee: { ...consigneeContact },
    goods: {
      ...draft.goods,
      name: '文件',
      weight: 1,
      count: 1
    },
    selectedProduct: { ...expressProduct },
    agreementAccepted: true
  }
}

module.exports = {
  senderContact,
  consigneeContact,
  expressProduct,
  createValidExpressDraft
}
