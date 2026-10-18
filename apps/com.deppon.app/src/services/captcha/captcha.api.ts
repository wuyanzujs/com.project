import { depponHttp } from '@/request/deppon'

import type { ClickWordCaptchaCheckRequest, ClickWordCaptchaCheckResult, ClickWordCaptchaRaw } from './types'

const CAPTCHA_TYPE_CLICK_WORD = 'clickWord'

export const captchaApi = {
  getCaptchaAction(loading = false) {
    return depponHttp.post<ClickWordCaptchaRaw, { captchaType: 'clickWord' }>(
      '/gwapi/messageService/eco/message/captcha/getCaptchaAction',
      { captchaType: CAPTCHA_TYPE_CLICK_WORD },
      { loading, login: false }
    )
  },

  checkCaptchaAction(data: ClickWordCaptchaCheckRequest) {
    return depponHttp.post<ClickWordCaptchaCheckResult | null, ClickWordCaptchaCheckRequest>(
      '/gwapi/messageService/eco/message/captcha/checkCaptchaAction',
      data,
      { loading: false, login: false }
    )
  }
}
