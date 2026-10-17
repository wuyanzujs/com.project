import { useCallback, useRef } from 'react'

import { LatestRequestCoordinator, type LatestRequestOptions } from './latestRequest'

type LatestRequestHandler<TResult> = (result: TResult) => unknown | Promise<unknown>

/**
 * 协调页面内可能同时发生的业务请求，只让当前最新请求写回页面状态。
 *
 * 发票中心的订单、历史、电子卡和纳税人查询共用同一个 loading 状态；寄件页的报价和优惠券
 * 查询又会随着收寄信息、货物或优惠条件变化连续触发。这里用请求 key 区分业务请求，并用令牌
 * 判断返回结果是否仍然有效，避免旧请求晚返回时覆盖用户当前看到的数据。
 *
 * 请求开始和结束时分别触发 loading 回调；页面切换或业务条件失效时，可调用
 * `invalidateLatestRequest` 让尚未返回的请求结果作废。
 */
export function useLatestRequestRunner(onStart: () => void, onFinish: () => void) {
  const coordinator = useRef(new LatestRequestCoordinator()).current

  const runLatestRequest = useCallback(
    async <TResult>(key: string, request: () => Promise<TResult>, handleLatest: LatestRequestHandler<TResult>, options?: LatestRequestOptions) => {
      const token = coordinator.begin(key, options)

      if (!token) {
        return false
      }

      onStart()

      try {
        const result = await request()

        // 请求返回时再次校验令牌，确保旧请求不会提交结果。
        if (!coordinator.isLatest(token)) {
          return false
        }

        await handleLatest(result)
        return true
      } finally {
        if (coordinator.finish(token)) {
          onFinish()
        }
      }
    },
    [coordinator, onFinish, onStart]
  )

  const invalidateLatestRequest = useCallback(() => {
    coordinator.invalidate()
    onFinish()
  }, [coordinator, onFinish])

  // 让当前请求失效，并立即结束外部 loading 状态。
  return {
    invalidateLatestRequest,
    runLatestRequest
  }
}
