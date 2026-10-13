import { useCallback, useState } from 'react'

import {
  createExpressDraft,
  expressDraftBridge,
  expressDraftStorage,
  markExpressQuoteStale
} from '@/services/express'
import { goodsQueryService } from '@/services/goods'
import type {
  GoodsCheckResult,
  GoodsHistoryItem,
  GoodsSuggestionView
} from '@/services/goods'
import { navigateToAppRoute } from '@/shared/navigation/appNavigation'
import { APP_ROUTES } from '@/shared/navigation/routes'
import { createAppRouteUrl } from '@/shared/navigation/routeUrl'

interface UseGoodsQueryResult {
  keyword: string
  setKeyword: (next: string) => void
  suggestions: GoodsSuggestionView[]
  history: GoodsHistoryItem[]
  result: GoodsCheckResult | null
  message: string
  searching: boolean
  checking: boolean
  setHistory: (next: GoodsHistoryItem[]) => void
  setResult: (next: GoodsCheckResult | null) => void
  setMessage: (next: string) => void
  handleSearch: () => Promise<void>
  checkGoodsName: (goodsName: string) => Promise<void>
  handleClearHistory: () => Promise<void>
  handleCarryToExpress: () => void
}

export function useGoodsQuery(
  showToast: (title: string) => void
): UseGoodsQueryResult {
  const [keyword, setKeyword] = useState('')
  const [suggestions, setSuggestions] = useState<GoodsSuggestionView[]>([])
  const [history, setHistory] = useState<GoodsHistoryItem[]>(() =>
    goodsQueryService.getHistory()
  )
  const [result, setResult] = useState<GoodsCheckResult | null>(null)
  const [message, setMessage] = useState('')
  const [searching, setSearching] = useState(false)
  const [checking, setChecking] = useState(false)

  const checkGoodsName = useCallback(
    async (goodsName: string) => {
      const nextName = goodsName.trim()

      if (!nextName) {
        showToast('请输入货物名称')
        return
      }

      if (checking) {
        return
      }

      setChecking(true)
      setMessage('')

      try {
        const response = await goodsQueryService.checkGoods({
          goodsName: nextName
        })

        if (!response.status || !response.result) {
          const nextMessage = response.message || '暂未完成货物校验'

          setResult(null)
          setMessage(nextMessage)
          showToast(nextMessage)
          return
        }

        setKeyword(response.result.goodsName)
        setResult(response.result)
        setSuggestions([])
        setHistory(goodsQueryService.getHistory())
      } finally {
        setChecking(false)
      }
    },
    [checking, showToast]
  )

  const handleSearch = useCallback(async () => {
    const nextKeyword = keyword.trim()

    if (!nextKeyword) {
      showToast('请输入货物名称关键词')
      return
    }

    if (searching) {
      return
    }

    setSearching(true)
    setMessage('')
    setResult(null)

    try {
      const response = await goodsQueryService.searchGoods(nextKeyword)

      if (!response.status || !response.result) {
        const nextMessage = response.message || '暂未获取到品名推荐'

        setSuggestions([])
        setMessage(nextMessage)
        showToast(nextMessage)
        return
      }

      setSuggestions(response.result)
      setMessage(response.result.length ? '' : '未找到匹配品名，可直接校验')
    } finally {
      setSearching(false)
    }
  }, [keyword, searching, showToast])

  const handleClearHistory = useCallback(async () => {
    if (await goodsQueryService.clearHistory()) {
      setHistory([])
    } else {
      showToast('历史记录清理失败，请重试')
    }
  }, [showToast])

  const handleCarryToExpress = useCallback(() => {
    if (!result) {
      showToast('请先校验货物名称')
      return
    }

    if (!result.canExpress) {
      showToast('该货物暂不支持寄递')
      return
    }

    const draft = expressDraftStorage.restore() ?? createExpressDraft()
    const nextDraft = markExpressQuoteStale(
      {
        ...draft,
        goods: {
          ...draft.goods,
          name: result.goodsName
        }
      },
      '货物名称来自违禁品查询，请重新获取价格'
    )

    expressDraftBridge.carryFromGoodsQuery(nextDraft)
    navigateToAppRoute(
      createAppRouteUrl(APP_ROUTES.express, {
        source: 'GOODS_QUERY'
      })
    )
  }, [result, showToast])

  return {
    keyword,
    setKeyword,
    suggestions,
    history,
    result,
    message,
    searching,
    checking,
    setHistory,
    setResult,
    setMessage,
    handleSearch,
    checkGoodsName,
    handleClearHistory,
    handleCarryToExpress
  }
}
