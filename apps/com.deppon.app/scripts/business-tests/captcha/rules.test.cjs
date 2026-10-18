require('../support/register.cjs')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const { test } = require('node:test')

const { aesEncryptEcbBase64, buildCaptchaPointJson, buildCaptchaVerification, parsePngSize, serializeCaptchaPoints } = require('@/services/captcha')
const { shouldOfferCaptcha } = require('@/services/captcha/captcha.service')

// 黄金向量来自 2026-10-18 测试网关探针:secretKey 为 getCaptchaAction 真实返回,AES 输出由 OpenSSL 生成,
// 用于锁定生产端 EncryptUtil.aesEncode(steel_crypt AES-ECB-PKCS7)的 TS 移植口径。
const GOLDEN_SECRET_KEY = '6w8MdFfabw8Xpfzc'
const GOLDEN_POINTS = [
  { x: 50, y: 30 },
  { x: 100, y: 30 },
  { x: 150, y: 30 }
]
const GOLDEN_POINT_STR = JSON.stringify(GOLDEN_POINTS)
const GOLDEN_POINT_JSON = 'w32rL3MAJf2wVMU12sJDQiSwyoTSys1FZEuL8l3HPsL/603yy6GuPwOhKVnAuT0su1PoCi1YucT2RhlxhBjMXg=='

const decryptEcbFull = (base64, key) => {
  const decipher = crypto.createDecipheriv(`aes-${key.length * 8}-ecb`, Buffer.from(key, 'utf8'), null)
  return Buffer.concat([decipher.update(Buffer.from(base64, 'base64')), decipher.final()]).toString('utf8')
}

test('captcha aes matches the gateway probe golden vector', () => {
  assert.equal(aesEncryptEcbBase64(GOLDEN_POINT_STR, GOLDEN_SECRET_KEY), GOLDEN_POINT_JSON)
})

test('buildCaptchaPointJson encrypts points and falls back to plain json without secretKey', () => {
  assert.equal(buildCaptchaPointJson(GOLDEN_POINTS, GOLDEN_SECRET_KEY), GOLDEN_POINT_JSON)
  assert.equal(buildCaptchaPointJson(GOLDEN_POINTS, ''), GOLDEN_POINT_STR)
})

test('buildCaptchaVerification wraps token and plain points with --- separator', () => {
  const token = '8b65bbe892d74a8199747a85664a1818'
  const verification = buildCaptchaVerification(token, GOLDEN_POINTS, GOLDEN_SECRET_KEY)

  assert.equal(decryptEcbFull(verification, GOLDEN_SECRET_KEY), `${token}---${GOLDEN_POINT_STR}`)
  assert.notEqual(verification, `${token}---${GOLDEN_POINT_STR}`)
})

test('serializeCaptchaPoints keeps numeric coordinates for the gateway contract', () => {
  assert.equal(serializeCaptchaPoints([{ x: 12.4, y: 88 }]), '[{"x":12.4,"y":88}]')
})

test('parsePngSize reads IHDR dimensions from raw and data-url base64', () => {
  const header = Buffer.alloc(24)
  header[0] = 0x89
  Buffer.from('PNG', 'ascii').copy(header, 1)
  header.writeUInt32BE(640, 16)
  header.writeUInt32BE(320, 20)
  const base64 = header.toString('base64')

  assert.deepEqual(parsePngSize(base64), { width: 640, height: 320 })
  assert.deepEqual(parsePngSize(`data:image/png;base64,${base64}`), { width: 640, height: 320 })
  assert.deepEqual(parsePngSize('not-png'), { width: 0, height: 0 })
})

test('shouldOfferCaptcha matches gateway rate-limit wording only', () => {
  assert.equal(shouldOfferCaptcha('您的操作过于频繁，请稍后重试'), true)
  // 「请稍后再试」是客户端倒计时本地文案,不触发验证码
  assert.equal(shouldOfferCaptcha('请稍后再试'), false)
  assert.equal(shouldOfferCaptcha('账号或密码错误'), false)
  assert.equal(shouldOfferCaptcha(''), false)
  assert.equal(shouldOfferCaptcha(null), false)
})
