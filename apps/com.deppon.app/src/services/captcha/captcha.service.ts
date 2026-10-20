import { captchaApi } from './captcha.api'
import { buildCaptchaPointJson, buildCaptchaVerification, parsePngSize } from './captcha.rules'

import type { ClickWordCaptchaSession, ClickWordCaptchaVerifyInput } from './types'

/**
 * 频控/风控失败信号:网关文案「您的操作过于频繁，请稍后重试」;精确触发 code 待接口确认后收敛。
 */
const CAPTCHA_REQUIRED_MESSAGE_PATTERN = /频繁|稍后重试/

/**
 *
 * @param message 网关业务失败提示
 * @description 判断失败响应是否应弹出点选验证码
 */
export function shouldOfferCaptcha(message?: string | null): boolean {
  return Boolean(message && CAPTCHA_REQUIRED_MESSAGE_PATTERN.test(message))
}

export const captchaService = {
  /**
   *
   * @description 拉取一次点选文字验证码会话,失败返回 null
   */
  async loadClickWordCaptcha(): Promise<ClickWordCaptchaSession | null> {
    const response = await captchaApi.getCaptchaAction()

    if (!response.status || !response.result) {
      return null
    }

    const { token, secretKey, wordList, originalImageBase64 } = response.result

    if (!token || !secretKey || !wordList?.length || !originalImageBase64) {
      return null
    }

    const imageSize = parsePngSize(originalImageBase64)

    return {
      token,
      secretKey,
      wordList,
      imageBase64: originalImageBase64,
      imageWidth: imageSize.width,
      imageHeight: imageSize.height
    }
  },

  /**
   *
   * @param input 点选坐标与会话
   * @description 提交点选坐标校验,返回是否通过;失败时 message 为网关提示
   */
  async verifyClickWordCaptcha(input: ClickWordCaptchaVerifyInput): Promise<{ status: boolean; message: string; verification: string }> {
    const { points, session } = input
    const response = await captchaApi.checkCaptchaAction({
      captchaType: 'clickWord',
      pointJson: buildCaptchaPointJson(points, session.secretKey),
      token: session.token
    })

    if (!response.status) {
      return { status: false, message: response.message || '验证失败，请重试', verification: '' }
    }

    const passed = response.result?.result === true

    if (!passed) {
      return { status: false, message: '验证失败，请重试', verification: '' }
    }

    return {
      status: true,
      message: '',
      verification: buildCaptchaVerification(session.token, points, session.secretKey)
    }
  }
}
