import { useCallback, useEffect, useRef, useState } from 'react'

import { expressService } from '@/services/express'
import type { ExpressGoodsItem } from '@/services/express'

// 生产端物品信息页在输入品名时即时搜索推荐（queryCargoInfo），这里用
// 500ms 防抖复刻同样的交互，避免每个按键都打一次接口。
const GOODS_NAME_SUGGEST_DEBOUNCE_MS = 500

/** 物品信息页的品名联想：输入停止 500ms 后查询推荐，避免每次按键都请求接口。 */
export function useGoodsNameSuggestions() {
  const [suggestions, setSuggestions] = useState<ExpressGoodsItem[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const queryVersion = useRef(0)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearSuggestions = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
      debounceTimer.current = null
    }

    queryVersion.current += 1
    setSuggestions([])
    setMessage('')
  }, [])

  const querySuggestions = useCallback(async (keyword: string) => {
    const trimmed = keyword.trim()

    if (!trimmed) {
      setSuggestions([])
      setMessage('')
      return
    }

    const requestVersion = queryVersion.current + 1

    queryVersion.current = requestVersion
    setLoading(true)
    setMessage('')

    try {
      const response = await expressService.queryGoodsNames(trimmed, 1, 8)

      if (queryVersion.current !== requestVersion) {
        return
      }

      const list = response.status ? (response.result?.list?.filter(item => !!item.productKeyWord) ?? []) : []

      setSuggestions(list)
      setMessage(response.status ? (list.length ? '' : '未找到匹配品名，可继续手动填写') : response.message || '暂未获取到品名推荐')
    } finally {
      if (queryVersion.current === requestVersion) {
        setLoading(false)
      }
    }
  }, [])

  const handleNameInput = useCallback(
    (value: string) => {
      setSuggestions([])
      setMessage('')

      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }

      const keyword = value.trim()

      if (!keyword) {
        return
      }

      debounceTimer.current = setTimeout(() => {
        debounceTimer.current = null
        void querySuggestions(keyword)
      }, GOODS_NAME_SUGGEST_DEBOUNCE_MS)
    },
    [querySuggestions]
  )

  useEffect(
    () => () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    },
    []
  )

  return {
    clearSuggestions,
    handleNameInput,
    loading,
    message,
    suggestions
  }
}
