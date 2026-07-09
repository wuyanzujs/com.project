import type { DepponResponse } from '../request/deppon'

export function createServiceFailure<TResult>(
  message: string
): DepponResponse<TResult> {
  return {
    status: false,
    message,
    result: null
  }
}
