require('./register.cjs')
const Taro = require('@tarojs/taro')
const { readFileSync } = require('node:fs')

const { hydrateStorage } = require('@/cache/storage')
const {
  configureSessionCookieRuntime,
  getEcoToken,
  hydrateSessionCookie,
  recoverSessionCookie
} = require('@/request/cookieJar')

async function simulateRestart() {
  const entries = JSON.parse(readFileSync(0, 'utf8'))
  for (const [key, data] of entries) {
    await Taro.setStorage({ key, data })
  }

  let nativeReads = 0
  configureSessionCookieRuntime({
    async read() {
      nativeReads += 1
      return 'ECO_TOKEN=obsolete-native-token;'
    },
    async write() {
      throw new Error('Invalidated cookies must not be written')
    },
    async clear() {
      return true
    }
  })
  await hydrateStorage()
  await hydrateSessionCookie('https://owstest.deppon.com')
  await recoverSessionCookie('https://owstest.deppon.com')
  console.log(JSON.stringify({ token: getEcoToken(), nativeReads }))
}

simulateRestart().catch(error => {
  console.error(error)
  process.exitCode = 1
})
