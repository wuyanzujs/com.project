import { useDidShow } from '@tarojs/taro'

import { useCallback, useEffect, useRef, useState } from 'react'

import { getCurrentUser } from '@/services/auth'
import { realNameService } from '@/services/realname'

/**
 *
 * @description 寄件页实名提示：已登录且查询到未实名时才展示
 */
export function useExpressRealName() {
  const [authenticated, setAuthenticated] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const requestIdRef = useRef(0)

  const load = useCallback(async () => {
    if (!getCurrentUser()?.mobile) {
      setAuthenticated(false)
      setInitialized(false)
      return
    }

    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId

    try {
      const response = await realNameService.query()

      if (requestIdRef.current !== requestId) {
        return
      }

      if (!response.status || !response.result) {
        setInitialized(false)
        return
      }

      setAuthenticated(response.result.authenticated)
      setInitialized(true)
    } catch {
      if (requestIdRef.current === requestId) {
        setInitialized(false)
      }
    }
  }, [])

  useDidShow(() => {
    load()
  })

  useEffect(
    () => () => {
      requestIdRef.current += 1
    },
    []
  )

  return {
    visible: Boolean(getCurrentUser()?.mobile) && initialized && !authenticated
  }
}
