import AES from 'crypto-js/aes'
import Utf8 from 'crypto-js/enc-utf8'
import ECB from 'crypto-js/mode-ecb'
import Pkcs7 from 'crypto-js/pad-pkcs7'

import type { CaptchaPoint } from './types'

const VERIFICATION_SEPARATOR = '---'

/**
 *
 * @param content 待加密明文
 * @param secretKey 验证码会话密钥
 * @description AES-ECB-PKCS7,key 为 secretKey 原文字节,输出标准 base64(与生产端 EncryptUtil.aesEncode 等价)
 */
export function aesEncryptEcbBase64(content: string, secretKey: string): string {
  const key = Utf8.parse(secretKey)
  const encrypted = AES.encrypt(content, key, {
    mode: ECB,
    padding: Pkcs7,
    iv: undefined
  })

  return encrypted.toString()
}

/**
 *
 * @param points 点选坐标,须为服务端原图坐标系
 * @description 坐标数组序列化为点选 JSON
 */
export function serializeCaptchaPoints(points: CaptchaPoint[]): string {
  return JSON.stringify(points.map(point => ({ x: point.x, y: point.y })))
}

/**
 *
 * @param points 点选坐标
 * @param secretKey 会话密钥,空串时按明文提交
 * @description check 请求的 pointJson 字段
 */
export function buildCaptchaPointJson(points: CaptchaPoint[], secretKey: string): string {
  const pointStr = serializeCaptchaPoints(points)

  return secretKey ? aesEncryptEcbBase64(pointStr, secretKey) : pointStr
}

/**
 *
 * @param token 会话 token
 * @param points 点选坐标
 * @param secretKey 会话密钥
 * @description 业务请求携带的 captchaVerification:token 与明文坐标以 --- 拼接后整体加密
 */
export function buildCaptchaVerification(token: string, points: CaptchaPoint[], secretKey: string): string {
  const verification = `${token}${VERIFICATION_SEPARATOR}${serializeCaptchaPoints(points)}`

  return secretKey ? aesEncryptEcbBase64(verification, secretKey) : verification
}

const PNG_IHDR_OFFSET = 16
const PNG_SIZE_BYTES = 8
const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

/**
 *
 * @param imageBase64 PNG base64(可含 dataURL 前缀)
 * @description 从 PNG IHDR 解析原图宽高,用于点选坐标归一;仅解码头部 32 字符,避免依赖 atob
 */
export function parsePngSize(imageBase64: string): { width: number; height: number } {
  const raw = imageBase64.slice(imageBase64.indexOf(',') + 1)
  const bytes: number[] = []

  for (let index = 0; index + 1 < raw.length && bytes.length < PNG_IHDR_OFFSET + PNG_SIZE_BYTES; index += 4) {
    const chars = [0, 1, 2, 3].map(offset => BASE64_ALPHABET.indexOf(raw[index + offset] ?? ''))

    if (chars.some(code => code < 0)) {
      break
    }

    bytes.push((chars[0]! << 2) | (chars[1]! >> 4))
    bytes.push(((chars[1]! & 0x0f) << 4) | (chars[2]! >> 2))
    bytes.push(((chars[2]! & 0x03) << 6) | chars[3]!)
  }

  if (bytes.length < PNG_IHDR_OFFSET + PNG_SIZE_BYTES) {
    return { width: 0, height: 0 }
  }

  const readUint32 = (offset: number) => bytes.slice(offset, offset + 4).reduce((value, byte) => value * 256 + byte, 0)

  return { width: readUint32(PNG_IHDR_OFFSET), height: readUint32(PNG_IHDR_OFFSET + 4) }
}
