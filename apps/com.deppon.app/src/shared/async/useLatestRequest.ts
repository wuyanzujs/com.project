import { useCallback, useRef } from 'react'

import {
  LatestRequestCoordinator,
  type LatestRequestOptions
} from './latestRequest'

type LatestRequestHandler<TResult> = (
  result: TResult
) => unknown | Promise<unknown>

export function useLatestRequestRunner(
  onStart: () => void,
  onFinish: () => void
) {
  const coordinator = useRef(new LatestRequestCoordinator()).current

  const runLatestRequest = useCallback(
    async <TResult>(
      key: string,
      request: () => Promise<TResult>,
      handleLatest: LatestRequestHandler<TResult>,
      options?: LatestRequestOptions
    ) => {
      const token = coordinator.begin(key, options)

      if (!token) {
        return false
      }

      onStart()

      try {
        const result = await request()

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

  const invalidateLatestRequest = useCallback(
    () => {
      coordinator.invalidate()
      onFinish()
    },
    [coordinator, onFinish]
  )

  return {
    invalidateLatestRequest,
    runLatestRequest
  }
}
