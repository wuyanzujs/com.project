require('../support/register.cjs')
const assert = require('node:assert/strict')
const { test } = require('node:test')

const {
  applyAddressHintToContact,
  applyAnalysis4ToContact,
  applyAnalysisToContact,
  contactApi,
  contactService,
  createContactAddressCheckRequest,
  createEmptyContact,
  getAddressHintLabel,
  parseAddressHint,
  resolveContactAddressIntegrity
} = require('@/services/contact')

const cases = [
  {
    name: 'contact address analysis keeps town separate and ignores null hint parts',
    run() {
      const contact = createEmptyContact(1)
      const nextContact = applyAnalysisToContact(contact, {
        proCityName: '上海市-上海市-青浦区',
        town: '徐泾镇',
        address: '徐泾镇徐泾镇明珠路100号',
        name: ' 李四 ',
        telephone: '139 0013 9000',
        addressType: null,
        extension: null
      })

      assert.equal(nextContact.name, '李四')
      assert.equal(nextContact.telephone, '13900139000')
      assert.equal(nextContact.province, '上海市')
      assert.equal(nextContact.city, '上海市')
      assert.equal(nextContact.county, '青浦区')
      assert.equal(nextContact.town, '徐泾镇')
      assert.equal(nextContact.address, '明珠路100号')
      assert.equal(
        applyAnalysis4ToContact(contact, {
          province: '上海市',
          provinceCode: '310000',
          city: '上海市',
          cityCode: '310100',
          county: '青浦区',
          countyCode: '310118',
          town: '徐泾镇',
          townCode: '310118109',
          detailAddress: '徐泾镇明珠路100号',
          addressType: '0000'
        }).address,
        '明珠路100号'
      )
      assert.deepEqual(parseAddressHint('上海市,上海市,青浦区,null,明珠路100号'), {
        province: '上海市',
        city: '上海市',
        county: '青浦区',
        town: '',
        address: '明珠路100号',
        raw: '上海市,上海市,青浦区,null,明珠路100号'
      })
      const hint = parseAddressHint('上海市,上海市,青浦区,徐泾镇,徐泾镇明珠路100号')

      assert.equal(getAddressHintLabel(hint), '上海市上海市青浦区徐泾镇明珠路100号')
      assert.equal(applyAddressHintToContact(contact, hint).address, '明珠路100号')
    }
  },
  {
    name: 'contact address integrity separates review transport and auth outcomes',
    run() {
      assert.deepEqual(
        createContactAddressCheckRequest({
          province: ' 上海市 ',
          city: ' 上海市 ',
          county: ' 青浦区 ',
          address: ' 明珠路100号 '
        }),
        {
          province: '上海市',
          city: '上海市',
          county: '青浦区',
          address: '明珠路100号'
        }
      )
      assert.deepEqual(resolveContactAddressIntegrity({ status: true }), {
        kind: 'pass',
        message: ''
      })
      assert.deepEqual(
        resolveContactAddressIntegrity({
          status: false,
          message: ' 请补充门牌号 '
        }),
        { kind: 'review', message: '请补充门牌号' }
      )
      assert.deepEqual(
        resolveContactAddressIntegrity({
          status: false,
          message: '网络连接失败',
          transportFailure: true
        }),
        { kind: 'unavailable', message: '网络连接失败' }
      )
      assert.deepEqual(
        resolveContactAddressIntegrity({
          status: false,
          authExpired: true
        }),
        { kind: 'blocked', message: '登录状态已失效，请重新登录' }
      )
      assert.deepEqual(resolveContactAddressIntegrity({ status: false, message: '' }), {
        kind: 'review',
        message: '地址可能不完整，请确认是否继续使用'
      })
    }
  },
  {
    name: 'contact address integrity service sends normalized address fields',
    async run() {
      const originalCheckAddressDetail = contactApi.checkAddressDetail
      let request = null

      try {
        contactApi.checkAddressDetail = async nextRequest => {
          request = nextRequest

          return {
            status: false,
            message: '地址不够详细',
            result: null
          }
        }

        const response = await contactService.checkAddressDetail({
          province: ' 浙江省 ',
          city: ' 杭州市 ',
          county: ' 西湖区 ',
          address: ' 文一路1号 '
        })

        assert.deepEqual(request, {
          province: '浙江省',
          city: '杭州市',
          county: '西湖区',
          address: '文一路1号'
        })
        assert.equal(response.status, false)
        assert.equal(response.message, '地址不够详细')
      } finally {
        contactApi.checkAddressDetail = originalCheckAddressDetail
      }
    }
  }
]

for (const { name, run } of cases) {
  test(name, { timeout: 10000 }, run)
}
