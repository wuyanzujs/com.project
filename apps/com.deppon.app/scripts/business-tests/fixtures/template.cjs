require('../support/register.cjs')

function createExpressTemplateRaw(patch = {}) {
  return {
    id: 'TEMPLATE_001',
    defaultFlag: 1,
    templateName: '常用寄件',
    template: {
      sender: {
        name: ' 张三 ',
        telephone: '13800138000',
        province: '上海市',
        city: '上海市',
        county: '青浦区',
        address: '徐泾镇明珠路100号'
      },
      receiver: {
        name: '李四',
        telephone: '13900139000',
        province: '广东省',
        city: '深圳市',
        county: '南山区',
        address: '科技园科苑路200号'
      },
      isContact: 'N',
      goodInfo: {
        weight: 2.5,
        goodsName: ' 文件 ',
        isExtra: false
      },
      pickupTime: {
        dispatchFlag: 'Y',
        beginAcceptTime: '现在发货',
        beginAcceptTimeText: '现在发货',
        serviceTime: ''
      },
      payment: {
        paymentType: 'PAY_ARIIVE',
        paymentName: '到付'
      },
      product: {
        omsProductCode: 'PACKAGE',
        productCode: 'PACKAGE'
      },
      insurance: {
        insuranceAmount: '100'
      },
      addedService: {
        returnBillType: 'CUSTOMER_SIGNED_FAX',
        returnBillName: '电子签回单',
        returnRequirement: '',
        customReturnRequirement: ''
      }
    },
    ...patch
  }
}

module.exports = { createExpressTemplateRaw }
