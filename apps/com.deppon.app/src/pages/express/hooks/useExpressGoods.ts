import Taro from '@tarojs/taro'

import { useCallback, useRef, useState } from 'react'

import {
  expressService,
  updateExpressGoods,
  updateExpressPackaging
} from '@/services/express'
import type {
  ExpressDraft,
  ExpressGoodsItem,
  ExpressPackagingDraft
} from '@/services/express'

interface UseExpressGoodsParams {
  draft: ExpressDraft
  setDraft: React.Dispatch<React.SetStateAction<ExpressDraft>>
  restoreQuotes: (quotes: []) => void
}

interface UseExpressGoodsResult {
  goodsSuggestions: ExpressGoodsItem[]
  goodsLoading: boolean
  goodsMessage: string
  handlePackagingChange: (patch: Partial<ExpressPackagingDraft>) => void
  handleGoodsNameInput: (value: string) => void
  handleQueryGoodsNames: () => Promise<void>
  handleSelectGoodsName: (item: ExpressGoodsItem) => void
  updateGoods: (patch: Partial<ExpressDraft['goods']>) => void
}

export function useExpressGoods({
  draft,
  setDraft,
  restoreQuotes
}: UseExpressGoodsParams): UseExpressGoodsResult {
  const [goodsSuggestions, setGoodsSuggestions] = useState<ExpressGoodsItem[]>(
    []
  )
  const [goodsLoading, setGoodsLoading] = useState(false)
  const [goodsMessage, setGoodsMessage] = useState('')
  const goodsQueryVersion = useRef(0)

  const updateGoods = useCallback(
    (patch: Partial<ExpressDraft['goods']>) => {
      setDraft(current => updateExpressGoods(current, patch))
    },
    [setDraft]
  )

  const handlePackagingChange = useCallback(
    (patch: Partial<ExpressPackagingDraft>) => {
      restoreQuotes([])
      setDraft(current => updateExpressPackaging(current, patch))
    },
    [restoreQuotes, setDraft]
  )

  const handleGoodsNameInput = useCallback(
    (value: string) => {
      goodsQueryVersion.current += 1
      setGoodsSuggestions([])
      setGoodsMessage('')
      setDraft(current => updateExpressGoods(current, { name: value }))
    },
    [setDraft]
  )

  const handleQueryGoodsNames = useCallback(async () => {
    const keyword = draft.goods.name.trim()

    if (!keyword) {
      setGoodsSuggestions([])
      setGoodsMessage('')
      Taro.showToast({
        title: '请输入货物名称关键词',
        icon: 'none'
      })
      return
    }

    if (goodsLoading) {
      return
    }

    const requestVersion = goodsQueryVersion.current + 1

    goodsQueryVersion.current = requestVersion
    setGoodsLoading(true)
    setGoodsMessage('')

    try {
      const response = await expressService.queryGoodsNames(keyword, 1, 8)

      if (goodsQueryVersion.current !== requestVersion) {
        return
      }

      if (!response.status) {
        const message = response.message || '暂未获取到品名推荐'

        setGoodsSuggestions([])
        setGoodsMessage(message)
        Taro.showToast({
          title: message,
          icon: 'none'
        })
        return
      }

      const suggestions =
        response.result?.list?.filter(item => !!item.productKeyWord) ?? []

      setGoodsSuggestions(suggestions)
      setGoodsMessage(
        suggestions.length ? '' : '未找到匹配品名，可继续手动填写'
      )
    } finally {
      if (goodsQueryVersion.current === requestVersion) {
        setGoodsLoading(false)
      }
    }
  }, [draft.goods.name, goodsLoading])

  const handleSelectGoodsName = useCallback(
    (item: ExpressGoodsItem) => {
      setDraft(current =>
        updateExpressGoods(current, { name: item.productKeyWord })
      )
      setGoodsSuggestions([])
      setGoodsMessage('')
    },
    [setDraft]
  )

  return {
    goodsSuggestions,
    goodsLoading,
    goodsMessage,
    handlePackagingChange,
    handleGoodsNameInput,
    handleQueryGoodsNames,
    handleSelectGoodsName,
    updateGoods
  }
}
