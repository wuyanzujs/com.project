require('../support/register.cjs')
const { test } = require('node:test')
const assert = require('node:assert/strict')
const {
  ACCOUNT_SCOPED_CACHE_KEYS,
  ACCOUNT_SCOPED_STORAGE_KEYS,
  CACHE_KEYS,
  createCacheStorageKey
} = require('@/cache/keys')
const { getStorageValue, setStorageValue } = require('@/cache/storage')
const {
  clearAccountScopedCache,
  preserveAccountScopedCacheForLogin
} = require('@/cache/accountScope')
const { appWebMessageBridge } = require('@/shared/webview/appWebMessage')
const { clearAppSession, saveCurrentUser } = require('@/services/auth')
const {
  createAppUserIdentity,
  isSameAppUser,
  shouldClearAccountScopedCache
} = require('@/services/auth/sessionIdentity')

const cases = [
  {
    name: 'account scoped cache registry covers private business storage',
    run() {
      assert.deepEqual(ACCOUNT_SCOPED_CACHE_KEYS, [
        CACHE_KEYS.batchDraft,
        CACHE_KEYS.expressDraft,
        CACHE_KEYS.goodsQueryHistory,
        CACHE_KEYS.invoiceOrderAuth,
        CACHE_KEYS.invoiceOrderAuthCodeSend,
        CACHE_KEYS.invoiceEmail
      ])

      for (const key of ACCOUNT_SCOPED_CACHE_KEYS) {
        assert.equal(ACCOUNT_SCOPED_STORAGE_KEYS.includes(key), true)
        assert.equal(
          ACCOUNT_SCOPED_STORAGE_KEYS.includes(createCacheStorageKey(key)),
          true
        )
      }

      assert.equal(
        ACCOUNT_SCOPED_STORAGE_KEYS.includes(CACHE_KEYS.expressPrivacyConfirm),
        false
      )
    }
  },
  {
    name: 'first login preserves only explicitly staged anonymous drafts',
    async run() {
      const expressDraftKey = createCacheStorageKey(CACHE_KEYS.expressDraft)
      const historyKey = createCacheStorageKey(CACHE_KEYS.goodsQueryHistory)

      await setStorageValue(expressDraftKey, 'anonymous-express-draft')
      await setStorageValue(historyKey, 'private-history')
      preserveAccountScopedCacheForLogin(CACHE_KEYS.expressDraft)

      await clearAccountScopedCache({ preserveLoginReturnDrafts: true })

      assert.equal(getStorageValue(expressDraftKey), 'anonymous-express-draft')
      assert.equal(getStorageValue(historyKey), '')

      await clearAccountScopedCache()
      assert.equal(getStorageValue(expressDraftKey), '')
    }
  },
  {
    name: 'clearing app session removes account data but keeps device consent',
    async run() {
      for (const key of ACCOUNT_SCOPED_STORAGE_KEYS) {
        await setStorageValue(key, `private:${key}`)
      }

      await setStorageValue(CACHE_KEYS.cookie, 'ECO_TOKEN=old-token;')
      await setStorageValue(CACHE_KEYS.userInfo, '{"mobile":"13800138000"}')
      await setStorageValue(
        CACHE_KEYS.accountCacheOwner,
        '{"mobile":"13800138000"}'
      )
      await setStorageValue(CACHE_KEYS.userSession, 'legacy-session')
      await setStorageValue(CACHE_KEYS.expressPrivacyConfirm, 'device-consent')

      const warehouseMessage = JSON.stringify({
        event: 'SEND_WAREHOUSE',
        args: { isWarehousingService: 'N' }
      })

      appWebMessageBridge.clear()
      assert.equal(
        appWebMessageBridge.expectWarehouse({
          inputKey: 'session-expected-input',
          stagingId: 'SESSION-EXPECTED-STAGE'
        }),
        true
      )

      await clearAppSession()

      assert.equal(
        appWebMessageBridge.stage('EXPRESS_WAREHOUSE', warehouseMessage)
          .handled,
        false
      )
      assert.equal(appWebMessageBridge.consumeWarehouse(), null)

      await setStorageValue(CACHE_KEYS.userInfo, '{"mobile":"13800138000"}')
      await setStorageValue(
        CACHE_KEYS.accountCacheOwner,
        '{"mobile":"13800138000"}'
      )
      assert.equal(
        appWebMessageBridge.expectWarehouse({
          inputKey: 'session-pending-input',
          stagingId: 'SESSION-PENDING-STAGE'
        }),
        true
      )
      assert.equal(
        appWebMessageBridge.stage('EXPRESS_WAREHOUSE', warehouseMessage, {
          stagingId: 'SESSION-PENDING-STAGE'
        }).handled,
        true
      )

      await saveCurrentUser({ mobile: '13900139000' })

      assert.equal(appWebMessageBridge.consumeWarehouse(), null)
      assert.equal(
        appWebMessageBridge.expectWarehouse({
          inputKey: 'session-clear-input',
          stagingId: 'SESSION-CLEAR-STAGE'
        }),
        true
      )
      assert.equal(
        appWebMessageBridge.stage('EXPRESS_WAREHOUSE', warehouseMessage, {
          stagingId: 'SESSION-CLEAR-STAGE'
        }).handled,
        true
      )

      await clearAppSession()

      assert.equal(appWebMessageBridge.consumeWarehouse(), null)

      for (const key of ACCOUNT_SCOPED_STORAGE_KEYS) {
        assert.equal(getStorageValue(key), '')
      }

      assert.equal(getStorageValue(CACHE_KEYS.cookie), '')
      assert.equal(getStorageValue(CACHE_KEYS.userInfo), '')
      assert.equal(getStorageValue(CACHE_KEYS.accountCacheOwner), '')
      assert.equal(getStorageValue(CACHE_KEYS.userSession), '')
      assert.equal(
        getStorageValue(CACHE_KEYS.expressPrivacyConfirm),
        'device-consent'
      )
    }
  },
  {
    name: 'account identity rules detect user switches conservatively',
    run() {
      assert.equal(
        isSameAppUser(
          { id: 'USER_1', mobile: '13800138000' },
          { id: 'USER_1', mobile: '13900139000' }
        ),
        true
      )
      assert.equal(
        isSameAppUser(
          { mobile: '13800138000' },
          { mobile: '13800138000', nickName: 'new profile' }
        ),
        true
      )
      assert.equal(
        shouldClearAccountScopedCache(
          { id: 'USER_1', mobile: '13800138000' },
          { id: 'USER_2', mobile: '13800138000' },
          { id: 'USER_1' }
        ),
        true
      )
      assert.equal(
        shouldClearAccountScopedCache(
          null,
          { id: 'USER_2', mobile: '13900139000' },
          null
        ),
        true
      )
      assert.equal(
        shouldClearAccountScopedCache(
          null,
          { id: 'USER_2', mobile: '13900139000' },
          { id: 'USER_2' }
        ),
        false
      )
      assert.deepEqual(
        createAppUserIdentity({
          id: ' USER_2 ',
          mobile: '13900139000',
          nickName: '不应进入 owner'
        }),
        { id: 'USER_2', mobile: '13900139000' }
      )
    }
  }
]

for (const { name, run } of cases) {
  test(name, { timeout: 10000 }, run)
}
