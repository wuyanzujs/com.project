import type { DepponResponse } from '../request/deppon'

/**
 *
 * @param message 失败提示文案
 * @description 创建失败响应
 */
export function createServiceFailure<TResult>(message: string): DepponResponse<TResult> {
  return {
    status: false,
    message,
    result: null
  }
}
