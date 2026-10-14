require('../support/register.cjs')
const assert = require('node:assert/strict')
const { test } = require('node:test')

const { createECardLinkRequest } = require('@/services/ecard')
const { createMemberMasUrl, createMemberWelfareUrl } = require('@/services/member/member.service')
const { APP_WEB_TARGETS } = require('@/shared/webview/appWeb')

const cases = [
  {
    name: 'member welfare url appends token and source without losing hash route',
    run() {
      assert.equal(
        createMemberWelfareUrl('https://mastest.deppon.com.cn/cms-h5/h5.html#/welfare-center', 'COUPON_LIST', 'tmp-token'),
        'https://mastest.deppon.com.cn/cms-h5/h5.html#/welfare-center?code=tmp-token&source=COUPON_LIST'
      )
      assert.equal(
        createMemberWelfareUrl('https://mas.deppon.com/svip-member/entry', 'MEMBER_INDEX', 'svip-token'),
        'https://mas.deppon.com/svip-member/entry?code=svip-token&source=MEMBER_INDEX'
      )
    }
  },
  {
    name: 'member mas urls keep configured environment and append auth context',
    run() {
      assert.equal(
        createMemberMasUrl('MEMBER_POINTS', 'MEMBER_POINTS', 'points-token', 'https://mastest.deppon.com.cn/cms-h5/h5.html#/welfare-center'),
        'https://mastest.deppon.com.cn/points-center/home?code=points-token&source=MEMBER_POINTS'
      )
      assert.equal(
        createMemberMasUrl('MEMBER_STUDENTS', 'MEMBER_STUDENTS', '', 'https://mas.deppon.com/member/home'),
        'https://mas.deppon.com/student-member/entry?source=MEMBER_STUDENTS'
      )
      assert.equal(APP_WEB_TARGETS.MEMBER_POINTS_CENTER.url, '')
      assert.equal(APP_WEB_TARGETS.MEMBER_STUDENT_CENTER.title, '学生专区')
    }
  },
  {
    name: 'ecard link request preserves legacy target params without mini-program shell',
    run() {
      assert.deepEqual(
        createECardLinkRequest('RECHARGE', {
          type: 'YC',
          targetSource: 'HOME_ECARD',
          postmanId: 'PM001',
          activityCode: 'ACT001'
        }),
        {
          sysCode: 'APP',
          targetPage: 'RECHARGE',
          source: 'HOME_ECARD',
          type: 'YC',
          postmanId: 'PM001',
          activityCode: 'ACT001'
        }
      )
      assert.deepEqual(
        createECardLinkRequest('BILL', {
          targetSource: '  ',
          type: ''
        }),
        {
          sysCode: 'APP',
          targetPage: 'BILL',
          source: 'APP_ECARD_CENTER'
        }
      )
    }
  }
]

for (const { name, run } of cases) {
  test(name, { timeout: 10000 }, run)
}
