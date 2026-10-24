import type { DepponResponse } from '@/request/deppon'
import { APP_RUNTIME_CONFIG } from '@/shared/config/runtime'
import { appendRouteQuery } from '@/shared/navigation/routeUrl'
import { APP_WEB_TARGETS } from '@/shared/webview/appWeb'

import { expressApi } from './express.api'
import { trimText } from './express.draft'
import { buildSignStagingRequest } from './express.payload'
import { getCurrentEcoToken, getCurrentUser } from '../../auth'
import { createServiceFailure as createFailure } from '../../serviceResponse'

import type { ExpressDraft, ExpressSignStageResult } from './types'

// 下单接口用「1|货类|协议号」返回需要先签电子协议的场景。
const EXPRESS_SIGN_CODE_PREFIX = '1|'
const EXPRESS_SIGN_WEB_PATH = APP_WEB_TARGETS.EXPRESS_STATEMENT.url

/**
 *
 * @param code 下单接口返回的业务码
 * @description 判断是否为电子签署函拦截
 */
export function isExpressSignResponseCode(code?: string | null) {
  return trimText(code ?? '').startsWith(EXPRESS_SIGN_CODE_PREFIX)
}

/**
 *
 * @param code 下单接口返回的业务码
 * @description 解析签署函货类与协议号
 */
export function parseExpressSignResponseCode(code: string) {
  const [, goodsType = '', agreementId = ''] = trimText(code).split('|')

  return {
    goodsType: trimText(goodsType),
    agreementId: trimText(agreementId)
  }
}

/**
 *
 * @param draft 寄件草稿
 * @param code 下单接口返回的签署函业务码
 * @description 暂存发货信息并返回可打开的签署函地址
 */
export async function stageExpressSign(draft: ExpressDraft, code: string): Promise<DepponResponse<ExpressSignStageResult>> {
  const sign = parseExpressSignResponseCode(code)

  if (!sign.agreementId) {
    return createFailure('签署函信息缺失，请稍后重试')
  }

  try {
    const response = await expressApi.stageStagingInfo(buildSignStagingRequest(draft, sign, getCurrentUser()?.mobile ?? ''))
    const stagingId = typeof response.result === 'string' ? trimText(response.result) : ''

    if (!response.status || !stagingId) {
      return createFailure(response.message || '发货信息暂存失败，请稍后再试')
    }

    return {
      ...response,
      result: {
        stagingId,
        uri: appendRouteQuery(EXPRESS_SIGN_WEB_PATH, {
          queryId: stagingId,
          ecoToken: getCurrentEcoToken(),
          source: APP_RUNTIME_CONFIG.systemCode
        })
      }
    }
  } catch (error) {
    return createFailure(error instanceof Error && error.message ? error.message : '发货信息暂存失败，请稍后再试')
  }
}
