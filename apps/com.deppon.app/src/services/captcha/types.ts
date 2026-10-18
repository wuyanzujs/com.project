export interface CaptchaPoint {
  x: number
  y: number
}

/**
 * @description getCaptchaAction 回显完整 CaptchaVO,这里只声明客户端实际消费的字段
 */
export interface ClickWordCaptchaRaw {
  token?: string | null
  secretKey?: string | null
  wordList?: string[] | null
  originalImageBase64?: string | null
}

export interface ClickWordCaptchaCheckRequest {
  captchaType: 'clickWord'
  pointJson: string
  token: string
}

export interface ClickWordCaptchaCheckResult {
  result?: boolean | null
}

export interface ClickWordCaptchaSession {
  token: string
  secretKey: string
  wordList: string[]
  imageBase64: string
  imageWidth: number
  imageHeight: number
}

export interface ClickWordCaptchaVerifyInput {
  points: CaptchaPoint[]
  session: ClickWordCaptchaSession
}
