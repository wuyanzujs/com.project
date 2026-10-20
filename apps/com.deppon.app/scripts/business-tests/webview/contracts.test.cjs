require('../support/register.cjs')
const assert = require('node:assert/strict')
const { test } = require('node:test')

const { queryService } = require('@/services/query')
const { supportService } = require('@/services/support')
const { APP_WEB_TARGETS, isAllowedAppWebTargetUrl, requiresAppWebLogin } = require('@/shared/webview/appWeb')
const { appWebMessageBridge, parseAppWebMessage } = require('@/shared/webview/appWebMessage')

const cases = [
  {
    name: 'collection account web messages require source and context expectations',
    run() {
      const message = JSON.stringify({
        event: 'COLLECTION_CHANGE',
        args: { bankAccount: '6222 0000 1234', countName: '张三' }
      })
      const expressContext = {
        source: 'EXPRESS_COLLECTION_ACCOUNT',
        messageContext: 'EXPRESS_DRAFT'
      }
      const orderContext = {
        source: 'ORDER_EDIT_COLLECTION_ACCOUNT',
        messageContext: 'ORDER_EDIT:ORDER_001'
      }

      appWebMessageBridge.clear()

      assert.deepEqual(
        parseAppWebMessage(
          JSON.stringify({
            data: [
              {
                event: 'COLLECTION_CHANGE',
                args: {
                  bankAccount: ' 6222 0000 1234 ',
                  countName: '张三'
                }
              }
            ]
          })
        ),
        {
          event: 'COLLECTION_CHANGE',
          args: {
            bankAccount: ' 6222 0000 1234 ',
            countName: '张三'
          }
        }
      )
      assert.equal(appWebMessageBridge.stage('CUSTOMER_CENTER', message).handled, false)
      assert.equal(
        appWebMessageBridge.stage('EXPRESS_COLLECTION_ACCOUNT', message, {
          messageContext: 'EXPRESS_DRAFT'
        }).handled,
        false
      )
      assert.equal(appWebMessageBridge.expectCollectionAccount(expressContext), true)
      assert.equal(
        appWebMessageBridge.stage('EXPRESS_COLLECTION_ACCOUNT', message, {
          messageContext: 'ORDER_EDIT:ORDER_001'
        }).handled,
        false
      )
      assert.deepEqual(
        appWebMessageBridge.stage('EXPRESS_COLLECTION_ACCOUNT', message, {
          messageContext: 'EXPRESS_DRAFT'
        }),
        {
          handled: true,
          closeAfterReceive: true
        }
      )
      assert.equal(appWebMessageBridge.consumeCollectionAccount(orderContext), null)
      assert.deepEqual(appWebMessageBridge.consumeCollectionAccount(expressContext), {
        account: '622200001234',
        accountName: '张三'
      })
      assert.equal(appWebMessageBridge.consumeCollectionAccount(expressContext), null)

      assert.equal(appWebMessageBridge.expectCollectionAccount(orderContext), true)
      assert.equal(
        appWebMessageBridge.stage('EXPRESS_COLLECTION_ACCOUNT', message, {
          messageContext: 'ORDER_EDIT:ORDER_001'
        }).handled,
        false
      )
      assert.equal(
        appWebMessageBridge.stage('ORDER_EDIT_COLLECTION_ACCOUNT', message, {
          messageContext: 'ORDER_EDIT:ORDER_002'
        }).handled,
        false
      )
      assert.equal(
        appWebMessageBridge.stage('ORDER_EDIT_COLLECTION_ACCOUNT', message, {
          messageContext: 'ORDER_EDIT:ORDER_001'
        }).handled,
        true
      )
      assert.equal(
        appWebMessageBridge.consumeCollectionAccount({
          ...orderContext,
          messageContext: 'ORDER_EDIT:ORDER_002'
        }),
        null
      )
      assert.deepEqual(appWebMessageBridge.consumeCollectionAccount(orderContext), {
        account: '622200001234',
        accountName: '张三'
      })
      assert.equal(APP_WEB_TARGETS.ORDER_EDIT_COLLECTION_ACCOUNT.url, APP_WEB_TARGETS.EXPRESS_COLLECTION_ACCOUNT.url)
      assert.equal(
        isAllowedAppWebTargetUrl(
          'ORDER_EDIT_COLLECTION_ACCOUNT',
          globalThis.__APP_RUNTIME_CONFIG__.webBaseURL + APP_WEB_TARGETS.ORDER_EDIT_COLLECTION_ACCOUNT.url
        ),
        true
      )
      assert.equal(
        isAllowedAppWebTargetUrl(
          'ORDER_EDIT_COLLECTION_ACCOUNT',
          globalThis.__APP_RUNTIME_CONFIG__.webBaseURL + '/depponmobile/h5/index#/claimPackagePages/index'
        ),
        false
      )
      assert.equal(APP_WEB_TARGETS.EXPRESS_COLLECTION_RULES.auth, false)
    }
  },
  {
    name: 'mine about us web target is public and controlled',
    run() {
      assert.equal(APP_WEB_TARGETS.MINE_ABOUT_US.url, '/depponmobile/h5/index#/homePackagePages/companyOverview/index')
      assert.equal(APP_WEB_TARGETS.MINE_ABOUT_US.auth, false)
    }
  },
  {
    name: 'authenticated web targets fail closed without an App session',
    run() {
      assert.equal(requiresAppWebLogin({ allowed: true, auth: true }, false), true)
      assert.equal(requiresAppWebLogin({ allowed: true, auth: true }, true), false)
      assert.equal(requiresAppWebLogin({ allowed: true, auth: false }, false), false)
      assert.equal(requiresAppWebLogin({ allowed: false, auth: true }, false), false)
    }
  },
  {
    name: 'account preferences web target uses controlled OWS settings page',
    run() {
      // 账号偏好设置 URL：从「我的」进入带 CENTER_USER_SETTING，从订单详情进入带 ORDER_DETAIL_USER_SETTING。
      assert.equal(APP_WEB_TARGETS.ACCOUNT_PREFERENCES.url, '/depponmobile/mow/center/accountSet?pageSource=APP&sonSource=CENTER_USER_SETTING')
      assert.equal(
        APP_WEB_TARGETS.ORDER_DETAIL_ACCOUNT_PREFERENCES.url,
        '/depponmobile/mow/center/accountSet?pageSource=APP&sonSource=ORDER_DETAIL_USER_SETTING'
      )
    }
  },
  {
    name: 'protocol record and privacy settings use controlled H5 targets',
    run() {
      assert.equal(APP_WEB_TARGETS.PROTOCOL_RECORD.url, '/depponmobile/protocol/record')
      assert.equal(APP_WEB_TARGETS.PROTOCOL_RECORD.title, '法律条款与隐私政策')
      assert.equal(APP_WEB_TARGETS.CUSTOMER_PRIVATE_BILL.url, '/depponmobile/mow/customer/privateSetting')
      assert.equal(APP_WEB_TARGETS.CUSTOMER_PRIVATE_BILL.title, '隐私设置')
      // 「我的 → 客服中心」是 H5，不是原生聚合页
      assert.equal(APP_WEB_TARGETS.CUSTOMER_SERVICE_CENTER.url, '/depponmobile/h5/index#/partsPackagePages/customer/index')
      assert.equal(APP_WEB_TARGETS.CUSTOMER_SERVICE_CENTER.title, '客服中心')
    }
  },
  {
    name: 'support chat list keeps hash route query under controlled web target',
    run() {
      const chatPath = '/depponmobile/h5/index#/chatPackagePages/chatList/index'

      assert.equal(APP_WEB_TARGETS.SUPPORT_CHAT_LIST.url, chatPath)
      assert.equal(
        supportService.createSecureWebUri(chatPath, 'APP_SUPPORT_CENTER'),
        '/depponmobile/h5/index#/chatPackagePages/chatList/index?sonSource=APP_SUPPORT_CENTER&pageSource=APP'
      )
    }
  },
  {
    name: 'support aftercare records preserve controlled paths and login guards',
    run() {
      const aftercare = supportService.getSections().find(section => section.title === '售后服务')
      const entries = new Map((aftercare?.entries ?? []).map(entry => [entry.id, entry]))
      // 客服中心「售后服务」只保留投诉、理赔与其进展，理赔已完成收在理赔进展列表内。
      const expected = [
        ['complaint-record', 'SUPPORT_COMPLAINT_RECORD', '/depponmobile/complaint/record'],
        ['claim-processing', 'SUPPORT_CLAIM_PROCESSING', '/depponmobile/h5/index#/claimPackagePages/list?tab=2']
      ]

      assert.equal(APP_WEB_TARGETS.SUPPORT_CLAIM_COMPLETED.url, '/depponmobile/h5/index#/claimPackagePages/list?tab=3')

      for (const [id, source, path] of expected) {
        assert.equal(APP_WEB_TARGETS[source].url, path)
        assert.equal(entries.get(id)?.webSource, source)
        assert.equal(entries.get(id)?.webPath, path)
        assert.equal(entries.get(id)?.webParamSource, 'APP_SUPPORT_CENTER')
        assert.equal(entries.get(id)?.loginRequired, true)
      }

      assert.equal(
        supportService.createSecureWebUri(APP_WEB_TARGETS.SUPPORT_COMPLAINT_RECORD.url, 'APP_SUPPORT_CENTER'),
        '/depponmobile/complaint/record?sonSource=APP_SUPPORT_CENTER&pageSource=APP'
      )
      assert.equal(
        supportService.createSecureWebUri(APP_WEB_TARGETS.SUPPORT_CLAIM_PROCESSING.url, 'APP_SUPPORT_CENTER'),
        '/depponmobile/h5/index#/claimPackagePages/list?tab=2&sonSource=APP_SUPPORT_CENTER&pageSource=APP'
      )
    }
  },
  {
    name: 'station feedback web target preserves legacy scene and row data',
    run() {
      assert.equal(APP_WEB_TARGETS.STATION_FEEDBACK.url, '/depponmobile/survey/noStarEvaluate')

      const stationUri = queryService.createStationFeedbackWebUri(
        {
          code: '021A001'
        },
        {
          province: '上海市',
          provinceCode: '310000',
          city: '上海市',
          cityCode: '310100',
          county: '青浦区',
          countyCode: '310118',
          town: '徐泾镇',
          townCode: '310118109',
          address: '明珠路100号',
          fullAddress: '上海市上海市青浦区徐泾镇明珠路100号'
        }
      )
      const stationParams = new URL(stationUri, 'https://owstest.deppon.com').searchParams

      assert.equal(stationParams.get('scene'), 'P0101')
      assert.equal(stationParams.get('channel'), 'APP')
      assert.deepEqual(JSON.parse(stationParams.get('rowData')), [
        {
          field: 'deptCode',
          data: '021A001'
        },
        {
          field: 'queryAddress',
          data: '上海市上海市青浦区徐泾镇明珠路100号'
        }
      ])

      const emptyParams = new URL(queryService.createStationFeedbackWebUri(), 'https://owstest.deppon.com').searchParams

      assert.equal(emptyParams.get('scene'), 'P0102')
    }
  }
]

for (const { name, run } of cases) {
  test(name, { timeout: 10000 }, run)
}
